(function(){
  const defaultCfg = {
    NEGOCIO_ID: "barberia0001",
    HORARIO: { inicio: "09:00", fin: "19:00", intervaloMin: 30 },
    barberos: [
      { 
        id: "b1", 
        nombre: "Raul", 
        activo: true, 
        horario_inicio: '09:00', 
        horario_fin: '19:00', 
        break_inicio: '13:00', 
        break_fin: '14:00', 
        dias: [1,2,3,4,5,6], 
        break_padding_min: 15,
        fecha_creacion: new Date().toISOString()
      },
      { 
        id: "b2", 
        nombre: "Carlos", 
        activo: true, 
        horario_inicio: '10:00', 
        horario_fin: '20:00', 
        break_inicio: '14:00', 
        break_fin: '15:00', 
        dias: [1,2,3,4,5], 
        break_padding_min: 10,
        fecha_creacion: new Date().toISOString()
      }
    ],
    servicios: [],
    citas: []
  };
  let persisted = null;
  try { persisted = JSON.parse(localStorage.getItem('turnord_config')); } catch {}
  const cfg = persisted ? { ...defaultCfg, ...persisted } : defaultCfg;
  window.TURNORD = cfg;
})();
