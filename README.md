# Qhali Kay (Sumaq Llank'ay) - Sistema de Evaluación de Riesgos Laborales 🌿

![Estado](https://img.shields.io/badge/Estado-Activo-success)
![Versión](https://img.shields.io/badge/Versi%C3%B3n-1.0-blue)
![Tecnologías](https://img.shields.io/badge/Tecnolog%C3%ADas-HTML%20%7C%20CSS%20%7C%20JS-F7DF1E)

**Qhali Kay** (o *Sumaq Llank'ay*) es una aplicación web diseñada para facilitar la evaluación de factores de riesgo ergonómico y psicosocial en el entorno de trabajo. Permite a los evaluadores e inspectores de seguridad y salud en el trabajo registrar de forma digital y estructurada las condiciones de los trabajadores utilizando métodos estandarizados internacionalmente.

---

## 🎯 Métodos de Evaluación Integrados

El aplicativo consolida los siguientes métodos de evaluación en una interfaz única:

### 1. Método RULA (Rapid Upper Limb Assessment)
Evalúa la exposición de los trabajadores a factores de riesgo que pueden ocasionar trastornos en los miembros superiores (brazos, antebrazos, muñecas), cuello y tronco. Se enfoca en posturas, fuerzas y movimientos repetitivos.

### 2. Método REBA (Rapid Entire Body Assessment)
Similar a RULA, pero diseñado para evaluar posturas de trabajo impredecibles o dinámicas que afectan a todo el cuerpo (incluyendo miembros inferiores). Especialmente útil en el sector salud, servicios y trabajos de manipulación de cargas.

### 3. Evaluación de Factores Psicosociales
Módulo destinado a identificar y evaluar riesgos derivados de la organización del trabajo, carga mental, relaciones laborales y otros factores que puedan afectar la salud mental y física del trabajador.

---

## 🚀 Funcionalidades Principales

- **Dashboard Integrado:** Panel de control central (index) que permite navegar fácilmente entre las distintas herramientas de evaluación.
- **Ficha de Identificación:** Registro de datos sociodemográficos y laborales del trabajador previo a las evaluaciones específicas.
- **Diseño Responsivo:** Interfaz adaptable para su uso en computadoras de escritorio, tablets y dispositivos móviles, ideal para inspecciones en campo.
- **Persistencia Local:** Manejo de estado a través de JavaScript, permitiendo un flujo continuo durante la recolección de datos.

---

## 📂 Estructura del Proyecto

El proyecto está construido puramente con tecnologías Frontend estándar (Vanilla HTML, CSS, JS):

```text
📦 Sumaq-Llank-ay
 ┣ 📂 css
 ┃ ┗ 📜 styles.css           # Hoja de estilos global y diseño del sistema
 ┣ 📂 js
 ┃ ┣ 📜 app.js               # Lógica general y navegación
 ┃ ┣ 📜 psicosocial.js       # Lógica de cálculo y validación: Ficha Psicosocial
 ┃ ┣ 📜 reba.js              # Lógica de cálculo y validación: Método REBA
 ┃ ┗ 📜 rula.js              # Lógica de cálculo y validación: Método RULA
 ┣ 📂 pages
 ┃ ┣ 📜 dashboard.html       # Panel principal del aplicativo
 ┃ ┣ 📜 identificacion.html  # Formulario de datos del trabajador
 ┃ ┣ 📜 psicosocial.html     # Interfaz de la evaluación psicosocial
 ┃ ┣ 📜 reba.html            # Interfaz de evaluación REBA
 ┃ ┗ 📜 rula.html            # Interfaz de evaluación RULA
 ┣ 📜 index.html             # Punto de entrada / Landing page
 ┗ 📜 README.md              # Documentación del proyecto
```

---

## 💻 Instalación y Uso Local

Al ser un proyecto estático, no requiere de instalación de dependencias ni servidores complejos para funcionar.

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/Mordok1903/Sumaq-Llank-ay.git
   ```

2. **Abrir el proyecto:**
   - Navega a la carpeta descargada.
   - Haz doble clic en el archivo `index.html` para abrirlo en tu navegador predeterminado.
   - *(Opcional, pero recomendado)*: Abre el proyecto usando un servidor local estático como la extensión "Live Server" en VSCode para una mejor experiencia de desarrollo.

---

## 🌍 Despliegue (Hosting)

Este proyecto está optimizado para ser desplegado fácilmente en plataformas gratuitas como **Vercel**, **GitHub Pages** o **Netlify**.

Para desplegar en Vercel:
1. Inicia sesión en [Vercel](https://vercel.com/).
2. Haz clic en "Add New" -> "Project".
3. Importa este repositorio de GitHub.
4. Haz clic en "Deploy" sin modificar la configuración predeterminada.

---

## 👥 Contribuciones

Si deseas colaborar con el proyecto, por favor crea un *fork* del repositorio, crea una nueva rama para tus características (`git checkout -b feature/nueva-caracteristica`) y envía un *Pull Request* para su revisión.
