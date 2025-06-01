import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/login';
import Home from './pages/home';
import SeleccionDuracion from './pages/asignacion/SeleccionDuracion';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/asignar/duracion/:tipo" element={<SeleccionDuracion />} />
      </Routes>
    </Router>
  );
}

export default App;
