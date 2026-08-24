# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-08-24

### Added

- Initial Phase 0 documentation.
- `README.md` with initial diagnostic.
- `ARCHITECTURE_PLAN.md` with unified architecture draft.
- `PROJECT_RULES.md` with operating rules.
- `STACK_VERSIONS.md` with version policy and pending decisions.
- `DEPLOYMENT.md` with deployment flow and checklist.

## [0.2.0] - 2026-08-24

### Added

- Phase 1 base app using Next.js + TypeScript.
- Initial App Router structure under `src/app`.
- Local Git repository initialization.
- Base testing setup with Vitest and Playwright.
- Base Supabase structure (`supabase/config.toml` and migrations folder).
- `vercel.json` and `.env.example` for deployment/env baseline.

### Changed

- Updated architecture, stack, deployment, and README docs from Phase 0 to Phase 1 status.

## [0.3.0] - 2026-08-24

### Added

- Phase 2 initial Supabase migration with core domain tables.
- RLS policies for domain tables and storage objects.
- Auth bootstrap trigger for `profiles` on `auth.users` insert.
- Storage buckets `property-media` and `generated-media`.
- Supabase health endpoint at `src/app/api/health/supabase/route.ts`.
- NPM scripts for Supabase DB push/reset.

### Changed

- Updated README and architecture status to reflect Phase 2 in progress.

## [0.4.0] - 2026-08-24

### Added

- Real Supabase health validation through `/api/health/supabase` with successful response.
- Minimal seed script `scripts/seed-minimal.mjs` to create/fetch a seed agent and seed properties.
- First Property CRUD service in `src/lib/services/property-service.ts`.
- Property validation and input parsing in `src/lib/validators/property.ts`.
- Property API routes:
  - `GET/POST /api/properties`
  - `GET/PATCH/DELETE /api/properties/:id`
- Basic CRUD UI at `/properties`.

### Changed

- Home page now links to the properties module.
- README and architecture docs updated to Phase 3 in progress.

## [0.5.0] - 2026-08-24

### Added

- Token-based auth guard for property APIs using `Authorization: Bearer` and Supabase `auth.uid()` context.
- Media CRUD service with Supabase Storage upload/delete flow in `src/lib/services/property-media-service.ts`.
- Media API routes:
  - `GET/POST /api/properties/:id/media`
  - `PATCH/DELETE /api/properties/:id/media/:mediaId`
- Integration tests for property routes and media routes.
- `.env.example` entries for `SEED_AGENT_EMAIL` and `SEED_AGENT_PASSWORD`.

### Changed

- Property API no longer trusts client-provided `createdBy`; owner is derived from token identity.
- Properties test UI now requests access token and supports media upload/update/delete.

## [0.6.0] - 2026-08-24

### Added

