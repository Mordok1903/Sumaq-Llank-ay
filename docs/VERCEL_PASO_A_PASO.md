# Publicar la interfaz V2 en Vercel

Esta guía configura la interfaz. Antes de utilizarla, la base debe tener la migración V2, la función `siga-api` debe estar activa y sus secretos deben estar configurados en Supabase. Consulta [Supabase paso a paso](SUPABASE_PASO_A_PASO.md).

## Variables de la interfaz

En el proyecto de Vercel, abre **Settings → Environment Variables → Add Environment Variable**. Añade estas tres entradas, sin comillas alrededor del valor:

| Name                     | Value                                                                               |
| ------------------------ | ----------------------------------------------------------------------------------- |
| `VITE_APP_MODE`          | `supabase`                                                                          |
| `VITE_SUPABASE_URL`      | `https://REFERENCIA_DE_TU_PROYECTO.supabase.co`                                     |
| `VITE_SUPABASE_ANON_KEY` | La clave publicable del mismo proyecto; también se admite la clave heredada `anon`. |

Obtén la URL y la clave pública desde **Supabase → Connect** o **Settings → API Keys**. Una clave publicable empieza por `sb_publishable_`. No utilices una clave `sb_secret_` ni `service_role` en estas variables.

Selecciona **Production** para la versión del dominio principal y **Preview** para la rama que estés revisando. Cada despliegue recibe las variables de su propio entorno: configurarlas solo en Production no resuelve un fallo de Preview. Para otras pruebas, utiliza un proyecto Supabase de desarrollo separado cuando corresponda.

Las variables Cloudinary, `MAINTENANCE_SECRET` y `ALLOWED_ORIGINS` las lee la función de Supabase. Añadirlas únicamente en Vercel no configura esa función. No les agregues prefijo `VITE_`.

## Compilación y versión de Node

El archivo `vercel.json` establece:

- Comando: `npm run build:release`.
- Carpeta publicada: `dist`.

El proyecto requiere Node 22.12 o posterior de la rama 22 y excluye otras versiones mayores. En **Settings → Build and Deployment → Node.js Version**, selecciona **22.x** para que el panel y `package.json` coincidan. El rango anterior `>=22.12.0` permitía que Vercel eligiera una versión mayor nueva.

Si aparece el error que pide configurar `VITE_APP_MODE`, `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`, revisa los nombres, los valores y el entorno seleccionado. La comprobación impide publicar el modo demo o incluir una clave secreta en el navegador; debe permanecer activa.

Las advertencias de instalación que no detienen el proceso son distintas del error final del comando de compilación. Revisa ese error final antes de cambiar dependencias.

## Dominios permitidos por Supabase

En **Supabase → Edge Functions → Secrets → ALLOWED_ORIGINS**, conserva una lista de orígenes exactos separados por coma. Ejemplo de formato:

```text
https://TU-DOMINIO.vercel.app,http://127.0.0.1:5173,https://TU-ALIAS-DE-RAMA.vercel.app
```

Sustituye los dominios por los reales. No incluyas rutas, barra final ni comodines. Si vas a probar una Preview, copia su dominio exacto desde los detalles del despliegue y añádelo a la lista existente. Un dominio de producción permitido no autoriza automáticamente el dominio de Preview. El alias estable de la rama evita tener que cambiar esta lista en cada nueva compilación de esa misma rama.

Configura por separado los destinos exactos de recuperación de contraseña en Supabase Auth, como indica la guía de Supabase. `ALLOWED_ORIGINS` controla las llamadas del navegador a la función y no configura las redirecciones de correo.

## Repetir el despliegue y probar

Guarda primero las variables. Los cambios no se incorporan a despliegues anteriores: crea un despliegue nuevo o usa **Redeploy**. Si también hubo un cambio de código, utiliza el despliegue del **commit más reciente de la rama**, no la ejecución antigua que falló.

Espera el estado **Ready**. Abre el acceso de la Preview y comprueba sesión, guardado/reapertura y evidencia con información ficticia. No des por validada la integración solo porque compile. Un error de origen después de compilar requiere revisar la lista de dominios de Supabase.

La rama `feat/siga-v2-login-manual` y su solicitud de integración permiten revisar la V2. Publicar una Preview no integra la rama con `main` ni cambia por sí mismo el dominio de producción. Completa la aceptación antes de promoverla o integrar los cambios.

Referencias oficiales: [variables de Vercel](https://vercel.com/docs/environment-variables/managing-environment-variables), [versiones de Node](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions) y [claves de Supabase](https://supabase.com/docs/guides/getting-started/api-keys).
