# Diagnóstico CFDIGITAL - Estado del Proyecto

**Fecha:** 28 de agosto de 2026  
**Proyecto:** Inmobiliaria_v4 (CFDIGITAL)  
**Repositorio:** https://github.com/proyectoinmobiliaria2026-rgb/inmobiliario_4.git

---

## 1. Estado de Git

| Aspecto | Estado |
|---------|--------|
| Rama actual | `main` |
| Sincronización | Actualizada con `origin/main` |
| Último commit | `73cc656` - feat(entrega1): portada CF Digital, dashboard de métricas reales |

### Archivos Modificados (sin commit)
- `src/app/api/publications/route.ts`
- `src/lib/services/publication-service.ts`
- `src/lib/types/publication.ts`
- `src/lib/validators/publication.ts`

### Archivos Nuevos (sin trackear)
- `src/app/api/publications/[id]/confirm-api/route.ts`
- `src/app/api/publications/[id]/manual-action/route.ts`
- `src/app/api/publications/[id]/manual-actions/route.ts`
- `supabase/migrations/20260827000000_phase13_multichannel_publications.sql`

---

## 2. Stack Tecnológico

| Componente | Versión |
|------------|---------|
| Next.js | 15.5.23 |
| React | 19.1.1 |
| TypeScript | 5.9.2 |
| Supabase JS | 2.57.4 |
| Tailwind CSS | 4.3.3 |
| Vitest | 3.2.4 |
| Playwright | 1.55.0 |

---

## 3. Migraciones de Base de Datos

### Migraciones Aplicadas
1. `20260824074500_phase2_initial_schema.sql` - Schema inicial
2. `20260824100000_phase9_leads.sql` - Sistema de leads
3. `20260824110000_phase10_publications_scheduler.sql` - Publicaciones y scheduler
4. `20260824120000_phase11_property_details.sql` - Detalles de propiedades
5. `20260824130000_phase12_entrega1.sql` - Entrega 1
6. `20260827000000_phase13_multichannel_publications.sql` - **Nueva, pendiente de aplicar**

### Novedades de Phase 13 (Multicanal)
- Nuevos modos de publicación: `assisted_manual`, `direct_api`, `local_test`
- Nuevos estados para flujo manual: `prepared`, `manual_queue`, `ready_to_publish`, `published_manually`, `skipped`
- Campos de trazabilidad: `confirmed_by`, `confirmed_at_manual`, `group_batch`, `batch_time_slot`
- Nueva tabla: `publication_manual_actions` (auditoría de acciones)
- Soporte para TikTok como plataforma

---

## 4. Variables de Entorno

### Requeridas (.env.example)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AI_PROVIDER=mock
AI_API_KEY=
AI_MODEL=gpt-4o-mini
COOKIE_SECURE=
SEED_AGENT_EMAIL=
SEED_AGENT_PASSWORD=
```

### Estado de Conexión
- Proyecto Supabase vinculado: `Inmobiliaria_v4` (ref: `zkcspkxhhmpwbtxauldw`)
- Docker no está corriendo (requerido para Supabase local)
- CLI de Supabase requiere login para operaciones remotas

---

## 5. Estado de Supabase

| Aspecto | Estado |
|---------|--------|
| Proyecto remoto | Vinculado (Inmobiliaria_v4) |
| Supabase local | No ejecutándose (Docker no disponible) |
| Migraciones pendientes | 1 (Phase 13) |
| RLS | Habilitado en tablas |

---

## 6. Funcionalidades por Entrega

### Entrega 1 (Completada)
- Portada CF Digital con branding institucional
- Dashboard de métricas reales
- Estados comerciales de propiedades
- Folio y expediente de 7 pasos
- Requisito de contratación: 2 depósitos + aval con inmueble
- Rebrand del CRM (azul marino, rojo, blanco)
- Registro de cuenta con correo y contraseña propios
- Cambio de correo electrónico desde la cuenta
- Cuenta de usuario, cambio de contraseña y perfil de contacto
- Formulario de propiedad con AI (títulos, descripciones, amenidades)
- Generación de ficha PDF

### Fase 13 (En progreso - Multicanal)
- Publicación asistida manual (Facebook Grupos)
- Publicación directa por API (Instagram, TikTok)
- Sistema de batches y time slots
- Auditoría de acciones manuales
- Confirmación de publicaciones API

---

## 7. Estructura del Proyecto

```
src/
├── app/
│   ├── api/
│   │   ├── auth/              # Login, logout, session, registro
│   │   ├── dashboard/         # Resumen de métricas
│   │   ├── leads/             # CRUD de leads
│   │   ├── properties/        # CRUD de propiedades + AI
│   │   ├── publications/      # CRUD de publicaciones + endpoints nuevos
│   │   └── scheduler/         # Jobs programados
│   ├── account/               # Página de cuenta de usuario
│   ├── dashboard/             # Dashboard principal
│   ├── leads/                 # Gestión de leads
│   ├── properties/            # Gestión de propiedades
│   ├── publications/          # Gestión de publicaciones
│   └── register/              # Registro de usuarios
├── components/
│   ├── dashboard/             # Componentes del dashboard
│   ├── layout/                # Navbar y layout
│   ├── leads/                 # Workbench de leads
│   └── properties/            # Workbench de propiedades
└── lib/
    ├── ai/                    # Servicio AI (OpenAI + mock)
    ├── auth/                  # Autenticación y sesiones
    ├── services/              # Lógica de negocio
    ├── types/                 # Tipos TypeScript
    └── validators/            # Validadores de entrada
```

---

## 8. Pendientes Identificados

### Críticos
1. **Migración Phase 13 pendiente**: Debe aplicarse a Supabase remoto
2. **Commit de cambios**: 4 archivos modificados + 4 nuevos sin commit
3. **Variables de entorno**: Verificar que .env.local tenga las credenciales correctas

### Recomendaciones
1. Ejecutar `npx supabase db push` para aplicar migración multicanal
2. Hacer commit de los cambios de Fase 13
3. Configurar Docker Desktop para desarrollo local con Supabase
4. Ejecutar `supabase login` para operaciones remotas desde CLI
5. Ejecutar tests para validar cambios antes de push

---

## 9. Comandos Útiles

```bash
# Aplicar migraciones pendientes
npx supabase db push

# Ejecutar tests
npm test

# Build de producción
npm run build

# Desarrollo local
npm run dev

# Seed de datos mínimos
npm run seed:min
```

---

## 10. Próximos Pasos Sugeridos

1. Revisar y validar los cambios pendientes de Fase 13
2. Aplicar migración `20260827000000_phase13_multichannel_publications.sql` a producción
3. Commit de todos los cambios con mensaje descriptivo
4. Push a `origin/main`
5. Verificar deploy en Vercel (auto-deploy configurado)
6. Probar endpoints nuevos de publicaciones multicanal

---

**Generado por:** Claude Code  
**Fecha de generación:** 28/08/2026 18:28 UTC
