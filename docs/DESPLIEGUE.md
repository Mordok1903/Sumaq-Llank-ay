# Integración y despliegue después de aprobar la prueba local

Este procedimiento describe la instalación o transición de cada proyecto. La migración v2 revoca escrituras del cliente anterior y cambia expedientes antiguos a revisión. Publicar solo la interfaz o aplicar solo la migración interrumpiría el cliente v1. Planificar un cambio coordinado con copia y ventana de mantenimiento.

Para ejecutar los archivos SQL y comandos en orden, consultar [Supabase paso a paso](SUPABASE_PASO_A_PASO.md). Para el uso diario, consultar [la guía de usuario](GUIA_USUARIO.md).

## 1. Entorno de desarrollo

Crear un proyecto Supabase de desarrollo vacío y un entorno Cloudinary de prueba. Usar las herramientas oficiales de [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started); registrar la versión usada en la bitácora del despliegue.

Para Supabase local con Docker: `supabase start`, `supabase db reset`, `supabase functions serve siga-api --env-file .env.server`. Estos comandos son únicamente para desarrollo. La configuración admite el endpoint HTTP de Supabase local solo cuando Vite está en desarrollo.

En un proyecto de desarrollo alojado: vincular el proyecto correcto, inspeccionar `supabase migration list` y aplicar las dos migraciones a la base vacía. Nunca ejecutar `db reset` contra producción.

Copiar `.env.example` como `.env` y configurar las tres variables públicas:

```dotenv
VITE_APP_MODE=supabase
VITE_SUPABASE_URL=https://REFERENCIA_DESARROLLO.supabase.co
VITE_SUPABASE_ANON_KEY=CLAVE_PUBLICA_DEL_PROYECTO
```

Usar la clave publicable/anon del proyecto. El rol de servicio y los secretos Cloudinary no llevan prefijo `VITE_` y no se guardan en Git. Para Supabase local, usar su URL/clave de desarrollo. Reiniciar Vite después de cambiar variables.

En los secretos de la función configurar `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `ALLOWED_ORIGINS` y `MAINTENANCE_SECRET` aleatorio de alta entropía. Supabase proporciona la URL y sus claves administradas en la función alojada; el código admite las variables heredadas y los diccionarios actuales de claves. Mantener los secretos en el proveedor o un gestor de secretos; no pegarlos en comandos que queden registrados.

`ALLOWED_ORIGINS` es una lista de orígenes exactos separados por coma, por ejemplo `http://127.0.0.1:5173`. CORS restringe navegadores y no sustituye la autorización. Toda operación de usuario comprueba sesión, perfil y propiedad en servidor.

Crear las cuentas iniciales desde la administración de Supabase. El trigger siempre crea evaluadores; asignar el primer administrador mediante una operación administrativa revisada por ID de cuenta. El navegador no puede ascender su rol.

## 2. Aceptación de integración

- Dos evaluadores y un administrador: probar lecturas ajenas, intentos de modificar `perfiles.rol`, altas administrativas y sesiones revocadas.
- Probar carga, visualización privada, caducidad del enlace y eliminación real. Intentar SVG/HTML disfrazado, archivos demasiado grandes y cargas concurrentes por encima del cupo.
- Interrumpir una carga y confirmar que mantenimiento limpia su reserva. Simular indisponibilidad del proveedor y comprobar reintento sin perder el trabajo.
- Completar, cerrar y recargar una evaluación; comparar huella, versiones, evidencias y auditoría. Cambiar seguimiento y confirmar que el informe no cambia.
- Probar guardado sin red y conflictos entre dos sesiones. Probar recuperación de contraseña desde el correo de desarrollo.
- Ejecutar `npm run check`, la comprobación Deno y `npm audit`. Registrar resultados y una restauración satisfactoria de copia antes de producción.

## 3. Configuración real de Auth

`supabase/config.toml` configura el entorno local; no actualiza por sí mismo el panel del proyecto alojado. En Auth del proyecto real, tras la aprobación:

