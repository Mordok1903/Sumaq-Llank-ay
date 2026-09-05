// ================================================
// app.js — Controlador Global del Sistema SIGA
// Estado compartido, navegación, localStorage
// ================================================

const SIGA = {
  // ── Estado global de la evaluación ──
  state: {
    identificacion: {},
    reba: {
      // Grupo A
      tronco: null, troncoTorsion: false,
      cuello: null, cuelloTorsion: false,
      piernas: null, piernasFlexion: null,
      cargaFuerza: null, instauracionRapida: false,
      // Grupo B
      brazo: null, brazoAbduccion: false, brazoHombro: false, brazoApoyo: false,
      antebrazo: null,
      muneca: null, munecaDesviacion: false,
      acoplamiento: null,
      // Actividad
      actEstatica: false, actRepeticion: false, actCambioBrusco: false,
      // Resultados
      puntuacionA: null, puntuacionB: null, tablaC: null,
      puntuacionFinal: null, nivel: null
    },
    rula: {
      // Grupo A (brazo/muñeca)
      brazo: null, brazoHombro: false, brazoAbduccion: false, brazoApoyo: false,
      antebrazo: null, antebrazoLinea: false, antebrazoFuera: false,
      muneca: null, munecaDesviacion: false,
      giroMuneca: null,
      // Grupo B (cuello/tronco)
      cuello: null, cuelloTorsion: false, cuelloInclinacion: false,
      tronco: null, troncoTorsion: false, troncoInclinacion: false,
      piernas: null,
      // Fuerza y músculo
      usoMuscular: false,
      fuerzaCarga: null,
      // Resultados
      posturaA: null, posturaB: null,
      puntajeC: null, puntajeD: null,
      puntuacionFinal: null, nivel: null
    },
    psicosocial: {
      respuestas: {}, // {q1: 3, q2: 5, ...}
      dimensiones: {
        participacion: { score: null, nivel: null },
        formacion: { score: null, nivel: null },
        gestionTiempo: { score: null, nivel: null },
        cohesion: { score: null, nivel: null },
        cargaMental: { score: null, nivel: null },
        autonomia: { score: null, nivel: null },
        condicionesLaborales: { score: null, nivel: null }
      }
    },
    progreso: {
      identificacion: false,
      reba: false,
      rula: false,
      psicosocial: false
    }
  },

  // ── Persistencia en localStorage ──
  save() {
    localStorage.setItem('siga_state', JSON.stringify(this.state));
  },
  load() {
    const saved = localStorage.getItem('siga_state');
    if (saved) {
      try {
        this.state = JSON.parse(saved);
        console.log('[SIGA] Estado cargado desde localStorage');
      } catch (e) {
        console.warn('[SIGA] Error al cargar estado:', e);
      }
    }
  },
  reset() {
    if (confirm('¿Estás seguro de que deseas reiniciar toda la evaluación? Se perderán todos los datos ingresados.')) {
      localStorage.removeItem('siga_state');
      window.location.href = '../index.html';
    }
  },

  // ── Cálculo de progreso ──
  getProgress() {
    const steps = Object.values(this.state.progreso);
    const done = steps.filter(Boolean).length;
    return Math.round((done / steps.length) * 100);
  },

  // ── Actualizar barra de progreso en sidebar ──
  updateProgressBar() {
    const pct = this.getProgress();
    const fill = document.getElementById('progress-fill');
    const label = document.getElementById('progress-label');
    if (fill) fill.style.width = pct + '%';
    if (label) label.textContent = pct + '%';
  },

  // ── Navegación activa en sidebar ──
  setActiveNav(page) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const active = document.querySelector(`[data-page="${page}"]`);
    if (active) active.classList.add('active');
  },

  // ── Helper: Formatear fecha ──
  formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
  },

  // ── Helper: Obtener clase de nivel de riesgo ──
  getNivelClass(nivel) {
    const map = { 0: 'level-0', 1: 'level-1', 2: 'level-2', 3: 'level-3', 4: 'level-4' };
    return map[nivel] ?? 'level-0';
  },

  getNivelText(nivel) {
    const map = {
      0: 'Inapreciable', 1: 'Bajo', 2: 'Medio', 3: 'Alto', 4: 'Muy Alto'
    };
    return map[nivel] ?? '—';
  },

  getNivelAccion(nivel) {
    const map = {
      0: 'No es necesaria una acción específica. Mantener vigilancia.',
      1: 'Puede ser necesaria alguna medida. Revisar la causa.',
      2: 'La acción es necesaria. Priorizar controles dentro del plan SST.',
      3: 'La acción es necesaria pronto. Establecer responsable y fecha.',
      4: 'Actuación inmediata. Revisar la continuidad de la tarea.'
    };
    return map[nivel] ?? '—';
  },

  // ── Inicializar en cada página ──
  init(page) {
    this.load();
    this.setActiveNav(page);
    this.updateProgressBar();
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); this.save(); this.showToast('Guardado ✓'); }
    });
  },

  // ── Toast notification ──
  showToast(message, type = 'success') {
    let toast = document.getElementById('siga-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'siga-toast';
      toast.style.cssText = `
        position: fixed; bottom: 24px; right: 24px;
        background: var(--clr-bg-card); border: 1px solid var(--clr-border);
        border-radius: var(--radius-md); padding: 12px 20px;
        font-size: 0.875rem; font-weight: 600; color: var(--clr-text-primary);
        box-shadow: var(--shadow-lg); z-index: 9999;
        transition: opacity 0.3s; opacity: 0;
      `;
      document.body.appendChild(toast);
    }
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    toast.textContent = `${icons[type] || ''} ${message}`;
    toast.style.opacity = '1';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
  }
};

