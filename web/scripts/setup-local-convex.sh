#!/usr/bin/env bash
#
# setup-local-convex.sh — Bootstrap the local Convex dev environment for
# ClassroomSuite (port base 10810).
#
# Usage:
#   ./scripts/setup-local-convex.sh              # Full setup (fresh volume)
#   ./scripts/setup-local-convex.sh --start      # Just start containers
#   ./scripts/setup-local-convex.sh --stop       # Gracefully stop containers
#   ./scripts/setup-local-convex.sh --nuke       # Destroy everything and rebuild
#
# What this does (full setup):
#   1. Starts Convex backend + dashboard via Docker Compose (from project root)
#   2. Generates admin key from the running instance
#   3. Updates web/.env.local with the new admin key
#   4. Deploys Convex functions (schema, indexes)
#   5. Sets auth environment variables (JWKS, JWT_PRIVATE_KEY, SITE_URL)
#
# Manual step required:
#   - Set AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET in Google Cloud Console then
#     `npx convex env set ... --url http://localhost:10810 --admin-key "$ADMIN_KEY"`

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WEB_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT_DIR="$(cd "$WEB_DIR/.." && pwd)"
ENV_FILE="$WEB_DIR/.env.local"

CONVEX_PORT="${CS_PORT_CONVEX:-10810}"
DASHBOARD_PORT="${CS_PORT_DASHBOARD:-10817}"
SITE_PROXY_PORT="${CS_PORT_SITE_PROXY:-10815}"
DEV_PORT="${CS_PORT_WEB_DEV:-10814}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
err()   { echo -e "${RED}[ERR]${NC}   $*" >&2; }

MODE="full"
case "${1:-}" in
  --start) MODE="start" ;;
  --stop)  MODE="stop"  ;;
  --nuke)  MODE="nuke"  ;;
  --help|-h) head -22 "$0" | tail -20; exit 0 ;;
esac

cd "$ROOT_DIR"

if [ "$MODE" = "stop" ]; then
  info "Stopping Convex containers..."
  docker compose stop convexDB-backend convexDB-dashboard
  ok "Stopped (data preserved)."
  exit 0
fi

if [ "$MODE" = "nuke" ]; then
  warn "This will destroy all local Convex data and rebuild from scratch."
  read -rp "Are you sure? (y/N) " confirm
  [ "$confirm" = "y" ] || [ "$confirm" = "Y" ] || { info "Aborted."; exit 0; }
  info "Tearing down..."
  docker compose down -v
  MODE="full"
fi

info "Starting Convex backend + dashboard..."
docker compose up -d convexDB-backend convexDB-dashboard

info "Waiting for backend at http://localhost:${CONVEX_PORT}/version ..."
for i in $(seq 1 30); do
  if curl -sf "http://localhost:${CONVEX_PORT}/version" >/dev/null 2>&1; then
    ok "Backend healthy."
    break
  fi
  [ "$i" -eq 30 ] && { err "Backend not healthy after 30s."; exit 1; }
  sleep 1
done

if [ "$MODE" = "start" ]; then
  ok "Containers running. Run 'npm run dev' inside ./web."
  exit 0
fi

info "Generating admin key..."
ADMIN_KEY=$(docker compose exec -T convexDB-backend ./generate_admin_key.sh 2>/dev/null | grep -oE 'convex-self-hosted\|[a-f0-9]+')
[ -n "$ADMIN_KEY" ] || { err "Failed to generate admin key."; exit 1; }
ok "Admin key: ${ADMIN_KEY:0:25}..."

info "Updating $ENV_FILE ..."
mkdir -p "$WEB_DIR"
if [ -f "$ENV_FILE" ] && grep -q "^CONVEX_SELF_HOSTED_ADMIN_KEY=" "$ENV_FILE"; then
  sed -i '' "s|^CONVEX_SELF_HOSTED_ADMIN_KEY=.*|CONVEX_SELF_HOSTED_ADMIN_KEY=$ADMIN_KEY|" "$ENV_FILE"
