-- OPCIONAL, SOLO ADMINISTRACION. Requiere V2 y siga-api desplegada.
-- Preparar una copia privada de este archivo con el secreto de mantenimiento.
-- No subir esa copia a Git ni introducir una clave de servicio en este script.
BEGIN;
DO $$
BEGIN
  IF to_regprocedure('public.siga_write(uuid,uuid,bigint,jsonb,boolean)') IS NULL THEN
    RAISE EXCEPTION 'Aplicar y verificar V2 antes de programar mantenimiento';
  END IF;
END $$;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
DECLARE
  maintenance_token text := 'MAINTENANCE_SECRET_REEMPLAZAR';
  project_url text := 'https://REFERENCIA_DE_TU_PROYECTO.supabase.co';
  token_id uuid;
  url_id uuid;
BEGIN
  IF maintenance_token='MAINTENANCE_SECRET_REEMPLAZAR' OR length(maintenance_token)<32 THEN
    RAISE EXCEPTION 'Configurar el mismo MAINTENANCE_SECRET de siga-api en una copia privada';
  END IF;
  IF project_url !~ '^https://[a-z0-9-]+\.supabase\.co$' THEN
    RAISE EXCEPTION 'Configurar la URL HTTPS del proyecto Supabase correcto';
  END IF;
  SELECT id INTO token_id FROM vault.secrets WHERE name='siga_maintenance_secret';
  IF token_id IS NULL THEN
    PERFORM vault.create_secret(maintenance_token,'siga_maintenance_secret','Solo permite mantenimiento de siga-api');
  ELSE
    PERFORM vault.update_secret(token_id,maintenance_token);
  END IF;
  SELECT id INTO url_id FROM vault.secrets WHERE name='siga_maintenance_url';
  IF url_id IS NULL THEN
    PERFORM vault.create_secret(project_url,'siga_maintenance_url','Proyecto de siga-api');
  ELSE
    PERFORM vault.update_secret(url_id,project_url);
  END IF;
END $$;

-- Supabase administra los objetos de pg_net como supabase_admin: un REVOKE
-- ejecutado como postgres no elimina sus permisos PUBLIC. No afirmamos que lo haga.
-- La cola conserva temporalmente la cabecera: usar SOLO el secreto limitado de
-- mantenimiento y mantener net fuera de los esquemas expuestos por la Data API.
-- Los roles del navegador deben seguir siendo NOLOGIN; verificar tambien por HTTP.
-- https://supabase.com/kb/troubleshooting/revoking-access-to-pg_net-objects-has-no-effect-0bbc16
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN ('anon','authenticated') AND rolcanlogin) THEN
    RAISE EXCEPTION 'Los roles del navegador no deben permitir conexiones SQL directas';
  END IF;
END $$;
REVOKE ALL ON SCHEMA cron FROM PUBLIC,anon,authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA cron FROM PUBLIC,anon,authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cron FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.siga_run_maintenance()
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE maintenance_token text; project_url text;
BEGIN
  SELECT decrypted_secret INTO STRICT maintenance_token FROM vault.decrypted_secrets WHERE name='siga_maintenance_secret';
  SELECT decrypted_secret INTO STRICT project_url FROM vault.decrypted_secrets WHERE name='siga_maintenance_url';
  IF length(maintenance_token)<32 OR project_url !~ '^https://[a-z0-9-]+\.supabase\.co$' THEN
    RAISE EXCEPTION 'Configuracion de mantenimiento invalida';
  END IF;
  RETURN net.http_post(
    url:=project_url||'/functions/v1/siga-api',
    headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||maintenance_token),
    body:='{"action":"maintenance"}'::jsonb,
    timeout_milliseconds:=90000
  );
END $$;
REVOKE ALL ON FUNCTION public.siga_run_maintenance() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.siga_run_maintenance() TO service_role;

SELECT cron.schedule('siga-maintenance-v2','*/5 * * * *','SELECT public.siga_run_maintenance();');
COMMIT;

-- Verificar luego el job y una respuesta HTTP real; agendar no prueba la entrega.
-- Con la clave publica, Accept-Profile: net debe devolver PGRST106 (no expuesto).
-- La llamada anonima a RPC siga_run_maintenance debe ser rechazada.
