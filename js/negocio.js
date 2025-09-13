// JavaScript para la página de gestión de negocio de TurnORD

// Variables globales
let currentMetrics = {};
let refreshInterval = null;

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  initializeNegocio();
});

function initializeNegocio() {
  try {
    setupEventListeners();
    loadBusinessData();
    initializeEstadisticas();
    startAutoRefresh();
  } catch (error) {
    console.error('Error al inicializar página de negocio:', error);
    TurnORDUtils.notify.error('Error al cargar la página de negocio');
  }
}

// Configurar event listeners
function setupEventListeners() {
  try {
    // Formulario de servicios
    const formServicio = document.getElementById('formServicio');
    if (formServicio) {
      formServicio.addEventListener('submit', handleServiceSubmit);
    }
    
    // Formulario de barberos
    const formBarbero = document.getElementById('formBarbero');
    if (formBarbero) {
      formBarbero.addEventListener('submit', handleBarberSubmit);
    }

    // Formulario de horario
    const formHorario = document.getElementById('formHorario');
    if(formHorario) {
      formHorario.addEventListener('submit', handleHorarioSubmit);
    }
    
    // Botones de eliminar servicios
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-eliminar-servicio')) {
        const servicioId = e.target.getAttribute('data-id');
        eliminarServicio(servicioId);
      }
    });
    
    // Botones de eliminar barberos
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-eliminar-barbero')) {
        const barberoId = e.target.getAttribute('data-id');
        eliminarBarbero(barberoId);
      }
    });
    
    // Botones de configurar barberos
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-configurar-barbero')) {
        const barberoId = e.target.getAttribute('data-id');
        abrirModalConfigBarbero(barberoId);
      }
    });

    // Botones de configurar servicios
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-configurar-servicio')) {
        const servicioId = e.target.getAttribute('data-id');
        abrirModalConfigServicio(servicioId);
      }
    });
    
    // Modal de configuración de barbero
    const modalConfigBarbero = document.getElementById('modalConfigBarbero');
    const btnCerrarModal = document.getElementById('btnCerrarModal');
    const btnCancelarConfig = document.getElementById('btnCancelarConfig');
    const formConfigBarbero = document.getElementById('formConfigBarbero');
    
    if (btnCerrarModal) {
      btnCerrarModal.addEventListener('click', cerrarModalConfigBarbero);
    }
    
    if (btnCancelarConfig) {
      btnCancelarConfig.addEventListener('click', cerrarModalConfigBarbero);
    }
    
    if (formConfigBarbero) {
      formConfigBarbero.addEventListener('submit', handleConfigBarberoSubmit);
    }
    
    if (modalConfigBarbero) {
      modalConfigBarbero.addEventListener('click', (e) => {
        if (e.target === modalConfigBarbero) {
          cerrarModalConfigBarbero();
        }
      });
    }

    // Modal de configuración de servicio
    const modalConfigServicio = document.getElementById('modalConfigServicio');
    const btnCerrarModalServicio = document.getElementById('btnCerrarModalServicio');
    const btnCancelarConfigServicio = document.getElementById('btnCancelarConfigServicio');
    const formConfigServicio = document.getElementById('formConfigServicio');

    if (btnCerrarModalServicio) {
      btnCerrarModalServicio.addEventListener('click', cerrarModalConfigServicio);
    }
    if (btnCancelarConfigServicio) {
      btnCancelarConfigServicio.addEventListener('click', cerrarModalConfigServicio);
    }
    if (formConfigServicio) {
      formConfigServicio.addEventListener('submit', handleConfigServicioSubmit);
    }
    if (modalConfigServicio) {
      modalConfigServicio.addEventListener('click', (e) => {
        if (e.target === modalConfigServicio) {
          cerrarModalConfigServicio();
        }
      });
    }
    
  } catch (error) {
    console.error('Error al configurar event listeners:', error);
  }
}

// Cargar datos del negocio
function loadBusinessData() {
  try {
    renderHorarioGlobal();
    calcularMetricas();
    renderServicios();
    renderBarberos();
    renderIngresosDelDia();
  } catch (error) {
    console.error('Error al cargar datos del negocio:', error);
    TurnORDUtils.notify.error('Error al cargar los datos');
  }
}

// Renderizar horario global
function renderHorarioGlobal() {
  try {
    const horario = TURNORD.HORARIO || { inicio: '09:00', fin: '19:00' };
    document.getElementById('horarioGlobalInicio').value = horario.inicio;
    document.getElementById('horarioGlobalFin').value = horario.fin;
  } catch (error) {
    console.error('Error al renderizar horario global:', error);
  }
}

// Iniciar actualización automática
function startAutoRefresh() {
  // Limpiar intervalo anterior si existe
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  
  // Actualizar cada 30 segundos
  refreshInterval = setInterval(() => {
    try {
      calcularMetricas();
      renderIngresosDelDia();
    } catch (error) {
      console.error('Error en actualización automática:', error);
    }
  }, 30000);
}

// Obtener citas del negocio
function getCitasNegocio() {
  try {
    return TurnORDUtils.StorageUtils.getCitas().filter(c => c.negocio_id === TURNORD.NEGOCIO_ID);
  } catch (error) {
    console.error('Error al obtener citas del negocio:', error);
    return [];
  }
}

