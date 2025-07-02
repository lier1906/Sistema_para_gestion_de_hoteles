// frontend/src/pages/home/index.js

import React, { useEffect, useState, useRef } from 'react';
import './home.css';

function Home() {
  // =========================
  // Estados para Disponibilidad
  // =========================
  const [cabinasDisponibles, setCabinasDisponibles] = useState([]);

  // =========================
  // Estados para Estancias Activas
  // =========================
  const [estanciasActivas, setEstanciasActivas] = useState([]); // Siempre un arreglo
  const timersRef = useRef({}); // Guardará timers para cada estancia

  // =========================
  // Estados para Limpieza y Mantenimiento
  // =========================
  const [limpiezaList, setLimpiezaList] = useState([]);               // items en estado “limpieza”
  const [mantenimientoList, setMantenimientoList] = useState([]);     // items en estado “mantenimiento”

  // =========================
  // Estados del Modal de Confirmación (cuando finalizo una estancia)
  // =========================
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [estanciaParaFinalizar, setEstanciaParaFinalizar] = useState(null);

  // =========================
  // Estados del Modal de Asignación y Pagos
  // =========================
  const [modalVisible, setModalVisible] = useState(false);
  const [modalPaso, setModalPaso] = useState(1);
  const [modalTipo, setModalTipo] = useState('');
  const [modalPrecios, setModalPrecios] = useState([]);
  const [seleccion, setSeleccion] = useState(null);
  const [cabinas, setCabinas] = useState([]);
  const [cargandoCabinas, setCargandoCabinas] = useState(false);

  // Datos del formulario de Asignación
  const [formData, setFormData] = useState({
    placa: '',
    personas: '',
    descuento: '',
  });

  // =========================
  // Estados para Pagos
  // =========================
  const [idEstancia, setIdEstancia] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [miniModalPago, setMiniModalPago] = useState(false);
  const [pagoFormulario, setPagoFormulario] = useState({
    metodo: 'EFECTIVO',
    monto: '',
  });

  // =========================
  // useEffect principal: cargar disponibilidad, estancias, limpieza y mantenimiento
  // =========================
  useEffect(() => {
    cargarDisponibilidad();
    cargarEstanciasActivas();
    cargarLimpieza();
    cargarMantenimiento();

    // Cleanup: limpiar todos los timers al desmontar el componente
    return () => {
      Object.values(timersRef.current).forEach((timerId) => clearInterval(timerId));
    };
  }, []);

  // ────────────────────────────────────────────────────────────────────────────
  // Función: cargarDisponibilidad() → GET /api/cabinas-disponibles
  // ────────────────────────────────────────────────────────────────────────────
  const cargarDisponibilidad = () => {
    fetch('http://localhost:5000/api/cabinas-disponibles')
      .then((res) => res.json())
      .then((data) => setCabinasDisponibles(data))
      .catch((err) => console.error('Error al obtener disponibilidad:', err));
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Función: cargarEstanciasActivas() → GET /api/estancias-activas
  // ────────────────────────────────────────────────────────────────────────────
  const cargarEstanciasActivas = () => {
    fetch('http://localhost:5000/api/estancias-activas')
      .then((res) => {
        if (!res.ok) throw new Error('Error al obtener estancias activas');
        return res.json();
      })
      .then((data) => {
        const arr = Array.isArray(data) ? data : [];
        setEstanciasActivas(arr);

        // Inicia un timer para cada estancia que aún no tenga uno
        arr.forEach((estancia) => {
          if (!timersRef.current[estancia.id_estancia]) {
            const timerId = setInterval(() => {
              setEstanciasActivas((prev) =>
                prev.map((e) => {
                  if (e.id_estancia === estancia.id_estancia) {
                    return { ...e, now: Date.now() }; // Forzamos re-render cada segundo
                  }
                  return e;
                })
              );
            }, 1000);
            timersRef.current[estancia.id_estancia] = timerId;
          }
        });
      })
      .catch((err) => console.error(err));
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Función: cargarLimpieza() → GET /api/estancias-limpieza
  // ────────────────────────────────────────────────────────────────────────────
  const cargarLimpieza = () => {
    fetch('http://localhost:5000/api/estancias-limpieza')
      .then((res) => {
        if (!res.ok) throw new Error('Error al obtener limpieza');
        return res.json();
      })
      .then((data) => {
        setLimpiezaList(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error('Error al cargar limpieza:', err));
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Función: cargarMantenimiento() → GET /api/mantenimiento-pendiente
  // ────────────────────────────────────────────────────────────────────────────
  const cargarMantenimiento = () => {
    fetch('http://localhost:5000/api/mantenimiento-pendiente')
      .then((res) => {
        if (!res.ok) throw new Error('Error al obtener mantenimiento');
        return res.json();
      })
      .then((data) => {
        setMantenimientoList(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error('Error al cargar mantenimiento:', err));
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Función: calcularTiempoRestante(estancia) → Devuelve "HH:MM:SS" o "—:—:—"
  // ────────────────────────────────────────────────────────────────────────────
  const calcularTiempoRestante = (estancia) => {
    const duracionHoras = Number(estancia.duracion_horas);
    if (!duracionHoras || duracionHoras <= 0) {
      return '—:—:—';
    }
    try {
      const ingresoMs = new Date(estancia.fecha_ingreso).getTime();
      const duracionMs = duracionHoras * 60 * 60 * 1000;
      const finProgramado = ingresoMs + duracionMs;
      const ahora = Date.now();
      const diff = finProgramado - ahora;
      if (diff <= 0) {
        return '00:00:00';
      }
      const horas = Math.floor(diff / (1000 * 60 * 60));
      const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const segundos = Math.floor((diff % (1000 * 60)) / 1000);
      const pad = (n) => n.toString().padStart(2, '0');
      return `${pad(horas)}:${pad(minutos)}:${pad(segundos)}`;
    } catch {
      return '00:00:00';
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Función: formatearFecha(isoString) → devuelve "DD/MM/YYYY HH:MM"
  // ────────────────────────────────────────────────────────────────────────────
  const formatearFecha = (isoString) => {
    try {
      const fecha = new Date(isoString);
      const dia = fecha.getDate().toString().padStart(2, '0');
      const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
      const año = fecha.getFullYear();
      const hrs = fecha.getHours().toString().padStart(2, '0');
      const mins = fecha.getMinutes().toString().padStart(2, '0');
      return `${dia}/${mes}/${año} ${hrs}:${mins}`;
    } catch {
      return '—';
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // FUNCIONES PARA ASIGNAR CABINA (igual que antes, sin cambios)
  // ────────────────────────────────────────────────────────────────────────────
  const abrirModal = (tipo) => {
    setModalTipo(tipo);
    setSeleccion(null);
    setCabinas([]);
    setModalPaso(1);
    setModalVisible(true);
    fetch(`http://localhost:5000/api/precios/${tipo}`)
      .then((res) => res.json())
      .then((data) => setModalPrecios(data))
      .catch((err) => console.error('Error al obtener precios:', err));
  };
  const cerrarModal = () => {
    setModalVisible(false);
    setModalTipo('');
    setModalPrecios([]);
    setCabinas([]);
    setSeleccion(null);
    setFormData({ placa: '', personas: '', descuento: '' });
    setCargandoCabinas(false);
    setMiniModalPago(false);
    setPagoFormulario({ metodo: 'EFECTIVO', monto: '' });
    setPagos([]);
    setIdEstancia(null);
  };
  const elegirDuracion = (precioObj) => {
    setSeleccion(precioObj);
    setCargandoCabinas(true);
    fetch(`http://localhost:5000/api/cabinas-por-tipo/${modalTipo}`)
      .then((res) => res.json())
      .then((data) => {
        setCabinas(data);
        setCargandoCabinas(false);
      })
      .catch((err) => {
        console.error('Error al obtener cabinas:', err);
        setCargandoCabinas(false);
      });
  };
  const elegirCabina = (numeroCabina) => {
    setSeleccion((prev) => ({ ...prev, cabina: numeroCabina }));
    setModalPaso(2);
  };
  const handleSubmitAsignacion = (e) => {
    e.preventDefault();
    const payload = {
      cabina: seleccion?.cabina,
      tipo: modalTipo,
      duracion: seleccion?.duracion_horas,
      precio: seleccion?.precio,
      placa: formData.placa,
      personas: formData.personas,
      descuento: formData.descuento,
    };
    fetch('http://localhost:5000/api/asignar-cabina', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Error al asignar cabina');
        return res.json();
      })
      .then((response) => {
        alert('🏷️ Cabina asignada con éxito');
        const nuevoId = response.id_estancia;
        setIdEstancia(nuevoId);
        cargarPagosDeEstancia(nuevoId);
        cargarDisponibilidad();
        cargarEstanciasActivas();
        setMiniModalPago(true);
      })
      .catch((err) => {
        console.error('Error al asignar cabina:', err);
        alert('🚨 Error al asignar la cabina');
      });
  };
  const cargarPagosDeEstancia = (id_est) => {
    fetch(`http://localhost:5000/api/pagos/${id_est}`)
      .then((res) => res.json())
      .then((data) => setPagos(data))
      .catch((err) => console.error('Error al obtener pagos:', err));
  };
  const handleRegistrarPago = () => {
    if (!idEstancia) {
      alert('Primero debes asignar la habitación para registrar un pago.');
      return;
    }
    if (!pagoFormulario.monto || Number(pagoFormulario.monto) <= 0) {
      alert('Ingresa un monto válido.');
      return;
    }
    const payload = {
      id_estancia: idEstancia,
      metodo_pago: pagoFormulario.metodo,
      monto_pagado: parseFloat(pagoFormulario.monto),
    };
    fetch('http://localhost:5000/api/registrar-pago', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Error al registrar pago');
        return res.json();
      })
      .then((resp) => {
        alert('💲 Pago registrado correctamente');
        cargarPagosDeEstancia(idEstancia);
        setMiniModalPago(false);
        setPagoFormulario({ metodo: 'EFECTIVO', monto: '' });
      })
      .catch((err) => {
        console.error('Error al registrar pago:', err);
        alert('🚨 Error al registrar el pago');
      });
  };
  const calcularPagoRestante = () => {
    if (!seleccion) return 0;
    const totalPagar = Number(seleccion.precio);
    const sumaPagos = pagos.reduce((acc, p) => acc + Number(p.monto_pagado), 0);
    return totalPagar - sumaPagos;
  };

  // ────────────────────────────────────────────────────────────────────────────
  // NUEVA FUNCIÓN: ampliarEstancia (se había estado mostrando error “not defined”)
  // ────────────────────────────────────────────────────────────────────────────
  const ampliarEstancia = (id_est, horasExtra) => {
    if (!horasExtra || isNaN(horasExtra) || Number(horasExtra) <= 0) {
      alert('Ingresa un número válido de horas adicionales.');
      return;
    }
    fetch(`http://localhost:5000/api/ampliar-estancia/${id_est}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ horas_extra: parseInt(horasExtra, 10) }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Error al ampliar estancia');
        return res.json();
      })
      .then((resp) => {
        alert('⏳ Estancia ampliada exitosamente');
        cargarEstanciasActivas();
      })
      .catch((err) => {
        console.error('Error al ampliar estancia:', err);
        alert('🚨 Error al ampliar la estancia');
      });
  };

  // ────────────────────────────────────────────────────────────────────────────
  // FUNCIONES PARA FINALIZAR ESTANCIA (ahora con dos opciones: Limpieza o Mantenimiento)
  // ────────────────────────────────────────────────────────────────────────────
  const abrirConfirmModal = (id_estancia) => {
    setEstanciaParaFinalizar(id_estancia);
    setShowConfirmModal(true);
  };
  const cerrarConfirmModal = () => {
    setEstanciaParaFinalizar(null);
    setShowConfirmModal(false);
  };

  // 1) Enviar a Limpieza: llamamos al nuevo endpoint `/api/finalizar-estancia-limpieza/:id`
  const confirmarLimpieza = () => {
  if (!estanciaParaFinalizar) return;



  // 2) Enviamos el cuerpo con { limpiador }
  fetch(
    `http://localhost:5000/api/finalizar-estancia-limpieza/${estanciaParaFinalizar}`,
    {
      method: 'PUT',
  
    }
  )
    .then(res => {
      if (!res.ok) throw new Error();
      alert('✅ Estancia finalizada y correo enviado.');
      cargarDisponibilidad();
      cargarEstanciasActivas();
      cargarLimpieza();
      
    })
    .catch(err => {
      console.error(err);
      alert('🚨 Error al finalizar la estancia para Limpieza.');
    })
    .finally(() => {
      cerrarConfirmModal();
    });
};

  // 2) Enviar a Mantenimiento: llamamos al nuevo endpoint `/api/finalizar-estancia-mantenimiento/:id`
  const confirmarMantenimiento = () => {
    if (!estanciaParaFinalizar) return;
    fetch(`http://localhost:5000/api/finalizar-estancia-mantenimiento/${estanciaParaFinalizar}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => {
        if (!res.ok) throw new Error('No se pudo finalizar estancia (Mantenimiento)');
        return res.json();
      })
      .then(() => {
        alert('🛠️ Estancia finalizada y cabina enviada a Mantenimiento.');
        cargarDisponibilidad();
        cargarEstanciasActivas();
        cargarMantenimiento();
      })
      .catch((err) => {
        console.error(err);
        alert('🚨 Error al finalizar la estancia para Mantenimiento.');
      })
      .finally(() => {
        cerrarConfirmModal();
      });
  };

  // ────────────────────────────────────────────────────────────────────────────
  // FUNCIONES PARA FINALIZAR LIMPIEZA y MANTENIMIENTO DESDE SUS SECCIONES
  // ────────────────────────────────────────────────────────────────────────────
  const handleFinalizarLimpieza = (id_limpieza) => {
  // 1) Pedir nombre del limpiador al usuario
  const limpiador = prompt('¿Cómo te llamas?');
  if (!limpiador?.trim()) return;  // si no ingresó nada, abortamos

  // 2) Enviar también el campo “limpiador” al backend
  fetch('http://localhost:5000/api/finalizar-limpieza', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id_limpieza,
      usuario_id: 1,       // o reemplaza con el ID del usuario autenticado
      observaciones: '',
      limpiador,           // ← este es el nuevo campo
    }),
  })
  .then(res => {
    if (!res.ok) throw new Error();
    alert('✅ Limpieza finalizada y correo enviado.');
    cargarDisponibilidad();
    cargarLimpieza();
  })
  .catch(() => {
    alert('🚨 No se pudo finalizar la limpieza.');
  });
};

  const handleFinalizarMantenimiento = (id_mantenimiento) => {
    fetch('http://localhost:5000/api/finalizar-mantenimiento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_mantenimiento, usuario_id: 1 }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('No se pudo finalizar mantenimiento');
        return res.json();
      })
      .then(() => {
        alert('✅ Mantenimiento finalizado. Cabina disponible.');
        cargarDisponibilidad();
        cargarMantenimiento();
      })
      .catch((err) => {
        console.error(err);
        alert('🚨 Error al finalizar mantenimiento.');
      });
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Cálculo del total de disponibilidad (suma de cantidades)
  // ────────────────────────────────────────────────────────────────────────────
  const totalDisponibles = cabinasDisponibles.reduce((acc, c) => acc + c.cantidad, 0);

  return (
    <div className="window">
      {/* =======================
           HEADER PRINCIPAL
         ======================= */}
      <div className="window-header">
        <div className="window-title">Menú Principal - HotelDePaso.com</div>
        <div className="close-btn">✕</div>
      </div>

      {/* =======================
           TOP BAR
         ======================= */}
      <div className="top-bar">
        <div className="logo-container">
          <div className="logo">{/* SVG del logo */}</div>
          <div className="brand">
            <h1>Hotel de<br />Paso</h1>
          </div>
        </div>
        <div>
          <h2 className="main-title">SISTEMA HOTEL DE PASO</h2>
          <p className="website">www.HotelDePaso.com</p>
        </div>
        <div className="user-info">
          <button className="icon-button">✏️ Registrar Gasto</button>
          <button className="icon-button">⏱️ Cerrar Sesión</button>
          <p className="user-greeting">Hola SERGIO, <span className="smile-icon">😊</span></p>
          <p className="date">Viernes 30 de Agosto de 2024</p>
        </div>
      </div>

      {/* ==============================
           CONTENIDO PRINCIPAL (3 Columnas)
         ============================== */}
      <div className="main-content">
        {/* ────────────────
            COLUMNA IZQUIERDA
           ──────────────── */}
        <div className="left-column">
          {/* — Limpieza — */}
          <div className="section limpieza">
            <div className="section-header">
              <span>Limpieza <span className="tool-icon">🧹</span></span>
              <span className="count-badge">{limpiezaList.length}</span>
            </div>
            <div className="section-content">
              {limpiezaList.length === 0 ? (
                <p style={{ color: '#999' }}>Sin registros</p>
              ) : (
                limpiezaList.map((item) => (
                  <div key={item.id_limpieza} className="room-row">
                    <div className="room-number">#{item.numero_cabina}</div>
                    <div className="room-time">{formatearFecha(item.fecha_inicio_limpieza)}</div>
                    <button
                      className="liberar-btn"
                      onClick={() => handleFinalizarLimpieza(item.id_limpieza)}
                    >
                      Finalizar
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* — Disponibilidad — */}
          <div className="section disponibilidad">
            <div className="section-header">
              <span>Disponibilidad</span>
              <span className="count-badge">{totalDisponibles}</span>
            </div>
            <div className="section-content">
              {cabinasDisponibles.length === 0 ? (
                <p style={{ color: '#999' }}>Sin datos de cabinas</p>
              ) : (
                cabinasDisponibles.map((item, index) => (
                  <div
                    key={index}
                    className="room-row"
                    style={{ cursor: 'pointer' }}
                    onClick={() => abrirModal(item.tipo)}
                  >
                    <div className="room-type">Cabina {item.tipo}</div>
                    <div className="room-count">{item.cantidad}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ────────────────
            COLUMNA CENTRAL
           ──────────────── */}
        <div className="center-column">
          {/* — Cabinas Ocupadas — */}
          <div className="section ocupacion">
            <div className="section-header">
              <span>
                Cabinas Ocupadas <span className="tool-icon">🔎</span>
                <a href="#" className="mapa-link">🏨 Ver Mapa</a>
              </span>
              <div><span className="room-count">{estanciasActivas.length}</span></div>
            </div>
            <div className="section-content">
              {estanciasActivas.length === 0 ? (
                <p style={{ color: '#999' }}>No hay cabinas ocupadas actualmente</p>
              ) : (
                estanciasActivas.map((estancia) => {
                  const tiempoRestanteStr = calcularTiempoRestante(estancia);
                  const ingresoForm = formatearFecha(estancia.fecha_ingreso);
                  const duracionHoras = estancia.duracion_horas || 0;
                  const placa = estancia.placa_cliente || '—';
                  const tipo = estancia.tipo_cabina || '—';

                  // Fecha de salida programada
                  const finProgMs = new Date(estancia.fecha_ingreso).getTime() + duracionHoras * 3600000;
                  const salidaForm =
                    duracionHoras > 0
                      ? formatearFecha(new Date(finProgMs).toISOString())
                      : '—';

                  return (
                    <div key={estancia.id_estancia} className="ocupacion-card">
                      {/* — Header amarillo con número grande y tiempo restante — */}
                      <div className="ocupacion-header">
                        <div className="room-big-number">{estancia.numero_cabina}</div>
                        <div className="time-remaining">
                          <div className="time-label">Tiempo Restante:</div>
                          <div className="time-value">{tiempoRestanteStr}</div>
                        </div>
                        <div className="icons-right">
                          <span className="icon-people">👤 {estancia.personas_extras}</span>
                          <span
                            className="icon-edit"
                            style={{ cursor: 'pointer', marginLeft: '8px' }}
                            onClick={() => alert(`✏️ Editar estancia ${estancia.id_estancia}`)}
                          >
                            ✏️
                          </span>
                        </div>
                      </div>

                      {/* — Cuerpo con datos — */}
                      <div className="ocupacion-body">
                        <div className="detalle-left">
                          <p><strong>Ingreso:</strong> {ingresoForm}</p>
                          <p><strong>Salida Estimada:</strong> {salidaForm}</p>
                          <p><strong>Placa:</strong> {placa}</p>
                          <p><strong>Tipo:</strong> {tipo}</p>
                          <p><strong>Duración:</strong> {duracionHoras > 0 ? `${duracionHoras} hrs` : '— hrs'}</p>
                        </div>
                        <div className="detalle-buttons">
                          <button
                            className="btn-rojo"
                            onClick={() => alert(`🧾 Factura para estancia ${estancia.id_estancia}`)}
                          >
                            Solicitar Factura
                          </button>
                          <button
                            className="btn-rojo"
                            onClick={() => alert(`🎫 Reimprimir ticket ${estancia.id_estancia}`)}
                          >
                            Reimprimir Ticket
                          </button>
                          <button
                            className="btn-rojo"
                            onClick={() => {
                              const horasExtra = prompt('¿Cuántas horas adicionales deseas agregar?', '1');
                              if (horasExtra) {
                                ampliarEstancia(estancia.id_estancia, parseInt(horasExtra, 10));
                              }
                            }}
                          >
                            Ampliar Estancia
                          </button>
                          <button
                            className="btn-rojo"
                            onClick={() => abrirConfirmModal(estancia.id_estancia)}
                          >
                            Finalizar
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ────────────────
            COLUMNA DERECHA
           ──────────────── */}
        <div className="right-column">
          {/* — Mantenimiento — */}
          <div className="section mantenimiento">
            <div className="section-header">
              <span>Mantenimiento <span className="tool-icon">🔧</span></span>
              <span className="count-badge">{mantenimientoList.length}</span>
            </div>
            <div className="section-content">
              {mantenimientoList.length === 0 ? (
                <p style={{ color: '#999' }}>Sin tareas de mantenimiento</p>
              ) : (
                mantenimientoList.map((item) => (
                  <div key={item.id_mantenimiento} className="room-row">
                    <div className="room-number">#{item.numero_cabina}</div>
                    <div className="room-time">Inicio: {formatearFecha(item.fecha_inicio_mantenimiento)}</div>
                    <button
                      className="liberar-btn"
                      onClick={() => handleFinalizarMantenimiento(item.id_mantenimiento)}
                    >
                      Finalizar
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* — Estancias Programadas — */}
          <div className="section reservaciones">
            <div className="section-header">
              <span>Estancias Programadas</span>
              <span className="add-icon">+</span>
            </div>
            <div className="section-content">
              <p style={{ color: '#999' }}>No hay estancias programadas</p>
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================
          BLOQUE: Overlay + Modal de Asignación / Pagos (igual que antes)
         ================================================================= */}
      {modalVisible && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {/* ═════════════════ PASO 1: Elegir Duración y luego Cabina ════════════════ */}
            {modalPaso === 1 && (
              <>
                <h3>Duración para cabina {modalTipo}</h3>
                <ul className="lista-duraciones">
                  {modalPrecios.map((p, i) => (
                    <li key={i} onClick={() => elegirDuracion(p)}>
                      {p.duracion_horas} hrs – ₡{p.precio.toLocaleString('es-CR')}
                    </li>
                  ))}
                </ul>

                {seleccion && (
                  <div className="cabinas-list">
                    <h4>Seleccioná la cabina</h4>
                    {cargandoCabinas ? (
                      <p>Cargando cabinas…</p>
                    ) : (
                      cabinas.map((cab, idx) => (
                        <div
                          key={idx}
                          className="cabina-item"
                          onClick={() => elegirCabina(cab.numero)}
                        >
                          Cabina {cab.numero}
                        </div>
                      ))
                    )}
                  </div>
                )}

                <div className="modal-footer">
                  <button className="btn-volver" onClick={cerrarModal}>
                    Cerrar
                  </button>
                </div>
              </>
            )}

            {/* ═════════════════ PASO 2: Formulario de Asignación + Pagos ════════════════ */}
            {modalPaso === 2 && (
              <>
                <h3>Asignación de Habitación</h3>
                <div className="modal-body-dos-columnas">
                  {/* — Columna Izquierda: Formulario de datos — */}
                  <div className="columna-izq">
                    <div className="resumen-izq">
                      <p>
                        <strong>N° de Habitación:</strong> {seleccion.cabina}
                      </p>
                      <p>
                        <strong>Tiempo de Estancia:</strong> {seleccion.duracion_horas} hrs
                      </p>
                      <p>
                        <strong>Tipo de Habitación:</strong> {modalTipo}
                      </p>
                      <p>
                        <strong>Precio Unitario:</strong> ₡
                        {Number(seleccion.precio).toLocaleString('es-CR')}
                      </p>
                    </div>

                    <form onSubmit={handleSubmitAsignacion} className="form-izq">
                      <label>Placas / ID de Cliente</label>
                      <input
                        type="text"
                        value={formData.placa}
                        onChange={(e) =>
                          setFormData({ ...formData, placa: e.target.value })
                        }
                        required
                      />

                      <label>Personas Extras</label>
                      <select
                        value={formData.personas}
                        onChange={(e) =>
                          setFormData({ ...formData, personas: e.target.value })
                        }
                        required
                      >
                        <option value="">Seleccione</option>
                        <option value="1">1 Persona</option>
                        <option value="2">2 Personas</option>
                        <option value="3">3 Personas</option>
                      </select>

                      <label>Clave de Descuento</label>
                      <input
                        type="text"
                        value={formData.descuento}
                        onChange={(e) =>
                          setFormData({ ...formData, descuento: e.target.value })
                        }
                      />

                      <div className="checkbox-factura">
                        <input id="chk-factura" type="checkbox" />
                        <label htmlFor="chk-factura">Solicitar Factura</label>
                      </div>

                      <hr style={{ margin: '10px 0' }} />

                      <button className="btn-asignar-final" type="submit">
                        ASIGNAR HABITACIÓN
                      </button>
                    </form>
                  </div>

                  {/* — Columna Derecha: Resumen de costos + sección de Pagos — */}
                  <div className="columna-der">
                    <div className="resumen-der">
                      <div className="fila-resumen">
                        <span>Precio de Habitación:</span>
                        <span>₡{Number(seleccion.precio).toLocaleString('es-CR')}</span>
                      </div>
                      <div className="fila-resumen">
                        <span>Personas Extras:</span>
                        <span>₡0</span>
                      </div>
                      <div className="fila-resumen">
                        <span>SubTotal:</span>
                        <span>₡{Number(seleccion.precio).toLocaleString('es-CR')}</span>
                      </div>
                      <div className="fila-resumen">
                        <span>Descuento:</span>
                        <span>
                          ₡
                          {formData.descuento
                            ? Number(formData.descuento).toLocaleString('es-CR')
                            : '0'}
                        </span>
                      </div>
                      <div className="fila-resumen total-final">
                        <span>Total:</span>
                        <span>
                          ₡
                          {(
                            Number(seleccion.precio) -
                            Number(formData.descuento || 0)
                          ).toLocaleString('es-CR')}
                        </span>
                      </div>
                    </div>

                    <div className="seccion-pagos">
                      <h4>Forma de Pago</h4>
                      <div className="lista-pagos">
                        {pagos.length === 0 ? (
                          <p style={{ color: '#666' }}>(No hay pagos registrados)</p>
                        ) : (
                          pagos.map((pago) => (
                            <div
                              key={pago.id_pago}
                              style={{
                                marginBottom: '6px',
                                display: 'flex',
                                justifyContent: 'space-between',
                              }}
                            >
                              <span>{pago.metodo_pago}:</span>
                              <span>₡{Number(pago.monto_pagado).toLocaleString('es-CR')}</span>
                            </div>
                          ))
                        )}
                      </div>

                      <button
                        className="btn-realizar-pago"
                        type="button"
                        onClick={() => setMiniModalPago(true)}
                      >
                        REALIZAR UN PAGO
                      </button>

                      <div className="info-pago-restante">
                        Pago Restante:{' '}
                        <strong>₡{calcularPagoRestante().toLocaleString('es-CR')}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button className="btn-volver" onClick={() => setModalPaso(1)}>
                    « Volver
                  </button>
                  <button className="btn-cerrar" onClick={cerrarModal}>
                    Cerrar
                  </button>
                </div>
              </>
            )}

            {/* ════════════════════════════════════════════════════════
                MINI‐MODAL PARA REALIZAR PAGO (si miniModalPago == true)
               ════════════════════════════════════════════════════════ */}
            {miniModalPago && (
              <div
                className="modal-overlay mini-pago-overlay"
                onClick={() => setMiniModalPago(false)}
              >
                <div className="mini-pago-modal" onClick={(e) => e.stopPropagation()}>
                  <h4>Registrar Pago</h4>

                  <label>Método de Pago</label>
                  <select
                    value={pagoFormulario.metodo}
                    onChange={(e) =>
                      setPagoFormulario({ ...pagoFormulario, metodo: e.target.value })
                    }
                  >
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TARJETA">Tarjeta</option>
                  </select>

                  <label>Monto</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={pagoFormulario.monto}
                    onChange={(e) =>
                      setPagoFormulario({ ...pagoFormulario, monto: e.target.value })
                    }
                    placeholder="Ingrese monto a pagar"
                  />

                  <div className="mini-pago-buttons">
                    <button className="btn-realizar-pago" onClick={handleRegistrarPago}>
                      CONFIRMAR PAGO
                    </button>
                    <button className="btn-cerrar" onClick={() => setMiniModalPago(false)}>
                      CANCELAR
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          BLOQUE: Modal de Confirmación (Limpieza o Mantenimiento)
         ──────────────────────────────────────────────────────────────────────── */}
      {showConfirmModal && (
        <div className="confirm-modal-overlay" onClick={cerrarConfirmModal}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>¿A dónde deseas enviar esta cabina?</h3>
            <p>Elige uno de los siguientes estados:</p>
            <div className="confirm-buttons">
              <button className="btn-limpieza" onClick={confirmarLimpieza}>
                Enviar a Limpieza
              </button>
              <button className="btn-mantenimiento" onClick={confirmarMantenimiento}>
                Enviar a Mantenimiento
              </button>
            </div>
            <button className="btn-cerrar-modal" onClick={cerrarConfirmModal}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
