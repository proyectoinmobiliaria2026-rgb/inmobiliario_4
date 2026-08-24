# DEPLOYMENT

Estado: listo para conectar GitHub + Vercel (Fase 3).

## Flujo objetivo

1. Desarrollo local.
2. Pruebas y build exitosos.
3. Commit en Git.
4. Push a GitHub.
5. Deployment automatico en Vercel.
6. Servicios de datos en Supabase (ya enlazado y con migraciones aplicadas).

## Estado de configuracion

- Git local inicializado con commit inicial del proyecto.
- `vercel.json` configurado para framework Next.js.
- `.env.example` actualizado sin secretos.
- Endpoint de verificacion Supabase disponible en `/api/health/supabase`.
- Proyecto local enlazado a Supabase remoto y migraciones aplicadas.
- Supabase project ref: `zkcspkxhhmpwbtxauldw`.
- Cuenta Vercel: `proyectoinmobiliaria2026@gmail.com` (username CLI: `inmobiliariaapp026-5947`, scope/team: `cfdigital`).
- Integracion GitHub -> Vercel conectada: cada push a `main` despliega a produccion automaticamente.

## Variables de entorno requeridas en Vercel

| Variable | Uso | Exposicion |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | publica (cliente) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clave anon de Supabase | publica (cliente) |
| `SUPABASE_SERVICE_ROLE_KEY` | operaciones privilegiadas (seed local) | privada (solo servidor) |
| `AI_PROVIDER` | `mock` (default) o `openai` | privada |
| `AI_API_KEY` | requerida si `AI_PROVIDER=openai` | privada |
| `AI_MODEL` | modelo a usar (default `gpt-4o-mini`) | privada |
| `COOKIE_SECURE` | opcional; `true` fuerza cookies Secure (recomendado en HTTPS) | privada |

Notas:

- Las cookies de sesion usan flag `Secure` automaticamente cuando `NODE_ENV=production` (Vercel).
- `SEED_AGENT_EMAIL` / `SEED_AGENT_PASSWORD` son solo para el seed local (`npm run seed:min`); no configurar en Vercel.

## Pasos para conectar GitHub

1. Crear repositorio vacio en GitHub (privado recomendado), por ejemplo `cfdigital-app`.
2. Agregar remote y push:
   ```bash
   git remote add origin https://github.com/<usuario>/cfdigital-app.git
   git push -u origin main
   ```

## Pasos para conectar Vercel

1. Entrar a https://vercel.com/new e importar el repositorio.
2. Framework preset: Next.js (detectado via `vercel.json`).
3. Configurar las variables de entorno de la tabla anterior (Production y Preview).
4. Deploy. Cada push a `main` genera deployment de produccion; cada PR genera preview.
5. Verificar `https://<dominio>/api/health/supabase` debe responder `{"ok":true}`.

## Reglas de deployment

- No editar produccion como solucion permanente.
- Cada deployment debe corresponder a un commit identificable.
- Configuraciones sensibles solo por variables de entorno.
- No subir `.env` al repositorio (esta en `.gitignore`).

## Checklist previo a produccion

- Tests en verde (`npm run test`).
- Lint en verde (`npm run lint`).
- Build en verde (`npm run build`).
- E2E en verde (`npm run test:e2e`).
- Variables de entorno validadas en Vercel.
- Migraciones aplicadas y trazables (`npm run db:push`).
