# Supabase: scripts y puesta en marcha de la versión 2

Estos archivos se aplican por proyecto y se han probado en una base aislada. Antes de ejecutarlos, comprueba el estado del proyecto de destino. Subir el código a GitHub no aplica SQL, no configura Auth y no despliega la función de servidor.

## Qué ejecutar y en qué orden

Abre el proyecto correcto en Supabase y entra en **SQL Editor → New query**. Copia el archivo completo de cada paso, ejecútalo y comprueba el resultado antes de continuar. No pegues contraseñas ni claves en SQL.

| Orden | Archivo                                                                                                         | Cuándo usarlo                                                                                   |
| ----- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1     | [00_revision_previa.sql](../supabase/sql/00_revision_previa.sql)                                                | Siempre: consulta el estado sin modificar datos.                                                |
| 2     | [202611100002_security_and_traceability.sql](../supabase/migrations/202611100002_security_and_traceability.sql) | Una sola vez sobre una base V1 compatible, después del respaldo y durante el cambio coordinado. |
| 3     | [02_verificar_v2.sql](../supabase/sql/02_verificar_v2.sql)                                                      | Después de migrar, o para revisar una base que ya es V2.                                        |
| 4     | [03_administrador_inicial.sql](../supabase/sql/03_administrador_inicial.sql)                                    | Opcional: asigna el primer administrador autorizado.                                            |

El paso 1 debe indicar **Base V1 detectada** si existen las tres tablas antiguas. Eso no comprueba que todas sus columnas coincidan: compara el esquema con la [base histórica](../supabase/migrations/202611100001_legacy_schema.sql). Si ya detecta V2, pasa directamente a la verificación; no repitas la migración. Si faltan tablas, revisa la instalación antes de continuar.

**No ejecutes `supabase_schema.sql`: está retirado. No ejecutes la migración 001 sobre una base existente.** Esa base histórica solo sirve para construir un entorno vacío junto con la migración 002; por sí sola conserva los permisos antiguos y no es una instalación terminada.

## Antes de migrar una base existente

1. Guarda una copia de PostgreSQL y de los originales de Cloudinary. Comprueba la restauración en un destino aislado; la copia de la base no incluye los bytes de fotos y videos.
2. Prueba la migración sobre esa copia. Si el esquema real difiere, adapta y revisa la migración antes de aplicarla.
3. Programa mantenimiento y detén las operaciones de la versión anterior. La migración revoca sus escrituras directas: base, función e interfaz V2 deben entrar en servicio de forma coordinada.
4. Ejecuta el archivo 002 completo, desde `BEGIN` hasta `COMMIT`. Si falla, conserva el error y revisa la causa; no quites comprobaciones para forzarlo. Si la sesión queda dentro de una transacción fallida, ejecuta `ROLLBACK;` antes de volver a consultar.
5. Ejecuta el verificador 02. Debe devolver **OK: tablas, RLS y permisos de operaciones v2 verificados**. El resumen de archivos ayuda a detectar originales antiguos que todavía requieren protección.

La migración conserva el registro anterior en auditoría y devuelve los cierres antiguos a revisión. No convierte un informe V1 en un cierre V2 ya validado. No borra las evaluaciones existentes.

### Primer administrador, si hace falta

Primero crea la cuenta legítima desde **Authentication → Users**. En el archivo 03, sustituye únicamente el valor de esta asignación por el correo exacto de esa cuenta:

```sql
DECLARE correo_admin text := 'ADMIN_EMAIL_REEMPLAZAR'; cuenta uuid; anterior text;
```

Ejecuta **todo el archivo 03**, no solo esa línea. El script exige una cuenta y un perfil existentes, registra el cambio en auditoría y no duplica el evento si la cuenta ya era administradora. No modifica contraseñas. Si ya tienes un administrador válido, puedes omitir este paso. Revisa también los administradores heredados: la migración no decide cuáles eran legítimos.

## Desplegar la función de servidor

El SQL no basta: la interfaz V2 guarda a través de `siga-api`. Desde esta carpeta, con Supabase CLI instalado, autentícate y vincula **la referencia del proyecto que acabas de revisar**:

```powershell
supabase login
supabase link --project-ref REFERENCIA_DE_TU_PROYECTO
supabase migration list --remote
```

Elige un único procedimiento de migración para ese proyecto. Si aplicaste SQL manualmente, registra en el historial **solo las versiones cuyo esquema ya comprobaste**, antes de usar `db push`. `migration repair` cambia el historial, no ejecuta SQL:

```powershell
# Solo si la base histórica 001 coincide con la base que ya existía:
supabase migration repair --status applied 202611100001 --remote
# Solo después de aplicar 002 y obtener OK en el verificador:
supabase migration repair --status applied 202611100002 --remote
supabase migration list --remote
```

Para un **proyecto de desarrollo completamente vacío**, la alternativa es `supabase db push --remote`, que aplica ambas migraciones en orden. No lo uses sobre una base existente con historial sin reconciliar. No ejecutes `db reset` en producción.

Crea un archivo privado `.env.server` en tu equipo con los siguientes nombres y tus valores reales. Está excluido de Git. No uses el prefijo `VITE_` en estos secretos:

