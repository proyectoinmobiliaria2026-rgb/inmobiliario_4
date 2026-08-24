# STACK_VERSIONS

Estado: aprobado e inicializado en Fase 1.

## Decision de stack (propuesta inicial)

- Runtime web full-stack: Next.js
- Lenguaje: TypeScript
- Base de datos y auth: Supabase
- Deployment: Vercel
- Testing: Vitest + Playwright
- Lint/format: ESLint + Prettier

## Versiones fijadas

- Node.js: 24.19.0 (entorno actual de desarrollo)
- npm: 12.0.2
- Next.js: 15.5.3
- React: 19.1.1
- React DOM: 19.1.1
- TypeScript: 5.9.2
- ESLint: 9.34.0
- eslint-config-next: 15.5.3
- Vitest: 3.2.4
- Playwright: 1.55.0
- Supabase JS: 2.57.4

## Politica

- No cambiar versiones sin analisis de compatibilidad e impacto.
- Mantener `package-lock.json` como referencia de resolucion.
