// Solo se aplica tras revisar el modo simulación y preparar la copia de seguridad.
import { createClient } from "@supabase/supabase-js";
import { cloudinary } from "../supabase/functions/_shared/cloudinary.js";
import { sha256 } from "../supabase/functions/_shared/domain/evaluation.js";
const env = process.env,
  apply = process.argv.includes("--apply");
for (const name of [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
])
  if (!env[name])
    throw new Error(`Falta configurar ${name} en el entorno privado.`);
const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  }),
  cloud = cloudinary({
    cloud: env.CLOUDINARY_CLOUD_NAME,
    key: env.CLOUDINARY_API_KEY,
    secret: env.CLOUDINARY_API_SECRET,
  });
const base = `https://api.cloudinary.com/v1_1/${encodeURIComponent(env.CLOUDINARY_CLOUD_NAME)}`,
  headers = {
    Authorization: `Basic ${Buffer.from(`${env.CLOUDINARY_API_KEY}:${env.CLOUDINARY_API_SECRET}`).toString("base64")}`,
  };
async function admin(path, options = {}) {
  const response = await fetch(base + path, {
    ...options,
    headers: { ...headers, ...options.headers },
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok)
    throw new Error(`Cloudinary Admin respondió ${response.status}`);
  return response.json();
}
async function main() {
  const name = "siga_evidencias",
    preset = await admin(`/upload_presets/${name}`);
  let page = 0,
    count = 0,
    changed = 0;
  if (apply) {
    await admin(`/upload_presets/${name}`, {
      method: "PUT",
      body: new URLSearchParams({
        unsigned: "false",
        type: "authenticated",
        allowed_formats: "jpg,jpeg,png,webp,mp4,mov,webm",
        overwrite: "false",
      }),
    });
    const check = await admin(`/upload_presets/${name}`);
    if (check.unsigned !== false)
      throw new Error("No se confirmó la desactivación del preset unsigned");
  }
  while (true) {
    const { data, error } = await db
      .from("evidencias")
      .select(
        "id,cloudinary_public_id,tipo,delivery_type,sha256,evaluaciones!inner(estado)",
      )
      .order("id")
      .range(page * 100, page * 100 + 99);
    if (error)
      throw new Error(
        "No se pudo consultar el inventario; aplique primero la migración v2.",
      );
    for (const item of data) {
      if (item.delivery_type === "authenticated" && item.sha256) continue;
      count++;
      if (!apply) continue;
      if (item.evaluaciones.estado === "completada")
        throw new Error(
          "Existe un informe cerrado con evidencia antigua. Revise su expediente antes de migrar.",
        );
      const resource = item.tipo === "imagen" ? "image" : "video";
      // Permite reanudar si el proveedor cambió el tipo antes de guardar en PostgreSQL.
      let asset;
      try {
        asset = await admin(
          `/resources/${resource}/authenticated/${encodeURIComponent(item.cloudinary_public_id)}`,
        );
      } catch {
        asset = await cloud.secure(resource, item.cloudinary_public_id);
      }
      if (asset.type !== "authenticated")
        throw new Error("No se confirmó la protección de un archivo");
      const url = await cloud.downloadURL(
          resource,
          item.cloudinary_public_id,
          asset.format,
        ),
        response = await fetch(url, { signal: AbortSignal.timeout(90000) });
      if (!response.ok)
        throw new Error("No se pudo comprobar el archivo protegido");
      const hash = await sha256(new Uint8Array(await response.arrayBuffer()));
      const update = await db
        .from("evidencias")
        .update({
          delivery_type: "authenticated",
          formato: asset.format,
          sha256: hash,
          cloudinary_url: asset.secure_url,
          cloudinary_secure_url: asset.secure_url,
        })
        .eq("id", item.id)
        .select("id")
        .single();
      if (update.error)
        throw new Error(
          "Archivo protegido; falta actualizar su registro. Se puede reanudar el proceso.",
        );
      changed++;
    }
    if (data.length < 100) break;
    page++;
  }
  console.log(
    JSON.stringify({
      modo: apply ? "aplicado" : "simulación",
      preset_unsigned_actual: preset.unsigned,
      evidencias_por_migrar: count,
      evidencias_migradas: changed,
      nota: "Revisar y completar descripción, método, lado y fotograma de evidencias antiguas antes de cerrar.",
    }),
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
