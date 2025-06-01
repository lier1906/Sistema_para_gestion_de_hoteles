import React, { useEffect, useState } from 'react';
import './home.css';

function Home() {
  // =========================
  // Tus estados originales
  // =========================
  const [cabinasDisponibles, setCabinasDisponibles] = useState([]);
  
  // === ESTADOS AGREGADOS para el Modal ===
  const [modalVisible, setModalVisible] = useState(false);          // *** AGREGADO ***
  const [modalPaso, setModalPaso] = useState(1);                      // *** AGREGADO ***
  const [modalTipo, setModalTipo] = useState('');                     // *** AGREGADO ***
  const [modalPrecios, setModalPrecios] = useState([]);               // *** AGREGADO ***
  const [seleccion, setSeleccion] = useState(null);                   // *** AGREGADO ***
  const [cabinas, setCabinas] = useState([]);                         // *** AGREGADO ***
  const [cargandoCabinas, setCargandoCabinas] = useState(false);     // *** AGREGADO ***

  const [formData, setFormData] = useState({
    placa: '',
    personas: '',
    descuento: ''
  });

  // ===============================
  // useEffect: cargar disponibilidad
  // ===============================
  useEffect(() => {
    fetch('http://localhost:5000/api/cabinas-disponibles')
      .then(res => res.json())
      .then(data => setCabinasDisponibles(data))
      .catch(err => console.error('Error al obtener disponibilidad', err));
  }, []);

  // ============================
  // Función para abrir el modal
  // ============================
  const abrirModal = (tipo) => {
    setModalTipo(tipo);              // guardo “SENCILLA” o “VIP”
    setSeleccion(null);              // reseteo selecciones previas
    setCabinas([]);                  // vacío lista de cabinas
    setModalPaso(1);                 // empiezo en el Paso 1 del modal
    setModalVisible(true);           // muestro el overlay + modal
    // Cargo las duraciones/ precios para ese tipo:
    fetch(`http://localhost:5000/api/precios/${tipo}`)
      .then(res => res.json())
      .then(data => setModalPrecios(data))
      .catch(err => console.error('Error al obtener precios', err));
  };

  // ===============================
  // Función para cerrar (dismiss) el modal
  // ===============================
  const cerrarModal = () => {
    setModalVisible(false);          // oculta modal completamente
    setModalTipo('');                
    setModalPrecios([]);             
    setCabinas([]);                  
    setSeleccion(null);              
    setFormData({ placa: '', personas: '', descuento: '' });
    setCargandoCabinas(false);
  };

  // ===================================================
  // Función auxiliar: el usuario eligió una duración (p ej. 4 hrs)
  // ===================================================
  const elegirDuracion = (precioObj) => {    // precioObj = { duracion_horas: x, precio: y }
    setSeleccion(precioObj);
    setCargandoCabinas(true);
    // Tras haber seleccionado duración, cargo cabinas disponibles de ese tipo:
    fetch(`http://localhost:5000/api/cabinas-por-tipo/${modalTipo}`)
      .then(res => res.json())
      .then(data => {
        setCabinas(data);
        setCargandoCabinas(false);
      })
      .catch(err => {
        console.error('Error al obtener cabinas', err);
        setCargandoCabinas(false);
      });
  };

  // ===================================================
  // Función auxiliar: el usuario eligió un número de cabina
  // ===================================================
  const elegirCabina = (numeroCabina) => {
    // agrego el número de cabina a “seleccion” y paso al Paso 2
    setSeleccion(prev => ({ ...prev, cabina: numeroCabina }));
    setModalPaso(2);
  };

  // ===============================================
  // Al enviar el formulario final (Asignación)
  // ===============================================
  const handleSubmit = (e) => {
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
      .then(res => res.json())
      .then(response => {
        alert('🏷️ Cabina asignada con éxito');

        // *** AGREGADO: recargo la disponibilidad tras asignar ***
        fetch('http://localhost:5000/api/cabinas-disponibles')
          .then(res => res.json())
          .then(data => setCabinasDisponibles(data))
          .catch(err => console.error(err));

        cerrarModal();
      })
      .catch(err => {
        console.error('Error al asignar cabina', err);
        alert('🚨 Error al asignar la cabina');
      });
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
          <div className="logo">
            {/* SVG del logo */}
          </div>
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

                    <form onSubmit={handleSubmit} className="form-izq">
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
                        <p style={{ color: '#666' }}>(No hay pagos registrados)</p>
                      </div>
                      <button
                        className="btn-realizar-pago"
                        type="button"
                        onClick={() => alert('Aquí iría “Realizar un Pago”')}
                      >
                        REALIZAR UN PAGO
                      </button>
                      <div className="info-pago-restante">
                        Pago Restante:{' '}
                        <strong>
                          ₡
                          {(
                            Number(seleccion.precio) -
                            Number(formData.descuento || 0)
                          ).toLocaleString('es-CR')}
                        </strong>
                      </div>
                      <button className="btn-asignar-final" type="submit">
                        ASIGNAR HABITACIÓN
                      </button>
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
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