// Calcular métricas del negocio
function calcularMetricas() {
  try {
    const citas = getCitasNegocio();
    const hoy = new Date().toISOString().split('T')[0];
    const mesActual = hoy.substring(0, 7); // YYYY-MM
    
    // Métricas del día
    const citasHoy = citas.filter(c => c.fecha === hoy);
    const ingresosHoy = citasHoy
      .filter(c => c.estado === 'atendida')
      .reduce((sum, c) => sum + (parseFloat(c.precio) || 0), 0);
    
    // Métricas del mes
    const citasMes = citas.filter(c => c.fecha.startsWith(mesActual));
    const ingresosMes = citasMes
      .filter(c => c.estado === 'atendida')
      .reduce((sum, c) => sum + (parseFloat(c.precio) || 0), 0);
    
    // Métricas generales
    const totalCitas = citas.length;
    const citasAtendidas = citas.filter(c => c.estado === 'atendida').length;
    const tasaAtencion = totalCitas > 0 ? ((citasAtendidas / totalCitas) * 100).toFixed(1) : '0';
    
    currentMetrics = {
      citasHoy: citasHoy.length,
      ingresosHoy,
      citasMes: citasMes.length,
      ingresosMes,
      totalCitas,
      citasAtendidas,
      tasaAtencion
    };
    
    updateMetricsDisplay();
    
  } catch (error) {
    console.error('Error al calcular métricas:', error);
    TurnORDUtils.notify.error('Error al calcular las métricas');
  }
}

// Actualizar visualización de métricas
function updateMetricsDisplay() {
  try {
    const elementos = {
      'citasHoy': currentMetrics.citasHoy || 0,
      'ingresosHoy': `$${(currentMetrics.ingresosHoy || 0).toLocaleString()}`,
      'citasMes': currentMetrics.citasMes || 0,
      'ingresosMes': `$${(currentMetrics.ingresosMes || 0).toLocaleString()}`,
      'totalCitas': currentMetrics.totalCitas || 0,
      'tasaAtencion': `${currentMetrics.tasaAtencion || 0}%`
    };
    
    Object.entries(elementos).forEach(([id, valor]) => {
      const elemento = document.getElementById(id);
      if (elemento) {
        // Animación de cambio
        if (elemento.textContent !== valor.toString()) {
          elemento.style.transform = 'scale(1.05)';
          elemento.textContent = valor;
          setTimeout(() => {
            elemento.style.transform = 'scale(1)';
          }, 200);
        }
      }
    });
    
  } catch (error) {
    console.error('Error al actualizar métricas:', error);
  }
}

// Renderizar servicios activos
function renderServicios() {
  try {
    const servicios = TURNORD.servicios || [];
    const tbody = document.getElementById('serviciosTableBody');
    
    if (!tbody) {
      console.warn('Tabla de servicios no encontrada');
      return;
    }
    
    if (servicios.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500">No hay servicios registrados</td></tr>';
      return;
    }
    
    tbody.innerHTML = servicios.map(servicio => `
      <tr class="hover:bg-gray-50 transition-colors">
        <td class="px-4 py-3 font-medium">${TurnORDUtils.Validators.escapeHtml(servicio.nombre)}</td>
        <td class="px-4 py-3">$${parseFloat(servicio.precio || 0).toLocaleString()}</td>
        <td class="px-4 py-3">${parseInt(servicio.duracion || 0)} min</td>
        <td class="px-4 py-3">
          <button
            class="btn-configurar-servicio bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition-colors mr-2"
            data-id="${servicio.id}"
            title="Configurar servicio"
          >
            Editar
          </button>
          <button 
            class="btn-eliminar-servicio bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition-colors"
            data-id="${servicio.id}"
            title="Eliminar servicio"
          >
            Eliminar
          </button>
        </td>
      </tr>
    `).join('');
    
  } catch (error) {
    console.error('Error al renderizar servicios:', error);
    TurnORDUtils.notify.error('Error al cargar los servicios');
  }
}

// Renderizar barberos
function renderBarberos() {
  try {
    const barberos = TURNORD.barberos || [];
    const tbody = document.getElementById('barberosTableBody');
    
    if (!tbody) {
      console.warn('Tabla de barberos no encontrada');
      return;
    }
    
    if (barberos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-gray-500">No hay barberos registrados</td></tr>';
      return;
    }
    
    tbody.innerHTML = barberos.map(barbero => {
      const citas = getCitasNegocio();
      const citasBarbero = citas.filter(c => c.barbero_id === barbero.id);
      const citasAtendidas = citasBarbero.filter(c => c.estado === 'atendida').length;
      
      return `
        <tr class="hover:bg-gray-50 transition-colors">
          <td class="px-4 py-3 font-medium">${TurnORDUtils.Validators.escapeHtml(barbero.nombre)}</td>
          <td class="px-4 py-3">${citasAtendidas} citas</td>
          <td class="px-4 py-3">
            <button 
              class="btn-configurar-barbero bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition-colors mr-2"
              data-id="${barbero.id}"
              title="Configurar barbero"
            >
              Configurar
            </button>
            <button 
              class="btn-eliminar-barbero bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition-colors"
              data-id="${barbero.id}"
              title="Eliminar barbero"
            >
              Eliminar
            </button>
          </td>
        </tr>
      `;
    }).join('');
    
    // También renderizar la configuración de barberos
    renderBarberosConfig();
    
  } catch (error) {
    console.error('Error al renderizar barberos:', error);
    TurnORDUtils.notify.error('Error al cargar los barberos');
  }
}