- Desactivar registro público de correo y anónimo; las cuentas se crean por administración.
- Activar confirmación de correo, cambio seguro de contraseña y comprobación de contraseña actual cuando el flujo lo admita; mantener cambio seguro de correo.
- Establecer mínimo de 12 caracteres y activar protección de contraseñas filtradas si el plan lo permite. Configurar CAPTCHA con las claves del proveedor y pasar su token al inicio/recuperación si se activa: la interfaz actual no incluye un widget CAPTCHA y no debe activarse sin integrarlo.
- Configurar Site URL con el dominio HTTPS final y redirecciones exactas a `/pages/login.html?flow=recovery`. Mantener redirecciones localhost solo en desarrollo.
- Definir duración absoluta e inactividad de sesiones según la operación y disponibilidad del plan. La expiración del JWT por sí sola no impone esas duraciones. Mantener protección de reutilización de refresh tokens.
- Revisar los administradores existentes: la migración impide nuevas escaladas pero no puede determinar cuáles de los administradores anteriores eran legítimos.

CAPTCHA, claves de correo, límites de sesión del plan y verificación de administradores existentes requieren configuración de la cuenta. No se han dado por aplicados ni se han simulado como controles activos.

## 4. Copia y transición de una base v1 existente

1. Anunciar mantenimiento, impedir nuevas operaciones y conservar el estado del despliegue anterior. Obtener copia PostgreSQL y copia de los originales Cloudinary antes de cambiar datos o tipos de entrega.
2. Probar la restauración en un destino aislado. Revisar tablas, recuentos, cuentas y archivos; conservar la contraseña de la copia por separado.
3. Inspeccionar el esquema real y compararlo con `202611100001_legacy_schema.sql`. Esa migración es una base histórica para entornos vacíos; no se vuelve a ejecutar sobre el proyecto real. Si el esquema coincide, registrar **solo esa base** como aplicada con `supabase migration repair 202611100001 --status applied`. Revisar el historial antes y después.
4. Revisar el plan/diff de `202611100002_security_and_traceability.sql` en una copia del esquema. Aplicar solamente la migración pendiente mediante el flujo de migraciones oficial. Se conserva el registro v1 completo en `auditoria` y los cierres anteriores pasan a revisión; no se les atribuye un cierre v2 retroactivo.
5. Desplegar `siga-api`, sus secretos y los cambios de Auth. Migrar archivos antiguos y revisar sus metadatos. Habilitar mantenimiento y alertas.
6. Publicar la interfaz v2, ejecutar la aceptación en el sitio final y retirar mantenimiento. No restaurar el cliente v1 como solución a un fallo: sus permisos de escritura ya no existen.

Ante un fallo, mantener mantenimiento y corregir el despliegue o restaurar la copia completa de forma coordinada. No reabrir los permisos inseguros antiguos para que el cliente anterior vuelva a escribir. La restauración requiere evaluar las operaciones posteriores a la copia y el estado de los archivos.

## 5. Cloudinary

Las cargas nuevas de v2 son firmadas, van a `authenticated` y no usan el preset unsigned. El preset antiguo sigue siendo una vía independiente de carga hasta desactivarlo.

