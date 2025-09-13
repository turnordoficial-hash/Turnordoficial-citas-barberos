// JavaScript para el formulario de reserva de citas de TurnORD

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  initializeClientForm();
});

function initializeClientForm() {
  try {
    cargarBarberos();
    setupFormValidation();
    setupFormSubmission();
    setMinDate();
    setupEnhancedUI();
  } catch (error) {
    console.error('Error al inicializar formulario de clientes:', error);
    TurnORDUtils.notify.error('Error al cargar el formulario');
  }
}

// Cargar barberos al inicio
function cargarBarberos() {
  try {
    const select = document.getElementById('barbero');
    if (!select) {
      throw new Error('Elemento select de barberos no encontrado');
    }

    // Limpiar opciones existentes (excepto la primera)
    while (select.children.length > 1) {
      select.removeChild(select.lastChild);
    }

    const barberosActivos = TURNORD.barberos.filter(b => b.activo);
    
    if (barberosActivos.length === 0) {
      throw new Error('No hay barberos activos disponibles');
    }

    barberosActivos.forEach(barbero => {
      const option = document.createElement('option');
      option.value = barbero.id;
      option.textContent = barbero.nombre;
      select.appendChild(option);
    });

  } catch (error) {
    console.error('Error al cargar barberos:', error);
    TurnORDUtils.notify.error('Error al cargar la lista de barberos');
  }
}

// Helpers de horario/días/break
function getBarberoById(id){
  try {
    const ls = TurnORDUtils.StorageUtils.getBarberos();
    return ls.find(b=>String(b.id)===String(id)) || TURNORD.barberos.find(b=>String(b.id)===String(id)) || null;
  } catch { return null; }
}
function toMinutes(hhmm){ const [h,m]=String(hhmm||'0:0').split(':').map(Number); return h*60+m; }
function inRange(min, start, end){ return min>=start && min<end; }
function dayToIndex(d){ // 1..7 (1=Lunes, 7=Domingo)
  return d; }
function dateToDayIndexISO(dateStr){ const d=new Date(dateStr).getDay(); return d===0?7:d; }

// Establecer fecha mínima (hoy)
function setMinDate() {
  try {
    const fechaInput = document.getElementById('fecha');
    if (fechaInput) {
      const today = new Date().toISOString().split('T')[0];
      fechaInput.min = today;
    }
  } catch (error) {
    console.error('Error al establecer fecha mínima:', error);
  }
}

// UI moderna para fecha/hora
function setupEnhancedUI(){
  try {
    // Fecha: etiqueta moderna con mes y día legible
    const fecha = document.getElementById('fecha');
    if (fecha && !document.getElementById('fechaPretty')){
      const pretty = document.createElement('div');
      pretty.id = 'fechaPretty';
      pretty.className = 'text-sm text-gray-600 mt-1 flex items-center gap-2';
      pretty.innerHTML = '<span class="inline-block w-2 h-2 rounded-full bg-brand-600"></span><span>Selecciona una fecha</span>';
      fecha.parentNode.appendChild(pretty);
      fecha.addEventListener('change', updateDatePretty);
      updateDatePretty();
    }

    // Hora: contenedor de sugerencias
    const hora = document.getElementById('hora');
    if (hora && !document.getElementById('horaSuggestions')){
      const wrap = document.createElement('div');
      wrap.id = 'horaSuggestions';
      wrap.className = 'hidden mt-2 grid grid-cols-3 gap-2';
      hora.parentNode.appendChild(wrap);

      // Abrir sugerencias al enfocar la hora
      hora.addEventListener('focus', ()=> { wrap.classList.remove('hidden'); });
      // Cerrar al hacer click fuera
      document.addEventListener('click', (e)=>{
        if (!wrap.contains(e.target) && e.target !== hora){
          wrap.classList.add('hidden');
        }
      });
    }
  } catch(err){ console.error('Error setupEnhancedUI', err); }
}