// Renderizar ingresos del día
function renderIngresosDelDia() {
  try {
    const citas = getCitasNegocio();
    const hoy = new Date().toISOString().split('T')[0];
    const citasHoy = citas.filter(c => c.fecha === hoy && c.estado === 'atendida');
    
    const tbody = document.getElementById('ingresosTableBody');
    if (!tbody) {
      console.warn('Tabla de ingresos no encontrada');
      return;
    }
    
    if (citasHoy.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500">No hay ingresos registrados hoy</td></tr>';
      return;
    }
    
    // Agrupar por barbero
    const ingresosPorBarbero = {};
    citasHoy.forEach(cita => {
      const barberoId = cita.barbero_id;
      if (!ingresosPorBarbero[barberoId]) {
        const barbero = TURNORD.barberos.find(b => b.id === barberoId);
        ingresosPorBarbero[barberoId] = {
          nombre: barbero?.nombre || 'Barbero desconocido',
          citas: 0,
          ingresos: 0
        };
      }
      ingresosPorBarbero[barberoId].citas++;
      ingresosPorBarbero[barberoId].ingresos += parseFloat(cita.precio || 0);
    });
    
    tbody.innerHTML = Object.values(ingresosPorBarbero).map(barbero => `
      <tr class="hover:bg-gray-50 transition-colors">
        <td class="px-4 py-3 font-medium">${TurnORDUtils.Validators.escapeHtml(barbero.nombre)}</td>
        <td class="px-4 py-3">${barbero.citas}</td>
        <td class="px-4 py-3 font-semibold text-green-600">$${barbero.ingresos.toLocaleString()}</td>
        <td class="px-4 py-3 text-sm text-gray-500">${TurnORDUtils.DateUtils.formatDate(hoy)}</td>
      </tr>
    `).join('');
    
  } catch (error) {
    console.error('Error al renderizar ingresos:', error);
    TurnORDUtils.notify.error('Error al cargar los ingresos');
  }
}

// Manejar envío del formulario de servicios
function handleServiceSubmit(e) {
  e.preventDefault();
  
  try {
    const formData = new FormData(e.target);
    const nombre = formData.get('nombre')?.toString().trim();
    const precio = formData.get('precio')?.toString().trim();
    const duracion = formData.get('duracion')?.toString().trim();
    
    // Validaciones
    if (!TurnORDUtils.Validators.isValidString(nombre, 2, 50)) {
      TurnORDUtils.notify.warning('El nombre del servicio debe tener entre 2 y 50 caracteres');
      return;
    }
    
    const precioNum = parseFloat(precio);
    if (isNaN(precioNum) || precioNum <= 0 || precioNum > 999999) {
      TurnORDUtils.notify.warning('El precio debe ser un número válido entre 1 y 999,999');
      return;
    }
    
    const duracionNum = parseInt(duracion, 10);
    if (isNaN(duracionNum) || duracionNum < 5 || duracionNum > 480) {
      TurnORDUtils.notify.warning('La duración debe estar entre 5 y 480 minutos');
      return;
    }
    
    // Verificar si ya existe un servicio con el mismo nombre
    const servicioExistente = TURNORD.servicios.find(s => 
      s.nombre.toLowerCase() === nombre.toLowerCase()
    );
    
    if (servicioExistente) {
      TurnORDUtils.notify.warning('Ya existe un servicio con ese nombre');
      return;
    }
    
    // Crear nuevo servicio
    const nuevoServicio = {
      id: TurnORDUtils.generateId(),
      nombre,
      precio: precioNum,
      duracion: duracionNum,
      activo: true,
      fecha_creacion: new Date().toISOString()
    };
    
    // Agregar al array de servicios
    TURNORD.servicios.push(nuevoServicio);
    
    // Guardar en localStorage
    const success = TurnORDUtils.StorageUtils.saveConfig(TURNORD);
    
    if (success) {
      TurnORDUtils.notify.success('Servicio agregado correctamente');
      e.target.reset();
      renderServicios();
    } else {
      throw new Error('Error al guardar la configuración');
    }
    
  } catch (error) {
    console.error('Error al agregar servicio:', error);
    TurnORDUtils.notify.error(`Error: ${error.message}`);
  }
}

// Manejar envío del formulario de barberos
function handleBarberSubmit(e) {
  e.preventDefault();
  
  try {
    const formData = new FormData(e.target);
    const nombre = formData.get('nombre')?.toString().trim();
    
    // Validaciones
    if (!TurnORDUtils.Validators.isValidString(nombre, 2, 50)) {
      TurnORDUtils.notify.warning('El nombre del barbero debe tener entre 2 y 50 caracteres');
      return;
    }
    
    // Verificar si ya existe un barbero con el mismo nombre
    const barberoExistente = TURNORD.barberos.find(b => 
      b.nombre.toLowerCase() === nombre.toLowerCase()
    );
    
    if (barberoExistente) {
      TurnORDUtils.notify.warning('Ya existe un barbero con ese nombre');
      return;
    }
    
    // Crear nuevo barbero
    const nuevoBarbero = {
      id: TurnORDUtils.generateId(),
      nombre,
      activo: true,
      fecha_creacion: new Date().toISOString()
    };
    
    // Agregar al array de barberos
    TURNORD.barberos.push(nuevoBarbero);
    
    // Guardar en localStorage
    const success = TurnORDUtils.StorageUtils.saveConfig(TURNORD);
    
    if (success) {
      TurnORDUtils.notify.success('Barbero agregado correctamente');
      e.target.reset();
      renderBarberos();
    } else {
      throw new Error('Error al guardar la configuración');
    }
    
  } catch (error) {
    console.error('Error al agregar barbero:', error);
    TurnORDUtils.notify.error(`Error: ${error.message}`);
  }
}

