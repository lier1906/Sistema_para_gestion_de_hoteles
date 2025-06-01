import React, { useState } from 'react';
import './login.css';
import { useNavigate } from 'react-router-dom';


function Login() {
  const navigate = useNavigate();

  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [mensaje, setMensaje] = useState('');

  const manejarEnvio = (e) => {
    e.preventDefault();

    fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo, contrasena })
    })
      .then(res => res.json())
      .then(data => {
        if (data.autenticado) {
  localStorage.setItem('usuario', JSON.stringify(data.usuario)); // guarda los datos
  navigate('/home'); // 🔁 redirige al Home automáticamente

          // Aquí podrías redirigir o guardar en localStorage si querés
        } else {
          setMensaje('❌ Credenciales incorrectas');
        }
      })
      .catch(err => {
        console.error(err);
        setMensaje('❌ Error de conexión con el servidor');
      });
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="title">Hotel de Paso Atlantis</h1>
        <p className="subtitle">Inicio de Sesión</p>

        <form onSubmit={manejarEnvio}>
          <label htmlFor="email">Correo:</label>
          <input
            type="email"
            id="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            required
          />

          <label htmlFor="password">Contraseña:</label>
          <input
            type="password"
            id="password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            required
          />

          <button type="submit">INGRESAR</button>
          <a href="#" className="forgot">¿Olvidó su contraseña?</a>
        </form>

        {mensaje && <p style={{ marginTop: '15px', color: 'white' }}>{mensaje}</p>}
      </div>
    </div>
  );
}

export default Login;