function updateDatePretty(){
  const el = document.getElementById('fechaPretty');
  const val = document.getElementById('fecha')?.value;
  if (!el) return;
  if (!val){ el.querySelector('span:last-child').textContent = 'Selecciona una fecha'; return; }
  try {
    const d = new Date(val + 'T00:00:00');
    const texto = d.toLocaleDateString('es-ES', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
    el.querySelector('span:last-child').textContent = texto;
  } catch { el.querySelector('span:last-child').textContent = val; }
}

function renderTimeSuggestions(horas){
  const cont = document.getElementById('horaSuggestions');
  const horaInput = document.getElementById('hora');
  if (!cont || !horaInput) return;
  if (!horas || horas.length===0){
    cont.className = 'mt-2 text-sm text-gray-500';
    cont.textContent = 'No hay horarios disponibles para esta fecha y barbero';
    return;
  }
  cont.className = 'mt-2 grid grid-cols-3 gap-2';
  cont.innerHTML = horas.map(h=>`<button type="button" class="px-2 py-2 rounded-lg border hover:bg-gray-50 text-sm" data-hora="${h}">${h}</button>`).join('');
  cont.querySelectorAll('button[data-hora]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      horaInput.value = btn.getAttribute('data-hora');
      cont.classList.add('hidden');
      clearFieldError(horaInput);
    });
  });
}

// Configurar validación en tiempo real
function setupFormValidation() {
  const campos = {
    'nombre': validateNombre,
    'telefono': validateTelefono,
    'email': validateEmail,
    'fecha': validateFecha,
    'hora': validateHora
  };

  Object.entries(campos).forEach(([id, validator]) => {
    const campo = document.getElementById(id);
    if (campo) {
      campo.addEventListener('blur', () => validator(campo));
      campo.addEventListener('input', () => clearFieldError(campo));
    }
  });
}

// Validaciones individuales
function validateNombre(campo) {
  const valor = campo.value.trim();
  if (!TurnORDUtils.Validators.required(valor)) {
    showFieldError(campo, 'El nombre es obligatorio');
    return false;
  }
  if (valor.length < 2) {
    showFieldError(campo, 'El nombre debe tener al menos 2 caracteres');
    return false;
  }
  clearFieldError(campo);
  return true;
}

function validateTelefono(campo) {
  const valor = campo.value.trim();
  if (!TurnORDUtils.Validators.required(valor)) {
    showFieldError(campo, 'El teléfono es obligatorio');
    return false;
  }
  if (!TurnORDUtils.Validators.phone(valor)) {
    showFieldError(campo, 'Formato de teléfono inválido');
    return false;
  }
  clearFieldError(campo);
  return true;
}

function validateEmail(campo) {
  const valor = campo.value.trim();
  if (valor && !TurnORDUtils.Validators.email(valor)) {
    showFieldError(campo, 'Formato de email inválido');
    return false;
  }
  clearFieldError(campo);
  return true;
}

function validateFecha(campo) {
  const valor = campo.value;
  if (!TurnORDUtils.Validators.required(valor)) {
    showFieldError(campo, 'La fecha es obligatoria');
    return false;
  }
  if (!TurnORDUtils.Validators.futureDate(valor)) {
    showFieldError(campo, 'La fecha no puede ser en el pasado');
    return false;
  }
  clearFieldError(campo);
  return true;
}