// Eliminar servicio
function eliminarServicio(servicioId) {
  try {
    if (!servicioId) {
      throw new Error('ID de servicio no válido');
    }
    
    // Verificar si hay citas que usan este servicio
    const citas = getCitasNegocio();
    const citasConServicio = citas.filter(c => c.servicio_id === servicioId);
    
    if (citasConServicio.length > 0) {
      TurnORDUtils.notify.warning('No se puede eliminar el servicio porque tiene citas asociadas');
      return;
    }
    
    // Confirmar eliminación
    if (!confirm('¿Estás seguro de que deseas eliminar este servicio?')) {
      return;
    }
    
    // Eliminar del array
    const index = TURNORD.servicios.findIndex(s => s.id === servicioId);
    if (index === -1) {
      throw new Error('Servicio no encontrado');
    }
    
    TURNORD.servicios.splice(index, 1);
    
    // Guardar cambios
    const success = TurnORDUtils.StorageUtils.saveConfig(TURNORD);
    
    if (success) {
      TurnORDUtils.notify.success('Servicio eliminado correctamente');
      renderServicios();
    } else {
      throw new Error('Error al guardar los cambios');
    }
    
  } catch (error) {
    console.error('Error al eliminar servicio:', error);
    TurnORDUtils.notify.error(`Error: ${error.message}`);
  }
}

// Eliminar barbero
function eliminarBarbero(barberoId) {
  try {
    if (!barberoId) {
      throw new Error('ID de barbero no válido');
    }
    
    // Verificar si hay citas asignadas a este barbero
    const citas = getCitasNegocio();
    const citasConBarbero = citas.filter(c => c.barbero_id === barberoId);
    
    if (citasConBarbero.length > 0) {
      TurnORDUtils.notify.warning('No se puede eliminar el barbero porque tiene citas asignadas');
      return;
    }
    
    // Confirmar eliminación
    if (!confirm('¿Estás seguro de que deseas eliminar este barbero?')) {
      return;
    }
    
    // Eliminar del array
    const index = TURNORD.barberos.findIndex(b => b.id === barberoId);
    if (index === -1) {
      throw new Error('Barbero no encontrado');
    }
    
    TURNORD.barberos.splice(index, 1);
    
    // Guardar cambios
    const success = TurnORDUtils.StorageUtils.saveConfig(TURNORD);
    
    if (success) {
      TurnORDUtils.notify.success('Barbero eliminado correctamente');
      renderBarberos();
    } else {
      throw new Error('Error al guardar los cambios');
    }
    
  } catch (error) {
    console.error('Error al eliminar barbero:', error);
    TurnORDUtils.notify.error(`Error: ${error.message}`);
  }
}

