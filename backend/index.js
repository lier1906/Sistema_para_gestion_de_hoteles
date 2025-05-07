const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');       // 👈 conexión MySQL
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// 📦 Conexión a la base de datos
const conexion = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

conexion.connect((err) => {
  if (err) {
    console.error('❌ Error al conectar a la base de datos:', err);
  } else {
    console.log('✅ Conexión a MySQL exitosa');
  }
});

// Ruta de prueba básica
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hola desde el backend con Node.js y Express!' });
});

// Ruta para consultar usuarios
app.get('/api/usuarios', (req, res) => {
  conexion.query('SELECT * FROM Usuarios', (err, results) => {
    if (err) {
      console.error('❌ Error en la consulta:', err);
      res.status(500).json({ error: 'Error en la consulta' });
    } else {
      res.json(results);
    }
  });
});

app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});
app.post('/api/login', (req, res) => {
  const { correo, contrasena } = req.body;

  const query = 'SELECT * FROM Usuarios WHERE correo = ? AND contrasena = ?';
  conexion.query(query, [correo, contrasena], (err, resultados) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error en el servidor' });
    }

    if (resultados.length > 0) {
      res.json({ autenticado: true, usuario: resultados[0] });
    } else {
      res.json({ autenticado: false });
    }
  });
});