function validateHora(campo) {
  const valor = campo.value;
  if (!TurnORDUtils.Validators.required(valor)) {
    showFieldError(campo, 'La hora es obligatoria');
    return false;
  }
  if (!TurnORDUtils.Validators.time(valor)) {
    showFieldError(campo, 'Formato de hora inválido');
    return false;
  }
  // Validar contra horario del barbero y días laborales
  const barberoId = document.getElementById('barbero')?.value;
  const fecha = document.getElementById('fecha')?.value;
  const b = getBarberoById(barberoId);
  if (b && fecha) {
    const hmin = toMinutes(valor);
    const start = toMinutes(b.horario_inicio || '09:00');
    const end = toMinutes(b.horario_fin || '19:00');
    if (!inRange(hmin, start, end)) {
      showFieldError(campo, `Horario disponible: ${b.horario_inicio||'09:00'} - ${b.horario_fin||'19:00'}`);
      return false;
    }
    // Validar día laboral
    const dias = Array.isArray(b.dias) ? b.dias : [1,2,3,4,5,6,7];
    const dow = dateToDayIndexISO(fecha);
    if (!dias.includes(dow)) {
      showFieldError(campo, 'El barbero no trabaja este día');
      return false;
    }
    // Validar break con padding
    const bi = toMinutes(b.break_inicio||'00:00');
    const bf = toMinutes(b.break_fin||'00:00');
    const pad = parseInt(b.break_padding_min||'0',10) || 0;
    if (bi<bf){
      const blockedEnd = bf + pad;
      if (hmin>=bi && hmin<blockedEnd) {
        showFieldError(campo, `No disponible por break hasta ${String(Math.floor(blockedEnd/60)).padStart(2,'0')}:${String(blockedEnd%60).padStart(2,'0')}`);
        return false;
      }
    }
  }
  clearFieldError(campo);
  return true;
}

// Mostrar error en campo
function showFieldError(campo, mensaje) {
  clearFieldError(campo);
  
  campo.classList.add('border-red-500', 'bg-red-50');
  
  const errorDiv = document.createElement('div');
  errorDiv.className = 'text-red-500 text-sm mt-1 field-error';
  errorDiv.textContent = mensaje;
  
  campo.parentNode.appendChild(errorDiv);
}

// Limpiar error de campo
function clearFieldError(campo) {
  campo.classList.remove('border-red-500', 'bg-red-50');
  
  const errorDiv = campo.parentNode.querySelector('.field-error');
  if (errorDiv) {
    errorDiv.remove();
  }
}

// Configurar envío del formulario
function setupFormSubmission() {
  const form = document.getElementById('formCita');
  if (!form) {
    console.error('Formulario no encontrado');
    return;
  }

  form.addEventListener('submit', handleFormSubmit);
}

// Manejar envío del formulario
function handleFormSubmit(e) {
  e.preventDefault();
  
  try {
    // Validar todos los campos
    if (!validateAllFields()) {
      TurnORDUtils.notify.warning('Por favor corrige los errores en el formulario');
      return;
    }

    // Verificar disponibilidad
    if (!checkAvailability()) {
      return;
    }

    // Crear y guardar la cita
    const nuevaCita = createCitaObject();
    if (saveCita(nuevaCita)) {
      // Programar notificaciones automáticas
      if (window.NotificationManager) {
        window.NotificationManager.scheduleNotifications(nuevaCita);
      }
      
      showSuccessMessage(nuevaCita);
      resetForm();
    }

  } catch (error) {
    console.error('Error al procesar formulario:', error);
    TurnORDUtils.notify.error('Error al procesar la reserva');
  }
}

// Validar todos los campos
function validateAllFields() {
  const campos = ['nombre', 'telefono', 'email', 'fecha', 'hora'];
  const validadores = [validateNombre, validateTelefono, validateEmail, validateFecha, validateHora];
  
  let todosValidos = true;
  
  campos.forEach((id, index) => {
    const campo = document.getElementById(id);
    if (campo && !validadores[index](campo)) {
      todosValidos = false;
    }
  });
  
  // Validar selects
  const servicio = document.getElementById('servicio');
  const barbero = document.getElementById('barbero');
  
  if (!servicio.value) {
    showFieldError(servicio, 'Selecciona un servicio');
    todosValidos = false;
  }
  
  if (!barbero.value) {
    showFieldError(barbero, 'Selecciona un barbero');
    todosValidos = false;
  }
  
  return todosValidos;
}

