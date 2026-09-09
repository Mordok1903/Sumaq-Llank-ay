// ================================================
// evidencias.js — Módulo de Evidencias SIGA
// Upload a Cloudinary + CRUD en Supabase
// Galería, lightbox y validación
// ================================================

const EVIDENCIAS = {

  // ── Subir archivo a Cloudinary ──
  async uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CONFIG.CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', 'siga/evidencias');

    const resourceType = file.type.startsWith('video') ? 'video' : 'image';
    const url = `https://api.cloudinary.com/v1_1/${CONFIG.CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;

    const response = await fetch(url, { method: 'POST', body: formData });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'Error al subir archivo a Cloudinary');
    }

    return await response.json();
  },

  // ── Subir evidencia completa (Cloudinary + Supabase) ──
  async upload(file, evaluacionId) {
    // Validar tipo
    const esImagen = CONFIG.FORMATOS_IMAGEN.includes(file.type);
    const esVideo = CONFIG.FORMATOS_VIDEO.includes(file.type);
    if (!esImagen && !esVideo) {
      return { success: false, error: `Formato no permitido: ${file.type}. Use JPG, PNG, WebP, MP4 o MOV.` };
    }

    // Validar tamaño
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > CONFIG.MAX_FILE_SIZE_MB) {
      return { success: false, error: `Archivo muy grande (${sizeMB.toFixed(1)} MB). Máximo: ${CONFIG.MAX_FILE_SIZE_MB} MB.` };
    }

    // Validar límites
    const conteo = await this.contarPorTipo(evaluacionId);
    if (esImagen && conteo.imagenes >= CONFIG.MAX_FOTOS) {
      return { success: false, error: `Límite de fotos alcanzado (${CONFIG.MAX_FOTOS}).` };
    }
    if (esVideo && conteo.videos >= CONFIG.MAX_VIDEOS) {
      return { success: false, error: `Límite de videos alcanzado (${CONFIG.MAX_VIDEOS}).` };
    }

    try {
      // Subir a Cloudinary
      const cloudResult = await this.uploadToCloudinary(file);

      // Generar thumbnail URL para videos
      let thumbnailUrl = cloudResult.secure_url;
      if (esVideo) {
        // Cloudinary genera thumbnails de video automáticamente
        thumbnailUrl = cloudResult.secure_url
          .replace('/video/upload/', '/video/upload/c_fill,w_400,h_300,so_1/')
          .replace(/\.[^.]+$/, '.jpg');
      } else {
        // Thumbnail de imagen
        thumbnailUrl = cloudResult.secure_url
          .replace('/image/upload/', '/image/upload/c_fill,w_400,h_300/');
      }

      // Guardar en Supabase
      const sb = AUTH.getSupabase();
      const { data, error } = await sb
        .from('evidencias')
        .insert({
          evaluacion_id: evaluacionId,
          cloudinary_public_id: cloudResult.public_id,
          cloudinary_url: cloudResult.url,
          cloudinary_secure_url: cloudResult.secure_url,
          tipo: esImagen ? 'imagen' : 'video',
          nombre_archivo: file.name,
          tamano_bytes: file.size,
          width: cloudResult.width || null,
          height: cloudResult.height || null,
          thumbnail_url: thumbnailUrl
        })
        .select()
        .single();

      if (error) throw new Error('Error al guardar evidencia: ' + error.message);

      return { success: true, evidencia: data };
    } catch (err) {
      console.error('[EVIDENCIAS] Error en upload:', err);
      return { success: false, error: err.message };
    }
  },

  // ── Listar evidencias de una evaluación ──
  async listar(evaluacionId) {
    const sb = AUTH.getSupabase();
    const { data, error } = await sb
      .from('evidencias')
      .select('*')
      .eq('evaluacion_id', evaluacionId)
      .order('created_at', { ascending: true });

    if (error) { console.error('[EVIDENCIAS] Error listando:', error); return []; }
    return data || [];
  },

  // ── Contar evidencias por tipo ──
  async contarPorTipo(evaluacionId) {
    const evidencias = await this.listar(evaluacionId);
    return {
      imagenes: evidencias.filter(e => e.tipo === 'imagen').length,
      videos: evidencias.filter(e => e.tipo === 'video').length,
      total: evidencias.length
    };
  },

  // ── Eliminar evidencia ──
  async eliminar(evidenciaId) {
    const sb = AUTH.getSupabase();
    const { error } = await sb
      .from('evidencias')
      .delete()
      .eq('id', evidenciaId);

    if (error) {
      console.error('[EVIDENCIAS] Error eliminando:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  // ── Validar mínimos de evidencias ──
  async validarMinimos(evaluacionId) {
    const conteo = await this.contarPorTipo(evaluacionId);
    const errores = [];
    if (conteo.imagenes < CONFIG.MIN_FOTOS) {
      errores.push(`Se requiere al menos ${CONFIG.MIN_FOTOS} foto (tiene ${conteo.imagenes}).`);
    }
    if (conteo.videos < CONFIG.MIN_VIDEOS) {
      errores.push(`Se requiere al menos ${CONFIG.MIN_VIDEOS} video (tiene ${conteo.videos}).`);
    }
    return { valido: errores.length === 0, errores, conteo };
  },

  // ── Renderizar zona de upload ──
  renderUploadZone(evaluacionId, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
    <div class="upload-zone" id="upload-zone">
      <div class="upload-zone-inner" id="upload-drop-area">
        <div class="upload-zone-icon">📸</div>
        <div class="upload-zone-title">Subir Evidencia del Ciclo de Trabajo</div>
        <div class="upload-zone-desc">
          Arrastra fotos o videos aquí, o haz clic para seleccionar
        </div>
        <div class="upload-zone-formats">
          JPG, PNG, WebP, MP4, MOV · Máx. ${CONFIG.MAX_FILE_SIZE_MB} MB
        </div>
        <input type="file" id="upload-input" multiple accept="image/*,video/*" style="display:none">
        <button type="button" class="btn btn-primary" onclick="document.getElementById('upload-input').click()">
          📷 Seleccionar Archivos
        </button>
      </div>
      <div class="upload-counter" id="upload-counter">Cargando...</div>
      <div class="upload-progress" id="upload-progress" style="display:none">
        <div class="upload-progress-bar" id="upload-progress-bar"></div>
        <span class="upload-progress-text" id="upload-progress-text">Subiendo...</span>
      </div>
      <div class="upload-gallery" id="upload-gallery"></div>
    </div>`;

    // Event listeners
    const fileInput = document.getElementById('upload-input');
    const dropArea = document.getElementById('upload-drop-area');

    fileInput.addEventListener('change', (e) => {
      this._handleFiles(e.target.files, evaluacionId);
      fileInput.value = ''; // Reset para permitir re-subir mismo archivo
    });

    // Drag & Drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropArea.addEventListener(eventName, (e) => { e.preventDefault(); e.stopPropagation(); });
    });
    ['dragenter', 'dragover'].forEach(eventName => {
      dropArea.addEventListener(eventName, () => dropArea.classList.add('drag-over'));
    });
    ['dragleave', 'drop'].forEach(eventName => {
      dropArea.addEventListener(eventName, () => dropArea.classList.remove('drag-over'));
    });
    dropArea.addEventListener('drop', (e) => {
      this._handleFiles(e.dataTransfer.files, evaluacionId);
    });

    // Cargar evidencias existentes
    this._refreshGallery(evaluacionId);
  },

  // ── Manejar archivos seleccionados ──
  async _handleFiles(files, evaluacionId) {
    const progressEl = document.getElementById('upload-progress');
    const progressBar = document.getElementById('upload-progress-bar');
    const progressText = document.getElementById('upload-progress-text');

    progressEl.style.display = 'flex';
    let uploaded = 0;
    const total = files.length;

    for (const file of files) {
      progressText.textContent = `Subiendo ${uploaded + 1}/${total}: ${file.name}`;
      progressBar.style.width = `${(uploaded / total) * 100}%`;

      const result = await this.upload(file, evaluacionId);
      if (!result.success) {
        SIGA.showToast(result.error, 'error');
      } else {
        SIGA.showToast(`✓ ${file.name} subido`, 'success');
      }
      uploaded++;
      progressBar.style.width = `${(uploaded / total) * 100}%`;
    }

    progressEl.style.display = 'none';
    this._refreshGallery(evaluacionId);
  },

  // ── Refrescar galería ──
  async _refreshGallery(evaluacionId) {
    const evidencias = await this.listar(evaluacionId);
    const conteo = {
      imagenes: evidencias.filter(e => e.tipo === 'imagen').length,
      videos: evidencias.filter(e => e.tipo === 'video').length
    };

    // Actualizar contador
    const counterEl = document.getElementById('upload-counter');
    if (counterEl) {
      const fotosOk = conteo.imagenes >= CONFIG.MIN_FOTOS;
      const videosOk = conteo.videos >= CONFIG.MIN_VIDEOS;
      counterEl.innerHTML = `
        <span class="${fotosOk ? 'text-safe' : 'text-warn'}">📷 ${conteo.imagenes}/${CONFIG.MAX_FOTOS} fotos</span>
        <span class="upload-counter-sep">·</span>
        <span class="${videosOk ? 'text-safe' : 'text-warn'}">🎥 ${conteo.videos}/${CONFIG.MAX_VIDEOS} videos</span>
        ${!fotosOk || !videosOk ? '<span class="upload-counter-req">⚠️ Mínimo: 1 foto + 1 video</span>' : '<span class="text-safe">✓ Requisito cumplido</span>'}
      `;
    }

    // Renderizar galería
    const galleryEl = document.getElementById('upload-gallery');
    if (!galleryEl) return;

    if (evidencias.length === 0) {
      galleryEl.innerHTML = '<div class="upload-empty">No hay evidencias subidas aún</div>';
      return;
    }

    galleryEl.innerHTML = evidencias.map(ev => `
      <div class="upload-thumb" data-id="${ev.id}">
        <div class="upload-thumb-media" onclick="EVIDENCIAS.openLightbox('${ev.cloudinary_secure_url}', '${ev.tipo}')">
          ${ev.tipo === 'video'
            ? `<div class="upload-thumb-play">▶</div><img src="${ev.thumbnail_url}" alt="${ev.nombre_archivo}" loading="lazy">`
            : `<img src="${ev.thumbnail_url || ev.cloudinary_secure_url}" alt="${ev.nombre_archivo}" loading="lazy">`
          }
        </div>
        <div class="upload-thumb-info">
          <span class="upload-thumb-type ${ev.tipo}">${ev.tipo === 'imagen' ? '📷' : '🎥'}</span>
          <span class="upload-thumb-name" title="${ev.nombre_archivo}">${ev.nombre_archivo || 'Sin nombre'}</span>
          <button type="button" class="upload-thumb-delete" onclick="EVIDENCIAS._eliminarConfirm('${ev.id}', '${evaluacionId}')" title="Eliminar">✕</button>
        </div>
      </div>
    `).join('');
  },

  // ── Confirmar eliminación ──
  async _eliminarConfirm(evidenciaId, evaluacionId) {
    if (!confirm('¿Eliminar esta evidencia?')) return;
    const result = await this.eliminar(evidenciaId);
    if (result.success) {
      SIGA.showToast('Evidencia eliminada', 'info');
      this._refreshGallery(evaluacionId);
    } else {
      SIGA.showToast('Error al eliminar: ' + result.error, 'error');
    }
  },

  // ── Lightbox: ver imagen/video en pantalla completa ──
  openLightbox(url, tipo) {
    // Remover lightbox existente
    const existing = document.getElementById('siga-lightbox');
    if (existing) existing.remove();

    const lightbox = document.createElement('div');
    lightbox.id = 'siga-lightbox';
    lightbox.className = 'lightbox-overlay';
    lightbox.onclick = (e) => { if (e.target === lightbox) lightbox.remove(); };

    const mediaHtml = tipo === 'video'
      ? `<video src="${url}" controls autoplay class="lightbox-media lightbox-video"></video>`
      : `<img src="${url.replace('/image/upload/', '/image/upload/q_auto,f_auto/')}" alt="Evidencia" class="lightbox-media">`;

    lightbox.innerHTML = `
      <div class="lightbox-content">
        <button class="lightbox-close" onclick="document.getElementById('siga-lightbox').remove()">✕</button>
        ${mediaHtml}
        <div class="lightbox-actions">
          <a href="${url}" target="_blank" class="btn btn-secondary btn-sm">🔗 Abrir original</a>
          <a href="${url}" download class="btn btn-primary btn-sm">⬇️ Descargar</a>
        </div>
      </div>`;

    document.body.appendChild(lightbox);
    // Animar entrada
    requestAnimationFrame(() => lightbox.classList.add('active'));
  },

  // ── Renderizar galería para Dashboard (solo lectura) ──
  async renderDashboardGallery(evaluacionId, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const evidencias = await this.listar(evaluacionId);
    if (evidencias.length === 0) {
      container.innerHTML = '<p style="color:var(--clr-text-muted); font-size:0.875rem;">No hay evidencias fotográficas o videográficas registradas.</p>';
      return;
    }

    const imagenes = evidencias.filter(e => e.tipo === 'imagen');
    const videos = evidencias.filter(e => e.tipo === 'video');

    let html = '<div class="evidence-dashboard-grid">';

    imagenes.forEach(ev => {
      html += `
        <div class="evidence-dash-item" onclick="EVIDENCIAS.openLightbox('${ev.cloudinary_secure_url}', 'imagen')">
          <img src="${ev.thumbnail_url || ev.cloudinary_secure_url}" alt="${ev.nombre_archivo}" loading="lazy">
          <div class="evidence-dash-badge">📷</div>
        </div>`;
    });

    videos.forEach(ev => {
      html += `
        <div class="evidence-dash-item video" onclick="EVIDENCIAS.openLightbox('${ev.cloudinary_secure_url}', 'video')">
          <img src="${ev.thumbnail_url}" alt="${ev.nombre_archivo}" loading="lazy">
          <div class="evidence-dash-badge">🎥</div>
          <div class="evidence-dash-play">▶</div>
        </div>`;
    });

    html += '</div>';
    html += `<div style="margin-top:0.75rem; font-size:0.78rem; color:var(--clr-text-muted);">
      📷 ${imagenes.length} foto${imagenes.length !== 1 ? 's' : ''} · 🎥 ${videos.length} video${videos.length !== 1 ? 's' : ''}
    </div>`;

    container.innerHTML = html;
  }
};

window.EVIDENCIAS = EVIDENCIAS;
