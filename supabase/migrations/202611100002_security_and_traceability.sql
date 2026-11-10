BEGIN;

DO $$ BEGIN
  IF to_regclass('public.perfiles') IS NULL OR to_regclass('public.evaluaciones') IS NULL OR to_regclass('public.evidencias') IS NULL THEN
    RAISE EXCEPTION 'Falta la base del aplicativo. Revisar 00_revision_previa.sql y las instrucciones antes de aplicar V2';
  END IF;
  IF to_regclass('public.informes') IS NOT NULL OR to_regclass('public.auditoria') IS NOT NULL THEN
    RAISE EXCEPTION 'V2 detectada o esquema parcialmente actualizado. No repetir: ejecutar 02_verificar_v2.sql';
  END IF;
END $$;

-- Migración aditiva. Aplicar primero en desarrollo; el cliente v1 deja de escribir.
ALTER TABLE public.evaluaciones ADD COLUMN IF NOT EXISTS payload jsonb;
ALTER TABLE public.evaluaciones ADD COLUMN IF NOT EXISTS revision bigint NOT NULL DEFAULT 0;
ALTER TABLE public.evaluaciones ADD COLUMN IF NOT EXISTS validation_version text;
ALTER TABLE public.evidencias ADD COLUMN IF NOT EXISTS metodo text;
ALTER TABLE public.evidencias ADD COLUMN IF NOT EXISTS lado text;
ALTER TABLE public.evidencias ADD COLUMN IF NOT EXISTS fotograma_segundos numeric;
ALTER TABLE public.evidencias ADD COLUMN IF NOT EXISTS sha256 text;
ALTER TABLE public.evidencias ADD COLUMN IF NOT EXISTS formato text;
ALTER TABLE public.evidencias ADD COLUMN IF NOT EXISTS delivery_type text NOT NULL DEFAULT 'upload';
ALTER TABLE public.evidencias ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'activa';
ALTER TABLE public.evidencias ADD COLUMN IF NOT EXISTS actor_id uuid;

CREATE TABLE public.auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluacion_id uuid REFERENCES public.evaluaciones(id) ON DELETE RESTRICT,
  actor_id uuid,
  accion text NOT NULL,
  revision bigint NOT NULL,
  detalle jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.informes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluacion_id uuid NOT NULL UNIQUE REFERENCES public.evaluaciones(id) ON DELETE RESTRICT,
  actor_id uuid NOT NULL,
  snapshot jsonb NOT NULL,
  contenido_canonico text NOT NULL,
  sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.asset_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evidencia_id uuid,
  evaluacion_id uuid REFERENCES public.evaluaciones(id) ON DELETE RESTRICT,
  actor_id uuid NOT NULL,
  public_id text NOT NULL,
  resource_type text NOT NULL CHECK(resource_type IN ('image','video')),
  delivery_type text NOT NULL,
  accion text NOT NULL DEFAULT 'destroy' CHECK(accion IN ('destroy','secure')),
  estado text NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('pendiente','completada')),
  intentos integer NOT NULL DEFAULT 0,
  ultimo_error text,
  disponible_desde timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(public_id,resource_type,accion)
);
CREATE TABLE public.acciones_control (
  id uuid PRIMARY KEY,
  evaluacion_id uuid NOT NULL REFERENCES public.evaluaciones(id) ON DELETE RESTRICT,
  descripcion text NOT NULL,
  responsable text NOT NULL,
  fecha date,
  estado text NOT NULL CHECK(estado IN ('pendiente','en_curso','verificada')),
  verificacion text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NOT NULL
);

-- Conservar el expediente anterior y exigir revisión con el motor corregido.
INSERT INTO public.auditoria(evaluacion_id,accion,revision,detalle)
SELECT id,'importacion_v1',revision,to_jsonb(e) FROM public.evaluaciones e;
UPDATE public.evaluaciones SET estado='en_progreso' WHERE estado='completada';