// Verificar disponibilidad de la cita
function checkAvailability() {
  try {
    const fecha = document.getElementById('fecha').value;
    const hora = document.getElementById('hora').value;
    const barberoId = document.getElementById('barbero').value;

    const b = getBarberoById(barberoId);
    if (b) {
      const hmin = toMinutes(hora);
      const start = toMinutes(b.horario_inicio || '09:00');
      const end = toMinutes(b.horario_fin || '19:00');
      if (!inRange(hmin, start, end)) {
        TurnORDUtils.notify.warning(`Horario disponible: ${b.horario_inicio||'09:00'} - ${b.horario_fin||'19:00'}`);
        return false;
      }
      const dias = Array.isArray(b.dias) ? b.dias : [1,2,3,4,5,6,7];
      const dow = dateToDayIndexISO(fecha);
      if (!dias.includes(dow)) {
        TurnORDUtils.notify.warning('El barbero no trabaja este día');
        return false;
      }
      const bi = toMinutes(b.break_inicio||'00:00');
      const bf = toMinutes(b.break_fin||'00:00');
      const pad = parseInt(b.break_padding_min||'0',10) || 0;
      if (bi<bf){
        const blockedEnd = bf + pad;
        if (hmin>=bi && hmin<blockedEnd) {
          TurnORDUtils.notify.warning(`Hora no disponible (break) hasta ${String(Math.floor(blockedEnd/60)).padStart(2,'0')}:${String(blockedEnd%60).padStart(2,'0')}`);
          return false;
        }
      }
    }
    
    const citas = TurnORDUtils.StorageUtils.getCitas();
    const conflicto = citas.find(cita => 
      cita.fecha === fecha && 
      cita.hora === hora && 
      cita.barbero_id === barberoId &&
      cita.estado !== 'cancelada'
    );
    
    if (conflicto) {
      TurnORDUtils.notify.error('Ya existe una cita en esa fecha y hora con ese barbero');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error al verificar disponibilidad:', error);
    TurnORDUtils.notify.error('Error al verificar disponibilidad');
    return false;
  }
}

// Crear objeto de cita
function createCitaObject() {
  return {
    id: Date.now().toString(),
    negocio_id: TURNORD.NEGOCIO_ID,
    cliente_nombre: document.getElementById('nombre').value.trim(),
    cliente_telefono: document.getElementById('telefono').value.trim(),
    cliente_email: document.getElementById('email').value.trim() || '',
    servicio: document.getElementById('servicio').value,
    barbero_id: document.getElementById('barbero').value,
    fecha: document.getElementById('fecha').value,
    hora: document.getElementById('hora').value,
    estado: 'agendada',
    fecha_creacion: new Date().toISOString(),
    monto: getServicioPrecio(document.getElementById('servicio').value)
  };
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

// Guardar cita
function saveCita(cita) {
  try {
    const citas = TurnORDUtils.StorageUtils.getCitas();
    citas.push(cita);
    return TurnORDUtils.StorageUtils.saveCitas(citas);
  } catch (error) {
    console.error('Error al guardar cita:', error);
    TurnORDUtils.notify.error('Error al guardar la cita');
    return false;
  }
}

// Mostrar mensaje de éxito
function showSuccessMessage(cita) {
  const msgBox = document.getElementById('mensaje');
  if (!msgBox) return;
  
  const barberoSelect = document.getElementById('barbero');
  const barberoNombre = barberoSelect.options[barberoSelect.selectedIndex]?.textContent || '';
  
  const detalles = `Cliente: ${cita.cliente_nombre}\nServicio: ${cita.servicio}\nBarbero: ${barberoNombre}\nFecha: ${cita.fecha} ${cita.hora}`;
  
  // Notificación del navegador
  requestNotificationPermission(detalles);
  
  // Enlaces de confirmación
  const telefono = cita.cliente_telefono.replace(/\D/g, '');
  const msgShare = `Hola ${cita.cliente_nombre}, tu cita ha sido creada.%0A${detalles}%0A%0AGracias por reservar con TurnORD.`;
  const waHref = `https://wa.me/${telefono}?text=${msgShare}`;
  
  const subject = 'Confirmación de cita - TurnORD';
  const body = `Hola ${cita.cliente_nombre},%0A%0AEsta es la confirmación de tu cita:%0A${detalles.replace(/\n/g,'%0A')}%0A%0AGracias por reservar con TurnORD.`;
  const mailHref = `mailto:${encodeURIComponent(cita.cliente_email || '')}?subject=${subject}&body=${body}`;
  
  msgBox.innerHTML = `
    <div class="flex flex-col items-center gap-3">
      <div class="text-green-700"><b>✅ Tu cita fue reservada correctamente.</b></div>
      <pre class="bg-green-50 text-green-800 rounded p-3 w-full text-left whitespace-pre-wrap">${detalles}</pre>
      <div class="flex gap-2 flex-wrap">
        <a href="${waHref}" target="_blank" class="px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors">Enviar por WhatsApp</a>
        <a href="${mailHref}" class="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors">Enviar por Email</a>
      </div>
    </div>
  `;
  
  msgBox.className = 'mt-4 p-3 rounded-lg text-center bg-green-100 text-green-700';
  msgBox.classList.remove('hidden');
  
  TurnORDUtils.notify.success('¡Cita reservada exitosamente!');
}

// Solicitar permisos de notificación
function requestNotificationPermission(detalles) {
  if ('Notification' in window) {
    try {
      if (Notification.permission === 'granted') {
        new Notification('Cita reservada', { body: detalles });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification('Cita reservada', { body: detalles });
          }
        });
      }
    } catch (error) {
      console.warn('Error con notificaciones del navegador:', error);
    }
  }
}

