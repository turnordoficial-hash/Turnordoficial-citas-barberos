// JavaScript para el panel administrativo de TurnORD

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  initializeAdmin();
});

function initializeAdmin() {
  try {
    renderCitas();
    // Actualizar cada 30 segundos
    setInterval(renderCitas, 30000);
  } catch (error) {
    console.error('Error al inicializar panel administrativo:', error);
    TurnORDUtils.notify.error('Error al cargar el panel administrativo');
  }
}

// Mostrar citas en la tabla
function renderCitas() {
  try {
    const citas = TurnORDUtils.StorageUtils.getCitas();
    const tbody = document.getElementById('tablaCitas');
    
    if (!tbody) {
      console.error('Elemento tablaCitas no encontrado');
      return;
    }

    tbody.innerHTML = '';

    let pendientes = 0, atendidas = 0, delDia = 0;
    const hoy = new Date().toISOString().split('T')[0];

    citas.forEach((cita, index) => {
      // Validar estructura de la cita
      if (!cita || !cita.cliente_nombre) {
        console.warn('Cita con estructura inválida:', cita);
        return;
      }

      // Contar estadísticas
      if (cita.estado === 'pendiente') pendientes++;
      if (cita.estado === 'atendida') atendidas++;
      if (cita.fecha === hoy) delDia++;

      const row = document.createElement('tr');
      row.className = 'hover:bg-gray-100 transition-colors';

      // Buscar barbero con manejo de errores
      let barberoNombre = 'N/A';
      try {
        const barbero = TURNORD.barberos.find(b => b.id === cita.barbero_id);
        barberoNombre = barbero ? barbero.nombre : 'N/A';
      } catch (error) {
        console.warn('Error al buscar barbero:', error);
      }

      // Determinar color del estado
      const estadoColor = getEstadoColor(cita.estado);

      row.innerHTML = `
        <td class="border p-2">${cita.cliente_nombre}</td>
        <td class="border p-2">${cita.cliente_telefono || 'N/A'}</td>
        <td class="border p-2">${cita.servicio || 'N/A'}</td>
        <td class="border p-2">${barberoNombre}</td>
        <td class="border p-2">${cita.fecha || 'N/A'}</td>
        <td class="border p-2">${TurnORDUtils.DateUtils.formatTime(cita.hora || '')}</td>
        <td class="border p-2 font-bold ${estadoColor}">
          ${cita.estado || 'desconocido'}
        </td>
        <td class="border p-2">
          ${getActionButtons(index, cita.estado)}
        </td>
      `;

      tbody.appendChild(row);
    });

    // Actualizar contadores
    updateCounters(pendientes, atendidas, delDia);

  } catch (error) {
    console.error('Error al renderizar citas:', error);
    TurnORDUtils.notify.error('Error al cargar las citas');
  }
}

// Obtener color según el estado
function getEstadoColor(estado) {
  const colores = {
    'pendiente': 'text-yellow-600',
    'atendida': 'text-green-600',
    'cancelada': 'text-red-600',
    'en_atencion': 'text-blue-600'
  };
  return colores[estado] || 'text-gray-600';
}

// Generar botones de acción según el estado
function getActionButtons(index, estado) {
  if (estado === 'atendida' || estado === 'cancelada') {
    return '<span class="text-gray-500 text-sm">Finalizada</span>';
  }

  return `
    <button onclick="cambiarEstado(${index}, 'atendida')" 
      class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md mr-2 transition-colors">
      ✔ Atender
    </button>
    <button onclick="cambiarEstado(${index}, 'cancelada')" 
      class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md transition-colors">
      ✖ Cancelar
    </button>
  `;
}

// Actualizar contadores del dashboard
function updateCounters(pendientes, atendidas, delDia) {
  try {
    const elementos = {
      'citasPendientes': pendientes,
      'citasAtendidas': atendidas,
      'citasDia': delDia
    };

    Object.entries(elementos).forEach(([id, valor]) => {
      const elemento = document.getElementById(id);
      if (elemento) {
        elemento.textContent = valor;
      } else {
        console.warn(`Elemento ${id} no encontrado`);
      }
    });
  } catch (error) {
    console.error('Error al actualizar contadores:', error);
  }
}

