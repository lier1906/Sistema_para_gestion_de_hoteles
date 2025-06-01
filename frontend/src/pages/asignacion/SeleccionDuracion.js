import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './SeleccionDuracion.css';

function SeleccionDuracion() {
  const { tipo } = useParams(); // viene de la URL
  const [precios, setPrecios] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`http://localhost:5000/api/precios/${tipo}`)
      .then(res => res.json())
      .then(data => setPrecios(data))
      .catch(err => console.error('Error al obtener precios', err));
  }, [tipo]);

  const seleccionarDuracion = (horas, precio) => {
    // podés guardar esto en localStorage o context para continuar
    localStorage.setItem('seleccion', JSON.stringify({ tipo, horas, precio }));
    navigate('/asignar/cabina');
  };

  return (
    <div className="duracion-container">
      <h2>Seleccioná la duración para cabina {tipo}</h2>
      <div className="opciones">
        {precios.length === 0 ? (
          <p>No hay opciones disponibles</p>
        ) : (
          precios.map((item, index) => (
            <div className="opcion" key={index} onClick={() => seleccionarDuracion(item.duracion_horas, item.precio)}>
              <h3>{item.duracion_horas} hrs</h3>
              <p>₡{item.precio.toLocaleString('es-CR')}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default SeleccionDuracion;
