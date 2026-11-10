import { text } from "./evaluation.js";
export class MediaValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "MediaValidationError";
  }
}
export function validateEvidence(meta) {
  if (!["reba", "rula", "ambos"].includes(meta?.metodo))
    throw new MediaValidationError(
      "Indique el método que documenta la evidencia",
    );
  const descripcion = text(meta.descripcion, 2000),
    lado = text(meta.lado, 20),
    fotograma_segundos = Number(meta.fotograma_segundos || 0);
  if (descripcion.length < 10)
    throw new MediaValidationError(
      "Describa la postura y los ángulos observados (mínimo 10 caracteres)",
    );
  if (!["derecho", "izquierdo", "ambos", "no_aplica"].includes(lado))
    throw new MediaValidationError("Indique el lado corporal");
  if (
    !Number.isFinite(fotograma_segundos) ||
    fotograma_segundos < 0 ||
    fotograma_segundos > 86400
  )
    throw new MediaValidationError("Fotograma inválido");
  return { metodo: meta.metodo, descripcion, lado, fotograma_segundos };
}
export function validateFile(mime, bytes) {
  const ascii = (start, n) =>
    new TextDecoder().decode(bytes.slice(start, start + n));
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255,
    png = [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v),
    webp = ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP",
    iso = ascii(4, 4) === "ftyp",
    webm = [26, 69, 223, 163].every((v, i) => bytes[i] === v);
  const image =
      (mime === "image/jpeg" && jpeg) ||
      (mime === "image/png" && png) ||
      (mime === "image/webp" && webp),
    video =
      (["video/mp4", "video/quicktime"].includes(mime) && iso) ||
      (mime === "video/webm" && webm);
  if (!image && !video)
    throw new MediaValidationError(
      "El contenido del archivo no coincide con un formato permitido",
    );
  if (!bytes.length || bytes.length > (image ? 10_000_000 : 25_000_000))
    throw new MediaValidationError(
      image ? "La imagen supera 10 MB" : "El video supera 25 MB",
    );
  return image ? "imagen" : "video";
}
