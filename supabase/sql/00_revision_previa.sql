-- Solo lectura. Ejecutar en SQL Editor del proyecto correcto antes de la migración.
SELECT current_database() AS base_actual, current_user AS ejecutado_por,
  CASE
    WHEN to_regclass('public.informes') IS NOT NULL THEN 'V2 detectada: ejecutar 02_verificar_v2.sql; no repetir la migracion'
    WHEN to_regclass('public.perfiles') IS NOT NULL AND to_regclass('public.evaluaciones') IS NOT NULL AND to_regclass('public.evidencias') IS NOT NULL THEN 'Base V1 detectada: comparar esquema, respaldar y preparar migracion'
    ELSE 'Base incompleta o vacia: revisar instalacion antes de continuar'
  END AS siguiente_paso;

SELECT c.relname AS tabla,c.relrowsecurity AS rls_activa
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('perfiles','evaluaciones','evidencias','informes','auditoria','acciones_control','asset_jobs')
ORDER BY c.relname;

SELECT tablename AS tabla,policyname AS politica,cmd AS operacion,roles
FROM pg_policies WHERE schemaname='public' AND tablename IN ('perfiles','evaluaciones','evidencias')
ORDER BY tablename,policyname;
