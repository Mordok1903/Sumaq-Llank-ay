import { createClient } from "npm:@supabase/supabase-js@2.119.0";
import {
  emptyEvaluation,
  normalizeEvaluation,
  validateClosure,
  sha256,
  text,
} from "../_shared/domain/evaluation.js";
import { validateFile, validateEvidence } from "../_shared/domain/media.js";
import { cloudinary } from "../_shared/cloudinary.js";
import { serverKeys } from "../_shared/server-config.js";

const env = (name: string) => Deno.env.get(name) || "";
const keys = serverKeys(env);
const admin = createClient(keys.url, keys.secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const origins = new Set(
  env("ALLOWED_ORIGINS")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);
type Input = Record<string, any>;
class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
function uuid(value: unknown) {
  if (
    typeof value !== "string" ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
      value,
    )
  )
    throw new HttpError(400, "Identificador inválido");
  return value;
}
function revision(value: unknown) {
  if (!Number.isSafeInteger(value) || Number(value) < 0)
    throw new HttpError(400, "Revisión inválida");
  return Number(value);
}
async function rpc(name: string, params: Input) {
  const { data, error } = await admin.rpc(name, params);
  if (error) {
    if (error.code === "40001")
      throw new HttpError(
        409,
        "La evaluación cambió. Conserve su borrador y recargue la versión guardada.",
      );
    if (error.code === "42501")
      throw new HttpError(403, "No tiene permiso para esta evaluación");
    throw new HttpError(400, error.message);
  }
  return data;
}
async function evaluation(id: string, actor: string, edit = false) {
  const { data, error } = await admin
    .from("evaluaciones")
    .select("*")
    .eq("id", uuid(id))
    .single();
  if (error || !data) throw new HttpError(404, "Evaluación no disponible");
  const p = await admin.from("perfiles").select("rol").eq("id", actor).single();
  if (data.evaluador_id !== actor && p.data?.rol !== "admin")
    throw new HttpError(403, "No tiene permiso para esta evaluación");
  if (edit && data.estado === "completada")
    throw new HttpError(409, "El informe está cerrado");
  return data;
}
async function media(id: string, actor: string, edit = false) {
  const { data, error } = await admin
    .from("evidencias")
    .select("*")
    .eq("id", uuid(id))
    .single();
  if (error || !data) throw new HttpError(404, "Evidencia no disponible");
  await evaluation(data.evaluacion_id, actor, edit);
  return data;
}
function provider() {
  return cloudinary({
    cloud: env("CLOUDINARY_CLOUD_NAME"),
    key: env("CLOUDINARY_API_KEY"),
    secret: env("CLOUDINARY_API_SECRET"),
  });
}
async function boundedBody(req: Request, max: number) {
  const reader = req.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > max) {
      await reader.cancel();
      throw new HttpError(413, "Solicitud demasiado grande");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
async function drainJobs(onlyId?: string) {
  // Recupera reservas cuyo proceso terminó antes de confirmar o programar su limpieza.
  if (!onlyId) {
    const stale = await admin
      .from("evidencias")
      .select("id,actor_id")
      .eq("estado", "pendiente")
      .lt("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString())
      .limit(10);
    if (stale.error)
      throw new HttpError(
        500,
        "No se pudieron revisar las cargas interrumpidas",
      );
    for (const item of stale.data || [])
      await rpc("siga_queue_delete", {
        p_media: item.id,
        p_actor: item.actor_id,
        p_delay: 0,
      });
  }
  let query = admin
    .from("asset_jobs")
    .select("*")
    .eq("estado", "pendiente")
    .eq("accion", "destroy")
    .lte("disponible_desde", new Date().toISOString())
    .order("created_at")
    .limit(10);
  if (onlyId) query = query.eq("id", onlyId);
  const { data, error } = await query;
  if (error)
    throw new HttpError(500, "No se pudo consultar la cola de archivos");
  let completed = 0;
  for (const job of data || []) {
    try {
      await provider().destroy(
        job.resource_type,
        job.public_id,
        job.delivery_type,
      );
      await rpc("siga_finish_delete", { p_job: job.id });
      completed++;
    } catch {
      const { error: updateError } = await admin
        .from("asset_jobs")
        .update({
          intentos: job.intentos + 1,
          ultimo_error: "El proveedor o la base no confirmaron la operación",
          disponible_desde: new Date(
            Date.now() +
              Math.min(3600, 60 * 2 ** Math.min(job.intentos, 6)) * 1000,
          ).toISOString(),
        })
        .eq("id", job.id);
      if (updateError)
        throw new HttpError(
          500,
          "No se pudo conservar el reintento de eliminación",
        );
    }
  }
  return { completed };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin"),
    cors: Record<string, string> = {
      Vary: "Origin",
      "Access-Control-Allow-Headers":
        "authorization,apikey,content-type,x-client-info",
      "Access-Control-Allow-Methods": "POST,OPTIONS",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    };
  if (origin && origins.has(origin))
    cors["Access-Control-Allow-Origin"] = origin;
  const respond = (value: unknown, status = 200) =>
    new Response(JSON.stringify(value), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  try {
    if (origin && !origins.has(origin))
      throw new HttpError(403, "Origen no permitido");
    if (req.method === "OPTIONS")
      return new Response(null, { status: 204, headers: cors });
    if (req.method !== "POST") throw new HttpError(405, "Método no permitido");
    const auth = req.headers.get("authorization") || "";
    const maintenance = env("MAINTENANCE_SECRET");
    if (!origin && maintenance && auth === `Bearer ${maintenance}`) {
      const body = JSON.parse(
        new TextDecoder().decode(await boundedBody(req, 1000)),
      );
      if (body.action !== "maintenance")
        throw new HttpError(403, "Acción no permitida");
      return respond(await drainJobs());
    }
    if (!auth.startsWith("Bearer ")) throw new HttpError(401, "Inicie sesión");
    const userClient = createClient(env("SUPABASE_URL"), keys.publicKey, {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: authError } =
      await userClient.auth.getUser();
    if (authError || !userData.user)
      throw new HttpError(401, "La sesión expiró");
    const actor = userData.user.id,
      profile = await admin
        .from("perfiles")
        .select("rol")
        .eq("id", actor)
        .single();
    if (profile.error) throw new HttpError(403, "Perfil no disponible");
    const isAdmin = profile.data.rol === "admin";
    const multipart = (req.headers.get("content-type") || "").startsWith(
      "multipart/form-data",
    );
    const raw = await boundedBody(req, multipart ? 25_100_000 : 250_000);
    let body: Input,
      form: FormData | null = null;
    if (multipart) {
      form = await new Response(raw, {
        headers: { "Content-Type": req.headers.get("content-type")! },
      }).formData();
      body = { action: form.get("action"), id: form.get("id") };
    } else body = JSON.parse(new TextDecoder().decode(raw));
    if (body.action === "create")
      return respond(
        await rpc("siga_write", {
          p_id: null,
          p_actor: actor,
          p_expected: 0,
          p_payload: emptyEvaluation(),
          p_close: false,
        }),
      );
    if (body.action === "save") {
      const payload = normalizeEvaluation(body.payload);
      return respond(
        await rpc("siga_write", {
          p_id: uuid(body.id),
          p_actor: actor,
          p_expected: revision(body.revision),
          p_payload: payload,
          p_close: false,
        }),
      );
    }
    if (body.action === "close") {
      const row = await evaluation(body.id, actor, true),
        evidence = await admin
          .from("evidencias")
          .select("*")
          .eq("evaluacion_id", row.id);
      if (evidence.error)
        throw new HttpError(500, "No se pudo verificar la evidencia");
      const payload = validateClosure(row.payload, evidence.data);
      return respond(
        await rpc("siga_write", {
          p_id: row.id,
          p_actor: actor,
          p_expected: revision(body.revision),
          p_payload: payload,
          p_close: true,
        }),
      );
    }
    if (body.action === "create-user") {
      if (!isAdmin)
        throw new HttpError(403, "Solo un administrador puede crear cuentas");
      const nombre = text(body.nombre, 200),
        email = text(body.email, 254),
        password = typeof body.password === "string" ? body.password : "",
        rol = body.rol;
      if (
        !nombre ||
        !/^\S+@\S+\.\S+$/.test(email) ||
        password.length < 12 ||
        password.length > 256 ||
        !["admin", "evaluador"].includes(rol)
      )
        throw new HttpError(
          400,
          "Datos de cuenta inválidos; use al menos 12 caracteres de contraseña",
        );
      const result = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nombre },
      });
      if (result.error)
        throw new HttpError(
          400,
          "No se pudo crear la cuenta; revise si el correo ya está registrado",
        );
      const updated = await admin
        .from("perfiles")
        .update({ rol })
        .eq("id", result.data.user.id)
        .select("id,nombre,email,rol")
        .single();
      if (updated.error) {
        await admin.auth.admin.deleteUser(result.data.user.id);
        throw new HttpError(500, "No se pudo asignar el perfil de la cuenta");
      }
      return respond({ user: updated.data });
    }
    if (body.action === "upload") {
      await evaluation(body.id, actor, true);
      if (!form) throw new HttpError(400, "Archivo requerido");
      const file = form.get("file");
      if (!(file instanceof File))
        throw new HttpError(400, "Archivo requerido");
      const bytes = new Uint8Array(await file.arrayBuffer()),
        tipo = validateFile(file.type, bytes),
        meta = validateEvidence(JSON.parse(String(form.get("meta") || "{}"))),
        id = crypto.randomUUID(),
        publicId = `siga_${id}`,
        resource = tipo === "imagen" ? "image" : "video",
        format = (
          {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp",
            "video/mp4": "mp4",
            "video/quicktime": "mov",
            "video/webm": "webm",
          } as Record<string, string>
        )[file.type];
      await rpc("siga_reserve_media", {
        p_id: body.id,
        p_actor: actor,
        p_media: id,
        p_data: {
          ...meta,
          tipo,
          public_id: publicId,
          formato: format,
          nombre_archivo: text(file.name, 255),
          tamano_bytes: bytes.length,
          sha256: await sha256(bytes),
        },
      });
      try {
        const cloud = await provider().upload(resource, publicId, file);
        if (
          cloud.public_id !== publicId ||
          cloud.type !== "authenticated" ||
          cloud.resource_type !== resource
        )
          throw new HttpError(
            502,
            "El proveedor no confirmó una carga protegida",
          );
        return respond(
          await rpc("siga_activate_media", {
            p_media: id,
            p_actor: actor,
            p_url: cloud.secure_url,
            p_width: cloud.width || null,
            p_height: cloud.height || null,
            p_format: cloud.format,
          }),
        );
      } catch (error) {
        await rpc("siga_queue_delete", {
          p_media: id,
          p_actor: actor,
          p_delay: 120,
        });
        throw error;
      }
    }
    if (body.action === "media-url") {
      const ev = await media(body.id, actor);
      if (ev.estado !== "activa" || ev.delivery_type !== "authenticated")
        throw new HttpError(
          409,
          "La evidencia requiere protección o completar la carga",
        );
      return respond({
        url: await provider().downloadURL(
          ev.tipo === "imagen" ? "image" : "video",
          ev.cloudinary_public_id,
          ev.formato,
        ),
        expiresIn: 300,
      });
    }
    if (body.action === "delete-media") {
      const job = await rpc("siga_queue_delete", {
        p_media: uuid(body.id),
        p_actor: actor,
        p_delay: 0,
      });
      if (job) await drainJobs(job);
      return respond({ pending: job !== null });
    }
    if (body.action === "control-update") {
      if (!["pendiente", "en_curso", "verificada"].includes(body.estado))
        throw new HttpError(400, "Estado inválido");
      return respond(
        await rpc("siga_track_control", {
          p_id: uuid(body.id),
          p_actor: actor,
          p_estado: body.estado,
          p_nota: text(body.verificacion, 2000),
        }),
      );
    }
    if (body.action === "maintenance") {
      if (!isAdmin) throw new HttpError(403, "Solo administradores");
      return respond(await drainJobs());
    }
    throw new HttpError(400, "Acción no permitida");
  } catch (error) {
    const e = error as Error;
    if (e instanceof HttpError) return respond({ error: e.message }, e.status);
    if (e instanceof SyntaxError)
      return respond({ error: "Solicitud inválida" }, 400);
    if (e.name === "AbortError" || e.name === "TimeoutError")
      return respond(
        {
          error:
            "El proveedor tardó demasiado. La operación pendiente conserva su seguimiento.",
        },
        504,
      );
    return respond(
      {
        error: e.message?.startsWith("Cloudinary")
          ? e.message
          : "No se pudo completar la operación. Revise los datos o la configuración del servidor.",
      },
      400,
    );
  }
});