```dotenv
CLOUDINARY_CLOUD_NAME=TU_CLOUD_NAME
CLOUDINARY_API_KEY=TU_API_KEY
CLOUDINARY_API_SECRET=TU_API_SECRET
ALLOWED_ORIGINS=https://TU_DOMINIO
MAINTENANCE_SECRET=SECRETO_ALEATORIO_LARGO_Y_PRIVADO
```

`ALLOWED_ORIGINS` acepta varios orígenes exactos separados por coma, sin rutas ni barra final. Para desarrollo puedes incluir `http://127.0.0.1:5173`; en producción usa los dominios reales. Genera el secreto de mantenimiento con tu gestor de contraseñas; no reutilices ninguna contraseña de usuario.

```powershell
supabase secrets set --env-file .env.server
supabase functions deploy siga-api --project-ref REFERENCIA_DE_TU_PROYECTO
```

Supabase proporciona las claves administradas de su proyecto a la función alojada. El código admite tanto las variables heredadas como los diccionarios actuales `SUPABASE_SECRET_KEYS` y `SUPABASE_PUBLISHABLE_KEYS`. No copies una clave secreta al navegador. La opción `verify_jwt = false` ya está en `supabase/config.toml`: la función valida las sesiones de usuario con `auth.getUser()` y comprueba perfil y propiedad en cada operación; el mantenimiento usa su secreto independiente.

## Ajustes en el panel que no se hacen con SQL

En **Authentication**, configura la URL HTTPS del sitio y permite la redirección exacta `https://TU_DOMINIO/pages/login.html?flow=recovery`. Desactiva el registro público y anónimo; establece el mínimo de contraseña de 12 caracteres y los controles de confirmación/cambio seguro. Comprueba el envío y la entrega de correos de recuperación. `supabase/config.toml` describe el entorno local y no cambia automáticamente estos ajustes alojados.

La interfaz todavía no incluye un widget CAPTCHA. Si decides exigirlo en Auth, integra primero el widget y su token para evitar bloquear el acceso. Consulta el resto de ajustes y las pruebas de aceptación en [DESPLIEGUE.md](DESPLIEGUE.md).

Cloudinary también requiere sus credenciales y la revisión del preset y de los archivos antiguos. El SQL no protege archivos ya publicados. El [procedimiento de Cloudinary](../CLOUDINARY_SETUP.md) y el script `scripts/secure-cloudinary.mjs` separan consulta y aplicación; no se han ejecutado cambios reales en esta entrega.

## Conectar y probar la interfaz

En `.env` local, o en las variables de compilación del alojamiento, usa únicamente valores públicos:

```dotenv
VITE_APP_MODE=supabase
VITE_SUPABASE_URL=https://REFERENCIA_DE_TU_PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=CLAVE_PUBLICABLE_O_ANON_DEL_PROYECTO
```

Reinicia el servidor local después de cambiar `.env`. Para publicar, ejecuta `npm run build:release` y usa `dist`. Mantén el proyecto de prueba separado del real.

Antes de retirar mantenimiento, prueba dos evaluadores y un administrador: acceso, recuperación por correo, aislamiento entre cuentas, guardado y reapertura, carga y visualización privada, eliminación, cierre y seguimiento. El verificador SQL comprueba permisos y estructura; **no acredita** la configuración de Auth, la función desplegada, los archivos de Cloudinary ni una restauración real.

No hacen falta buckets de Supabase Storage para esta versión: los originales multimedia se gestionan en Cloudinary. Configura también el mantenimiento periódico y las alertas descritos en [DESPLIEGUE.md](DESPLIEGUE.md).

### Mantenimiento periódico opcional

El archivo [04_mantenimiento_programado.sql](../supabase/sql/04_mantenimiento_programado.sql) prepara un trabajo cada cinco minutos con `pg_cron` y `pg_net`. Requiere V2 verificada, `siga-api` activa y autorización administrativa para crear extensiones, guardar el secreto limitado en Vault y ejecutar llamadas periódicas. No se activa automáticamente al publicar la interfaz.

Utiliza una copia privada del archivo, sustituye la URL y la asignación inicial de `MAINTENANCE_SECRET_REEMPLAZAR` por el mismo secreto de la función y conserva los controles que rechazan los marcadores sin sustituir. No uses una clave de servicio para el mantenimiento ni subas la copia privada al repositorio. El archivo público debe conservar sus marcadores.

La cola de `pg_net` contiene temporalmente la cabecera de autorización; el script restringe su esquema, tablas y funciones para los roles del navegador. La función administrativa tiene ejecución exclusivamente de servidor y el job solo guarda una llamada a esa función, sin incluir el secreto en el texto del cron. Después de aplicarlo, verifica el job y una respuesta HTTP real; el alta del cron no acredita que el mantenimiento funcione. Para otro programador privado, sigue el procedimiento de DESPLIEGUE.md.

Referencias oficiales: [migraciones](https://supabase.com/docs/guides/deployment/database-migrations), [secretos de funciones](https://supabase.com/docs/guides/functions/secrets), [despliegue de funciones](https://supabase.com/docs/guides/functions/deploy) y [programación de funciones](https://supabase.com/docs/guides/functions/schedule-functions).
