import React, { useEffect, useState } from 'react';
import './home.css';

function Home() {
  // =========================
  // Tus estados originales
  // =========================
  const [cabinasDisponibles, setCabinasDisponibles] = useState([]);

  // === ESTADOS AGREGADOS para el Modal y Pagos ===
  const [modalVisible, setModalVisible] = useState(false);
  const [modalPaso, setModalPaso] = useState(1);
  const [modalTipo, setModalTipo] = useState('');
  const [modalPrecios, setModalPrecios] = useState([]);
  const [seleccion, setSeleccion] = useState(null);
  const [cabinas, setCabinas] = useState([]);
  const [cargandoCabinas, setCargandoCabinas] = useState(false);

  // Tabla de Estancia y Cliente (ya estaba en tu código original)
  const [formData, setFormData] = useState({
    placa: '',
    personas: '',
    descuento: ''
  });

  // === ESTADOS PARA PAGOS ===
  const [idEstancia, setIdEstancia] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [miniModalPago, setMiniModalPago] = useState(false);
  const [pagoFormulario, setPagoFormulario] = useState({
    metodo: 'EFECTIVO',
    monto: ''
  });

  // ===============================
  // useEffect: cargar disponibilidad inicial
  // ===============================
  useEffect(() => {
    fetch('http://localhost:5000/api/cabinas-disponibles')
      .then((res) => res.json())
      .then((data) => setCabinasDisponibles(data))
      .catch((err) => console.error('Error al obtener disponibilidad', err));
  }, []);

  // ============================
  // Función para abrir el modal
  // ============================
  const abrirModal = (tipo) => {
    setModalTipo(tipo);
    setSeleccion(null);
    setCabinas([]);
    setModalPaso(1);
    setModalVisible(true);

    // Cargo las duraciones/ precios para ese tipo:
    fetch(`http://localhost:5000/api/precios/${tipo}`)
      .then((res) => res.json())
      .then((data) => setModalPrecios(data))
      .catch((err) => console.error('Error al obtener precios', err));
  };

  // ===============================
  // Función para cerrar (dismiss) el modal completo
  // ===============================
  const cerrarModal = () => {
    setModalVisible(false);
    setModalTipo('');
    setModalPrecios([]);
    setCabinas([]);
    setSeleccion(null);
    setFormData({ placa: '', personas: '', descuento: '' });
    setCargandoCabinas(false);

    // También cerremos el mini‐modal de pago si estuviera abierto
    setMiniModalPago(false);
    setPagoFormulario({ metodo: 'EFECTIVO', monto: '' });
    setPagos([]);
    setIdEstancia(null);
  };

  // ===================================================
  // Función auxiliar: el usuario eligió una duración
  // ===================================================
  const elegirDuracion = (precioObj) => {
    setSeleccion(precioObj);
    setCargandoCabinas(true);

    // Tras seleccionar duración, cargo cabinas disponibles de ese tipo:
    fetch(`http://localhost:5000/api/cabinas-por-tipo/${modalTipo}`)
      .then((res) => res.json())
      .then((data) => {
        setCabinas(data);
        setCargandoCabinas(false);
      })
      .catch((err) => {
        console.error('Error al obtener cabinas', err);
        setCargandoCabinas(false);
      });
  };

  // ===================================================
  // Función auxiliar: el usuario eligió un número de cabina
  // ===================================================
  const elegirCabina = (numeroCabina) => {
    setSeleccion((prev) => ({ ...prev, cabina: numeroCabina }));
    setModalPaso(2);
  };

  // ===============================================
  // Al enviar el formulario final (Asignación)
  // ===============================================
  const handleSubmitAsignacion = (e) => {
    e.preventDefault();

    const data = {
      cabina: seleccion?.cabina,
      tipo: modalTipo,
      duracion: seleccion?.duracion_horas,
      precio: seleccion?.precio,
      ...formData
    };

    fetch('http://localhost:5000/api/asignar-cabina', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
      .then((res) => res.json())
      .then((response) => {
        alert('🏷️ Cabina asignada con éxito');

        // Guardamos el id_estancia que devuelve el backend
        const nuevoId = response.id_estancia;
        setIdEstancia(nuevoId);

        // Cargamos los pagos (aún no hay ninguno)
        cargarPagosDeEstancia(nuevoId);

        // Recargamos la disponibilidad de cabinas
        fetch('http://localhost:5000/api/cabinas-disponibles')
          .then((res) => res.json())
          .then((disp) => setCabinasDisponibles(disp))
          .catch((err) => console.error(err));

        // Abrimos el mini‐modal para realizar el primer pago
        setMiniModalPago(true);
      })
      .catch((err) => {
        console.error('Error al asignar cabina', err);
        alert('🚨 Error al asignar la cabina');
      });
  };

  // ===============================================
  // Función para cargar los pagos actuales de una estancia
  // ===============================================
  const cargarPagosDeEstancia = (id_est) => {
    fetch(`http://localhost:5000/api/pagos/${id_est}`)
      .then((res) => res.json())
      .then((data) => setPagos(data))
      .catch((err) => console.error('Error al obtener pagos', err));
  };

  // ===============================================
  // Función para registrar un pago (POST /api/registrar-pago)
  // ===============================================
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
      monto_pagado: parseFloat(pagoFormulario.monto)
    };

    fetch('http://localhost:5000/api/registrar-pago', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then((res) => res.json())
      .then((resp) => {
        alert('Pago registrado correctamente');

        // Recargamos la lista de pagos para actualizar “Pago Restante”
        cargarPagosDeEstancia(idEstancia);

        // Cerramos el mini‐modal y limpiamos el formulario
        setMiniModalPago(false);
        setPagoFormulario({ metodo: 'EFECTIVO', monto: '' });
      })
      .catch((err) => {
        console.error('Error al registrar pago', err);
        alert('Error al registrar el pago');
      });
  };

  // ===============================================
  // Función para calcular “Pago Restante”
  // ===============================================
  const calcularPagoRestante = () => {
    if (!seleccion) return 0;
    const totalPagar = Number(seleccion.precio);
    const sumaPagos = pagos.reduce((acc, p) => acc + Number(p.monto_pagado), 0);
    return totalPagar - sumaPagos;
  };

  // ================================
  // Cálculo del total de disponibilidad
  // ================================
  const totalDisponibles = cabinasDisponibles.reduce((acc, c) => acc + c.cantidad, 0);

  return (
    <div className="window">
      {/* =====================
          TU HEADER ORIGINAL
          ===================== */}
      <div className="window-header">
        <div className="window-title">Menú Principal - HotelDePaso.com</div>
        <div className="close-btn">✕</div>
      </div>

      {/* =====================
          TU TOP‐BAR ORIGINAL
          ===================== */}
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

      {/* ================================
          TU MAIN‐CONTENT ORIGINAL (3 COLUMNAS)
          ================================ */}
      <div className="main-content">
        <div className="left-column">
          <div className="section limpieza">
            <div className="section-header">
              <span>Limpieza <span className="tool-icon">🧹</span></span>
              <span className="count-badge">0</span>
            </div>
            <div className="section-content">
              <p style={{ color: '#999' }}>Sin registros</p>
            </div>
          </div>

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

        <div className="center-column">
          <div className="section ocupacion">
            <div className="section-header">
              <span>Cabinas Ocupadas <span className="tool-icon">🔎</span>
                <a href="#" className="mapa-link">🏨 Ver Mapa</a>
              </span>
              <div><span className="room-count">0</span></div>
            </div>
            <div className="section-content">
              <p style={{ color: '#999' }}>No hay cabinas ocupadas actualmente</p>
            </div>
          </div>
        </div>

        <div className="right-column">
          <div className="section mantenimiento">
            <div className="section-header">
              <span>Mantenimiento <span className="tool-icon">🔧</span></span>
              <span className="count-badge">0</span>
            </div>
            <div className="section-content">
              <p style={{ color: '#999' }}>Sin tareas de mantenimiento</p>
            </div>
          </div>

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

      {/* ====================================================
          BLOQUE NUEVO: Overlay + Modal (sólo si modalVisible)
          ==================================================== */}
      {modalVisible && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {/* =======================
                PASO 1: Elegir duración
                ======================= */}
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

            {/* ====================================
                PASO 2: Formulario de Asignación
                ==================================== */}
            {modalPaso === 2 && (
              <>
                <h3>Asignación de Habitación</h3>

                <div className="modal-body-dos-columnas">
                  {/* ------------------- Columna Izquierda ------------------- */}
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
                        <strong>Precio Unitario:</strong> ₡{Number(seleccion.precio).toLocaleString('es-CR')}
                      </p>
                    </div>

                    <form onSubmit={handleSubmitAsignacion} className="form-izq">
                      <label>Placas / ID de Cliente</label>
                      <input
                        type="text"
                        value={formData.placa}
                        onChange={(e) => setFormData({ ...formData, placa: e.target.value })}
                        required
                      />

                      <label>Personas Extras</label>
                      <select
                        value={formData.personas}
                        onChange={(e) => setFormData({ ...formData, personas: e.target.value })}
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
                        onChange={(e) => setFormData({ ...formData, descuento: e.target.value })}
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

                  {/* ------------------- Columna Derecha ------------------- */}
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
                          ₡{formData.descuento ? Number(formData.descuento).toLocaleString('es-CR') : '0'}
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
                                justifyContent: 'space-between'
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

            {/* =========================
                MINI‐MODAL PARA REALIZAR PAGO
                ========================= */}
            {miniModalPago && (
              <div className="modal-overlay mini-pago-overlay" onClick={() => setMiniModalPago(false)}>
                <div className="mini-pago-modal" onClick={(e) => e.stopPropagation()}>
                  <h4>Registrar Pago</h4>

                  <label>Método de Pago</label>
                  <select
                    value={pagoFormulario.metodo}
                    onChange={(e) => setPagoFormulario({ ...pagoFormulario, metodo: e.target.value })}
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
                    onChange={(e) => setPagoFormulario({ ...pagoFormulario, monto: e.target.value })}
                    placeholder="Ingrese monto a pagar"
                  />

                  <div className="mini-pago-buttons">
                    <button
                      className="btn-realizar-pago"
                      onClick={handleRegistrarPago}
                    >
                      CONFIRMAR PAGO
                    </button>
                    <button
                      className="btn-cerrar"
                      onClick={() => setMiniModalPago(false)}
                    >
                      CANCELAR
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
