// JavaScript para la gestión de citas y agenda de TurnORD

// Variables globales
const barberos = TURNORD.barberos.filter(b => b.activo);
let view = 'dia';
let currentDate = new Date();

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  initializeCitas();
});

function initializeCitas() {
  try {
    setupEventListeners();
    setInitialDate();
    build();
    actualizarEstadisticas();
  } catch (error) {
    console.error('Error al inicializar gestión de citas:', error);
    TurnORDUtils.notify.error('Error al cargar la agenda');
  }
}

// Configurar event listeners
function setupEventListeners() {
  try {
    // Botones de vista
    document.getElementById('vistaDia').onclick = () => changeView('dia');
    document.getElementById('vistaSemana').onclick = () => changeView('semana');
    document.getElementById('vistaMes').onclick = () => changeView('mes');
    
    // Navegación
    document.getElementById('btnHoy').onclick = () => goToToday();
    document.getElementById('btnPrev').onclick = () => navigateDate(-1);
    document.getElementById('btnNext').onclick = () => navigateDate(1);
    
    // Selector de fecha
    const fechaSelector = document.getElementById('fechaSelector');
    if (fechaSelector) {
      fechaSelector.onchange = (e) => {
        try {
          currentDate = new Date(e.target.value);
          build();
        } catch (error) {
          console.error('Error al cambiar fecha:', error);
          TurnORDUtils.notify.error('Fecha inválida');
        }
      };
    }
    
    // Filtros
    document.getElementById('filtroBarbero').onchange = () => build();
    document.getElementById('filtroEstado').onchange = () => build();
    
    // Modal nueva cita
    document.getElementById('btnNuevaCita').onclick = () => abrirModalNuevaCita();
    document.getElementById('cerrarModalCita').onclick = () => cerrarModalNuevaCita();
    document.getElementById('cancelarCita').onclick = () => cerrarModalNuevaCita();
    document.getElementById('formNuevaCita').onsubmit = (e) => {
      e.preventDefault();
      crearNuevaCita();
    };
    
    // Exportar
    document.getElementById('btnExportar').onclick = () => exportarCitas();
    
    // Cargar datos en filtros
    cargarFiltros();
    
  } catch (error) {
    console.error('Error al configurar event listeners:', error);
  }
}

// Establecer fecha inicial
function setInitialDate() {
  const fechaSelector = document.getElementById('fechaSelector');
  if (fechaSelector) {
    fechaSelector.value = toISODate(new Date());
  }
}

// Cambiar vista
function changeView(newView) {
  try {
    view = newView;
    updateViewButtons();
    build();
  } catch (error) {
    console.error('Error al cambiar vista:', error);
    TurnORDUtils.notify.error('Error al cambiar vista');
  }
}

// Actualizar botones de vista
function updateViewButtons() {
  const buttons = ['vistaDia', 'vistaSemana', 'vistaMes'];
  const views = ['dia', 'semana', 'mes'];
  
  buttons.forEach((buttonId, index) => {
    const button = document.getElementById(buttonId);
    if (button) {
      if (views[index] === view) {
        button.classList.add('bg-brand-700');
        button.classList.remove('bg-brand-600');
      } else {
        button.classList.add('bg-brand-600');
        button.classList.remove('bg-brand-700');
      }
    }
  });
}

// Ir a hoy
function goToToday() {
  try {
    currentDate = new Date();
    const fechaSelector = document.getElementById('fechaSelector');
    if (fechaSelector) {
      fechaSelector.value = toISODate(currentDate);
    }
    build();
  } catch (error) {
    console.error('Error al ir a hoy:', error);
  }
}

// Navegar fechas
function navigateDate(direction) {
  try {
    const days = view === 'dia' ? 1 : (view === 'semana' ? 7 : 30);
    currentDate.setDate(currentDate.getDate() + (direction * days));
    
    const fechaSelector = document.getElementById('fechaSelector');
    if (fechaSelector) {
      fechaSelector.value = toISODate(currentDate);
    }
    
    build();
  } catch (error) {
    console.error('Error al navegar fecha:', error);
    TurnORDUtils.notify.error('Error al navegar');
  }
}

