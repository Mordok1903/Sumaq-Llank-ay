# Prueba local antes de GitHub

Abrir **http://127.0.0.1:5173** con el servidor `npm start` activo. No se requieren credenciales. El aviso «Prueba local» confirma que se trabaja con datos ficticios en el navegador.

La revisión de celulares, tabletas y escritorio y la forma de probar en un dispositivo físico se describen en [FRONTEND_ADAPTABLE.md](FRONTEND_ADAPTABLE.md).

1. Crear una evaluación nueva y completar los siete datos obligatorios. Usar nombres ficticios. Guardar, recargar y comprobar que se conservan.
2. Adjuntar una foto y un video de prueba con descripción de al menos diez caracteres, método, lado y segundo del video. Comprobar que pueden abrirse. La mascota del proyecto y `test-results/video-prueba.mp4` sirven como archivos técnicos de prueba; no acreditan posturas reales.
3. Completar REBA y RULA. Guardar con el botón y Ctrl+S sin pulsar Continuar. Recargar y comprobar selecciones, correcciones y puntajes. Reiniciar un módulo y verificar que queda incompleto después de recargar.
4. Contestar solo 15 preguntas: la completitud debe ser 50% y el resultado global debe quedar incompleto. Completar las 30 y abrir Resultados.
5. Intentar cerrar con calidad o evidencias pendientes: debe indicar lo que falta. Agregar una medida con responsable y plazo; completar las seis revisiones de calidad y las cuatro de preparación.
6. Cerrar y conservar el informe. Deben aparecer fecha, revisión, versiones, huella y descarga JSON. Recargar: el informe permanece cerrado; los módulos dejan de ser editables.
7. Guardar un seguimiento posterior con estado «verificada» y una explicación de al menos diez caracteres. La huella del informe debe permanecer igual. Probar la vista de impresión y sus fotografías.
8. Crear otra evaluación y abrir ambas en pestañas distintas: modificar una no debe cambiar la otra. Para probar conflictos, abrir la misma evaluación en dos pestañas, guardar en una y después en la otra; la segunda debe conservar su borrador y ofrecer recuperación.
9. Revisar Mis evaluaciones y sus filtros. El usuario «Evaluador de prueba» es ficticio; crear cuentas reales no está habilitado en demo.

## Alcance de la comprobación

Las pruebas automáticas usan PostgreSQL aislado para ejecutar las migraciones y verificar permisos, concurrencia, cierre y auditoría; no conectan a la base real. El recorrido de navegador usa IndexedDB y archivos ficticios. Subidas a Cloudinary, correos, recuperación de contraseña, dos cuentas reales y mantenimiento programado necesitan la integración de desarrollo descrita en DESPLIEGUE.md.

Los datos de prueba dependen del navegador y del origen exacto: `localhost` y `127.0.0.1` tienen almacenes distintos. Para limpiar la prueba, borrar los datos del sitio desde el navegador. No hacerlo sobre el sitio real para intentar borrar expedientes del servidor.