ALTER TABLE public.evaluaciones ADD CONSTRAINT evaluaciones_reba_rango CHECK(reba_puntaje_final BETWEEN 1 AND 15) NOT VALID;
ALTER TABLE public.evaluaciones ADD CONSTRAINT evaluaciones_rula_rango CHECK(rula_puntaje_final BETWEEN 1 AND 7) NOT VALID;
ALTER TABLE public.evaluaciones ADD CONSTRAINT evaluaciones_psico_rango CHECK(psicosocial_promedio BETWEEN 20 AND 100) NOT VALID;
ALTER TABLE public.evaluaciones ADD CONSTRAINT evaluaciones_payload_size CHECK(payload IS NULL OR octet_length(payload::text)<200000);
ALTER TABLE public.evidencias ADD CONSTRAINT evidencias_estado_v2 CHECK(estado IN ('pendiente','activa','eliminando'));
ALTER TABLE public.evidencias ADD CONSTRAINT evidencias_hash_v2 CHECK(sha256 IS NULL OR sha256 ~ '^[a-f0-9]{64}$');
CREATE INDEX evaluaciones_owner_order_v2 ON public.evaluaciones(evaluador_id,created_at DESC,id);
CREATE INDEX auditoria_evaluacion_v2 ON public.auditoria(evaluacion_id,created_at DESC);
CREATE INDEX asset_jobs_pending_v2 ON public.asset_jobs(estado,disponible_desde);

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  INSERT INTO public.perfiles(id,nombre,email,rol)
  VALUES(NEW.id,left(COALESCE(NEW.raw_user_meta_data->>'nombre',split_part(NEW.email,'@',1)),200),NEW.email,'evaluador');
  RETURN NEW;
END; $$;

-- Eliminar también políticas antiguas con otros nombres: las políticas permisivas se suman.
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT tablename,policyname FROM pg_policies WHERE schemaname='public' AND tablename IN ('perfiles','evaluaciones','evidencias') LOOP
    EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,p.tablename);
  END LOOP;
END $$;
REVOKE ALL ON public.perfiles,public.evaluaciones,public.evidencias FROM anon,authenticated;
GRANT SELECT ON public.perfiles,public.evaluaciones,public.evidencias TO authenticated;
GRANT ALL ON public.perfiles,public.evaluaciones,public.evidencias TO service_role;
REVOKE CREATE ON SCHEMA public FROM PUBLIC,anon,authenticated;
CREATE POLICY perfiles_read_v2 ON public.perfiles FOR SELECT TO authenticated USING(id=(SELECT auth.uid()) OR public.is_admin());
CREATE POLICY evaluaciones_read_v2 ON public.evaluaciones FOR SELECT TO authenticated USING(evaluador_id=(SELECT auth.uid()) OR public.is_admin());
CREATE POLICY evidencias_read_v2 ON public.evidencias FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.evaluaciones e WHERE e.id=evaluacion_id AND (e.evaluador_id=(SELECT auth.uid()) OR public.is_admin())));

ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.informes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acciones_control ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.auditoria,public.informes,public.asset_jobs,public.acciones_control FROM anon,authenticated;
GRANT SELECT ON public.auditoria,public.informes,public.acciones_control TO authenticated;
GRANT ALL ON public.auditoria,public.informes,public.asset_jobs,public.acciones_control TO service_role;
CREATE POLICY auditoria_read_v2 ON public.auditoria FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.evaluaciones e WHERE e.id=evaluacion_id AND(e.evaluador_id=(SELECT auth.uid()) OR public.is_admin())));
CREATE POLICY informes_read_v2 ON public.informes FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.evaluaciones e WHERE e.id=evaluacion_id AND(e.evaluador_id=(SELECT auth.uid()) OR public.is_admin())));
CREATE POLICY acciones_read_v2 ON public.acciones_control FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.evaluaciones e WHERE e.id=evaluacion_id AND(e.evaluador_id=(SELECT auth.uid()) OR public.is_admin())));

CREATE FUNCTION public.siga_authorize(p_id uuid,p_actor uuid,p_edit boolean DEFAULT true)
RETURNS public.evaluaciones LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE e public.evaluaciones;
BEGIN
  SELECT * INTO e FROM public.evaluaciones WHERE id=p_id FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.perfiles WHERE id=p_actor AND (id=e.evaluador_id OR rol='admin')) THEN
    RAISE EXCEPTION 'Evaluacion no disponible' USING ERRCODE='42501';
  END IF;
  IF p_edit AND e.estado='completada' THEN RAISE EXCEPTION 'El informe esta cerrado'; END IF;
  PERFORM set_config('siga.actor',p_actor::text,true);
  RETURN e;
END $$;

