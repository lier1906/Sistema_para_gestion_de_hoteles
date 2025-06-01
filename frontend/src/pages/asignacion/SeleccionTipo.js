import React from 'react';
import './SeleccionTipo.css';
import { useNavigate } from 'react-router-dom';

function SeleccionTipo() {
  const navigate = useNavigate();

  const manejarSeleccion = (tipo) => {
    navigate(`/asignar/duracion/${tipo}`);
  };

  return (
    <div className="seleccion-container">
      <h2>Seleccionar tipo de cabina</h2>
      <div className="tarjetas">
        <div className="tarjeta sencilla" onClick={() => manejarSeleccion('SENCILLA')}>
          <h3>Cabina SENCILLA</h3>
          <p>Confort básica para una estancia rápida</p>
        </div>
        <div className="tarjeta vip" onClick={() => manejarSeleccion('VIP')}>
          <h3>Cabina VIP</h3>
          <p>Mayor espacio y comodidades exclusivas</p>
        </div>
      </div>
    </div>
  );
}

export default SeleccionTipo;
