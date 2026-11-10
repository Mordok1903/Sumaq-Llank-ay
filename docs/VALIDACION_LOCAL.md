# Validación local · 10 de noviembre de 2026

Base de trabajo: `c717220b6206b97f4563f8383a2f5ec578609af0`. Los cambios V2 se entregan en una rama para revisión; no se han modificado los servicios reales.

## Comprobaciones ejecutadas

| Comprobación                                   | Resultado                                                                             |
| ---------------------------------------------- | ------------------------------------------------------------------------------------- |
| `npm run check`                                | 47 pruebas aprobadas, 0 fallos, 0 omitidas; compilación de las nueve páginas correcta |
| Deno `check` de `siga-api`                     | Correcto                                                                              |
| `npm audit --json`                             | 0 vulnerabilidades conocidas reportadas                                               |
| `npm run build:release` sin configuración real | Rechazado como se esperaba; impide publicar el modo demo                              |
| `git diff --check`                             | Sin errores de espacios                                                               |
| Revisión de inserción HTML y eventos internos  | Sin `innerHTML`, `eval` ni eventos HTML internos en la aplicación                     |

Las pruebas cubren cálculos y límites, cuestionario parcial, normalización de datos, fechas, cabeceras/tamaños de archivos, firmas Cloudinary, cuotas concurrentes IndexedDB, conflictos y borradores, cifrado de copias y SQL ejecutado en PostgreSQL aislado. En SQL se comprueban los tres roles, altas sin escalada, propiedad, revisión, cupos, cola de borrado, cierre, inmutabilidad y seguimiento.

La ejecución completa incluye la compatibilidad con etiquetas RULA anteriores, cinco pruebas de la mascota, cuatro de acceso/recuperación con autenticación simulada, las claves de servidor heredadas/actuales y los scripts SQL de verificación y administrador. La prueba del administrador verifica rechazo del marcador sin sustituir, asignación y repetición sin duplicar auditoría.

## Acceso y documentación

Se comprobó el acceso conectado con una configuración local ficticia, sin enviar credenciales a servicios reales: formulario vacío, foco del error, mostrar/ocultar contraseña y recuperación sin correo. La entrega real del correo y la recuperación alojada quedan pendientes de integración.

El acceso conectado, el acceso demo y la guía pública se revisaron en anchos 320, 375, 820 y 1366 px: doce combinaciones sin desbordamiento horizontal. Los campos de acceso conservaron 48 px de alto y texto de 16 px. La guía se abre desde el acceso sin iniciar sesión. El modo demo presenta entrada sin cuenta y no pide credenciales.

## Recorrido de navegador ejecutado

Se utilizaron nombres ficticios, la mascota PNG del proyecto y un MP4 azul generado de un segundo. Todo se guardó en IndexedDB local.

- Identificación guardada y recuperada al recargar.
- REBA con cuello 3: resultado final 2; RULA con segmentos brazo 6, antebrazo 3 y muñeca 4: resultado final 5.
- Cuestionario con exactamente 30 preguntas, 150 opciones e identificadores únicos; completitud y resultado conservados.
- Foto y video guardados con descripción y método; imagen cargada y video de un segundo listo para reproducirse.
- Calidad y plan persistidos; cierre de evaluación y controles bloqueados.
- Seguimiento posterior guardado y recuperado sin cambiar la huella del informe.
- Segundo expediente separado, selección parcial RULA conservada al recargar, reinicio persistido y panel incompleto con «Sin evaluar».
- Historial filtrado por empresa y reapertura del informe cerrado.
- Corrección del margen duplicado: ancho de página igual al ancho visible de 1274 px, sin desplazamiento horizontal en el informe observado.

Se activó el control de impresión, que abrió/bloqueó la interacción de la pestaña durante el diálogo del navegador; se canceló cerrando esa pestaña de prueba. **No se ha inspeccionado un PDF final ni confirmado una impresión física.** La prueba de impresión queda indicada en PRUEBA_LOCAL.md.

## Pendiente fuera del entorno local

Integración de la función con las cuentas de desarrollo, correos y recuperación, cargas/borrados reales en Cloudinary, migración de originales antiguos, configuración Auth alojada, mantenimiento programado, alertas y restauración funcional de un respaldo real. Las pruebas locales no acreditan esos puntos ni validación profesional de los métodos.

El registro actualizado se conserva en `test-results/verificacion-publicacion.log`, las mediciones del acceso/ayuda en `test-results/acceso-ayuda-responsive.json` y su captura en `test-results/acceso-escritorio.jpg`. El recorrido anterior conserva la captura `test-results/informe-cerrado.jpg`. Esa carpeta está excluida de Git.
