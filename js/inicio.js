// JavaScript para la página de inicio/dashboard de TurnORD

// Variables globales
let intervalId = null;
let modalData = {};

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  initializeInicio();
});

function initializeInicio() {
  try {
    setupModalEventListeners();
    loadDashboardData();
    startAutoRefresh();
  } catch (error) {
    console.error('Error al inicializar página de inicio:', error);
    TurnORDUtils.notify.error('Error al cargar el dashboard');
  }
}

// Configurar event listeners del modal
function setupModalEventListeners() {
  try {
    const btnClose = document.getElementById('btnAtenderClose');
    const btnCancel = document.getElementById('btnAtenderCancel');
    const btnConfirm = document.getElementById('btnAtenderConfirm');
    const btnCancelarCita = document.getElementById('btnCancelarCita');

    if (btnClose) btnClose.addEventListener('click', closeModalAtender);
    if (btnCancel) btnCancel.addEventListener('click', closeModalAtender);
    if (btnConfirm) btnConfirm.addEventListener('click', confirmarAtencion);
    if (btnCancelarCita) btnCancelarCita.addEventListener('click', cancelarCita);
    
    // Cerrar modal al hacer clic fuera
    const modal = document.getElementById('modalAtender');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModalAtender();
        }
      });
    }

    // Modal Cobro
    const btnCobroClose = document.getElementById('btnCobroClose');
    const btnCobroCancel = document.getElementById('btnCobroCancel');
    const btnCobroSave = document.getElementById('btnCobroSave');
    if (btnCobroClose) btnCobroClose.addEventListener('click', closeModalCobro);
    if (btnCobroCancel) btnCobroCancel.addEventListener('click', closeModalCobro);
    if (btnCobroSave) btnCobroSave.addEventListener('click', guardarCobro);
  } catch (error) {
    console.error('Error al configurar modal:', error);
  }
}

// Cargar datos del dashboard
function loadDashboardData() {
  try {
    proximasCitas();
    actualizarContadores();
  } catch (error) {
    console.error('Error al cargar datos del dashboard:', error);
    TurnORDUtils.notify.error('Error al cargar los datos');
  }
}

// Iniciar actualización automática
function startAutoRefresh() {
  // Limpiar intervalo anterior si existe
  if (intervalId) {
    clearInterval(intervalId);
  }
  
  // Actualizar cada segundo para el countdown
  intervalId = setInterval(() => {
    try {
      proximasCitas();
      actualizarContadores();
    } catch (error) {
      console.error('Error en actualización automática:', error);
    }
  }, 1000);
}

// Leer citas desde localStorage
function getCitas() {
  try {
    return TurnORDUtils.StorageUtils.getCitas();
  } catch (error) {
    console.error('Error al obtener citas:', error);
    return [];
  }
}