// ── Sidebar HTML (inyectado en cada página) ──
function renderSidebar(activePage) {
  const pages = {
    index: 'Dashboard',
    identificacion: 'Identificación',
    reba: 'Calculadora REBA',
    rula: 'Calculadora RULA',
    psicosocial: 'Riesgos Psicosociales',
    dashboard: 'Resultados'
  };

  const progress = SIGA.getProgress();
  const s = SIGA.state.progreso;

  const badge = (done, page) => {
    if (done) return `<span class="nav-badge">✓</span>`;
    if (page === 'reba' && !s.identificacion) return `<span class="nav-badge locked">🔒</span>`;
    if (page === 'rula' && !s.identificacion) return `<span class="nav-badge locked">🔒</span>`;
    if (page === 'psicosocial' && !s.identificacion) return `<span class="nav-badge locked">🔒</span>`;
    if (page === 'dashboard' && !(s.reba || s.rula || s.psicosocial)) return `<span class="nav-badge locked">🔒</span>`;
    return '';
  };

  const navItems = [
    { id: 'index', icon: '🏠', label: 'Inicio', href: activePage === 'index' ? '#' : '../index.html' },
  ];

  return `
<aside class="sidebar">
  <div class="sidebar-brand">
    <div class="sidebar-logo">
      <div class="sidebar-logo-icon">⚡</div>
      <div>
        <div class="sidebar-logo-text">SIGA</div>
      </div>
    </div>
    <div class="sidebar-logo-sub">Sistema de Evaluación de Riesgos</div>
  </div>

  <div class="sidebar-progress">
    <div class="progress-label">
      <span>Progreso de la evaluación</span>
      <span id="progress-label">${progress}%</span>
    </div>
    <div class="progress-bar-track">
      <div class="progress-bar-fill" id="progress-fill" style="width:${progress}%"></div>
    </div>
  </div>

  <nav class="sidebar-nav">
    <div class="sidebar-nav-section">
      <div class="sidebar-nav-label">Navegación</div>
      <a class="nav-item ${activePage==='index'?'active':''}" href="${getRelPath(activePage,'index.html')}" data-page="index">
        <span class="nav-item-icon">🏠</span> Inicio
      </a>
    </div>

    <div class="sidebar-nav-section">
      <div class="sidebar-nav-label">Módulos de Evaluación</div>
      <a class="nav-item ${activePage==='identificacion'?'active':''}" href="${getRelPath(activePage,'pages/identificacion.html')}" data-page="identificacion">
        <span class="nav-item-icon">👤</span> Identificación
        ${badge(s.identificacion, 'identificacion')}
      </a>
      <a class="nav-item ${activePage==='reba'?'active':''}" href="${getRelPath(activePage,'pages/reba.html')}" data-page="reba">
        <span class="nav-item-icon">🏋️</span> Calculadora REBA
        ${badge(s.reba, 'reba')}
      </a>
      <a class="nav-item ${activePage==='rula'?'active':''}" href="${getRelPath(activePage,'pages/rula.html')}" data-page="rula">
        <span class="nav-item-icon">💪</span> Calculadora RULA
        ${badge(s.rula, 'rula')}
      </a>
      <a class="nav-item ${activePage==='psicosocial'?'active':''}" href="${getRelPath(activePage,'pages/psicosocial.html')}" data-page="psicosocial">
        <span class="nav-item-icon">🧠</span> Psicosocial
        ${badge(s.psicosocial, 'psicosocial')}
      </a>
    </div>

    <div class="sidebar-nav-section">
      <div class="sidebar-nav-label">Resultados</div>
      <a class="nav-item ${activePage==='dashboard'?'active':''}" href="${getRelPath(activePage,'pages/dashboard.html')}" data-page="dashboard">
        <span class="nav-item-icon">📊</span> Dashboard
        ${badge(s.reba && s.rula && s.psicosocial, 'dashboard')}
      </a>
    </div>

    <div class="sidebar-nav-section">
      <div class="sidebar-nav-label">Sistema</div>
      <div class="nav-item" onclick="SIGA.reset()" style="cursor:pointer;">
        <span class="nav-item-icon">🔄</span> Nueva Evaluación
      </div>
    </div>
  </nav>

  <div class="sidebar-footer">
    <strong>Consultoría Carranza E.I.R.L.</strong><br>
    RM 375-2008-TR · Ley N.° 29783<br>
    Versión 1.0 — 2026
  </div>
</aside>`;
}

function getRelPath(from, to) {
  if (from === 'index') return to;
  return '../' + to;
}

// Exportar globalmente
window.SIGA = SIGA;
window.renderSidebar = renderSidebar;
