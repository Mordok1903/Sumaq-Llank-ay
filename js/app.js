// ================================================
// app.js — Controlador Global del Sistema SIGA
// Estado compartido, navegación, localStorage
// + Integración con Supabase Auth
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
    // Sync con Supabase en background (sin bloquear)
    this._syncToSupabase();
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
      localStorage.removeItem('siga_evaluacion_id');
      window.location.href = window.location.pathname.includes('/pages/') ? 'evaluaciones.html' : 'pages/evaluaciones.html';
    }
  },

  // ── Sincronizar estado con Supabase ──
  async _syncToSupabase() {
    try {
      const evaluacionId = localStorage.getItem('siga_evaluacion_id');
      if (!evaluacionId) return;

      const session = await AUTH.getSession();
      if (!session) return;

      const sb = AUTH.getSupabase();
      const ident = this.state.identificacion || {};

      const updateData = {
        empresa: ident.empresa || null,
        ruc: ident.ruc || null,
        sede: ident.sede || null,
        area: ident.area || null,
        actividad: ident.actividad || null,
        fecha_eval: ident.fechaEval || null,
        trabajador: ident.trabajador || null,
        dni: ident.dni || null,
        puesto: ident.puesto || null,
        antiguedad: ident.antiguedad || null,
        sexo: ident.sexo || null,
        turno: ident.turno || null,
        tarea: ident.tarea || null,
        fase: ident.fase || null,
        duracion_ciclo: ident.duracionCiclo || null,
        duracion_jornada: ident.duracionJornada || null,
        frecuencia: ident.frecuencia || null,
        descripcion_tarea: ident.descripcionTarea || null,
        monitorista: ident.monitorista || null,
        cargo_monitorista: ident.cargoMonitorista || null,
        observaciones: ident.observaciones || null,
        checklist: { c1: ident.c1, c2: ident.c2, c3: ident.c3, c4: ident.c4 },
        reba_datos: this.state.reba || {},
        reba_puntaje_final: this.state.reba?.puntuacionFinal ?? null,
        reba_nivel: this.state.reba?.nivel ?? null,
        reba_riesgo: this.state.reba?.riesgo ?? null,
        rula_datos: this.state.rula || {},
        rula_puntaje_final: this.state.rula?.puntuacionFinal ?? null,
        rula_nivel: this.state.rula?.nivel ?? null,
        rula_riesgo: this.state.rula?.accion ?? null,
        psicosocial_datos: this.state.psicosocial || {},
        psicosocial_promedio: this.state.psicosocial?.promedioGlobal ?? null,
        estado: (this.state.progreso?.reba && this.state.progreso?.rula && this.state.progreso?.psicosocial)
          ? 'completada' : 'en_progreso'
      };

      await sb
        .from('evaluaciones')
        .update(updateData)
        .eq('id', evaluacionId);

    } catch (err) {
      console.warn('[SIGA] Error sincronizando con Supabase:', err);
    }
  },

  // ── Obtener o crear evaluación ──
  async ensureEvaluacion() {
    let evaluacionId = localStorage.getItem('siga_evaluacion_id');
    if (evaluacionId) return evaluacionId;

    const session = await AUTH.getSession();
    if (!session) return null;

    const sb = AUTH.getSupabase();
    const { data, error } = await sb
      .from('evaluaciones')
      .insert({ evaluador_id: session.user.id })
      .select()
      .single();

    if (error) {
      console.error('[SIGA] Error creando evaluación:', error);
      return null;
    }

    localStorage.setItem('siga_evaluacion_id', data.id);
    return data.id;
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

    // Inicializar auth si disponible
    if (typeof AUTH !== 'undefined') {
      AUTH.init();
      // Auth guard (excepto login)
      if (page !== 'login') {
        AUTH.requireAuth(page).then(async (ok) => {
          if (!ok) return;
          // Inyectar user badge en sidebar
          const userBadgeHtml = await AUTH.renderUserBadge();
          const sidebarFooter = document.querySelector('.sidebar-footer');
          if (sidebarFooter) sidebarFooter.insertAdjacentHTML('beforebegin', userBadgeHtml);
        });
      }
    } else {
      // Si no hay auth, mostrar directamente
      document.body.classList.add('auth-ready');
    }

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

  return `
<aside class="sidebar">
  <div class="sidebar-brand">
    <div class="sidebar-logo">
      <div class="sidebar-logo-text">Sumaq Llank'ay</div>
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
      <a class="nav-item ${activePage==='evaluaciones'?'active':''}" href="${getRelPath(activePage,'pages/evaluaciones.html')}" data-page="evaluaciones">
        <span class="nav-item-icon">📋</span> Mis Evaluaciones
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
