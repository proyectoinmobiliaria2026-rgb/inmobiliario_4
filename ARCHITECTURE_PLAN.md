# ARCHITECTURE_PLAN

## Objetivo

Construir CFDIGITAL como una sola aplicacion full-stack en un solo repositorio, con frontend y backend desacoplados por capas internas (no por proyectos separados).

## Arquitectura base implementada (Fase 1)

1. UI (web)
2. API / Server Actions
3. Capa de servicios de dominio
4. Integraciones (Supabase, IA, redes, media)
5. Persistencia (PostgreSQL + Storage + Auth)

## Modulos de dominio previstos

- Auth
- Properties
- Content Generation
- Images
- Video
- Publications
- Scheduler
- Leads
- Dashboard
- Audit Events

## Integraciones objetivo

- GitHub como source of truth
- Vercel para build y deployment
- Supabase para DB/Auth/Storage/RLS
- Proveedor IA desacoplado por `AIService`

## Restricciones de arquitectura

- Un solo proyecto y una sola linea de versiones.
- No duplicar implementaciones ni crear variantes tipo `*-v2`.
- Cambios estructurales importantes requieren analisis de impacto y rollback.
- Migraciones de DB siempre versionadas en `supabase/migrations`.

## Estado actual

- Existe aplicacion base Next.js con App Router.
- Toolchain inicial activo: TypeScript, ESLint, Vitest y Playwright.
- Lockfile generado (`package-lock.json`).
- Supabase y Vercel configurados a nivel base.

## Plan de avance por fases

- Fase 1: completada.
- Fase 2: completada (migracion base aplicada en remoto).
- Fase 3: completada (modulo IA desacoplado via AIService y deployment preparado para GitHub/Vercel).
- Fase 4-8: completadas (auth por sesion, media con Storage, dashboard real, contenido IA).
- Fase 9: completada (seguimiento de leads: tipos, validadores, servicio CRUD, API y UI en `/leads`, migracion con constraints y RLS por dueno aplicada en remoto).
- Fase 10: completada (publicaciones y scheduler: tipos, validadores, servicios con transiciones de estado, API CRUD + acciones y endpoint de scheduler con soporte cron, UI en `/publications`, migracion con constraints aplicada en remoto).
- Fase 11: completada (detalles comerciales de propiedad: amenidades y requisitos de contratacion).
- Fase 12: completada (Entrega 1: portada CF Digital, dashboard de metricas reales, estados comerciales, folio y expediente de 7 pasos).
- Fase 13: completada (publicaciones multicanal: modos `assisted_manual`/`direct_api`/`local_test`, estados `api_submitted`/`manual_queue`/`ready_to_publish`/`published_manually`, confirmaciones manuales y por API, tabla de auditoria `publication_manual_actions`, endpoints `confirm-api`/`manual-action`/`manual-actions`, migracion aplicada en remoto).
- Fase 14: planificada (UI/workbench diario del flujo multicanal, ver seccion "Fase 14" abajo).
- Fase 15+: modulos funcionales por prioridad de negocio (integración real de APIs de redes, staging de fotos, reel, reportes/auditoria).

---

## Fase 14: Workbench diario de publicaciones multicanal

**Objetivo:** convertir la seccion `/publications` en la herramienta de uso diario del agente ("mano derecha"). El usuario debe poder operar todas sus publicaciones en menos de 2 minutos, sin ambiguedad sobre que accion tomar en cada registro.

### Contexto actual (lo que ya existe)

- Backend multicanal completo (Fase 13): modos `assisted_manual` (Facebook Grupos), `direct_api` (Instagram/TikTok), `local_test`; estados validos por modo; transiciones de estado en `publication-service.ts`; endpoints `POST /api/publications/:id/manual-action`, `POST|PATCH /api/publications/:id/confirm-api`, `GET /api/publications/:id/manual-actions`, y `GET /api/publications/summary-by-mode` (via `get_publications_summary_by_mode`).
- UI actual (`publications-workbench.tsx`) **desactualizada**: no selecciona `mode` al crear, no muestra el flujo asistido ni los estados nuevos, no usa los endpoints nuevos.

