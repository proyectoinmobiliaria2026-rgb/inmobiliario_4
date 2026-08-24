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
- Fase 11+: modulos funcionales por prioridad de negocio.