// Mostrar próximas citas filtrando por negocio
function proximasCitas() {
  try {
    const citas = getCitas().filter(c => c.negocio_id === TURNORD.NEGOCIO_ID);
    const hoyISO = new Date().toISOString().split('T')[0];

    // Solo hoy y estados relevantes
    const proximas = citas
      .filter(c => c.fecha === hoyISO && ['agendada','creada','en_atencion'].includes((c.estado||'').toLowerCase()))
      .sort((a, b) => a.hora.localeCompare(b.hora))
      .slice(0, 20);

    const cont = document.getElementById('proximasCitas');
    if (!cont) return;

    if (proximas.length === 0) {
      cont.innerHTML = '<p class="text-gray-500 italic">No hay citas próximas para hoy.</p>';
      return;
    }

    const now = Date.now();
    cont.innerHTML = proximas.map(c => {
      const barbero = TURNORD.barberos.find(b => b.id === c.barbero_id);
      const est = (c.estado || '').toLowerCase();
      const isAtencion = est === 'en_atencion';
      const estadoColor = isAtencion ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
      const cardClass = isAtencion ? 'ring-2 ring-green-400 bg-green-50 cursor-pointer' : 'cursor-pointer hover:ring-1 hover:ring-brand-600/30';

      let corner = '';
      if (isAtencion) {
        const started = c.en_atencion_desde || 0;
        const durMs = ((c.duracion_min || (TURNORD?.HORARIO?.intervaloMin ?? 30)) * 60000);
        const remaining = Math.max(0, (started + durMs) - now);
        const mm = String(Math.floor(remaining/60000)).padStart(2,'0');
        const ss = String(Math.floor((remaining%60000)/1000)).padStart(2,'0');
        corner = `<span class="absolute top-2 right-2 text-xs bg-green-600 text-white px-2 py-0.5 rounded">${mm}:${ss}</span>`;
      }

      const dataAttrs = `data-id="${c.id ?? ''}" data-cliente="${c.cliente_nombre}" data-servicio="${c.servicio}" data-fecha="${c.fecha}" data-hora="${c.hora}" data-precio="${c.monto||''}" data-estado="${(c.estado||'').toLowerCase()}"`;

      return `
        <div class="relative bg-white rounded-2xl shadow p-4 flex flex-col gap-3 cita-item ${cardClass}" ${dataAttrs}>
          ${corner}
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <p class="font-semibold text-lg">${c.cliente_nombre}</p>
              <p class="text-gray-500">${c.servicio} | ${barbero?.nombre || "Barbero"}</p>
              <p class="text-sm text-gray-400">${c.fecha} ${c.hora}</p>
            </div>
            <span class="px-3 py-1 rounded-full text-sm font-medium ${estadoColor}">${c.estado}</span>
          </div>
          <p class="text-xs text-gray-400">${isAtencion ? 'Clic para cobrar' : 'Clic para atender o cancelar'}</p>
        </div>
      `;
    }).join('');

    // Click handlers
    cont.querySelectorAll('.cita-item').forEach(card => {
      const raw = card.getAttribute('data-estado') || (card.querySelector('span')?.textContent || '');
      const estado = raw
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g,'') // quitar acentos
        .replace(/\s+/g,'_');
      const payload = {
        id: card.getAttribute('data-id') || '',
        cliente: card.getAttribute('data-cliente') || '',
        servicio: card.getAttribute('data-servicio') || '',
        fecha: card.getAttribute('data-fecha') || '',
        hora: card.getAttribute('data-hora') || '',
        precio: parseFloat(card.getAttribute('data-precio') || '0') || 0
      };
      if (['agendada','creada'].includes(estado)) {
        card.addEventListener('click', () => openModalAtender(payload));
      } else if (estado === 'en_atencion') {
        card.addEventListener('click', () => openModalCobro(payload));
      }
    });
  } catch (error) {
    console.error('Error al mostrar próximas citas:', error);
    TurnORDUtils.notify.error('Error al cargar las próximas citas');
  }
}

// Obtener color según estado
function getEstadoColor(estado) {
  const colores = {
    'pendiente': 'bg-yellow-100 text-yellow-800',
    'atendida': 'bg-green-100 text-green-800',
    'en_atencion': 'bg-blue-100 text-blue-800',
    'confirmada': 'bg-green-100 text-green-800',
    'creada': 'bg-gray-100 text-gray-700',
    'cancelada': 'bg-red-100 text-red-800'
  };
  return colores[estado] || 'bg-gray-100 text-gray-700';
}

// Generar countdown para citas en atención
function generateCountdown(cita, now) {
  try {
    const started = cita.en_atencion_desde || 0;
    const durMs = ((cita.duracion_min || (TURNORD?.HORARIO?.intervaloMin ?? 30)) * 60000);
    const remaining = Math.max(0, (started + durMs) - now);
    
    const mm = String(Math.floor(remaining / 60000)).padStart(2, '0');
    const ss = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0');
    
    const colorClass = remaining < 300000 ? 'text-red-700 bg-red-50' : 'text-blue-700 bg-blue-50'; // 5 minutos
    
    return `<div class="mt-2 text-sm ${colorClass} px-2 py-1 rounded">
      Tiempo restante: <span class="font-semibold">${mm}:${ss}</span>
    </div>`;
  } catch (error) {
    console.error('Error al generar countdown:', error);
    return '';
  }
}

// Configurar click handlers (ya integrado en proximasCitas). Dejado por compatibilidad.
function setupCitaClickHandlers() {}

// Actualizar contadores del dashboard
function actualizarContadores() {
  try {
    const citas = getCitas().filter(c => c.negocio_id === TURNORD.NEGOCIO_ID);
    const hoy = new Date().toISOString().split('T')[0];
    
    const contadores = {
      turnosHoy: citas.filter(c => c.fecha === hoy).length,
      turnosPendientes: citas.filter(c => ['agendada','creada'].includes((c.estado||'').toLowerCase())).length,
      turnosAtendidos: citas.filter(c => (c.estado||'').toLowerCase() === 'atendida').length
    };
    
    Object.entries(contadores).forEach(([id, valor]) => {
      const elemento = document.getElementById(id);
      if (elemento) {
        if (elemento.textContent !== valor.toString()) {
          elemento.style.transform = 'scale(1.1)';
          elemento.textContent = valor;
          setTimeout(() => { elemento.style.transform = 'scale(1)'; }, 200);
        }
      }
    });
  } catch (error) {
    console.error('Error al actualizar contadores:', error);
  }
}