CREATE FUNCTION public.siga_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN RAISE EXCEPTION 'Registro inmutable: cree una nueva evaluacion para reevaluar'; END $$;
CREATE TRIGGER informes_immutable BEFORE UPDATE OR DELETE ON public.informes FOR EACH ROW EXECUTE FUNCTION public.siga_immutable();
CREATE TRIGGER auditoria_immutable BEFORE UPDATE OR DELETE ON public.auditoria FOR EACH ROW EXECUTE FUNCTION public.siga_immutable();

CREATE FUNCTION public.siga_lock_closed() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF OLD.estado='completada' THEN RAISE EXCEPTION 'El informe esta cerrado'; END IF;
  RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER evaluaciones_lock_closed BEFORE UPDATE OR DELETE ON public.evaluaciones FOR EACH ROW EXECUTE FUNCTION public.siga_lock_closed();

CREATE FUNCTION public.siga_media_guard() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
DECLARE e public.evaluaciones; parent uuid; total integer;
BEGIN
  parent=CASE WHEN TG_OP='DELETE' THEN OLD.evaluacion_id ELSE NEW.evaluacion_id END;
  SELECT * INTO e FROM public.evaluaciones WHERE id=parent FOR UPDATE;
  IF e.estado='completada' THEN RAISE EXCEPTION 'Evidencias del informe cerradas'; END IF;
  IF TG_OP='INSERT' THEN
    SELECT count(*) INTO total FROM public.evidencias WHERE evaluacion_id=parent AND tipo=NEW.tipo;
    IF total >= (CASE WHEN NEW.tipo='imagen' THEN 10 ELSE 3 END) THEN RAISE EXCEPTION 'Limite de evidencias alcanzado'; END IF;
  END IF;
  IF TG_OP='UPDATE' AND NEW.evaluacion_id<>OLD.evaluacion_id THEN RAISE EXCEPTION 'No se puede trasladar una evidencia'; END IF;
  RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER evidencias_guard BEFORE INSERT OR UPDATE OR DELETE ON public.evidencias FOR EACH ROW EXECUTE FUNCTION public.siga_media_guard();

CREATE FUNCTION public.siga_audit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE parent uuid; rev bigint; actor uuid;
BEGIN
  actor=nullif(current_setting('siga.actor',true),'')::uuid;
  IF TG_TABLE_NAME='evaluaciones' THEN
    parent=NEW.id;rev=NEW.revision;
  ELSE
    parent=CASE WHEN TG_OP='DELETE' THEN OLD.evaluacion_id ELSE NEW.evaluacion_id END;
    SELECT revision INTO rev FROM public.evaluaciones WHERE id=parent;
  END IF;
  INSERT INTO public.auditoria(evaluacion_id,actor_id,accion,revision,detalle)
  VALUES(parent,actor,TG_TABLE_NAME||':'||TG_OP,rev,jsonb_build_object('antes',CASE WHEN TG_OP='INSERT' THEN NULL ELSE to_jsonb(OLD) END,'despues',CASE WHEN TG_OP='DELETE' THEN NULL ELSE to_jsonb(NEW) END));
  RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER evaluaciones_audit AFTER INSERT OR UPDATE ON public.evaluaciones FOR EACH ROW EXECUTE FUNCTION public.siga_audit();
CREATE TRIGGER evidencias_audit AFTER INSERT OR UPDATE OR DELETE ON public.evidencias FOR EACH ROW EXECUTE FUNCTION public.siga_audit();

