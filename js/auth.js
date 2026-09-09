// ================================================
// auth.js — Módulo de Autenticación SIGA
// Supabase Auth + Roles (admin/evaluador)
// Persistencia de sesión: 2+ semanas
// ================================================

const AUTH = {
  _supabase: null,
  _user: null,
  _profile: null,

  // ── Inicializar cliente Supabase ──
  init() {
    if (this._supabase) return this._supabase;

    this._supabase = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        storage: window.localStorage,
        storageKey: 'siga-auth-token',
        flowType: 'implicit'
      }
    });

    // Listener para cambios de sesión
    this._supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        this._user = null;
        this._profile = null;
      }
    });

    return this._supabase;
  },

  // ── Obtener cliente Supabase ──
  getSupabase() {
    if (!this._supabase) this.init();
    return this._supabase;
  },

  // ── Obtener sesión activa ──
  async getSession() {
    const sb = this.getSupabase();
    const { data: { session }, error } = await sb.auth.getSession();
    if (error) { console.warn('[AUTH] Error obteniendo sesión:', error); return null; }
    return session;
  },

  // ── Obtener usuario actual ──
  async getUser() {
    if (this._user) return this._user;
    const session = await this.getSession();
    if (!session) return null;
    this._user = session.user;
    return this._user;
  },

  // ── Obtener perfil del usuario (con rol) ──
  async getUserProfile() {
    if (this._profile) return this._profile;
    const user = await this.getUser();
    if (!user) return null;

    const sb = this.getSupabase();
    const { data, error } = await sb
      .from('perfiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.warn('[AUTH] Error obteniendo perfil:', error);
      // Si no existe perfil, devolver datos básicos
      return { id: user.id, nombre: user.email, email: user.email, rol: 'evaluador' };
    }

    this._profile = data;
    return this._profile;
  },

  // ── Login con email y contraseña ──
  async login(email, password) {
    const sb = this.getSupabase();
    const { data, error } = await sb.auth.signInWithPassword({
      email: email.trim(),
      password: password
    });

    if (error) {
      console.error('[AUTH] Error de login:', error);
      return { success: false, error: this._translateError(error.message) };
    }

    this._user = data.user;
    this._profile = null; // Forzar recarga del perfil
    return { success: true, user: data.user, session: data.session };
  },

  // ── Logout ──
  async logout() {
    const sb = this.getSupabase();
    await sb.auth.signOut();
    this._user = null;
    this._profile = null;
    localStorage.removeItem('siga_state');
    localStorage.removeItem('siga_evaluacion_id');
  },

  // ── Crear usuario (solo admin) ──
  async createUser(email, password, nombre, rol = 'evaluador') {
    const profile = await this.getUserProfile();
    if (!profile || profile.rol !== 'admin') {
      return { success: false, error: 'Solo los administradores pueden crear usuarios.' };
    }

    // Usar un cliente separado sin persistencia para no afectar la sesión del admin
    const tempClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data, error } = await tempClient.auth.signUp({
      email: email.trim(),
      password: password,
      options: {
        data: { nombre: nombre, rol: rol }
      }
    });

    if (error) {
      console.error('[AUTH] Error creando usuario:', error);
      return { success: false, error: this._translateError(error.message) };
    }

    return { success: true, user: data.user };
  },

  // ── Listar usuarios (solo admin) ──
  async listUsers() {
    const profile = await this.getUserProfile();
    if (!profile || profile.rol !== 'admin') return [];

    const sb = this.getSupabase();
    const { data, error } = await sb
      .from('perfiles')
      .select('*')
      .order('created_at', { ascending: false });

    return error ? [] : data;
  },

  // ── Guard: redirigir si no hay sesión ──
  async requireAuth(currentPage) {
    const session = await this.getSession();
    if (!session) {
      const loginPath = currentPage === 'index' ? 'pages/login.html' : 'login.html';
      window.location.replace(loginPath);
      return false;
    }
    // Mostrar el body (oculto por defecto para evitar flash)
    document.body.classList.add('auth-ready');
    return true;
  },

  // ── Verificar si es admin ──
  async isAdmin() {
    const profile = await this.getUserProfile();
    return profile?.rol === 'admin';
  },

  // ── Traducir errores de Supabase ──
  _translateError(msg) {
    const map = {
      'Invalid login credentials': 'Email o contraseña incorrectos.',
      'Email not confirmed': 'El email no ha sido confirmado.',
      'User already registered': 'Ya existe un usuario con este email.',
      'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres.',
      'Unable to validate email address: invalid format': 'Formato de email inválido.',
      'Signup requires a valid password': 'Ingrese una contraseña válida.',
      'User not found': 'Usuario no encontrado.'
    };
    return map[msg] || msg || 'Error desconocido. Intente nuevamente.';
  },

  // ── Renderizar info del usuario en sidebar ──
  async renderUserBadge() {
    const profile = await this.getUserProfile();
    if (!profile) return '';
    const initial = (profile.nombre || profile.email).charAt(0).toUpperCase();
    const rolBadge = profile.rol === 'admin'
      ? '<span class="user-role-badge admin">Admin</span>'
      : '<span class="user-role-badge">Evaluador</span>';

    return `
    <div class="sidebar-user">
      <div class="sidebar-user-avatar">${initial}</div>
      <div class="sidebar-user-info">
        <div class="sidebar-user-name">${profile.nombre || profile.email}</div>
        ${rolBadge}
      </div>
      <button class="sidebar-user-logout" onclick="AUTH.logout().then(()=>window.location.href='${window.location.pathname.includes('/pages/') ? '' : 'pages/'}login.html')" title="Cerrar Sesión">
        🚪
      </button>
    </div>`;
  }
};

window.AUTH = AUTH;