// Utilidades de fecha
function toISODate(date) {
  return date.toISOString().split('T')[0];
}

// Obtener citas locales
function getCitasLocal() {
  try {
    const allCitas = TurnORDUtils.StorageUtils.getCitas();
    return allCitas.filter(c => c.negocio_id === TURNORD.NEGOCIO_ID);
  } catch (error) {
    console.error('Error al obtener citas locales:', error);
    return [];
  }
}

// Guardar cita local
function saveCitaLocal(cita) {
  try {
    const allCitas = TurnORDUtils.StorageUtils.getCitas();
    allCitas.push(cita);
    return TurnORDUtils.StorageUtils.saveCitas(allCitas);
  } catch (error) {
    console.error('Error al guardar cita local:', error);
    TurnORDUtils.notify.error('Error al guardar la cita');
    return false;
  }
}

// Generar slots de tiempo
function genSlots(inicio = "09:00", fin = "19:00", step = 30) {
  try {
    const toMin = s => {
      const [h, m] = s.split(':').map(Number);
      return h * 60 + m;
    };
    
    const toHHMM = t => {
      const hours = Math.floor(t / 60);
      const minutes = t % 60;
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    };
    
    const slots = [];
    let t = toMin(inicio);
    const T = toMin(fin);
    
    while (t < T) {
      slots.push(toHHMM(t));
      t += step;
    }
    
    return slots;
  } catch (error) {
    console.error('Error al generar slots:', error);
    return [];
  }
}

// Renderizar vista de día
function renderDia(fecha) {
  try {
    const slots = genSlots(TURNORD.HORARIO.inicio, TURNORD.HORARIO.fin);
    const citas = getCitasLocal().filter(c => c.fecha === fecha);
    const container = document.getElementById('agenda');
    
    if (!container) {
      throw new Error('Contenedor de agenda no encontrado');
    }
    
    const cols = ['Hora', ...barberos.map(b => b.nombre)];
    
    // Crear encabezado
    const head = `<div class="min-w-[640px] grid" style="grid-template-columns: repeat(${cols.length}, minmax(140px,1fr))">
      ${cols.map(c => `<div class="px-2 py-1 bg-gray-100 font-semibold border">${c}</div>`).join('')}
    </div>`;
    
    // Crear filas
    const rows = slots.map(slot => {
      const cells = [`<div class="px-2 py-1 border text-sm">${slot}</div>`];
      
      barberos.forEach(b => {
        const cita = citas.find(c => c.barbero_id === b.id && c.hora.slice(0, 5) === slot);
        const color = getCitaColor(cita?.estado);
        
        if (cita) {
          cells.push(`<div class="px-2 py-1 border ${color} cursor-pointer" onclick="editCita('${cita.id}')">
            ${cita.cliente_nombre} (${cita.estado})
          </div>`);
        } else {
          cells.push(`<div class="px-2 py-1 border">
            <button class="px-1 py-0.5 bg-brand-600 hover:bg-brand-700 text-white rounded transition-colors" 
              data-barbero="${b.id}" data-hora="${slot}">Crear</button>
          </div>`);
        }
      });
      
      return `<div class="min-w-[640px] grid" style="grid-template-columns: repeat(${cols.length}, minmax(140px,1fr))">
        ${cells.join('')}
      </div>`;
    }).join('');
    
    container.innerHTML = head + rows;
    
    // Configurar botones de crear cita
    setupCreateButtons(fecha);
    
  } catch (error) {
    console.error('Error al renderizar día:', error);
    TurnORDUtils.notify.error('Error al cargar la vista del día');
  }
}

