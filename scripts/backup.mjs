import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import {
  appendFile,
  mkdir,
  open,
  rename,
  stat,
  unlink,
} from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { Writable } from "node:stream";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const MAGIC = Buffer.from("SIGABK02");
function key(password, salt) {
  if (typeof password !== "string" || password.length < 20)
    throw new Error(
      "BACKUP_PASSWORD debe tener al menos 20 caracteres y conservarse fuera del respaldo.",
    );
  return scryptSync(password, salt, 32);
}
export async function encryptBackup(source, target, password) {
  const salt = randomBytes(16),
    iv = randomBytes(12),
    header = Buffer.concat([MAGIC, salt, iv]),
    cipher = createCipheriv("aes-256-gcm", key(password, salt), iv);
  cipher.setAAD(header);
  const output = createWriteStream(target, { flags: "wx", mode: 0o600 });
  output.write(header);
  await pipeline(source, cipher, output);
  await appendFile(target, cipher.getAuthTag());
}
export async function verifyBackup(path, password, destination) {
  const handle = await open(path, "r");
  let header, tag;
  try {
    const size = (await handle.stat()).size;
    if (size < 52) throw new Error("Respaldo incompleto");
    header = Buffer.alloc(36);
    tag = Buffer.alloc(16);
    await handle.read(header, 0, 36, 0);
    await handle.read(tag, 0, 16, size - 16);
    if (!header.subarray(0, 8).equals(MAGIC))
      throw new Error("Formato de respaldo desconocido");
  } finally {
    await handle.close();
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(password, header.subarray(8, 24)),
    header.subarray(24, 36),
  );
  decipher.setAAD(header);
  decipher.setAuthTag(tag);
  let bytes = 0;
  await pipeline(
    createReadStream(path, { start: 36, end: (await stat(path)).size - 17 }),
    decipher,
    destination ||
      new Writable({
        write(chunk, encoding, done) {
          bytes += chunk.length;
          done();
        },
      }),
  );
  return { bytes, verified: true };
}
async function main() {
  const args = process.argv.slice(2),
    password = process.env.BACKUP_PASSWORD;
  if (args[0] === "--verify") {
    if (!args[1]) throw new Error("Indique el archivo cifrado a verificar");
    await verifyBackup(args[1], password);
    console.log(
      "Respaldo cifrado íntegro y contraseña verificada. Falta probar su restauración PostgreSQL en un entorno aislado.",
    );
    return;
  }
  if (args[0] === "--extract") {
    if (!args[1] || args[2] !== "--to" || !args[3])
      throw new Error("Use --extract respaldo.dump.enc --to destino.dump");
    await verifyBackup(args[1], password);
    await verifyBackup(
      args[1],
      password,
      createWriteStream(args[3], { flags: "wx", mode: 0o600 }),
    );
    console.log(
      "Copia descifrada para restauración. Manténgala en una carpeta privada y elimínela tras la prueba.",
    );
    return;
  }
  await mkdir("backups", { recursive: true });
  const target = resolve(
      "backups",
      `siga-${new Date().toISOString().replace(/[:.]/g, "-")}.dump.enc`,
    ),
    partial = target + ".partial";
  let child, source, finished;
  if (args[0] === "--input" && args[1]) source = createReadStream(args[1]);
  else {
    if (!process.env.DATABASE_URL)
      throw new Error(
        "Configure DATABASE_URL en el entorno del proceso. No lo incluya en comandos ni archivos públicos.",
      );
    // La conexión se transmite al proceso por el entorno, sin contraseña en argumentos.
    child = spawn(
      process.env.PG_DUMP_PATH || "pg_dump",
      [
        "--format=custom",
        "--no-owner",
        "--no-acl",
        "--schema=public",
        "--schema=auth",
      ],
      {
        env: { ...process.env, PGDATABASE: process.env.DATABASE_URL },
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      },
    );
    child.stderr.resume();
    source = child.stdout;
    finished = new Promise((resolve, reject) => {
      child.on("error", () =>
        reject(
          new Error(
            "No se pudo iniciar pg_dump. Instale PostgreSQL o configure PG_DUMP_PATH.",
          ),
        ),
      );
      child.on("close", (code) =>
        code === 0
          ? resolve()
          : reject(
              new Error(
                "pg_dump no completó el respaldo. Revise conexión y permisos.",
              ),
            ),
      );
    });
    finished.catch(() => {});
  }
  try {
    await encryptBackup(source, partial, password);
    if (finished) await finished;
    await verifyBackup(partial, password);
    await rename(partial, target);
    console.log(`Respaldo cifrado y verificado: ${target}`);
  } catch (error) {
    child?.kill();
    await unlink(partial).catch(() => {});
    throw error;
  }
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