// Abrir modal de atención
function openModalAtender(payload) {
  try {
    const modal = document.getElementById('modalAtender');
    if (!modal) {
      throw new Error('Modal no encontrado');
    }
    
    // Guardar datos en variable global
    modalData = { ...payload };
    
    // Actualizar contenido del modal
    const elementos = {
      'modalCliente': payload.cliente || '—',
      'modalServicio': payload.servicio || '—',
      'modalFechaHora': `${payload.fecha || ''} ${payload.hora || ''}`.trim()
    };
    
    Object.entries(elementos).forEach(([id, valor]) => {
      const elemento = document.getElementById(id);
      if (elemento) {
        elemento.textContent = valor;
      }
    });
    
    // Establecer tiempo por defecto
    const tiempoInput = document.getElementById('modalTiempo');
    if (tiempoInput) {
      const defMin = (window.TURNORD?.HORARIO?.intervaloMin) || 30;
      tiempoInput.value = payload.duracion_min || defMin;
    }
    
    // Mostrar modal
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    // Focus en el input de tiempo
    setTimeout(() => {
      if (tiempoInput) tiempoInput.focus();
    }, 100);
    
  } catch (error) {
    console.error('Error al abrir modal:', error);
    TurnORDUtils.notify.error('Error al abrir el modal');
  }
}

// Cerrar modal de atención
function closeModalAtender() {
  try {
    const modal = document.getElementById('modalAtender');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    
    // Limpiar datos
    modalData = {};
    
  } catch (error) {
    console.error('Error al cerrar modal:', error);
  }
}

// Confirmar atención de cita
function cancelarCita() {
  try {
    const modal = document.getElementById('modalAtender');
    const id = modal?.dataset.id || '';
    const cliente = modal?.dataset.cliente || '';
    const fecha = modal?.dataset.fecha || '';
    const hora = modal?.dataset.hora || '';
    const all = TurnORDUtils.StorageUtils.getCitas();
    const idx = all.findIndex(x => (id ? x.id === id : (x.cliente_nombre===cliente && x.fecha===fecha && x.hora===hora)));
    if (idx >= 0) {
      all[idx].estado = 'cancelada';
      TurnORDUtils.StorageUtils.saveCitas(all);
    }
    closeModalAtender();
    loadDashboardData();
  } catch (e) { console.error(e); }
}

function confirmarAtencion() {
  try {
    const tiempoInput = document.getElementById('modalTiempo');
    const durMin = parseInt(tiempoInput?.value || '0', 10) || ((window.TURNORD?.HORARIO?.intervaloMin) || 30);
    
    if (durMin < 5 || durMin > 180) {
      TurnORDUtils.notify.warning('El tiempo debe estar entre 5 y 180 minutos');
      return;
    }
    
    const allCitas = TurnORDUtils.StorageUtils.getCitas();
    let citaIndex = -1;
    
    // Buscar la cita por ID o por datos
    if (modalData.id) {
      citaIndex = allCitas.findIndex(x => x.id === modalData.id);
    } else {
      citaIndex = allCitas.findIndex(x => 
        x.cliente_nombre === modalData.cliente && 
        x.fecha === modalData.fecha && 
        x.hora === modalData.hora
      );
    }
    
    if (citaIndex < 0) {
      throw new Error('Cita no encontrada');
    }
    
    // Actualizar cita
    allCitas[citaIndex].estado = 'en_atencion';
    allCitas[citaIndex].en_atencion_desde = Date.now();
    allCitas[citaIndex].duracion_min = durMin;
    allCitas[citaIndex].ultima_actualizacion = new Date().toISOString();
    
    const success = TurnORDUtils.StorageUtils.saveCitas(allCitas);
    
    if (success) {
      TurnORDUtils.notify.success('Cita marcada como en atención');
      closeModalAtender();
      loadDashboardData();
    } else {
      throw new Error('Error al guardar los cambios');
    }
    
  } catch (error) {
    console.error('Error al confirmar atención:', error);
    TurnORDUtils.notify.error(`Error: ${error.message}`);
  }
}

// Función para marcar cita como atendida (desde countdown)
function marcarComoAtendida(citaId) {
  try {
    const allCitas = TurnORDUtils.StorageUtils.getCitas();
    const citaIndex = allCitas.findIndex(c => c.id === citaId);
    
    if (citaIndex < 0) {
      throw new Error('Cita no encontrada');
    }
    
    allCitas[citaIndex].estado = 'atendida';
    allCitas[citaIndex].fecha_atencion = new Date().toISOString();
    allCitas[citaIndex].ultima_actualizacion = new Date().toISOString();
    
    // Cancelar notificaciones programadas ya que la cita fue atendida
    if (window.NotificationManager) {
      window.NotificationManager.cancelNotifications(citaId);
    }
    
    const success = TurnORDUtils.StorageUtils.saveCitas(allCitas);
    
    if (success) {
      TurnORDUtils.notify.success('Cita marcada como atendida');
      loadDashboardData();
    }
    
  } catch (error) {
    console.error('Error al marcar como atendida:', error);
    TurnORDUtils.notify.error('Error al actualizar la cita');
  }
}