// Configurar botones de crear cita
function setupCreateButtons(fecha) {
  const buttons = document.querySelectorAll('button[data-barbero]');
  buttons.forEach(btn => {
    btn.onclick = () => {
      try {
        const barberoId = btn.dataset.barbero;
        const hora = btn.dataset.hora;
        createQuickCita(barberoId, fecha, hora);
      } catch (error) {
        console.error('Error al crear cita rápida:', error);
        TurnORDUtils.notify.error('Error al crear la cita');
      }
    };
  });
}

// Crear cita rápida
function createQuickCita(barberoId, fecha, hora) {
  const nombre = prompt('Nombre del cliente:');
  if (!nombre || !nombre.trim()) {
    TurnORDUtils.notify.warning('Nombre requerido');
    return;
  }
  
  const telefono = prompt('Teléfono del cliente (opcional):') || '';
  const servicio = prompt('Servicio (Corte/Barba/Corte + Barba):', 'Corte') || 'Corte';
  
  const nueva = {
    id: Date.now().toString(),
    negocio_id: TURNORD.NEGOCIO_ID,
    cliente_nombre: nombre.trim(),
    cliente_telefono: telefono.trim(),
    cliente_email: '',
    servicio: servicio,
    barbero_id: barberoId,
    fecha: fecha,
    hora: hora,
    estado: 'creada',
    fecha_creacion: new Date().toISOString(),
    monto: getServicioPrecio(servicio)
  };
  
  if (saveCitaLocal(nueva)) {
    // Programar notificaciones automáticas
    if (window.NotificationManager) {
        window.NotificationManager.scheduleNotifications(nueva);
    }
    
    TurnORDUtils.notify.success('Cita creada exitosamente');
    build();
  }
}

// Obtener precio del servicio
function getServicioPrecio(servicio) {
  const precios = {
    'Corte': 15,
    'Barba': 10,
    'Corte + Barba': 20
  };
  return precios[servicio] || 15;
}

// Obtener color según estado de cita
function getCitaColor(estado) {
  const colores = {
    'creada': 'bg-yellow-100 border-yellow-300',
    'confirmada': 'bg-green-100 border-green-300',
    'cancelada': 'bg-red-100 border-red-300',
    'atendida': 'bg-blue-100 border-blue-300',
    'pendiente': 'bg-orange-100 border-orange-300'
  };
  return colores[estado] || 'bg-gray-100';
}

// Renderizar vista de semana
function renderSemana(fecha) {
  try {
    const start = new Date(fecha);
    start.setDate(start.getDate() - start.getDay());
    
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
    
    const slots = genSlots(TURNORD.HORARIO.inicio, TURNORD.HORARIO.fin);
    const citas = getCitasLocal();
    const container = document.getElementById('agenda');
    
    if (!container) {
      throw new Error('Contenedor de agenda no encontrado');
    }
    
    const cols = ['Hora', ...days.map(d => d.toLocaleDateString('es-DO', { weekday: 'short', day: '2-digit' }))];
    
    const head = `<div class="min-w-[640px] grid" style="grid-template-columns: repeat(${cols.length}, minmax(140px,1fr))">
      ${cols.map(c => `<div class="px-2 py-1 bg-gray-100 font-semibold border">${c}</div>`).join('')}
    </div>`;
    
    const rows = slots.map(slot => {
      const cells = [`<div class="px-2 py-1 border text-sm">${slot}</div>`];
      
      days.forEach(d => {
        const fechaISO = toISODate(d);
        const citasDelSlot = citas.filter(c => c.fecha === fechaISO && c.hora.slice(0, 5) === slot);
        
        if (citasDelSlot.length > 0) {
          const citaTexto = citasDelSlot.map(c => `${c.cliente_nombre} (${c.estado})`).join(', ');
          const color = getCitaColor(citasDelSlot[0].estado);
          cells.push(`<div class="px-2 py-1 border ${color} text-xs">${citaTexto}</div>`);
        } else {
          cells.push(`<div class="px-2 py-1 border"></div>`);
        }
      });
      
      return `<div class="min-w-[640px] grid" style="grid-template-columns: repeat(${cols.length}, minmax(140px,1fr))">
        ${cells.join('')}
      </div>`;
    }).join('');
    
    container.innerHTML = head + rows;
    
  } catch (error) {
    console.error('Error al renderizar semana:', error);
    TurnORDUtils.notify.error('Error al cargar la vista de semana');
  }
}