- Server-side cookie session auth endpoints:
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/auth/session`
- Route auth guard now supports bearer token and httpOnly cookie session.
- Additional business validations for properties and media:
  - Allowed property and operation types
  - Numeric range checks
  - Publish readiness rules
  - MIME and size validation for media uploads
- Authenticated e2e tests for:
  - Property CRUD via cookie session
  - Media CRUD via cookie session
- Validator unit tests for business rules.

### Changed

- Properties UI now supports cookie login/logout session flow and optional bearer token override.

## [0.7.0] - 2026-08-24

### Added

- Session refresh endpoint `POST /api/auth/refresh` with refresh token cookie rotation.
- Automatic 401 retry with session renewal in the properties workbench (`apiFetch` helper).
- Real properties/media interface at `/properties` replacing the technical panel:
  - Full property form (type, operation, status, address, rooms, area, price, currency)
  - Client-side business validation with visible error list
  - Edit and publish actions per property
  - Media upload form with kind/state/file and MIME check
  - Media list with mark-as-processed and delete actions
- E2E UI test covering login, session refresh, validation errors, property create/edit/publish/delete and media upload/update/delete.

### Changed

- Removed old technical CRUD panel (`properties-crud.tsx`) in favor of `properties-workbench.tsx`.
- Refreshed workbench styles in `globals.css`.

## [0.8.0] - 2026-08-24

### Added

- Media gallery with signed Storage URLs:
  - `listPropertyMedia` now returns `signed_url` per file (5 minute expiry).
  - Image thumbnails and signed video links in the workbench.
- Property list filters and pagination:
  - `GET /api/properties` supports `page`, `pageSize`, `status`, `propertyType`, `operationType`, `search`.
  - Response envelope `{ items, total, page, pageSize, totalPages }`.
  - Filter bar and pagination controls in the workbench.
- Real-data dashboard:
  - `GET /api/dashboard/summary` with per-user counts (properties by status, media by kind, leads) and recent published list.
  - `/dashboard` page with stat cards and recent published section.
- E2E test for dashboard real data rendering.

### Changed

- `published_at` is now set automatically when a property transitions to `published`.
- Workbench fetches use `cache: "no-store"` to avoid stale media lists.

## [0.9.0] - 2026-08-24

### Added

- Decoupled AI content generation module (`src/lib/ai/`):
  - `AIService` interface with provider factory (`mock` default, `openai` via env).
  - Temporary deterministic mock provider labeled for replacement.
  - OpenAI Chat Completions provider with JSON response format.
  - Shared prompt builder for property-to-copy prompts.
- Channel-adapted copies (facebook, instagram, whatsapp) with hashtags and CTA.
- Content persistence in `ai_generations` table:
  - `POST /api/properties/:id/generate-content`
  - `GET /api/properties/:id/generations`
- "Contenido IA" panel in the workbench with channel select, generation history and result rendering.
- Deployment preparation:
  - Deployment guide for GitHub + Vercel with required env matrix.
  - `COOKIE_SECURE` env override for session cookies (auto-secure in production).
- E2E suite now runs against production build (`next build && next start`) with retry and test-data cleanup helpers.
- Tests: mock provider unit tests, prompt builder test, content routes integration tests, AI content e2e (API + UI).

## [0.10.0] - 2026-08-24

### Added

- Leads follow-up module (Fase 9):
  - Lead types in `src/lib/types/lead.ts` (status lifecycle: new, contacted, qualified, won, lost).
  - Lead validators with business rules (required contact channel, email format, lengths, valid dates/status) in `src/lib/validators/lead.ts`.
  - Lead CRUD service with filters, search and pagination in `src/lib/services/lead-service.ts`.
  - Lead API routes:
    - `GET/POST /api/leads`
    - `GET/PATCH/DELETE /api/leads/:id`
  - Follow-up UI at `/leads` (`leads-workbench.tsx`): lead form, status quick-change, search/status filters, next follow-up dates.
  - Versioned migration `20260824100000_phase9_leads.sql` with DB-level check constraints, follow-up indexes and per-owner RLS policy (applied to remote).
- Lead badge styles for each lead status in `globals.css`.

### Verified

- Unit tests: 24/24 passing (including 4 lead validator tests).
- Typecheck (`tsc --noEmit`) and ESLint clean.
- E2E suite: 6/6 passing against production build.

## [0.11.0] - 2026-08-24

### Added

- Publications + social scheduler module (Fase 10):
  - Types in `src/lib/types/publication.ts` (status lifecycle: draft, scheduled, published, failed, cancelled; platforms facebook/instagram/whatsapp; scheduler job records and run summary).
  - Validators with business rules (required property/platform, platform/mode whitelists, hashtag normalization and limits, copy/cta lengths, schedule date sanity) in `src/lib/validators/publication.ts`.
  - Publication service with status-transition guards (schedule from draft/failed, publish from draft/scheduled/failed, cancel from non-terminal states) in `src/lib/services/publication-service.ts`.
  - Scheduler service in `src/lib/services/scheduler-service.ts`:
    - `publish_publication` job enqueue/cancel tied to each publication.
    - `runDueSchedulerJobs` batch processor with attempt tracking, exponential-ish backoff (5 min per attempt), `scheduler_runs` audit rows and failure escalation to `failed` publication.
  - API routes:
    - `GET/POST /api/publications`
    - `GET/PATCH/DELETE /api/publications/:id`
    - `POST /api/publications/:id/schedule`, `/publish`, `/cancel`
    - `GET /api/scheduler/jobs`
    - `POST /api/scheduler/run` (session auth or `x-cron-secret` header for Vercel Cron via service-role client).
  - Publications UI at `/publications` (`publications-workbench.tsx`): property + channel + copy form with "Traer copia IA" prefill, create draft or create+schedule, per-row schedule/publish-now/cancel/delete actions, status/platform filters, pending jobs panel and manual scheduler trigger.
  - Versioned migration `20260824110000_phase10_publications_scheduler.sql` with status/platform/mode check constraints, scheduled-date consistency check, scheduler job constraints and due-job indexes (applied to remote).
- Badge styles for scheduled/failed/cancelled publications in `globals.css`.

### Verified

- Unit tests: 36/36 passing (5 publication validator tests, publications and scheduler route integration tests).
- Typecheck (`tsc --noEmit`) and ESLint clean.
- E2E suite: 7/7 passing against production build, including full publications flow (create draft, schedule, scheduler run to published, cancel, delete).