CREATE FUNCTION public.siga_write(p_id uuid,p_actor uuid,p_expected bigint,p_payload jsonb,p_close boolean DEFAULT false)
RETURNS public.evaluaciones LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE e public.evaluaciones; ident jsonb; snap jsonb; content text; item jsonb; missing boolean;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.perfiles WHERE id=p_actor) THEN RAISE EXCEPTION 'Perfil no disponible' USING ERRCODE='42501'; END IF;
  PERFORM set_config('siga.actor',p_actor::text,true);
  IF p_id IS NULL THEN
    INSERT INTO public.evaluaciones(evaluador_id,payload,validation_version) VALUES(p_actor,p_payload,'v2') RETURNING * INTO e;
    RETURN e;
  END IF;
  e=public.siga_authorize(p_id,p_actor,true);
  IF e.revision<>p_expected THEN RAISE EXCEPTION 'Conflicto de revision' USING ERRCODE='40001'; END IF;
  IF jsonb_typeof(p_payload)<>'object' OR p_payload->>'schemaVersion'<>'2' THEN RAISE EXCEPTION 'Formato de evaluacion invalido'; END IF;
  ident=p_payload->'identificacion';
  IF p_close THEN
    IF p_payload->'progreso'<> '{"identificacion":true,"reba":true,"rula":true,"psicosocial":true}'::jsonb THEN RAISE EXCEPTION 'Evaluacion incompleta'; END IF;
    IF p_payload->'calidad'<>'[true,true,true,true,true,true]'::jsonb THEN RAISE EXCEPTION 'Falta revision de calidad'; END IF;
    IF NOT (ident @> '{"c1":true,"c2":true,"c3":true,"c4":true}'::jsonb) THEN RAISE EXCEPTION 'Falta checklist de preparacion'; END IF;
    SELECT EXISTS(SELECT 1 FROM public.evidencias WHERE evaluacion_id=p_id AND (estado<>'activa' OR sha256 IS NULL OR delivery_type<>'authenticated')) INTO missing;
    IF missing THEN RAISE EXCEPTION 'Hay evidencias pendientes o sin proteger'; END IF;
    IF NOT EXISTS(SELECT 1 FROM public.evidencias WHERE evaluacion_id=p_id AND tipo='imagen') OR NOT EXISTS(SELECT 1 FROM public.evidencias WHERE evaluacion_id=p_id AND tipo='video') THEN RAISE EXCEPTION 'Falta una foto o un video'; END IF;
    IF EXISTS(SELECT 1 FROM unnest(ARRAY['reba','rula']) m WHERE NOT EXISTS(SELECT 1 FROM public.evidencias ev WHERE ev.evaluacion_id=p_id AND ev.metodo IN(m,'ambos') AND length(trim(ev.descripcion))>=10)) THEN RAISE EXCEPTION 'Vincule evidencia a cada metodo'; END IF;
  END IF;
  UPDATE public.evaluaciones SET payload=p_payload,revision=revision+1,validation_version='v2',
    empresa=ident->>'empresa',trabajador=ident->>'trabajador',area=ident->>'area',fecha_eval=nullif(ident->>'fechaEval','')::date,
    reba_datos=p_payload->'reba',rula_datos=p_payload->'rula',psicosocial_datos=p_payload->'psicosocial',
    reba_puntaje_final=(p_payload->'reba'->>'puntuacionFinal')::int,reba_nivel=(p_payload->'reba'->>'nivel')::int,reba_riesgo=p_payload->'reba'->>'riesgo',
    rula_puntaje_final=(p_payload->'rula'->>'puntuacionFinal')::int,rula_nivel=(p_payload->'rula'->>'nivel')::int,rula_riesgo=p_payload->'rula'->>'riesgo',
    psicosocial_promedio=(p_payload->'psicosocial'->>'promedioGlobal')::numeric,
    estado=CASE WHEN p_close THEN 'completada' ELSE 'en_progreso' END
  WHERE id=p_id RETURNING * INTO e;
  IF p_close THEN
    snap=jsonb_build_object('id',e.id,'revision',e.revision,'versions',p_payload->'versions','payload',p_payload,'evidencias',(SELECT coalesce(jsonb_agg(to_jsonb(ev) ORDER BY ev.id),'[]'::jsonb) FROM public.evidencias ev WHERE evaluacion_id=p_id));
    content=snap::text;
    INSERT INTO public.informes(evaluacion_id,actor_id,snapshot,contenido_canonico,sha256) VALUES(p_id,p_actor,snap,content,encode(sha256(convert_to(content,'UTF8')),'hex'));
    FOR item IN SELECT value FROM jsonb_array_elements(p_payload->'acciones') LOOP
      INSERT INTO public.acciones_control(id,evaluacion_id,descripcion,responsable,fecha,estado,verificacion,updated_by) VALUES((item->>'id')::uuid,p_id,item->>'descripcion',item->>'responsable',nullif(item->>'fecha','')::date,item->>'estado',item->>'verificacion',p_actor);
    END LOOP;
  END IF;
  RETURN e;
END $$;

CREATE FUNCTION public.siga_reserve_media(p_id uuid,p_actor uuid,p_media uuid,p_data jsonb)
RETURNS public.evidencias LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE ev public.evidencias;
BEGIN
  PERFORM public.siga_authorize(p_id,p_actor,true);
  INSERT INTO public.evidencias(id,evaluacion_id,cloudinary_public_id,cloudinary_url,cloudinary_secure_url,tipo,nombre_archivo,descripcion,tamano_bytes,metodo,lado,fotograma_segundos,sha256,formato,delivery_type,estado,actor_id)
  VALUES(p_media,p_id,p_data->>'public_id','','',p_data->>'tipo',p_data->>'nombre_archivo',p_data->>'descripcion',(p_data->>'tamano_bytes')::bigint,p_data->>'metodo',p_data->>'lado',(p_data->>'fotograma_segundos')::numeric,p_data->>'sha256',p_data->>'formato','authenticated','pendiente',p_actor) RETURNING * INTO ev;
  RETURN ev;