// Renderizar vista de mes
function renderMes(fecha) {
  try {
    const citas = getCitasLocal();
    const container = document.getElementById('agenda');
    
    if (!container) {
      throw new Error('Contenedor de agenda no encontrado');
    }
    
    const year = fecha.getFullYear();
    const month = fecha.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    
    let grid = `<div class="grid gap-1" style="grid-template-columns: repeat(7,minmax(120px,1fr))">`;
    
    // Días de la semana
    const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    weekdays.forEach(d => {
      grid += `<div class="px-2 py-1 bg-gray-100 font-semibold border text-center">${d}</div>`;
    });
    
    // Espacios vacíos al inicio
    for (let i = 0; i < firstDay; i++) {
      grid += `<div class="px-2 py-6 border bg-gray-50"></div>`;
    }
    
    // Días del mes
    for (let d = 1; d <= lastDate; d++) {
      const fechaISO = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const citasDelDia = citas.filter(c => c.fecha === fechaISO);
      
      let inner = `<div class="text-sm font-semibold mb-1 text-center">${d}</div>`;
      
      citasDelDia.forEach(c => {
        const color = getCitaColor(c.estado);
        inner += `<div class="text-xs p-1 my-0.5 rounded ${color} cursor-pointer" onclick="editCita('${c.id}')">
          ${c.cliente_nombre} (${c.estado})
        </div>`;
      });
      
      grid += `<div class="px-1 py-1 border min-h-[80px] hover:bg-gray-50 transition-colors">${inner}</div>`;
    }
    
    container.innerHTML = grid + '</div>';
    
  } catch (error) {
    console.error('Error al renderizar mes:', error);
    TurnORDUtils.notify.error('Error al cargar la vista del mes');
  }
}

// Editar cita
function editCita(citaId) {
  try {
    const citas = getCitasLocal();
    const cita = citas.find(c => c.id === citaId);
    
    if (!cita) {
      TurnORDUtils.notify.error('Cita no encontrada');
      return;
    }
    
    const nuevoEstado = prompt(`Estado actual: ${cita.estado}\nNuevo estado (creada/confirmada/atendida/cancelada):`, cita.estado);
    
    if (nuevoEstado && ['creada', 'confirmada', 'atendida', 'cancelada'].includes(nuevoEstado)) {
      cita.estado = nuevoEstado;
      cita.ultima_actualizacion = new Date().toISOString();
      
      const allCitas = TurnORDUtils.StorageUtils.getCitas();
      const index = allCitas.findIndex(c => c.id === citaId);
      if (index >= 0) {
        allCitas[index] = cita;
        if (TurnORDUtils.StorageUtils.saveCitas(allCitas)) {
          // Programar notificaciones automáticas
          if (window.NotificationManager) {
              window.NotificationManager.scheduleNotifications(cita);
          }
          
          TurnORDUtils.notify.success('Cita actualizada');
          build();
        }
      }
    } else if (nuevoEstado) {
      TurnORDUtils.notify.error('Estado inválido');
    }
    
  } catch (error) {
    console.error('Error al editar cita:', error);
    TurnORDUtils.notify.error('Error al editar la cita');
  }
}

// Función principal de construcción
function build() {
  try {
    const fechaISO = toISODate(currentDate);
    
    if (view === 'dia') {
      renderDia(fechaISO);
    } else if (view === 'semana') {
      renderSemana(fechaISO);
    } else {
      renderMes(currentDate);
    }
    
  } catch (error) {
    console.error('Error al construir vista:', error);
    TurnORDUtils.notify.error('Error al cargar la vista');
  }
}