// Exportar datos del negocio
function exportarDatos() {
  try {
    const datos = {
      negocio: {
        id: TURNORD.NEGOCIO_ID,
        nombre: 'TurnORD Business',
        fecha_exportacion: new Date().toISOString()
      },
      servicios: TURNORD.servicios,
      barberos: TURNORD.barberos,
      citas: getCitasNegocio(),
      metricas: currentMetrics
    };
    
    const dataStr = JSON.stringify(datos, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `turnord-datos-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    TurnORDUtils.notify.success('Datos exportados correctamente');
    
  } catch (error) {
    console.error('Error al exportar datos:', error);
    TurnORDUtils.notify.error('Error al exportar los datos');
  }
}

// Limpiar intervalo al salir de la página
window.addEventListener('beforeunload', () => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});

// Renderizar configuración de barberos
function renderBarberosConfig() {
  try {
    const barberos = TURNORD.barberos || [];
    const container = document.getElementById('barberosConfig');
    
    if (!container) {
      console.warn('Contenedor de configuración de barberos no encontrado');
      return;
    }
    
    if (barberos.length === 0) {
      container.innerHTML = '<div class="text-center py-8 text-gray-500">No hay barberos registrados para configurar</div>';
      return;
    }
    
    container.innerHTML = barberos.map(barbero => {
      const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const diasTrabajo = (barbero.dias || []).map(d => diasSemana[d]).join(', ') || 'No configurado';
      const horario = `${barbero.horario_inicio || '09:00'} - ${barbero.horario_fin || '19:00'}`;
      const breakInfo = barbero.break_inicio && barbero.break_fin ? 
        `${barbero.break_inicio} - ${barbero.break_fin}` : 'Sin break';
      
      return `
        <div class="border rounded-lg p-4 bg-gray-50">
          <div class="flex justify-between items-start mb-3">
            <div>
              <h4 class="font-semibold text-lg">${TurnORDUtils.Validators.escapeHtml(barbero.nombre)}</h4>
              <span class="inline-block px-2 py-1 text-xs rounded-full ${
                barbero.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }">
                ${barbero.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <button 
              class="btn-configurar-barbero bg-brand-600 hover:bg-brand-700 text-white px-3 py-2 rounded-lg text-sm transition"
              data-id="${barbero.id}"
            >
              Editar configuración
            </button>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span class="font-medium text-gray-700">Horario:</span>
              <div class="text-gray-600">${horario}</div>
            </div>
            <div>
              <span class="font-medium text-gray-700">Break:</span>
              <div class="text-gray-600">${breakInfo}</div>
            </div>
            <div>
              <span class="font-medium text-gray-700">Días:</span>
              <div class="text-gray-600">${diasTrabajo}</div>
            </div>
          </div>
          
          ${barbero.break_padding_min ? `
            <div class="mt-2 text-xs text-gray-500">
              Tiempo adicional después del break: ${barbero.break_padding_min} minutos
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
    
  } catch (error) {
    console.error('Error al renderizar configuración de barberos:', error);
  }
}

// Abrir modal de configuración de barbero
function abrirModalConfigBarbero(barberoId) {
  try {
    const barbero = TURNORD.barberos.find(b => b.id === barberoId);
    if (!barbero) {
      TurnORDUtils.notify.error('Barbero no encontrado');
      return;
    }
    
    const modal = document.getElementById('modalConfigBarbero');
    const modalTitle = document.getElementById('modalTitle');
    
    if (!modal) {
      console.error('Modal de configuración no encontrado');
      return;
    }
    
    // Actualizar título
    if (modalTitle) {
      modalTitle.textContent = `Configurar ${barbero.nombre}`;
    }
    
    // Llenar formulario con datos actuales
    document.getElementById('barberoId').value = barbero.id;
    document.getElementById('barberoNombre').value = barbero.nombre;
    document.getElementById('horarioInicio').value = barbero.horario_inicio || '09:00';
    document.getElementById('horarioFin').value = barbero.horario_fin || '19:00';
    document.getElementById('breakInicio').value = barbero.break_inicio || '';
    document.getElementById('breakFin').value = barbero.break_fin || '';
    document.getElementById('breakPadding').value = barbero.break_padding_min || 0;
    document.getElementById('barberoActivo').checked = barbero.activo !== false;
    
    // Configurar días de trabajo
    const diasCheckboxes = document.querySelectorAll('input[name="dias"]');
    diasCheckboxes.forEach(checkbox => {
      checkbox.checked = (barbero.dias || []).includes(parseInt(checkbox.value));
    });
    
    // Mostrar modal
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
  } catch (error) {
    console.error('Error al abrir modal de configuración:', error);
    TurnORDUtils.notify.error('Error al abrir la configuración');
  }
}

// Cerrar modal de configuración de barbero
function cerrarModalConfigBarbero() {
  try {
    const modal = document.getElementById('modalConfigBarbero');
    if (modal) {
      modal.classList.add('hidden');
      document.body.style.overflow = 'auto';
    }
    
    // Limpiar formulario
    const form = document.getElementById('formConfigBarbero');
    if (form) {
      form.reset();
    }
    
  } catch (error) {
    console.error('Error al cerrar modal:', error);
  }
}

// Manejar envío del formulario de configuración de barbero
function handleConfigBarberoSubmit(e) {
  e.preventDefault();
  
  try {
    const formData = new FormData(e.target);
    const barberoId = formData.get('barberoId');
    const nombre = formData.get('nombre')?.toString().trim();
    const horarioInicio = formData.get('horarioInicio');
    const horarioFin = formData.get('horarioFin');
    const breakInicio = formData.get('breakInicio');
    const breakFin = formData.get('breakFin');
    const breakPadding = parseInt(formData.get('breakPadding')) || 0;
    const activo = formData.has('activo');
    
    // Obtener días seleccionados
    const diasSeleccionados = [];
    const diasCheckboxes = document.querySelectorAll('input[name="dias"]:checked');
    diasCheckboxes.forEach(checkbox => {
      diasSeleccionados.push(parseInt(checkbox.value));
    });
    
    // Validaciones
    if (!TurnORDUtils.Validators.isValidString(nombre, 2, 50)) {
      TurnORDUtils.notify.warning('El nombre del barbero debe tener entre 2 y 50 caracteres');
      return;
    }

    const barberoExistente = TURNORD.barberos.find(b =>
      b.nombre.toLowerCase() === nombre.toLowerCase() && b.id !== barberoId
    );

    if (barberoExistente) {
      TurnORDUtils.notify.warning('Ya existe otro barbero con ese nombre');
      return;
    }

    if (!horarioInicio || !horarioFin) {
      TurnORDUtils.notify.warning('Debe especificar horario de inicio y fin');
      return;
    }
    
    if (horarioInicio >= horarioFin) {
      TurnORDUtils.notify.warning('La hora de inicio debe ser anterior a la hora de fin');
      return;
    }
    
    if (breakInicio && breakFin && breakInicio >= breakFin) {
      TurnORDUtils.notify.warning('La hora de inicio del break debe ser anterior a la hora de fin');
      return;
    }
    
    if (diasSeleccionados.length === 0) {
      TurnORDUtils.notify.warning('Debe seleccionar al menos un día de trabajo');
      return;
    }
    
    // Encontrar y actualizar barbero
    const barberoIndex = TURNORD.barberos.findIndex(b => b.id === barberoId);
    if (barberoIndex === -1) {
      throw new Error('Barbero no encontrado');
    }
    
    // Actualizar configuración
    TURNORD.barberos[barberoIndex] = {
      ...TURNORD.barberos[barberoIndex],
      nombre: nombre,
      horario_inicio: horarioInicio,
      horario_fin: horarioFin,
      break_inicio: breakInicio || '',
      break_fin: breakFin || '',
      break_padding_min: breakPadding,
      dias: diasSeleccionados,
      activo: activo
    };
    
    // Guardar cambios
    const success = TurnORDUtils.StorageUtils.saveConfig(TURNORD);
    
    if (success) {
      TurnORDUtils.notify.success('Configuración guardada correctamente');
      cerrarModalConfigBarbero();
      renderBarberos(); // Esto también actualizará la configuración
    } else {
      throw new Error('Error al guardar la configuración');
    }
    
  } catch (error) {
    console.error('Error al guardar configuración de barbero:', error);
    TurnORDUtils.notify.error(`Error: ${error.message}`);
  }
}

// Funciones de estadísticas de ganancias
function initializeEstadisticas() {
  try {
    // Verificar que los elementos existan
    const filtroFecha = document.getElementById('filtroFecha');
    const filtroBarbero = document.getElementById('filtroBarbero');
    const exportarBtn = document.getElementById('exportarDatos');
    
    if (filtroFecha && filtroBarbero) {
      // Event listeners para filtros
      filtroFecha.addEventListener('change', actualizarEstadisticas);
      filtroBarbero.addEventListener('change', actualizarEstadisticas);
      
      if (exportarBtn) {
        exportarBtn.addEventListener('click', exportarEstadisticas);
      }
      
      // Cargar barberos en el filtro
      cargarBarberosEnFiltro();
      
      // Cargar estadísticas iniciales
      actualizarEstadisticas();
    }
  } catch (error) {
    console.error('Error al inicializar estadísticas:', error);
  }
}

function cargarBarberosEnFiltro() {
  try {
    const barberos = JSON.parse(localStorage.getItem('barberos') || '[]');
    const filtroBarbero = document.getElementById('filtroBarbero');
    
    if (!filtroBarbero) return;
    
    // Limpiar opciones existentes excepto "Todos"
    filtroBarbero.innerHTML = '<option value="todos">Todos los barberos</option>';
    
    barberos.forEach(barbero => {
      const option = document.createElement('option');
      option.value = barbero.id;
      option.textContent = barbero.nombre;
      filtroBarbero.appendChild(option);
    });
  } catch (error) {
    console.error('Error al cargar barberos en filtro:', error);
  }
}

function actualizarEstadisticas() {
  try {
    const filtroFechaEl = document.getElementById('filtroFecha');
    const filtroBarberoEl = document.getElementById('filtroBarbero');
    
    if (!filtroFechaEl || !filtroBarberoEl) return;
    
    const filtroFecha = filtroFechaEl.value;
    const filtroBarbero = filtroBarberoEl.value;
    
    const citas = JSON.parse(localStorage.getItem('citas') || '[]');
    const barberos = JSON.parse(localStorage.getItem('barberos') || '[]');
    const servicios = JSON.parse(localStorage.getItem('servicios') || '[]');
    
    // Filtrar citas por fecha
    const citasFiltradas = filtrarCitasPorFecha(citas, filtroFecha);
    
    // Filtrar por barbero si no es "todos"
    const citasFinales = filtroBarbero === 'todos' 
      ? citasFiltradas 
      : citasFiltradas.filter(cita => cita.barberoId === filtroBarbero);
    
    // Calcular estadísticas
    const estadisticas = calcularEstadisticas(citasFinales, barberos, servicios);
    
    // Actualizar UI
    actualizarResumenGanancias(estadisticas.resumen);
    actualizarTablaEstadisticas(estadisticas.porBarbero);
    
  } catch (error) {
    console.error('Error al actualizar estadísticas:', error);
  }
}

function filtrarCitasPorFecha(citas, filtro) {
  const ahora = new Date();
  const inicioDelDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  
  return citas.filter(cita => {
    const fechaCita = new Date(cita.fecha);
    
    switch (filtro) {
      case 'hoy':
        return fechaCita >= inicioDelDia;
      case 'semana':
        const inicioSemana = new Date(inicioDelDia);
        inicioSemana.setDate(inicioDelDia.getDate() - inicioDelDia.getDay());
        return fechaCita >= inicioSemana;
      case 'mes':
        const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
        return fechaCita >= inicioMes;
      case 'trimestre':
        const inicioTrimestre = new Date(ahora.getFullYear(), Math.floor(ahora.getMonth() / 3) * 3, 1);
        return fechaCita >= inicioTrimestre;
      case 'año':
        const inicioAño = new Date(ahora.getFullYear(), 0, 1);
        return fechaCita >= inicioAño;
      default:
        return true;
    }
  }).filter(cita => cita.estado === 'completada');
}

function calcularEstadisticas(citas, barberos, servicios) {
  const estadisticasPorBarbero = {};
  let ingresosTotales = 0;
  let citasTotales = citas.length;
  
  // Inicializar estadísticas por barbero
  barberos.forEach(barbero => {
    estadisticasPorBarbero[barbero.id] = {
      nombre: barbero.nombre,
      citas: 0,
      ingresos: 0,
      servicios: {},
      calificacionPromedio: 0,
      calificaciones: []
    };
  });
  
  // Procesar cada cita
  citas.forEach(cita => {
    const barberoId = cita.barberoId;
    if (estadisticasPorBarbero[barberoId]) {
      const servicio = servicios.find(s => s.id === cita.servicioId);
      const precio = servicio ? servicio.precio : 0;
      
      estadisticasPorBarbero[barberoId].citas++;
      estadisticasPorBarbero[barberoId].ingresos += precio;
      ingresosTotales += precio;
      
      // Contar servicios populares
      const servicioNombre = servicio ? servicio.nombre : 'Desconocido';
      estadisticasPorBarbero[barberoId].servicios[servicioNombre] = 
        (estadisticasPorBarbero[barberoId].servicios[servicioNombre] || 0) + 1;
      
      // Calificaciones (simuladas por ahora)
      if (cita.calificacion) {
        estadisticasPorBarbero[barberoId].calificaciones.push(cita.calificacion);
      }
    }
  });
  
  // Calcular promedios y encontrar mejor barbero
  let mejorBarbero = { nombre: '-', ingresos: 0 };
  
  Object.values(estadisticasPorBarbero).forEach(stats => {
    if (stats.calificaciones.length > 0) {
      stats.calificacionPromedio = stats.calificaciones.reduce((a, b) => a + b, 0) / stats.calificaciones.length;
    }
    
    if (stats.ingresos > mejorBarbero.ingresos) {
      mejorBarbero = { nombre: stats.nombre, ingresos: stats.ingresos };
    }
  });
  
  return {
    resumen: {
      ingresosTotales,
      citasTotales,
      promedioPorCita: citasTotales > 0 ? ingresosTotales / citasTotales : 0,
      mejorBarbero: mejorBarbero.nombre
    },
    porBarbero: Object.values(estadisticasPorBarbero)
  };
}

function actualizarResumenGanancias(resumen) {
  document.getElementById('ingresosTotales').textContent = `$${resumen.ingresosTotales.toLocaleString()}`;
  document.getElementById('citasCompletadas').textContent = resumen.citasTotales;
  document.getElementById('promedioCita').textContent = `$${Math.round(resumen.promedioPorCita).toLocaleString()}`;
  document.getElementById('mejorBarbero').textContent = resumen.mejorBarbero;
}

function actualizarTablaEstadisticas(estadisticasPorBarbero) {
  const tbody = document.getElementById('tablaEstadisticas');
  tbody.innerHTML = '';
  
  estadisticasPorBarbero.forEach(stats => {
    if (stats.citas > 0) { // Solo mostrar barberos con citas
      const row = document.createElement('tr');
      
      // Obtener servicio más popular
      const servicioPopular = Object.entries(stats.servicios)
        .sort(([,a], [,b]) => b - a)[0];
      const servicioTexto = servicioPopular ? `${servicioPopular[0]} (${servicioPopular[1]})` : '-';
      
      row.innerHTML = `
        <td class="border p-3">${stats.nombre}</td>
        <td class="border p-3">${stats.citas}</td>
        <td class="border p-3">$${stats.ingresos.toLocaleString()}</td>
        <td class="border p-3">$${Math.round(stats.ingresos / stats.citas).toLocaleString()}</td>
        <td class="border p-3">${servicioTexto}</td>
        <td class="border p-3">${stats.calificacionPromedio > 0 ? stats.calificacionPromedio.toFixed(1) + '⭐' : '-'}</td>
      `;
      
      tbody.appendChild(row);
    }
  });
  
  if (tbody.children.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="6" class="border p-3 text-center text-gray-500">No hay datos para el período seleccionado</td>';
    tbody.appendChild(row);
  }
}

function exportarEstadisticas() {
  try {
    const filtroFecha = document.getElementById('filtroFecha').value;
    const filtroBarbero = document.getElementById('filtroBarbero').value;
    
    // Obtener datos actuales
    const citas = JSON.parse(localStorage.getItem('citas') || '[]');
  const barberos = JSON.parse(localStorage.getItem('barberos') || '[]');
  const servicios = JSON.parse(localStorage.getItem('servicios') || '[]');
    
    const citasFiltradas = filtrarCitasPorFecha(citas, filtroFecha);
    const citasFinales = filtroBarbero === 'todos' 
      ? citasFiltradas 
      : citasFiltradas.filter(cita => cita.barberoId === filtroBarbero);
    
    // Crear CSV
    let csv = 'Fecha,Barbero,Cliente,Servicio,Precio,Estado\n';
    
    citasFinales.forEach(cita => {
      const barbero = barberos.find(b => b.id === cita.barberoId);
      const servicio = servicios.find(s => s.id === cita.servicioId);
      
      csv += `${cita.fecha},${barbero?.nombre || 'N/A'},${cita.clienteNombre || 'N/A'},${servicio?.nombre || 'N/A'},${servicio?.precio || 0},${cita.estado}\n`;
    });
    
    // Descargar archivo
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `estadisticas_${filtroFecha}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    TurnORDUtils.notify.success('Estadísticas exportadas correctamente');
  } catch (error) {
    console.error('Error al exportar estadísticas:', error);
    TurnORDUtils.notify.error('Error al exportar estadísticas');
  }
}

// Hacer funciones disponibles globalmente
window.eliminarServicio = eliminarServicio;
window.eliminarBarbero = eliminarBarbero;
window.exportarDatos = exportarDatos;
window.getCurrentMetrics = () => currentMetrics;
window.abrirModalConfigBarbero = abrirModalConfigBarbero;
window.cerrarModalConfigBarbero = cerrarModalConfigBarbero;
window.initializeEstadisticas = initializeEstadisticas;
window.actualizarEstadisticas = actualizarEstadisticas;
window.exportarEstadisticas = exportarEstadisticas;

// Manejar envío del formulario de horario
function handleHorarioSubmit(e) {
  e.preventDefault();
  try {
    const inicio = document.getElementById('horarioGlobalInicio').value;
    const fin = document.getElementById('horarioGlobalFin').value;

    if (!inicio || !fin) {
      TurnORDUtils.notify.warning('Debe especificar horario de apertura y cierre');
      return;
    }

    if (inicio >= fin) {
      TurnORDUtils.notify.warning('La hora de apertura debe ser anterior a la de cierre');
      return;
    }

    TURNORD.HORARIO.inicio = inicio;
    TURNORD.HORARIO.fin = fin;

    const success = TurnORDUtils.StorageUtils.saveConfig(TURNORD);

    if (success) {
      TurnORDUtils.notify.success('Horario general guardado correctamente');
    } else {
      throw new Error('Error al guardar la configuración del horario');
    }

  } catch (error) {
    console.error('Error al guardar horario general:', error);
    TurnORDUtils.notify.error(`Error: ${error.message}`);
  }
}

// Abrir modal de configuración de servicio
function abrirModalConfigServicio(servicioId) {
  try {
    const servicio = TURNORD.servicios.find(s => s.id === servicioId);
    if (!servicio) {
      TurnORDUtils.notify.error('Servicio no encontrado');
      return;
    }

    const modal = document.getElementById('modalConfigServicio');
    if (!modal) {
      console.error('Modal de configuración de servicio no encontrado');
      return;
    }

    // Llenar formulario
    document.getElementById('servicioId').value = servicio.id;
    document.getElementById('servicioNombre').value = servicio.nombre;
    document.getElementById('servicioPrecio').value = servicio.precio;
    document.getElementById('servicioDuracion').value = servicio.duracion;

    // Mostrar modal
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

  } catch (error) {
    console.error('Error al abrir modal de servicio:', error);
    TurnORDUtils.notify.error('Error al abrir la configuración del servicio');
  }
}

// Cerrar modal de configuración de servicio
function cerrarModalConfigServicio() {
  try {
    const modal = document.getElementById('modalConfigServicio');
    if (modal) {
      modal.classList.add('hidden');
      document.body.style.overflow = 'auto';
    }
    const form = document.getElementById('formConfigServicio');
    if (form) {
      form.reset();
    }
  } catch (error) {
    console.error('Error al cerrar modal de servicio:', error);
  }
}

// Manejar envío del formulario de configuración de servicio
function handleConfigServicioSubmit(e) {
  e.preventDefault();

  try {
    const formData = new FormData(e.target);
    const servicioId = formData.get('servicioId');
    const nombre = formData.get('nombre')?.toString().trim();
    const precio = formData.get('precio')?.toString().trim();
    const duracion = formData.get('duracion')?.toString().trim();

    // Validaciones
    if (!TurnORDUtils.Validators.isValidString(nombre, 2, 50)) {
      TurnORDUtils.notify.warning('El nombre del servicio debe tener entre 2 y 50 caracteres');
      return;
    }
    const precioNum = parseFloat(precio);
    if (isNaN(precioNum) || precioNum <= 0 || precioNum > 999999) {
      TurnORDUtils.notify.warning('El precio debe ser un número válido entre 1 y 999,999');
      return;
    }
    const duracionNum = parseInt(duracion, 10);
    if (isNaN(duracionNum) || duracionNum < 5 || duracionNum > 480) {
      TurnORDUtils.notify.warning('La duración debe estar entre 5 y 480 minutos');
      return;
    }

    const servicioExistente = TURNORD.servicios.find(s =>
      s.nombre.toLowerCase() === nombre.toLowerCase() && s.id !== servicioId
    );
    if (servicioExistente) {
      TurnORDUtils.notify.warning('Ya existe otro servicio con ese nombre');
      return;
    }

    // Encontrar y actualizar servicio
    const servicioIndex = TURNORD.servicios.findIndex(s => s.id === servicioId);
    if (servicioIndex === -1) {
      throw new Error('Servicio no encontrado');
    }

    TURNORD.servicios[servicioIndex] = {
      ...TURNORD.servicios[servicioIndex],
      nombre,
      precio: precioNum,
      duracion: duracionNum
    };

    // Guardar cambios
    const success = TurnORDUtils.StorageUtils.saveConfig(TURNORD);

    if (success) {
      TurnORDUtils.notify.success('Servicio actualizado correctamente');
      cerrarModalConfigServicio();
      renderServicios();
    } else {
      throw new Error('Error al guardar la configuración');
    }

  } catch (error) {
    console.error('Error al guardar configuración de servicio:', error);
    TurnORDUtils.notify.error(`Error: ${error.message}`);
  }
}