// Cambiar estado de una cita
function cambiarEstado(index, nuevoEstado) {
  try {
    // Validar parámetros
    if (typeof index !== 'number' || index < 0) {
      throw new Error('Índice de cita inválido');
    }

    if (!['atendida', 'cancelada', 'pendiente'].includes(nuevoEstado)) {
      throw new Error('Estado inválido');
    }

    const citas = TurnORDUtils.StorageUtils.getCitas();
    
    if (index >= citas.length) {
      throw new Error('Cita no encontrada');
    }

    const citaAnterior = { ...citas[index] };
    citas[index].estado = nuevoEstado;
    
    // Agregar timestamp del cambio
    citas[index].ultima_actualizacion = new Date().toISOString();
    
    // Si se atiende, agregar monto si no existe
    if (nuevoEstado === 'atendida' && !citas[index].monto) {
      citas[index].monto = getServicioPrecio(citas[index].servicio);
    }

    // Cancelar notificaciones si la cita se atiende o cancela
    if ((nuevoEstado === 'atendida' || nuevoEstado === 'cancelada') && window.NotificationManager) {
      window.NotificationManager.cancelNotifications(citas[index].id);
    }

    const success = TurnORDUtils.StorageUtils.saveCitas(citas);
    
    if (success) {
      renderCitas();
      
      // Mostrar notificación de éxito
      const mensajes = {
        'atendida': 'Cita marcada como atendida',
        'cancelada': 'Cita cancelada',
        'pendiente': 'Cita marcada como pendiente'
      };
      
      TurnORDUtils.notify.success(mensajes[nuevoEstado]);
      
      // Log para auditoría
      console.log(`Cita ${index} cambió de ${citaAnterior.estado} a ${nuevoEstado}`, {
        cliente: citas[index].cliente_nombre,
        fecha: citas[index].fecha,
        hora: citas[index].hora
      });
    }
    
  } catch (error) {
    console.error('Error al cambiar estado de cita:', error);
    TurnORDUtils.notify.error(`Error: ${error.message}`);
  }
}

// Obtener precio de un servicio (función auxiliar)
function getServicioPrecio(servicio) {
  const precios = {
    'Corte': 15,
    'Barba': 10,
    'Corte + Barba': 20
  };
  return precios[servicio] || 15;
}

// Función para exportar datos (nueva funcionalidad)
function exportarDatos() {
  try {
    const citas = TurnORDUtils.StorageUtils.getCitas();
    const dataStr = JSON.stringify(citas, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `citas_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    TurnORDUtils.notify.success('Datos exportados correctamente');
  } catch (error) {
    console.error('Error al exportar datos:', error);
    TurnORDUtils.notify.error('Error al exportar los datos');
  }
}

// Función para filtrar citas por fecha
function filtrarPorFecha(fecha) {
  try {
    if (!TurnORDUtils.Validators.required(fecha)) {
      renderCitas(); // Mostrar todas si no hay fecha
      return;
    }

    const citas = TurnORDUtils.StorageUtils.getCitas();
    const citasFiltradas = citas.filter(cita => cita.fecha === fecha);
    
    // Renderizar solo las citas filtradas
    renderCitasFiltradas(citasFiltradas);
    
  } catch (error) {
    console.error('Error al filtrar citas:', error);
    TurnORDUtils.notify.error('Error al filtrar las citas');
  }
}

// Renderizar citas filtradas (función auxiliar)
function renderCitasFiltradas(citas) {
  const tbody = document.getElementById('tablaCitas');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  citas.forEach((cita, index) => {
    // Similar a renderCitas pero con índices originales
    // ... código similar al de renderCitas
  });
}

// Hacer funciones disponibles globalmente
window.cambiarEstado = cambiarEstado;
window.exportarDatos = exportarDatos;
window.filtrarPorFecha = filtrarPorFecha;