// Hacer funciones disponibles globalmente
// Funciones del modal de nueva cita
function cargarFiltros() {
  try {
    const barberos = JSON.parse(localStorage.getItem('barberos') || '[]');
    const filtroBarbero = document.getElementById('filtroBarbero');
    const citaBarbero = document.getElementById('citaBarbero');
    
    // Limpiar y cargar barberos en filtros
    filtroBarbero.innerHTML = '<option value="todos">Todos los barberos</option>';
    citaBarbero.innerHTML = '<option value="">Seleccionar barbero</option>';
    
    barberos.forEach(barbero => {
      if (barbero.activo) {
        const optionFiltro = document.createElement('option');
        optionFiltro.value = barbero.id;
        optionFiltro.textContent = barbero.nombre;
        filtroBarbero.appendChild(optionFiltro);
        
        const optionCita = document.createElement('option');
        optionCita.value = barbero.id;
        optionCita.textContent = barbero.nombre;
        citaBarbero.appendChild(optionCita);
      }
    });
    
    // Cargar servicios
    const servicios = JSON.parse(localStorage.getItem('servicios') || '[]');
    const citaServicio = document.getElementById('citaServicio');
    citaServicio.innerHTML = '<option value="">Seleccionar servicio</option>';
    
    servicios.forEach(servicio => {
      const option = document.createElement('option');
      option.value = servicio.id;
      option.textContent = `${servicio.nombre} - $${servicio.precio}`;
      citaServicio.appendChild(option);
    });
    
  } catch (error) {
    console.error('Error al cargar filtros:', error);
  }
}

function abrirModalNuevaCita() {
  try {
    // Establecer fecha actual por defecto
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('citaFecha').value = hoy;
    
    // Mostrar modal
    document.getElementById('modalNuevaCita').classList.remove('hidden');
  } catch (error) {
    console.error('Error al abrir modal:', error);
  }
}

function cerrarModalNuevaCita() {
  try {
    document.getElementById('modalNuevaCita').classList.add('hidden');
    document.getElementById('formNuevaCita').reset();
  } catch (error) {
    console.error('Error al cerrar modal:', error);
  }
}

function crearNuevaCita() {
  try {
    const formData = new FormData(document.getElementById('formNuevaCita'));
    
    const nuevaCita = {
      id: Date.now().toString(),
      clienteNombre: document.getElementById('clienteNombre').value,
      clienteTelefono: document.getElementById('clienteTelefono').value,
      barberoId: document.getElementById('citaBarbero').value,
      servicioId: document.getElementById('citaServicio').value,
      fecha: document.getElementById('citaFecha').value,
      hora: document.getElementById('citaHora').value,
      notas: document.getElementById('citaNotas').value,
      estado: 'pendiente',
      fechaCreacion: new Date().toISOString()
    };
    
    // Validar campos requeridos
    if (!nuevaCita.clienteNombre || !nuevaCita.barberoId || !nuevaCita.servicioId || !nuevaCita.fecha || !nuevaCita.hora) {
      TurnORDUtils.notify.error('Por favor complete todos los campos requeridos');
      return;
    }
    
    // Guardar cita
    saveCitaLocal(nuevaCita);
    
    // Cerrar modal y actualizar vista
    cerrarModalNuevaCita();
    build();
    actualizarEstadisticas();
    
    TurnORDUtils.notify.success('Cita creada exitosamente');
    
  } catch (error) {
    console.error('Error al crear cita:', error);
    TurnORDUtils.notify.error('Error al crear la cita');
  }
}