El script `scripts/secure-cloudinary.mjs` consulta por defecto y solo modifica con `--apply`. Requiere variables privadas `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y las tres de Cloudinary. No ejecutarlo desde una carpeta compartida ni con secretos públicos.

```powershell
npm run cloudinary:secure
npm run cloudinary:secure -- --apply
```

La aplicación exige `.env` por ese comando; también se puede invocar el script directamente con variables del proceso. El modo aplicado cambia **solo** `siga_evidencias` a firmado/autenticado con formatos permitidos, y protege los activos referenciados en la tabla. Recalcula la huella de originales y actualiza registros, con posibilidad de reanudar si falla la segunda parte. No inventa descripciones ni vínculos metodológicos: el evaluador debe completarlos o reemplazar la evidencia antes del nuevo cierre. No se ha ejecutado este script con las credenciales reales.

Inspeccionar también activos huérfanos de cargas anteriores: no se eliminan automáticamente ni se modifica un archivo ajeno a la tabla. Revisar transformaciones públicas y desactivar prestaciones unsigned que no se utilicen. Cambiar el tipo e invalidar caché no garantiza retirada inmediata de copias ya descargadas; comprobar los enlaces públicos anteriores.

Habilitar y verificar el respaldo de originales en Cloudinary o una exportación cifrada independiente con una política de retención. El dump PostgreSQL conserva registros y referencias, **no los bytes de fotos/videos**. El script no activa servicios de respaldo de pago ni cambia el plan.

Referencias: [preset administrativo](https://cloudinary.com/documentation/admin_api#update_an_upload_preset), [cambio de tipo de entrega](https://cloudinary.com/documentation/image_upload_api_reference#rename) y [descarga privada](https://cloudinary.com/documentation/image_upload_api_reference#download).

## 6. Mantenimiento y alertas

Configurar un programador privado cada cinco minutos que envíe POST a `/functions/v1/siga-api` con cuerpo `{"action":"maintenance"}` y Authorization Bearer `MAINTENANCE_SECRET`. No incluir Origin. El secreto solo permite mantenimiento; no operaciones de usuario.

Para Supabase Cron, el archivo opcional `supabase/sql/04_mantenimiento_programado.sql` prepara extensiones, almacenamiento del secreto en Vault y una función restringida de mantenimiento. Debe aplicarse y verificarse por administración; la publicación de la interfaz no crea el trabajo. Conservar el secreto real únicamente en una copia privada del archivo. Se restringe la lectura de la cola `pg_net`, que contiene temporalmente las cabeceras de la petición.

Alertar por fallo de ejecución, reservas pendientes de más de 15 minutos o trabajos de eliminación pendientes de más de una hora. Revisar `asset_jobs.ultimo_error` e `intentos`; reintentar conserva el trabajo hasta confirmación del proveedor. Configurar la alerta mediante la plataforma operativa disponible; no hay una tarea externa creada en esta entrega.

## 7. Respaldos y restauración

Instalar `pg_dump` compatible con la versión del servidor. Configurar `DATABASE_URL` y `BACKUP_PASSWORD` de al menos 20 caracteres en el entorno privado. `npm run backup` genera un dump de `public` y `auth`, cifrado AES-256-GCM y verificado antes de renombrarlo como copia completa. Nunca se escribe el dump en claro durante el respaldo.

```powershell
npm run backup
npm run backup -- --verify backups/NOMBRE.dump.enc
npm run backup -- --extract backups/NOMBRE.dump.enc --to backups/restauracion-prueba.dump
```

Para probar recuperación, preparar PostgreSQL aislado compatible con las extensiones y roles requeridos por el dump, configurar `PGDATABASE` con su conexión privada y ejecutar `pg_restore --exit-on-error --no-owner --no-acl backups/restauracion-prueba.dump`. No apuntar al proyecto activo. Los esquemas administrados de Supabase pueden requerir el procedimiento oficial de restauración del proveedor; cualquier error impide dar por validada la recuperación.

Comprobar recuentos, cuentas, permisos, auditoría, informes y hashes; restaurar/validar también originales multimedia. Después retirar el dump en claro de la carpeta privada. Conservar al menos una copia cifrada fuera del equipo y otra versión anterior; programar diariamente y comprobar la recuperación periódicamente según la retención acordada. `--verify` acredita integridad criptográfica, no restauración funcional. Solo se han probado cifrado y detección de alteraciones con datos ficticios.

## 8. Publicación

`npm run build` genera una compilación local. `npm run build:release` exige modo Supabase y configuración pública y rechaza nombres de secretos en variables `VITE_`. Vercel usa ese comando y `dist`, con CSP, cabeceras de seguridad y sin scripts CDN. Revisar orígenes CSP si se usa dominio Supabase personalizado u otro proveedor.

La V2 está integrada en `main`. Para una instalación nueva o una transición adicional, coordinar los servicios y completar la aceptación antes de publicar. Los registros de despliegue y pendientes de cada cuenta deben conservarse en una bitácora privada; esta guía no sustituye esas verificaciones.
