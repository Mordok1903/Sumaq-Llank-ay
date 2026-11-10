-- OBSOLETO: no ejecutar el esquema v1 manualmente.
-- Su copia histórica solo existe como migración base para bases vacías.
-- En una base v1 existente, registrar la base como aplicada y ejecutar
-- 202611100002_security_and_traceability.sql durante una ventana de cambio.
-- Ver docs/DESPLIEGUE.md antes de utilizar Supabase CLI.
DO $$ BEGIN RAISE EXCEPTION 'Use las migraciones versionadas y docs/DESPLIEGUE.md; el esquema manual v1 fue retirado'; END $$;
