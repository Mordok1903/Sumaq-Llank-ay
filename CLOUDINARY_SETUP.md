# Guía de Configuración de Cloudinary para SIGA

El módulo de evidencias fotográficas y videográficas de SIGA utiliza **Cloudinary** para almacenar y optimizar los archivos, y **Supabase** para guardar la relación de esos archivos con cada evaluación.

Sigue estos pasos para asegurarte de que tu cuenta de Cloudinary (cloud name: `b7wgjvai`) esté correctamente configurada para recibir uploads directamente desde la aplicación sin exponer secretos.

---

## 1. Crear el Upload Preset ("Unsigned")

Para permitir subidas directas desde el navegador (frontend) sin un backend intermedio que firme las peticiones, necesitas crear un *Upload Preset* "unsigned".

1. Inicia sesión en tu cuenta de Cloudinary: [https://cloudinary.com/](https://cloudinary.com/)
2. Ve a **Settings** (el ícono de engranaje abajo a la izquierda).
3. Selecciona la pestaña **Upload** en el menú de la izquierda.
4. Haz scroll hacia abajo hasta la sección **Upload presets** y haz clic en **Add upload preset**.

Configura el preset de la siguiente manera:
- **Upload preset name:** `siga_evidencias` (⚠️ *Esto debe coincidir exactamente con el valor en `js/config.js`*)
- **Signing Mode:** Cambia a **Unsigned**.
- **Folder:** Opcionalmente, puedes poner `siga/evidencias` para que todo se organice en esa carpeta.

5. Haz clic en **Save** arriba a la derecha.

---

## 2. Verificar `config.js`

Asegúrate de que el archivo `js/config.js` tiene los valores correctos que corresponden a la configuración que acabas de hacer:

```javascript
const CONFIG = {
  // ...
  CLOUDINARY_CLOUD_NAME: 'b7wgjvai',
  CLOUDINARY_UPLOAD_PRESET: 'siga_evidencias',
  // ...
};
```

---

## Preguntas Frecuentes

**¿Por qué usar el modo Unsigned?**
Porque la aplicación SIGA es "estática" (solo HTML/JS corriendo en el cliente). Si usáramos subidas firmadas ("Signed"), tendríamos que exponer tu `API_SECRET` en el código fuente, lo cual es muy inseguro. El preset Unsigned permite subidas controladas (puedes limitar el tamaño, formato, etc.) sin usar secretos.

**¿Qué pasa con los videos pesados?**
Cloudinary procesa automáticamente los videos en segundo plano. Hemos configurado la aplicación para generar "thumbnails" (miniaturas) tipo `.jpg` automáticamente para los videos subidos, los cuales se usan en el Dashboard.

**¿Cuánto almacenamiento tengo?**
En la capa gratuita de Cloudinary, tienes hasta 25 créditos mensuales (cada crédito equivale a 1 GB de almacenamiento, 1 GB de ancho de banda o 1000 transformaciones de imágenes).
