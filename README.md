# Sumaq Llank'ay · versión 2

Aplicación de evaluación ergonómica con REBA, RULA y un cuestionario psicosocial exploratorio propio. El cuestionario no equivale a FPSICO ni cuenta con validación psicométrica.

## Utilizar el aplicativo

Consulta la [guía de usuario](docs/GUIA_USUARIO.md) para crear una evaluación, completar los métodos, adjuntar evidencias, guardar, cerrar el informe y registrar seguimiento. También está disponible desde **Guía de uso** en el menú y desde la pantalla de acceso, sin necesidad de iniciar sesión.

El acceso incluye recuperación de contraseña y un diseño adaptable a celulares, tabletas y computadoras. Las cuentas conectadas se solicitan al administrador de la organización. El modo local permite practicar con información ficticia sin credenciales.

## Probar en este equipo

Requiere Node.js 22, versión 22.12 o posterior dentro de esa rama. El rango del proyecto excluye otras versiones mayores para conservar el entorno validado. Desde la carpeta del proyecto:

```powershell
npm ci
npm start
```

Abrir http://127.0.0.1:5173. El modo predeterminado usa datos ficticios y archivos guardados en IndexedDB de este navegador; no contacta con Supabase ni Cloudinary. No abrir los HTML con doble clic. El puerto y el navegador determinan qué datos de prueba aparecen.

Seguir [la prueba local](docs/PRUEBA_LOCAL.md). Para comprobar el código: `npm run check`. Para verificar la función de servidor: `npm exec deno -- check supabase/functions/siga-api/index.ts`.

La interfaz se adapta a celular, tableta, laptop y PC. Ver [la revisión del frontend y la prueba desde un dispositivo físico](docs/FRONTEND_ADAPTABLE.md).

## Qué cambió

- Cálculos compartidos y versionados entre navegador y servidor; correcciones de tablas y rangos REBA/RULA.
- Guardado de los controles actuales, borradores por usuario y evaluación, cola de guardado y detección de conflictos.
- Informes cerrados con datos, evidencias, versiones, revisión y SHA-256; seguimiento separado del informe.
- Cargas autenticadas, validación de contenido y tamaño, eliminación con reintentos y trazabilidad.
- Permisos de lectura por propietario/administrador y escrituras exclusivamente a través del servidor autenticado.
- Dependencias fijadas, compilación, pruebas de dominio, persistencia, permisos y cifrado de respaldos.

Ver [arquitectura](docs/ARQUITECTURA.md), [cambios y límites](docs/CORRECCIONES.md) y [publicación y configuración](docs/DESPLIEGUE.md).

Para configurar las variables y resolver un despliegue fallido de Vercel, consulta [Vercel paso a paso](docs/VERCEL_PASO_A_PASO.md).

## Estado de los servicios

La publicación del código no despliega los servicios. Las migraciones y los cambios de configuración de las cuentas reales no se han aplicado en esta entrega. Sigue [los scripts de Supabase en orden](docs/SUPABASE_PASO_A_PASO.md) y el procedimiento de cambio coordinado antes de utilizar V2 en producción. Los informes internos sobre las cuentas reales permanecen fuera del repositorio público.

La prueba local de interfaz no certifica una integración real con Supabase/Cloudinary. Esa comprobación debe realizarse en un proyecto de desarrollo antes del cambio coordinado de producción.
