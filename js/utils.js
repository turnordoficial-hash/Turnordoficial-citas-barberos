// Utilidades comunes y manejo de errores modernos para TurnORD

// Crear instancia de notificaciones (se usa la del sistema de notificaciones principal)
const notify = {
  success: (msg, duration) => window.NotificationManager?.showInPageNotification('Éxito', msg, 'success'),
  error: (msg, duration) => window.NotificationManager?.showInPageNotification('Error', msg, 'error'),
  warning: (msg, duration) => window.NotificationManager?.showInPageNotification('Advertencia', msg, 'warning'),
  info: (msg, duration) => window.NotificationManager?.showInPageNotification('Información', msg, 'info')
};

// Funciones de utilidad para localStorage
const StorageUtils = {
  // Guardar/leer configuración
  saveConfig(cfg){
    try {
      localStorage.setItem('turnord_config', JSON.stringify(cfg));
      return true;
    } catch (e){ console.error('Error al guardar config:', e); notify.error('Error al guardar configuración'); return false; }
  },
  getConfig(){
    try { const s = localStorage.getItem('turnord_config'); return s? JSON.parse(s): null; }
    catch(e){ console.error('Error al leer config:', e); return null; }
  },

  // Obtener citas con manejo de errores
  getCitas() {
    try {
      const citas = localStorage.getItem('citas');
      return citas ? JSON.parse(citas) : [];
    } catch (error) {
      console.error('Error al obtener citas:', error);
      notify.error('Error al cargar las citas');
      return [];
    }
  },

  // Guardar citas con manejo de errores
  saveCitas(citas) {
    try {
      localStorage.setItem('citas', JSON.stringify(citas));
      return true;
    } catch (error) {
      console.error('Error al guardar citas:', error);
      notify.error('Error al guardar las citas');
      return false;
    }
  },

  // Obtener barberos con manejo de errores
  getBarberos() {
    try {
      const barberos = localStorage.getItem('barberos');
      return barberos ? JSON.parse(barberos) : [];
    } catch (error) {
      console.error('Error al obtener barberos:', error);
      notify.error('Error al cargar los barberos');
      return [];
    }
  },

  // Guardar barberos con manejo de errores
  saveBarberos(barberos) {
    try {
      localStorage.setItem('barberos', JSON.stringify(barberos));
      return true;
    } catch (error) {
      console.error('Error al guardar barberos:', error);
      notify.error('Error al guardar los barberos');
      return false;
    }
  }
};

// Validaciones comunes
const Validators = {
  // Validar email
  email(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  },

  // Validar teléfono
  phone(phone) {
    const regex = /^[\d\s\-\+\(\)]{7,15}$/;
    return regex.test(phone.replace(/\s/g, ''));
  },

  // Validar que no esté vacío
  required(value) {
    return value && value.toString().trim().length > 0;
  },

  // Validar fecha (no puede ser en el pasado)
  futureDate(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const inputDate = new Date(date);
    return inputDate >= today;
  },

  // Validar hora en formato HH:MM
  time(time) {
    const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return regex.test(time);
  },

  // Escapar HTML
  escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[s]));
  }
};

// Utilidades de fecha
const DateUtils = {
  // Convertir fecha a formato ISO
  toISODate(date) {
    return date.toISOString().split('T')[0];
  },

  // Obtener inicio de semana
  startOfWeek(date) {
    const day = date.getDay();
    const diff = (day + 6) % 7;
    const start = new Date(date);
    start.setDate(date.getDate() - diff);
    return start;
  },

  // Formatear fecha para mostrar
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  },

  // Formatear hora
  formatTime(timeString) {
    return timeString.slice(0, 5);
  }
};

// Manejo de errores global
window.addEventListener('error', (event) => {
  console.error('Error global:', event.error);
  notify.error('Ha ocurrido un error inesperado');
});

// Manejo de promesas rechazadas
window.addEventListener('unhandledrejection', (event) => {
  console.error('Promesa rechazada:', event.reason);
  notify.error('Error en operación asíncrona');
});

// Exportar para uso global
window.TurnORDUtils = {
  notify,
  StorageUtils,
  Validators,
  DateUtils
};