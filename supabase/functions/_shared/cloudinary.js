export async function signature(params, secret) {
  const values = Object.keys(params)
    .sort()
    .filter(
      (k) => params[k] !== undefined && params[k] !== null && params[k] !== "",
    )
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  const bytes = await crypto.subtle.digest(
    "SHA-1",
    new TextEncoder().encode(values + secret),
  );
  return [...new Uint8Array(bytes)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
export function cloudinary(config, fetcher = fetch) {
  for (const key of ["cloud", "key", "secret"])
    if (!config[key])
      throw new Error("Cloudinary no está configurado en el servidor");
  async function post(resource, action, params, file) {
    const signed = { ...params, timestamp: Math.floor(Date.now() / 1000) },
      form = new FormData();
    for (const [k, v] of Object.entries(signed)) form.set(k, String(v));
    form.set("api_key", config.key);
    form.set("signature", await signature(signed, config.secret));
    if (file) form.set("file", file);
    const response = await fetcher(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloud)}/${resource}/${action}`,
      { method: "POST", body: form, signal: AbortSignal.timeout(90000) },
    );
    const data = await response.json();
    if (!response.ok)
      throw new Error(`Cloudinary rechazó la operación (${response.status})`);
    return data;
  }
  return {
    upload(resource, publicId, file) {
      return post(
        resource,
        "upload",
        {
          public_id: publicId,
          asset_folder: "siga/evidencias",
          type: "authenticated",
          overwrite: false,
        },
        file,
      );
    },
    async destroy(resource, publicId, type = "authenticated") {
      const result = await post(resource, "destroy", {
        public_id: publicId,
        type,
        invalidate: true,
      });
      if (!["ok", "not found"].includes(result.result))
        throw new Error("El proveedor no confirmó el borrado");
      return result;
    },
    secure(resource, publicId) {
      return post(resource, "rename", {
        from_public_id: publicId,
        to_public_id: publicId,
        type: "upload",
        to_type: "authenticated",
        overwrite: false,
        invalidate: true,
      });
    },
    async downloadURL(
      resource,
      publicId,
      format,
      type = "authenticated",
      ttl = 300,
    ) {
      if (
        !["image", "video"].includes(resource) ||
        !/^[a-z0-9]{2,8}$/.test(format)
      )
        throw new Error("Formato de evidencia no disponible");
      const params = {
          public_id: publicId,
          format,
          type,
          expires_at: Math.floor(Date.now() / 1000) + ttl,
          timestamp: Math.floor(Date.now() / 1000),
        },
        url = new URL(
          `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloud)}/${resource}/download`,
        );
      for (const [k, v] of Object.entries(params))
        url.searchParams.set(k, String(v));
      url.searchParams.set("api_key", config.key);
      url.searchParams.set("signature", await signature(params, config.secret));
      return url.href;
    },
  };
}
