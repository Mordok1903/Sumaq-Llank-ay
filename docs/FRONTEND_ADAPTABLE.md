# Interfaz adaptable · comprobación del 10 de noviembre de 2026

El frontend conserva la identidad visual, con una capa común de adaptación y navegación. La entrega final incluye las ocho páginas originales y una guía pública nueva. Los cálculos, permisos y persistencia siguen separados de la presentación.

## Cambios

- Mascota visible en todos los tamaños: arriba del encabezado en pantallas estrechas y al lado en escritorio. Conserva su consejo al tocarla o usar Enter/Espacio. Se verificó su carga y ausencia de desbordamiento en anchos 320, 375, 605, 820, 1366 y 1920.
- Interacción de la mascota restaurada: saludo inicial, cuatro frases originales que alternan al pulsar, salto y mensajes contextuales al pasar el puntero o enfocar botones y tarjetas. Los temporizadores se renuevan con cada mensaje; también se conserva la interacción al volver mediante la caché del navegador. Las cinco pruebas específicas de la mascota y las dos de interfaz pasan; la compilación y la comprobación en navegador son correctas.
- Navegación lateral en escritorio y menú modal en celular/tableta. Se reutilizan los mismos enlaces, sin duplicar la navegación ni sus identificadores. Al cambiar de tamaño, se cierra el menú y se restaura la distribución correspondiente.
- Menú con control de foco, Tab/Mayús+Tab, Escape, estado accesible y retorno al botón de apertura. En horizontal se puede desplazar su contenido conservando visible el cierre.
- Cuadrículas y formularios que se ajustan al espacio disponible. El historial pasa de tabla a tarjetas identificadas en pantallas pequeñas y conserva sus etiquetas y semántica de tabla.
- Resumen de REBA/RULA visible al pie cuando el panel completo queda debajo del formulario, con acceso a su detalle. El resultado se actualiza también al usar las flechas del teclado.
- Opciones de cuestionario con texto legible y selección nativa visible; resumen de dimensiones desplegable y progreso persistente durante el desplazamiento.
- Preguntas dentro de la tarjeta, con número destacado y cabecera de 16 px. Respuestas de 14 px: cinco columnas cuando hay espacio y filas de 52 px en anchos de hasta 700 px. En ventanas de poca altura el progreso deja de ser fijo para no cubrir el texto.
- Controles de al menos 44 px de alto en las vistas comprobadas, campos de texto de 16 px, foco visible y enlace para saltar al contenido. Se respeta la preferencia de reducir animaciones.
- Gráfica y etiquetas ajustadas, fotografías y videos dentro de los límites de la pantalla. Cerrar una evidencia con Escape también libera el reproductor y su enlace temporal local.
- Zona de menú y barra de resultados excluidas de impresión. Los estilos de adaptación se cargan después de los estilos de cada página para evitar que estos los anulen.

## Comprobación de tamaños

Se revisaron las **ocho páginas** —inicio, identificación, REBA, RULA, cuestionario, resultados, historial y acceso— en estos cinco tamaños:

| Vista            | Tamaño de ventana |
| ---------------- | ----------------- |
| Celular pequeño  | 320 × 568         |
| Celular          | 375 × 812         |
| Tableta vertical | 820 × 1180        |
| Laptop           | 1366 × 768        |
| PC               | 1920 × 1080       |

Son 40 combinaciones. Se añadieron otras 18 comprobaciones de calculadora y resultados en anchos 430, 768, 844, 960, 1024, 1100, 1101, 1279 y 1280; la de 844 × 390 verifica orientación horizontal. **Total: 58 combinaciones, sin desbordamiento horizontal del documento.** También se inspeccionaron elementos que sobresalieran del área visible y botones/opciones demasiado bajos en las 40 combinaciones principales.

Se verificaron apertura/cierre del menú, recorrido con teclado, cambio de tamaño con menú abierto, selección por flechas, actualización del puntaje, restauración de respuestas al recargar, progreso del cuestionario y ajuste de foto/video. Un diálogo de evidencia se probó a 320 × 568 y luego en horizontal; Escape lo retiró correctamente.

La validación se realizó cambiando el tamaño de ventana en el navegador integrado basado en Chromium. No equivale a una prueba física de todos los dispositivos ni de Safari, Firefox o sus teclados virtuales. Conviene completar la aceptación con un iPhone/Android y una tableta reales antes de publicar.

## Pruebas y archivos

La comprobación inicial de adaptación aprobó 35 pruebas. La ejecución completa final `npm run check` aprueba **47 pruebas, 0 fallos y compilación de nueve páginas correcta**. Incluye navegación, resumen de resultados, mascota y acceso. El cierre con Escape de medios y la presentación final de preguntas se comprobaron también en el navegador.

El acceso final usa dos columnas en escritorio y una tarjeta en pantallas estrechas; distingue el modo conectado del acceso demo. El acceso conectado, el acceso demo y la guía pública se comprobaron además en anchos 320, 375, 820 y 1366 px sin desbordamiento. Los campos conservan 16 px de texto y 48 px de alto. Ver [validación local](VALIDACION_LOCAL.md).

La tarjeta de pregunta se revisó adicionalmente en anchos 320, 375, 605, 701, 768, 820, 1366 y 1920. La cabecera quedó dentro del borde, separada de las respuestas y sin desbordamiento en todos ellos.

- Registro local: `test-results/verificacion-responsive.log`.
- Matriz de mediciones: `test-results/responsive-checks.json`.
- Capturas: `test-results/frontend-celular.jpg`, `frontend-tableta.jpg` y `frontend-pc.jpg`.
- Tarjeta de pregunta corregida: `test-results/pregunta-corregida.jpg`.

`test-results` permanece fuera de Git. Publicar el código en una rama no despliega el sitio ni modifica los servicios reales.

## Probar desde un celular o tableta físicos

La prueba en este equipo sigue en http://127.0.0.1:5173. Esa dirección, abierta desde un celular, se refiere al propio celular.

Para una prueba temporal por la misma red Wi-Fi, mantener el modo demo y ejecutar en el equipo:

```powershell
npm run dev:lan
```

Abrir en el otro dispositivo `http://IP_LOCAL_DEL_EQUIPO:5174`, sustituyendo el texto por la IPv4 del equipo en esa red. El puerto separado permite mantener la prueba de escritorio. Este comando habilita acceso desde la red local y se deja preparado para ejecutarlo manualmente; no se ha iniciado ni modificado el firewall. Detenerlo con Ctrl+C al terminar.

Usar datos ficticios. Cada navegador/origen tiene su propio almacén demo; los datos del celular no se sincronizan con los del PC. Para comprobar una integración real en la red, se deben configurar antes sus orígenes y redirecciones en el servidor de desarrollo.

En el equipo físico comprobar: giro vertical/horizontal, teclado virtual, zoom, selección táctil, menú, guardado/recarga y visualización de evidencia. La generación del PDF final continúa dentro de la aceptación manual de PRUEBA_LOCAL.md.
