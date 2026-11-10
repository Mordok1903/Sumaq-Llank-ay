-- Solo lectura. Si una comprobacion falla, mantener mantenimiento y revisar el despliegue.
DO $$
DECLARE item record; tabla text;
BEGIN
  FOREACH tabla IN ARRAY ARRAY['perfiles','evaluaciones','evidencias','informes','auditoria','acciones_control','asset_jobs'] LOOP
    IF to_regclass('public.'||tabla) IS NULL THEN RAISE EXCEPTION 'Falta la tabla public.%',tabla; END IF;
    IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('public.'||tabla) AND relrowsecurity) THEN RAISE EXCEPTION 'RLS desactivada en %',tabla; END IF;
    IF has_table_privilege('anon','public.'||tabla,'SELECT,INSERT,UPDATE,DELETE') THEN RAISE EXCEPTION 'Permisos anonimos no previstos en %',tabla; END IF;
    IF has_table_privilege('authenticated','public.'||tabla,'INSERT,UPDATE,DELETE') THEN RAISE EXCEPTION 'Escritura directa del navegador habilitada en %',tabla; END IF;
  END LOOP;
  IF to_regprocedure('public.siga_write(uuid,uuid,bigint,jsonb,boolean)') IS NULL THEN RAISE EXCEPTION 'Falta la operacion de guardado v2'; END IF;
  FOR item IN SELECT p.oid,p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname LIKE 'siga\_%' ESCAPE '\' LOOP
    IF has_function_privilege('anon',item.oid,'EXECUTE') OR has_function_privilege('authenticated',item.oid,'EXECUTE') THEN RAISE EXCEPTION 'Funcion privilegiada accesible al navegador: %',item.proname; END IF;
    IF NOT has_function_privilege('service_role',item.oid,'EXECUTE') THEN RAISE EXCEPTION 'Falta permiso de servidor: %',item.proname; END IF;
  END LOOP;
END $$;
SELECT 'OK: tablas, RLS y permisos de operaciones v2 verificados' AS resultado;
SELECT delivery_type,estado,count(*) AS archivos FROM public.evidencias GROUP BY delivery_type,estado ORDER BY delivery_type,estado;
-- Esta comprobacion no verifica Auth alojado, Cloudinary ni la ejecucion de la Edge Function.