elif [ -f "$ENV_FILE" ]; then
  {
    echo ""
    echo "CONVEX_SELF_HOSTED_URL=http://localhost:${CONVEX_PORT}"
    echo "CONVEX_SELF_HOSTED_ADMIN_KEY=$ADMIN_KEY"
  } >> "$ENV_FILE"
else
  cat > "$ENV_FILE" <<ENVEOF
NEXT_PUBLIC_CONVEX_URL=http://localhost:${DEV_PORT}/convex
NEXT_PUBLIC_CONVEX_SITE_URL=http://localhost:${SITE_PROXY_PORT}
NEXT_PUBLIC_API_URL=http://localhost:${CS_PORT_API:-10811}
CONVEX_SELF_HOSTED_URL=http://localhost:${CONVEX_PORT}
CONVEX_SELF_HOSTED_ADMIN_KEY=$ADMIN_KEY
ENVEOF
fi
ok ".env.local updated."

info "Deploying Convex functions..."
cd "$WEB_DIR"
npx convex deploy --url "http://localhost:${CONVEX_PORT}" --admin-key "$ADMIN_KEY"
ok "Functions deployed."

info "Generating JWKS + JWT_PRIVATE_KEY..."
KEYS_JSON=$(node -e "
const crypto = require('crypto');
const { promisify } = require('util');
const generateKeyPair = promisify(crypto.generateKeyPair);
(async () => {
  const { privateKey } = await generateKeyPair('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'jwk' },
    privateKeyEncoding: { type: 'pkcs8', format: 'jwk' },
  });
  const jwks = JSON.stringify({
    keys: [{ ...privateKey, use: 'sig', alg: 'RS256', kid: 'convex-self-hosted-1' }]
  });
  const pem = crypto.createPrivateKey({ key: privateKey, format: 'jwk' })
    .export({ type: 'pkcs8', format: 'pem' });
  console.log(JSON.stringify({ jwks, pem: pem.trim() }));
})();
")
JWKS=$(echo "$KEYS_JSON" | node -e "process.stdout.write(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).jwks)")
JWT_PEM=$(echo "$KEYS_JSON" | node -e "process.stdout.write(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).pem)")

npx convex env set JWKS "$JWKS" --url "http://localhost:${CONVEX_PORT}" --admin-key "$ADMIN_KEY"
ok "JWKS set."

node -e "
const http = require('http');
const body = JSON.stringify({ changes: [{ name: 'JWT_PRIVATE_KEY', value: process.argv[1] }] });
const req = http.request({
  hostname: 'localhost', port: ${CONVEX_PORT},
  path: '/api/update_environment_variables', method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Convex $ADMIN_KEY',
    'Content-Length': Buffer.byteLength(body),
  }
}, (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    if (res.statusCode !== 200) { console.error('Failed:', res.statusCode, d); process.exit(1); }
  });
});
req.write(body); req.end();
" "$JWT_PEM"
ok "JWT_PRIVATE_KEY set."

npx convex env set SITE_URL "http://localhost:${DEV_PORT}" --url "http://localhost:${CONVEX_PORT}" --admin-key "$ADMIN_KEY"
ok "SITE_URL set."

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ClassroomSuite Convex backend is ready!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""
echo "  Convex backend:   http://localhost:${CONVEX_PORT}"
echo "  Site proxy:       http://localhost:${SITE_PROXY_PORT}"
echo "  Dashboard:        http://localhost:${DASHBOARD_PORT}"
echo "  Next.js dev:      http://localhost:${DEV_PORT} (run \`npm run dev\` inside ./web)"
echo ""
echo -e "${YELLOW}Manual step:${NC} set Google OAuth credentials"
echo "  npx convex env set AUTH_GOOGLE_ID <id>     --url http://localhost:${CONVEX_PORT} --admin-key \"$ADMIN_KEY\""
echo "  npx convex env set AUTH_GOOGLE_SECRET <s>  --url http://localhost:${CONVEX_PORT} --admin-key \"$ADMIN_KEY\""
echo ""
echo "  In Google Cloud Console, add to the OAuth client:"
echo "    Authorized JS origin:   http://localhost:${DEV_PORT}"
echo "    Authorized redirect:    http://localhost:${SITE_PROXY_PORT}/api/auth/callback/google"
echo ""