function actualizarEstadisticas() {
  try {
    const citas = getCitasLocal();
    const hoy = new Date().toISOString().split('T')[0];
    const citasHoy = citas.filter(cita => cita.fecha === hoy);
    
    // Aplicar filtros
    const filtroBarbero = document.getElementById('filtroBarbero').value;
    const filtroEstado = document.getElementById('filtroEstado').value;
    
    let citasFiltradas = citasHoy;
    
    if (filtroBarbero !== 'todos') {
      citasFiltradas = citasFiltradas.filter(cita => cita.barberoId === filtroBarbero);
    }
    
    if (filtroEstado !== 'todos') {
      citasFiltradas = citasFiltradas.filter(cita => cita.estado === filtroEstado);
    }
    
    // Calcular estadísticas
    const totalCitas = citasFiltradas.length;
    const citasConfirmadas = citasFiltradas.filter(c => c.estado === 'confirmada').length;
    const citasPendientes = citasFiltradas.filter(c => c.estado === 'pendiente').length;
    
    // Calcular ingresos del día
    const servicios = JSON.parse(localStorage.getItem('servicios') || '[]');
    let ingresosDia = 0;
    
    citasFiltradas.forEach(cita => {
      if (cita.estado === 'completada') {
        const servicio = servicios.find(s => s.id === cita.servicioId);
        if (servicio) {
          ingresosDia += servicio.precio;
        }
      }
    });
    
    // Actualizar UI
    document.getElementById('totalCitas').textContent = totalCitas;
    document.getElementById('citasConfirmadas').textContent = citasConfirmadas;
    document.getElementById('citasPendientes').textContent = citasPendientes;
    document.getElementById('ingresosDia').textContent = `$${ingresosDia.toLocaleString()}`;
    
  } catch (error) {
    console.error('Error al actualizar estadísticas:', error);
  }
}

function exportarCitas() {
  try {
    const citas = getCitasLocal();
    const barberos = JSON.parse(localStorage.getItem('barberos') || '[]');
    const servicios = JSON.parse(localStorage.getItem('servicios') || '[]');
    
    // Aplicar filtros actuales
    const filtroBarbero = document.getElementById('filtroBarbero').value;
    const filtroEstado = document.getElementById('filtroEstado').value;
    
    let citasFiltradas = citas;
    
    if (filtroBarbero !== 'todos') {
      citasFiltradas = citasFiltradas.filter(cita => cita.barberoId === filtroBarbero);
    }
    
    if (filtroEstado !== 'todos') {
      citasFiltradas = citasFiltradas.filter(cita => cita.estado === filtroEstado);
    }
    
    // Crear CSV
    let csv = 'Fecha,Hora,Cliente,Teléfono,Barbero,Servicio,Precio,Estado,Notas\n';
    
    citasFiltradas.forEach(cita => {
      const barbero = barberos.find(b => b.id === cita.barberoId);
      const servicio = servicios.find(s => s.id === cita.servicioId);
      
      csv += `${cita.fecha},${cita.hora},${cita.clienteNombre || 'N/A'},${cita.clienteTelefono || 'N/A'},${barbero?.nombre || 'N/A'},${servicio?.nombre || 'N/A'},${servicio?.precio || 0},${cita.estado},"${cita.notas || ''}"\n`;
    });
    
    // Descargar archivo
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `citas_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    TurnORDUtils.notify.success('Citas exportadas correctamente');
    
  } catch (error) {
    console.error('Error al exportar citas:', error);
    TurnORDUtils.notify.error('Error al exportar citas');
  }
}

// Modificar la función build para incluir estadísticas
function buildWithStats() {
  build();
  actualizarEstadisticas();
}

window.editCita = editCita;
window.createQuickCita = createQuickCita;
window.abrirModalNuevaCita = abrirModalNuevaCita;
window.cerrarModalNuevaCita = cerrarModalNuevaCita;
window.crearNuevaCita = crearNuevaCita;
window.exportarCitas = exportarCitas;
window.actualizarEstadisticas = actualizarEstadisticas;