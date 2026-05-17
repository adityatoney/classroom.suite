# Sevarthi Hub — Tech Stack Summary

## 1. Frontend

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Framework** | Next.js (App Router) | 16.2.1 | SSR, routing, server actions, API routes |
| **UI Library** | React | 19.2.4 | Component model, hooks, concurrent features |
| **Language** | TypeScript | — | End-to-end type safety (frontend + Convex backend) |
| **Styling** | Tailwind CSS (CSS-first v4) | 4.x | Utility-first CSS with `@tailwindcss/postcss` (no config file needed) |
| **Component System** | shadcn/ui | 4.1.0 | Accessible, copy-paste UI primitives (dialogs, tables, dropdowns, etc.) |
| **Icons** | Lucide React | 1.0.1 | SVG icon library |
| **Charts** | Recharts | 3.8.0 | Data visualization (status distributions, progress charts) |
| **Command Palette** | cmdk | 1.1.1 | Cmd+K command palette |
| **Toasts** | Sonner | 2.0.7 | Toast notification system |
| **Theming** | next-themes | 0.4.6 | Light/dark mode support |
| **Date Utils** | date-fns | 4.1.0 | Date formatting and manipulation |
| **CSS Utilities** | class-variance-authority + tailwind-merge | 0.7.1 / 3.5.0 | Variant-based component styling, class deduplication |
| **Base UI** | @base-ui/react | 1.3.0 | Headless UI primitives |

---

## 2. Backend (Real-Time Database + Functions)

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Backend Platform** | Convex (self-hosted) | 1.34.0 | Real-time reactive database, serverless functions (queries/mutations/actions), file storage |
| **Schema** | Convex Schema DSL | — | TypeScript-defined schema with 16+ V2 tables, typed validators, indexed queries |
| **Functions** | Convex `query` / `mutation` / `action` / `httpAction` | — | Type-safe backend functions with auto-reactivity |
| **HTTP API** | Convex HTTP Actions + `httpRouter` | — | RESTful API layer (`/v1/orgs/{orgId}/...`) for external integrations |

> **Migration History**: Originally designed for Supabase (PostgreSQL) with SQL + RLS. Migrated to Convex for built-in reactivity, end-to-end TypeScript type safety, and simpler backend architecture.

---

## 3. Authentication & Authorization

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Auth Library** | @convex-dev/auth | 0.0.91 | Convex-native auth with session management |
| **OAuth Provider** | @auth/core (Auth.js) | 0.37.0 | Google OAuth provider integration |
| **Identity Provider** | Google OAuth | — | Primary sign-in method |
| **JWT Keys** | RS256 (`JWT_PRIVATE_KEY` + `JWKS`) | — | Token signing for self-hosted Convex |
| **RBAC** | Custom code-level authorization | — | Multi-tier: Org > Team > Project role resolution (`authz.ts`) |

**Role Hierarchy**: `viewer` > `contributor` > `manager` > `admin`, resolved per org/team/project scope.

---

## 4. Data Architecture

| Concept | Implementation | Details |
|---------|---------------|---------|
| **Multi-Tenancy** | Logical `orgId`-scoped isolation | Shared Convex deployment, all rows carry `orgId`, `by_org_*` indexes |
| **Hierarchy** | `Organization > Team > Project > Task > Subtask` | ClickUp-inspired model |
| **V2 Tables** | 16+ tables (suffixed `V2` during migration) | `tasksV2`, `teamsV2`, `orgMemberships`, `projectMemberships`, `configValues`, etc. |
| **Config Inheritance** | `configProfiles` + `configValues` | Cascading: Project > Team > Org > System defaults (statuses, priorities, phases) |
| **Audit Trail** | `taskActivityLogV2` | Immutable activity log for all task mutations |
| **Legacy Mapping** | `legacyMappings` table | Tracks V1 to V2 ID relationships during migration |

---

## 5. Data Processing & Import

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Excel Parsing** | xlsx (SheetJS) v0.18.5 | Parse `.xlsx` files for task import, MoM (Mother of Minutes) import |
| **Import Pipeline** | Next.js API route (parse) then Convex action (execute in batches of 50) | Two-stage: preview then commit |
| **Seed Scripts** | `seedDummyData.ts`, `seedV2.ts`, `adminUtils.ts` | Idempotent data seeding via `npx convex run` |

---

## 6. Infrastructure & Deployment

| Component | Technology | Details |
|-----------|-----------|---------|
| **Container Runtime** | Docker Compose | Self-hosted Convex backend + dashboard + Next.js app |
| **Convex Backend** | Port `10410` / `10411` (prod), `3210` / `3211` (dev) | Backend + site/HTTP ports |
| **Convex Dashboard** | Port `10417` | Admin DB explorer |
| **Next.js App** | Port `10413` (prod), `10414` (dev) | Frontend application |
| **Build Optimization** | Turbopack | Fast dev builds via Next.js Turbopack |
| **Proxy** | Next.js rewrites | Same-origin Convex requests via Next.js proxy config |

---

## 7. Development Tooling

| Tool | Purpose |
|------|---------|
| Convex CLI (`npx convex dev`) | Hot-reload backend functions, manage env vars, run scripts |
| patch-package | Patches `@convex-dev/auth` for self-hosted cookie behavior |
| Scripts | `setup-local-convex.sh` for local dev environment bootstrap |
| `npx convex run` | Execute seed, migration, and admin utility functions |

---

## 8. Architectural Patterns

| Pattern | Description |
|---------|-------------|
| **Strangler Migration** | V1 (legacy event-runbook) coexists with V2 (multi-tenant) tables; dual-write during transition |
| **Reactive Queries** | Every Convex `useQuery` is live-updating — no polling, no `revalidatePath()` |
| **Actor-Based Auth** | Every mutation resolves an actor context (`resolveActorContext`) then permission check then business logic then audit log |
| **Config Inheritance** | Project overrides Team overrides Org overrides System defaults |
| **Batch Mutations** | Large operations (import 368+ tasks, rollover) use `action` then internal `mutation` batches of 50 to stay under Convex's 10s execution limit |
| **Client Components for Live Data** | Most pages use `"use client"` + `useQuery` for real-time updates; read-only/admin pages can use SSR `fetchQuery` |

---

## 9. Cost Profile

**$0/month** (self-hosted)

- Convex: Self-hosted via Docker (no cloud billing)
- Next.js: Self-hosted or Vercel free tier eligible
- Auth: Google OAuth (free)
- No external database service costs
