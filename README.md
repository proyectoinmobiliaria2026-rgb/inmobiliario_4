# CFDIGITAL

Estado actual: Fase 10 completada (leads, publicaciones y scheduler) con UI SaaS rediseñada (Tailwind CSS v4) y despliegue en Vercel.

Este repositorio sigue el "Prompt Operativo Maestro" de CFDIGITAL con arquitectura unificada full-stack en un solo proyecto.

## Estado actual

- Aplicacion base: Next.js + TypeScript creada.
- Repositorio Git: inicializado localmente.
- Testing base: Vitest (unit) y Playwright (e2e) configurados.
- Supabase: estructura inicial creada (`supabase/config.toml` y `supabase/migrations`).
- Vercel: archivo `vercel.json` creado.
- Migracion inicial Fase 2 creada con tablas, RLS, Auth trigger y buckets de Storage.
- Health check real de Supabase validado con `ok: true`.
- Seed minimo implementado y CRUD base de propiedades disponible.
- Endpoints de propiedades protegidos por token (`Authorization: Bearer <access_token>`) usando `auth.uid()`.
- Sesion por cookie server-side implementada (`/api/auth/login`, `/api/auth/logout`, `/api/auth/session`).
- Renovacion de sesion por refresh token (`POST /api/auth/refresh`) con rotacion de cookies y reintento automatico en la UI.
- CRUD de media con subida a Supabase Storage disponible.
- Interfaz real de propiedades y media en `/properties` (formularios completos, validacion UX, edicion, publicacion y multimedia).
- Tests de integracion para rutas de propiedades y media disponibles.
- Tests e2e autenticados para propiedades y media disponibles.
- Tests e2e de UI para el flujo completo del workbench disponibles.
- Galeria de media con URLs firmadas de Supabase Storage (expiracion 5 minutos).
- Filtros (busqueda, estado, tipo, operacion) y paginado en el listado de propiedades.
- Dashboard con datos reales en `/dashboard` y API `GET /api/dashboard/summary`.
- Modulo de Generacion de Contenido con IA desacoplado via `AIService` (providers mock temporal y OpenAI) con copies por canal FB/IG/WA, hashtags y CTA.

## Documentos de control

- `ARCHITECTURE_PLAN.md`
- `PROJECT_RULES.md`
- `STACK_VERSIONS.md`
- `DEPLOYMENT.md`
- `CHANGELOG.md`

## Comandos clave

- `npm run dev`
- `npm run test`
- `npm run test:e2e`
- `npm run build`
- `npm run db:push`
- `npm run db:reset`
- `npm run seed:min`

## Health check

- Endpoint: `GET /api/health/supabase`
- Respuesta `ok: true` cuando variables y acceso basico a DB estan correctos.

## CRUD inicial de propiedades

- API: `GET/POST /api/properties` (GET soporta `page`, `pageSize`, `status`, `propertyType`, `operationType`, `search` y devuelve `{ items, total, page, pageSize, totalPages }`)
- API: `GET/PATCH/DELETE /api/properties/:id`
- UI: `/properties` (workbench con formulario completo, filtros, paginado, edicion, publicacion y listado)
- Semilla minima: `scripts/seed-minimal.mjs` (genera `supabase/seed-output.json` con `seedUserId`)
- Validaciones de negocio: tipos permitidos, rangos numericos, longitud de titulo y reglas para publicar.

## CRUD de media

- API: `GET/POST /api/properties/:id/media` (GET incluye `signed_url` por archivo)
- API: `PATCH/DELETE /api/properties/:id/media/:mediaId`
- Storage bucket: `property-media`
- Upload por `multipart/form-data` con campos `kind`, `state`, `file`
- Galeria visual en `/properties` (miniaturas de imagenes; enlaces firmados para video)

## Generacion de contenido con IA

- API: `POST /api/properties/:id/generate-content` (body `{ channel }`)
- API: `GET /api/properties/:id/generations`
- Canales: `facebook`, `instagram`, `whatsapp` (copy + hashtags + CTA adaptados)
- Desacoplado via interfaz `AIService` (`src/lib/ai/`): provider `mock` (temporal, default) u `openai` (`AI_PROVIDER=openai` + `AI_API_KEY`)
- Persistencia en tabla `ai_generations`
- UI: panel "Contenido IA" en `/properties` por propiedad seleccionada

## Dashboard

- Pagina: `/dashboard`
- API: `GET /api/dashboard/summary`
- Metricas reales por usuario: propiedades por estado, media por tipo, leads y publicadas recientes.
- `published_at` se establece automaticamente al pasar a `published`.

## Autenticacion API

- Se requiere token de Supabase Auth en `Authorization: Bearer <access_token>`.
- El backend ignora `createdBy` del cliente y usa `auth.uid()` del token.
- Alternativa: sesion por cookie httpOnly iniciando en `POST /api/auth/login`.
- Renovacion: `POST /api/auth/refresh` rota cookies usando el refresh token; la UI reintenta automaticamente tras un 401.

## Siguiente fase

Fase 11+: modulos funcionales por prioridad de negocio (integraciones reales de publicacion en redes, auditoria, reportes). Ver `ARCHITECTURE_PLAN.md` y `DEPLOYMENT.md`.