// Función para obtener estadísticas rápidas
function getEstadisticasRapidas() {
  try {
    const citas = getCitas().filter(c => c.negocio_id === TURNORD.NEGOCIO_ID);
    const hoy = new Date().toISOString().split('T')[0];
    
    return {
      totalHoy: citas.filter(c => c.fecha === hoy).length,
      pendientes: citas.filter(c => c.estado === 'pendiente').length,
      enAtencion: citas.filter(c => c.estado === 'en_atencion').length,
      atendidas: citas.filter(c => c.estado === 'atendida' && c.fecha === hoy).length,
      canceladas: citas.filter(c => c.estado === 'cancelada' && c.fecha === hoy).length
    };
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return {};
  }
}

// Modal de cobro
function openModalCobro(payload) {
  try {
    const modal = document.getElementById('modalCobro');
    if (!modal) return;
    modal.dataset.id = payload.id || '';
    const montoSugerido = Number(payload.precio || 0);
    document.getElementById('cobroCliente').textContent = payload.cliente || '—';
    document.getElementById('cobroMonto').value = isFinite(montoSugerido) && montoSugerido>0 ? montoSugerido.toFixed(2) : '';
    document.getElementById('cobroMetodo').value = 'Efectivo';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  } catch (e) { console.error(e); }
}
function closeModalCobro(){
  const modal = document.getElementById('modalCobro');
  if (!modal) return; modal.classList.add('hidden'); modal.classList.remove('flex');
}
function guardarCobro(){
  try {
    const modal = document.getElementById('modalCobro');
    const id = modal.dataset.id || '';
    const monto = parseFloat(document.getElementById('cobroMonto').value||'0');
    const metodo = document.getElementById('cobroMetodo').value;
    if (!isFinite(monto) || monto<=0){ TurnORDUtils.notify.warning('Monto inválido'); return; }
    const all = TurnORDUtils.StorageUtils.getCitas();
    const idx = all.findIndex(x=>x.id===id);
    if (idx>=0){
      all[idx].estado = 'atendida';
      all[idx].monto = monto;
      all[idx].pago_metodo = metodo;
      all[idx].atendida_en = Date.now();
      
      // Cancelar notificaciones programadas ya que la cita fue cobrada
      if (window.NotificationManager) {
        window.NotificationManager.cancelNotifications(id);
      }
      
      TurnORDUtils.StorageUtils.saveCitas(all);
    }
    closeModalCobro();
    loadDashboardData();
    renderHistorial();
  } catch (e) { console.error(e); }
}

function renderHistorial(){
  try {
    const citas = getCitas().filter(c => c.negocio_id===TURNORD.NEGOCIO_ID && (c.estado||'').toLowerCase()==='atendida');
    const tbody = document.getElementById('historialBody');
    if (!tbody) return;
    const rows = citas
      .sort((a,b)=> (b.atendida_en||0) - (a.atendida_en||0))
      .slice(0,20)
      .map(c=>{
        const fh = c.atendida_en ? new Date(c.atendida_en).toLocaleString() : `${c.fecha} ${c.hora}`;
        return `<tr>
          <td class="border px-3 py-2">${fh}</td>
          <td class="border px-3 py-2">${TurnORDUtils.Validators.escapeHtml ? TurnORDUtils.Validators.escapeHtml(c.cliente_nombre) : c.cliente_nombre}</td>
          <td class="border px-3 py-2">${c.servicio||''}</td>
          <td class="border px-3 py-2">${c.pago_metodo||'—'}</td>
          <td class="border px-3 py-2 text-right">${Number(c.monto||0).toFixed(2)}</td>
        </tr>`;
      }).join('');
    tbody.innerHTML = rows || '<tr><td colspan="5" class="border px-3 py-2 text-center text-gray-500">Sin registros</td></tr>';
  } catch (e) { console.error(e); }
}

// Limpiar intervalo al salir de la página
window.addEventListener('beforeunload', () => {
  if (intervalId) {
    clearInterval(intervalId);
  }
});

// Hacer funciones disponibles globalmente
window.openModalAtender = openModalAtender;
window.closeModalAtender = closeModalAtender;
window.confirmarAtencion = confirmarAtencion;
window.marcarComoAtendida = marcarComoAtendida;
window.getEstadisticasRapidas = getEstadisticasRapidas;
window.openModalCobro = openModalCobro;
window.closeModalCobro = closeModalCobro;
window.guardarCobro = guardarCobro;
window.renderHistorial = renderHistorial;