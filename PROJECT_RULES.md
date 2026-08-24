# PROJECT_RULES

## Reglas base

1. Proyecto unico full-stack (sin repos paralelos).
2. Cambio minimo necesario antes que reescrituras.
3. Reutilizar primero, crear despues.
4. Nunca exponer secretos en cliente o repositorio.
5. GitHub sera la fuente oficial del codigo.

## Flujo obligatorio de trabajo

1. Analizar y revisar contexto existente.
2. Identificar archivos y dependencias afectadas.
3. Implementar el cambio minimo.
4. Ejecutar pruebas y build.
5. Verificar diff y registrar cambios.

## Reglas de base de datos

- Todo cambio estructural debe generar migracion versionada.
- No depender de cambios manuales no reproducibles.
- Definir RLS y permisos desde el inicio.

## Reglas de calidad

- No declarar una funcionalidad "terminada" sin integracion real.
- Mocks deben estar etiquetados como temporales.
- Dashboard y reportes solo con datos reales.

## Reglas de seguridad

- Validacion de entradas en backend.
- Proteccion de endpoints y sesiones.
- Claves privadas solo en entorno seguro.

## Reglas de versionado

- No actualizar dependencias sin justificacion tecnica.
- Mantener `STACK_VERSIONS.md` y lockfile alineados.

## Regla de continuidad

Toda decision tecnica relevante debe quedar documentada para continuidad entre sesiones y entre agentes.
