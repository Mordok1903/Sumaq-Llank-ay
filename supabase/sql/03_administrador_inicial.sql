-- OPCIONAL. Ejecutar como propietario del proyecto despues de aplicar V2.
-- Primero crear la cuenta legitima en Authentication > Users.
-- Sustituir SOLO el correo de abajo. No compartir contrasenas en SQL.
BEGIN;
DO $$
DECLARE correo_admin text := 'ADMIN_EMAIL_REEMPLAZAR'; cuenta uuid; anterior text;
BEGIN
  IF correo_admin='ADMIN_EMAIL_REEMPLAZAR' OR correo_admin NOT LIKE '%@%' THEN RAISE EXCEPTION 'Sustituye ADMIN_EMAIL_REEMPLAZAR por el correo exacto de la cuenta autorizada'; END IF;
  SELECT id INTO STRICT cuenta FROM auth.users WHERE lower(email)=lower(correo_admin);
  SELECT rol INTO STRICT anterior FROM public.perfiles WHERE id=cuenta FOR UPDATE;
  IF anterior<>'admin' THEN
    UPDATE public.perfiles SET rol='admin' WHERE id=cuenta;
    INSERT INTO public.auditoria(evaluacion_id,actor_id,accion,revision,detalle)
    VALUES(NULL,auth.uid(),'asignacion_admin_manual',0,jsonb_build_object('cuenta_id',cuenta,'rol_anterior',anterior,'rol_nuevo','admin'));
  END IF;
END $$;
COMMIT;
