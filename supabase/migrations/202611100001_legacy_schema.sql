-- =============================================
-- SIGA — Schema SQL para Supabase
-- Sistema de Evaluación de Riesgos Laborales
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- =============================================

-- ═══════════════════════════════════
-- TABLA: perfiles (extiende auth.users)
-- ═══════════════════════════════════
CREATE TABLE IF NOT EXISTS perfiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  rol TEXT NOT NULL DEFAULT 'evaluador' CHECK (rol IN ('admin', 'evaluador')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════
-- TABLA: evaluaciones
-- ═══════════════════════════════════
CREATE TABLE IF NOT EXISTS evaluaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  evaluador_id UUID REFERENCES perfiles(id) NOT NULL,

  -- Datos de Identificación
  empresa TEXT,
  ruc TEXT,
  sede TEXT,
  area TEXT,
  actividad TEXT,
  fecha_eval DATE,
  trabajador TEXT,
  dni TEXT,
  puesto TEXT,
  antiguedad TEXT,
  sexo TEXT,
  turno TEXT,
  tarea TEXT,
  fase TEXT,
  duracion_ciclo TEXT,
  duracion_jornada TEXT,
  frecuencia TEXT,
  descripcion_tarea TEXT,
  monitorista TEXT,
  cargo_monitorista TEXT,
  observaciones TEXT,
  checklist JSONB DEFAULT '{"c1":false,"c2":false,"c3":false,"c4":false}',

  -- Resultados REBA (almacenados como JSONB para flexibilidad)
  reba_datos JSONB DEFAULT '{}',
  reba_puntaje_final INT,
  reba_nivel INT,
  reba_riesgo TEXT,

  -- Resultados RULA
  rula_datos JSONB DEFAULT '{}',
  rula_puntaje_final INT,
  rula_nivel INT,
  rula_riesgo TEXT,

  -- Resultados Psicosocial
  psicosocial_datos JSONB DEFAULT '{}',
  psicosocial_promedio NUMERIC(5,2),

  -- Metadata
  estado TEXT DEFAULT 'en_progreso' CHECK (estado IN ('en_progreso', 'completada')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════
-- TABLA: evidencias (fotos/videos en Cloudinary)
-- ═══════════════════════════════════
CREATE TABLE IF NOT EXISTS evidencias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  evaluacion_id UUID REFERENCES evaluaciones(id) ON DELETE CASCADE NOT NULL,
  cloudinary_public_id TEXT NOT NULL,
  cloudinary_url TEXT NOT NULL,
  cloudinary_secure_url TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('imagen', 'video')),
  nombre_archivo TEXT,
  descripcion TEXT DEFAULT '',
  tamano_bytes BIGINT,
  width INT,
  height INT,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════
-- ÍNDICES
-- ═══════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_evaluaciones_evaluador ON evaluaciones(evaluador_id);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_estado ON evaluaciones(estado);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_fecha ON evaluaciones(fecha_eval DESC);
CREATE INDEX IF NOT EXISTS idx_evidencias_evaluacion ON evidencias(evaluacion_id);

-- ═══════════════════════════════════
-- FUNCIÓN AUXILIAR: is_admin()
-- Con SECURITY DEFINER para evitar recursión infinita en RLS
-- ═══════════════════════════════════
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE id = auth.uid() AND rol = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ═══════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════

ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidencias ENABLE ROW LEVEL SECURITY;

-- Perfiles: usuario ve su propio perfil, admin ve todos
DROP POLICY IF EXISTS "perfiles_select_own" ON perfiles;
CREATE POLICY "perfiles_select_own"
  ON perfiles FOR SELECT
  USING (
    auth.uid() = id
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "perfiles_update_own" ON perfiles;
CREATE POLICY "perfiles_update_own"
  ON perfiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "perfiles_insert" ON perfiles;
CREATE POLICY "perfiles_insert"
  ON perfiles FOR INSERT
  WITH CHECK (true);

-- Evaluaciones: evaluador ve/edita las suyas, admin ve/edita todas
DROP POLICY IF EXISTS "evaluaciones_select" ON evaluaciones;
CREATE POLICY "evaluaciones_select"
  ON evaluaciones FOR SELECT
  USING (
    evaluador_id = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "evaluaciones_insert" ON evaluaciones;
CREATE POLICY "evaluaciones_insert"
  ON evaluaciones FOR INSERT
  WITH CHECK (evaluador_id = auth.uid());

DROP POLICY IF EXISTS "evaluaciones_update" ON evaluaciones;
CREATE POLICY "evaluaciones_update"
  ON evaluaciones FOR UPDATE
  USING (
    evaluador_id = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "evaluaciones_delete" ON evaluaciones;
CREATE POLICY "evaluaciones_delete"
  ON evaluaciones FOR DELETE
  USING (
    evaluador_id = auth.uid()
    OR public.is_admin()
  );

-- Evidencias: acceso a través de la evaluación relacionada
DROP POLICY IF EXISTS "evidencias_select" ON evidencias;
CREATE POLICY "evidencias_select"
  ON evidencias FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM evaluaciones e
      WHERE e.id = evaluacion_id
      AND (e.evaluador_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "evidencias_insert" ON evidencias;
CREATE POLICY "evidencias_insert"
  ON evidencias FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM evaluaciones e
      WHERE e.id = evaluacion_id
      AND (e.evaluador_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "evidencias_delete" ON evidencias;
CREATE POLICY "evidencias_delete"
  ON evidencias FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM evaluaciones e
      WHERE e.id = evaluacion_id
      AND (e.evaluador_id = auth.uid() OR public.is_admin())
    )
  );

-- ═══════════════════════════════════
-- TRIGGER: Auto-crear perfil al registrarse
-- ═══════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfiles (id, nombre, email, rol)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'rol', 'evaluador')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar trigger si ya existe (para re-ejecución segura)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ═══════════════════════════════════
-- TRIGGER: Actualizar updated_at en evaluaciones
-- ═══════════════════════════════════
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS evaluaciones_updated_at ON evaluaciones;
CREATE TRIGGER evaluaciones_updated_at
  BEFORE UPDATE ON evaluaciones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