END $$;
CREATE FUNCTION public.siga_activate_media(p_media uuid,p_actor uuid,p_url text,p_width int,p_height int,p_format text DEFAULT NULL)
RETURNS public.evidencias LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE ev public.evidencias;
BEGIN
  SELECT * INTO ev FROM public.evidencias WHERE id=p_media;
  PERFORM public.siga_authorize(ev.evaluacion_id,p_actor,true);
  IF ev.estado<>'pendiente' THEN RAISE EXCEPTION 'Carga no pendiente'; END IF;
  IF p_format IS NOT NULL AND p_format NOT IN ('jpg','jpeg','png','webp','mp4','mov','webm') THEN RAISE EXCEPTION 'Formato no admitido'; END IF;
  UPDATE public.evidencias SET cloudinary_url=p_url,cloudinary_secure_url=p_url,width=p_width,height=p_height,formato=coalesce(p_format,formato),estado='activa' WHERE id=p_media RETURNING * INTO ev;
  RETURN ev;
END $$;
CREATE FUNCTION public.siga_queue_delete(p_media uuid,p_actor uuid,p_delay int DEFAULT 0)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE ev public.evidencias; job uuid;
BEGIN
  SELECT * INTO ev FROM public.evidencias WHERE id=p_media;
  IF NOT FOUND THEN RETURN NULL; END IF;
  PERFORM public.siga_authorize(ev.evaluacion_id,p_actor,true);
  UPDATE public.evidencias SET estado='eliminando' WHERE id=p_media;
  INSERT INTO public.asset_jobs(evidencia_id,evaluacion_id,actor_id,public_id,resource_type,delivery_type,disponible_desde)
  VALUES(p_media,ev.evaluacion_id,p_actor,ev.cloudinary_public_id,CASE WHEN ev.tipo='imagen' THEN 'image' ELSE 'video' END,ev.delivery_type,now()+make_interval(secs=>greatest(p_delay,0)))
  ON CONFLICT(public_id,resource_type,accion) DO UPDATE SET estado='pendiente',disponible_desde=EXCLUDED.disponible_desde RETURNING id INTO job;
  RETURN job;
END $$;
CREATE FUNCTION public.siga_finish_delete(p_job uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE j public.asset_jobs;
BEGIN
  SELECT * INTO j FROM public.asset_jobs WHERE id=p_job FOR UPDATE;
  IF j.estado='completada' THEN RETURN; END IF;
  PERFORM public.siga_authorize(j.evaluacion_id,j.actor_id,true);
  DELETE FROM public.evidencias WHERE id=j.evidencia_id;
  UPDATE public.asset_jobs SET estado='completada',ultimo_error=NULL WHERE id=p_job;
END $$;
CREATE FUNCTION public.siga_track_control(p_id uuid,p_actor uuid,p_estado text,p_nota text) RETURNS public.acciones_control LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.acciones_control; e public.evaluaciones;
BEGIN
  SELECT * INTO a FROM public.acciones_control WHERE id=p_id FOR UPDATE;
  e=public.siga_authorize(a.evaluacion_id,p_actor,false);
  IF p_estado='verificada' AND length(trim(p_nota))<10 THEN RAISE EXCEPTION 'Documente la verificacion del control'; END IF;
  UPDATE public.acciones_control SET estado=p_estado,verificacion=left(p_nota,2000),updated_by=p_actor,updated_at=now() WHERE id=p_id RETURNING * INTO a;
  INSERT INTO public.auditoria(evaluacion_id,actor_id,accion,revision,detalle) VALUES(a.evaluacion_id,p_actor,'seguimiento_control',e.revision,to_jsonb(a));
  RETURN a;
END $$;

-- Ninguna operación privilegiada acepta una identidad enviada directamente desde el navegador.
DO $$ DECLARE f record; BEGIN
  FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname LIKE 'siga\_%' ESCAPE '\' LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC,anon,authenticated;
COMMIT;
