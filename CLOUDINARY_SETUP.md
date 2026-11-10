# Cloudinary en la versión 2

La guía anterior de subidas unsigned queda sustituida por [el procedimiento de integración y despliegue](docs/DESPLIEGUE.md#5-cloudinary).

Las evidencias nuevas pasan por una función autenticada de Supabase, se firman en el servidor y se almacenan con tipo `authenticated`. La clave secreta de Cloudinary no se incluye en el navegador. La visualización utiliza enlaces firmados de cinco minutos.

Límites de la aplicación: 10 fotos y 3 videos por evaluación; 10 MB por imagen y 25 MB por video. Formatos: JPG, PNG, WebP, MP4, MOV y WebM. El servidor valida cabecera, tamaño, propietario y metadatos antes de subir.

Antes de producción hay que desactivar el preset unsigned antiguo `siga_evidencias`, proteger los originales ya existentes, revisar activos huérfanos y configurar el mantenimiento de eliminaciones y los respaldos. El script `scripts/secure-cloudinary.mjs` ofrece simulación por defecto y requiere `--apply` para modificar. No se ha ejecutado con las credenciales reales.

El modo local predeterminado usa IndexedDB y no se conecta a Cloudinary. Es adecuado para revisar el recorrido con archivos ficticios, pero no verifica la configuración de la cuenta real.
