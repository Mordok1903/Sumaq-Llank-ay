// ================================================
// config.js — Configuración Global SIGA
// Credenciales de Supabase y Cloudinary
// ================================================

const CONFIG = {
  // ── Supabase ──
  SUPABASE_URL: 'https://sawcdgaewsehibclhrie.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhd2NkZ2Fld3NlaGliY2xocmllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5MTIzMTQsImV4cCI6MjEwNDQ4ODMxNH0.T07ofKKGvfNW_Z6J-dk4j5EKy2Jl8Jf8zqCu21vteSg',

  // ── Cloudinary ──
  CLOUDINARY_CLOUD_NAME: 'b7wgjvai',
  CLOUDINARY_UPLOAD_PRESET: 'siga_evidencias',

  // ── Límites de evidencias ──
  MAX_FOTOS: 10,
  MAX_VIDEOS: 3,
  MIN_FOTOS: 1,
  MIN_VIDEOS: 1,
  MAX_FILE_SIZE_MB: 25,

  // Formatos permitidos
  FORMATOS_IMAGEN: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
  FORMATOS_VIDEO: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'],

  // ── Sesión ──
  SESSION_EXPIRY_DAYS: 14 // Duración mínima de la sesión
};

window.CONFIG = CONFIG;