// Resetear formulario
function resetForm() {
  const form = document.getElementById('formCita');
  if (form) {
    form.reset();
    
    // Limpiar errores
    const errorDivs = form.querySelectorAll('.field-error');
    errorDivs.forEach(div => div.remove());
    
    // Limpiar clases de error
    const campos = form.querySelectorAll('.border-red-500');
    campos.forEach(campo => {
      campo.classList.remove('border-red-500', 'bg-red-50');
    });
  }
}

// Función para sugerir horarios disponibles
function sugerirHorarios() {
  try {
    const fecha = document.getElementById('fecha').value;
    const barberoId = document.getElementById('barbero').value;
    
    if (!fecha || !barberoId) {
      renderTimeSuggestions([]);
      return;
    }

    const b = getBarberoById(barberoId);
    const citas = TurnORDUtils.StorageUtils.getCitas();
    const citasDelDia = citas.filter(cita => 
      cita.fecha === fecha && 
      cita.barbero_id === barberoId &&
      cita.estado !== 'cancelada'
    );
    const horasOcupadas = new Set(citasDelDia.map(cita => cita.hora.slice(0, 5)));

    const horasDisponibles = [];
    const step = 30; // min

    // Config según barbero
    const start = toMinutes((b && b.horario_inicio) ? b.horario_inicio : '09:00');
    const end = toMinutes((b && b.horario_fin) ? b.horario_fin : '19:00');
    const bi = toMinutes(b?.break_inicio||'00:00');
    const bf = toMinutes(b?.break_fin||'00:00');
    const pad = parseInt(b?.break_padding_min||'0',10) || 0;
    const blockedEnd = bf + pad;

    // Validar día laborable
    const dias = Array.isArray(b?.dias) ? b.dias : [1,2,3,4,5,6,7];
    const dow = dateToDayIndexISO(fecha);
    if (!dias.includes(dow)) {
      renderTimeSuggestions([]);
      return;
    }

    for (let t = start; t < end; t += step) {
      const h = `${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;
      const inBreak = bi<bf && (t>=bi && t<blockedEnd);
      if (!inBreak && !horasOcupadas.has(h)) {
        horasDisponibles.push(h);
      }
    }

    renderTimeSuggestions(horasDisponibles);
    updateDatePretty();
  } catch (error) {
    console.error('Error al sugerir horarios:', error);
  }
}

// Event listeners adicionales
document.addEventListener('change', (e) => {
  if (e.target.id === 'fecha' || e.target.id === 'barbero') {
    sugerirHorarios();
    updateDatePretty();
  }
});

// Mostrar sugerencias al enfocar la hora
const horaInputEl = document.getElementById('hora');
if (horaInputEl){
  horaInputEl.addEventListener('focus', ()=>{
    const cont = document.getElementById('horaSuggestions');
    if (cont && cont.innerHTML.trim().length>0){ cont.classList.remove('hidden'); }
  });
}