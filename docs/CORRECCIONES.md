# Seguimiento de la auditoría

Estado: implementación local v2, pendiente de prueba del usuario y de integración/despliegue. Los documentos de auditoría originales conservan la situación observada antes de estos cambios.

| Hallazgo                                     | Cambio preparado                                                           | Verificación                                           |
| -------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------ |
| Escalada por actualización del perfil        | Sin escritura directa del navegador; rol validado en servidor              | Prueba real de permisos SQL                            |
| Rol administrativo en metadatos del registro | Trigger fija evaluador; altas administrativas solo en servidor             | Prueba SQL con metadatos manipulados                   |
| HTML sin escapar                             | Construcción DOM con texto; sin eventos internos ni CDN de scripts         | Pruebas DOM con carga XSS                              |
| Tablas y recortes RULA                       | Tabla completa 6×3×4×2 y rangos completos                                  | Regresiones y combinaciones de índices                 |
| Cuello 3 y celdas REBA                       | Tabla A completa y correcciones de B y postura sentada                     | Regresiones e índices                                  |
| Guardar sin continuar perdía cambios         | Captura actual, Ctrl+S, autoguardado y cola                                | Pruebas de estado y navegador                          |
| Errores remotos ignorados                    | Rechazo explícito, borrador conservado y recuperación visible              | Prueba de fallo de persistencia                        |
| ID global mezclaba pestañas                  | URL fija y borrador por usuario/evaluación/pestaña                         | Prueba de separación de ID                             |
| Escrituras antiguas sobre nuevas             | Revisión esperada y bloqueo transaccional                                  | Conflicto SQL y cola de estado                         |
| Sin expediente inmutable                     | Informe con versiones, evidencias, fecha, actor, revisión y hash           | Pruebas de cierre, inmutabilidad e integridad          |
| Sin historial de cambios                     | Auditoría anterior/posterior en operaciones de datos y archivos            | SQL y visor de trazabilidad                            |
| Panel vacío aceptable                        | Estado sin evaluar y cierre condicionado                                   | Reglas de evaluación incompleta                        |
| Calidad y planes no persistidos              | Seis comprobaciones y plan estructurado; seguimiento separado              | Pruebas de cierre y seguimiento                        |
| Cuestionario parcial e identificación FPSICO | 30 ítems únicos, global solo completo, etiqueta exploratoria               | Prueba de 15 respuestas y recorrido de 30              |
| Archivos unsigned/públicos                   | Proxy firmado, entrega autenticada, enlaces caducables, cupos y validación | Firmas y cuotas locales; integración real pendiente    |
| Borrado solo en base                         | Cola duradera, confirmación del proveedor, reintentos y recuperación       | Prueba de firma idempotente; trabajador real pendiente |
| Restauración RULA y reinicio                 | Restaurar controles y guardar el estado reiniciado                         | Controlador compartido y recorrido local               |
| Historial sin paginación                     | Filtros de servidor y páginas de 20 registros                              | Repositorio y navegación de historial                  |
| Dependencias y esquema manual                | Versiones fijadas, lockfile, Vite, migraciones y pruebas                   | Compilación y auditoría npm                            |
| Fechas desplazadas por UTC                   | Fecha de calendario, visualización sin desplazamiento y hoy en Lima        | Pruebas de fecha y año bisiesto                        |
| Sin copia recuperable                        | Respaldo PostgreSQL cifrado y verificable, guía de restauración            | Cifrado/alteración/contraseña; respaldo real pendiente |

Los cambios de permisos, registro de cuentas, preset público, archivos antiguos y respaldos no quedan activos en las cuentas reales hasta aplicar el procedimiento de despliegue. No se ha realizado una recuperación real de producción ni una validación profesional del instrumento psicosocial.

## Referencias metodológicas

- [REBA, material de Cornell](https://ergo.human.cornell.edu/Pub/AHquest/Cornell_REBA.pdf).
- [RULA, hoja y notas de Cornell](https://ergo.human.cornell.edu/Pub/AHquest/RULAworksheet.pdf). Se conservan las celdas del artículo original indicadas en los comentarios del motor y sus regresiones.
- [FPSICO, INSST](https://www.insst.es/materias/riesgos/riesgos-psicosociales/evaluacion-de-riesgos-psicosociales). Referencia para distinguir el instrumento oficial del cuestionario propio.
