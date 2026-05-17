# ClassroomSuite

A local-first, single-user teacher workspace that consolidates three workflows into one app:

1. **Comments Module** — live grid of students → live-compiled narrative paragraphs (auto name/pronoun substitution).
2. **Lessons Module** — upload screenshots of lesson plans, OCR + heuristic parse into the CHA Faculty Observation Form (Domains 1/2/3 + Post-Observation). BlockNote markdown agenda workspace.
3. **Email Engine** — single-click digest of the current narrative session, sent via Resend (or copy-to-clipboard fallback).

## Stack

Mirrors the **Sevarthi.Hub** template (see `docs/tech-stack-summary.md` if cloned alongside): Next.js 16 (App Router, Turbopack) + React 19 + Convex 1.34 + `@convex-dev/auth` (Google OAuth) + Tailwind 4 + shadcn/ui + Sonner + cmdk + date-fns. FastAPI sidecar with Tesseract for OCR (mirrors `finance.tracker/api/`).

## Local dev

```bash
# 1. Bring up Convex backend + dashboard + FastAPI parser
docker compose up -d convexDB-backend convexDB-dashboard parser

# 2. One-time: generate JWT keys + push Google OAuth creds to Convex
cd web && npm install && ./scripts/setup-local-convex.sh

# 3. Run the Next.js dev server
npm run dev      # → http://localhost:10814
```

Convex dashboard: http://localhost:10817 · Convex backend: http://localhost:10810 · FastAPI: http://localhost:10811

## Ports (Project #8, base 10810)

| Service | Port | Notes |
|---|---|---|
| Convex backend | 10810 | `CS_PORT_CONVEX` |
| FastAPI parser | 10811 | `CS_PORT_API` |
| Web (Docker prod) | 10813 | `CS_PORT_WEB` |
| Web (local dev) | 10814 | `CS_PORT_WEB_DEV` (hardcoded in `web/package.json`) |
| Convex site proxy | 10815 | `CS_PORT_SITE_PROXY` |
| Convex dashboard | 10817 | `CS_PORT_DASHBOARD` |

Persistent volume: `${SSD_DATA}/classroom.suite/convex` (default `/Volumes/DevSSD/docker-data/classroom.suite/convex`).

## Layout

```
classroom.suite/
├── docker-compose.yml
├── docs/                          # ST Faculty Observation Form 2026.docx
├── api/                           # FastAPI OCR sidecar (Tesseract)
└── web/                           # Next.js 16
    ├── convex/                    # backend functions + schema
    └── src/                       # app router, components, lib
```