### Inconsistencias detectadas a corregir en esta fase

1. El formulario de creacion no envia `mode`; el backend asigna `assisted_manual` por defecto (`mode ?? "assisted_manual"`), pero el constraint SQL `publications_batch_fields_check` exige `group_batch` y `batch_time_slot` para `assisted_manual`. Resultado: publicaciones creadas desde la UI no cumplen el constraint.
2. La UI solo lista estados `draft/scheduled/published/failed/cancelled`; no muestra `api_submitted`, `manual_queue`, `ready_to_publish`, `published_manually`, `skipped`.
3. El boton "Publicar ahora" llama a `publish` que para `direct_api` pasa a `api_submitted` (correcto) pero la UI no ofrece la confirmacion externa posterior.

### Diseno del workbench (panel central unico de 3 columnas)

- **Columna 1 "Enfocarse hoy":** agenda de accion inmediata. Reune publicaciones que requieren la atencion del usuario hoy:
  - `manual_queue` / `ready_to_publish` (Facebook asistido) pendientes de mover/confirmar.
  - `scheduled` con `scheduled_for` de hoy (direct_api).
  - `api_submitted` pendientes de confirmacion (direct_api).
- **Columna 2 "Cola completa":** todas las publicaciones, filtrable por canal / modo / estado. Cada fila muestra estado y SOLO el siguiente boton que aplica (diseno dirigido por el estado).
- **Columna 3 "Resumen y nueva publicacion":** formulario de creacion con seleccion explicita de modo + campos obligatorios por modo, resumen por modo/estado (`summary-by-mode`) y panel scheduler.

### Acciones contextuales por modo (solo se muestra la que aplica)

- **assisted_manual (Facebook):**
  - `prepared` → "Mover a cola" (`moved_to_queue`)
  - `manual_queue` → "Listo para publicar" (`marked_ready`)
  - `ready_to_publish` → "Confirmar publicacion manual" (`published_manually`, pide confirmacion)
  - desde estados no terminales → "Omitir" (`skipped`) / "Falló" (`failed`) / "Eliminar"
  - historial de acciones manuales visible (`manual-actions`).
- **direct_api (Instagram/TikTok):**
  - `draft`/`failed` → "Programar" (fecha+hora) o "Publicar ahora"
  - `scheduled` → "Publicar ahora" / "Cancelar"
  - `api_submitted` → "Confirmar (ID externo)" (`POST confirm-api`) / "Marcar falló" (`PATCH confirm-api`)
- **local_test:** "Publicar ahora" / "Cancelar" / "Eliminar".

### Entregables

1. Reformular `PublicationsWorkbench` a layout de 3 columnas con agenda del dia, cola filtrable y panel de resumen.
2. Seleccion explicita de modo en el formulario de creacion y validacion de campos obligatorios segun modo (corrige la inconsistencia #1).
3. Acciones contextuales por estado usando los endpoints nuevos.
4. Vista de confirmacion para `published_manually` (datos de la publicacion) y para `confirm-api` (external id + url).
5. Filtros por canal/modo/estado y badges legibles de estado en espanol.
6. Actualizar tests de UI y mantener suite verde (`npm test`, `npm run lint`, `npm run build`).
7. Actualizar README y CHANGELOG al cerrar la fase.

### Criterios de aceptacion

- Un usuario puede ejecutar el flujo completo assisted_manual (crear → cola → listo → publicado) desde la UI usando solo los botones contextuales.
- Un usuario puede crear una publicacion direct_api, programarla, publicarla, y confirmarla por API desde la UI.
- Ninguna publicacion creada desde la UI viola los constraints de la tabla `publications`.
- Cada fila muestra una unica accion habilitada segun su estado (cero ambiguedad).
- Suite de pruebas en verde y build OK.
