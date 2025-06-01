const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
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

// Login
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

// Cabinas disponibles agrupadas por tipo
app.get('/api/cabinas-disponibles', (req, res) => {
  const query = `
    SELECT tipo, COUNT(*) as cantidad
    FROM Cabinas
    WHERE estado = 'disponible'
    GROUP BY tipo
  `;

  conexion.query(query, (err, resultados) => {
    if (err) {
      console.error('❌ Error en la consulta:', err);
      return res.status(500).json({ error: 'Error en la base de datos' });
    }
    res.json(resultados);
  });
});

// Precios por tipo de cabina
app.get('/api/precios/:tipo', (req, res) => {
  const tipo = req.params.tipo;

  const query = `
    SELECT duracion_horas, precio 
    FROM Precios 
    WHERE tipo_cabina = ?
    ORDER BY duracion_horas ASC
  `;

  conexion.query(query, [tipo], (err, results) => {
    if (err) {
      console.error('❌ Error en la consulta de precios:', err);
      return res.status(500).json({ error: 'Error al obtener precios' });
    }
    res.json(results);
  });
});

// 🔥 NUEVA RUTA: Cabinas disponibles por tipo
app.get('/api/cabinas-por-tipo/:tipo', (req, res) => {
  const tipo = req.params.tipo;

  const query = `
    SELECT id_cabina, numero 
    FROM Cabinas 
    WHERE tipo = ? AND estado = 'disponible'
    ORDER BY numero
  `;

  conexion.query(query, [tipo], (err, resultados) => {
    if (err) {
      console.error('❌ Error en la consulta de cabinas por tipo:', err);
      return res.status(500).json({ error: 'Error al obtener cabinas' });
    }
    res.json(resultados);
  });
});

// Registrar estancia (asignar cabina)
app.post('/api/asignar-cabina', (req, res) => {
  const { placa, personas, descuento, cabina, tipo, duracion, precio } = req.body;

  if (!placa || !cabina || !tipo || !duracion || !precio) {
    return res.status(400).json({ error: 'Datos incompletos para asignar la cabina' });
  }

  const buscarCliente = `SELECT id_cliente FROM Clientes WHERE placa = ? LIMIT 1`;

  conexion.query(buscarCliente, [placa], (err, clienteRows) => {
    if (err) return res.status(500).json({ error: 'Error al buscar cliente' });

    const continuar = (idCliente) => {
      const buscarCabina = `SELECT id_cabina FROM Cabinas WHERE numero = ? LIMIT 1`;
      conexion.query(buscarCabina, [cabina], (err, cabinaRows) => {
        if (err || cabinaRows.length === 0) return res.status(500).json({ error: 'Error con la cabina seleccionada' });

        const idCabina = cabinaRows[0].id_cabina;
        const fechaIngreso = new Date();
        const idUsuario = 1; // Suponiendo usuario admin temporal

        const insertarEstancia = `
          INSERT INTO Estancias (id_cabina, id_cliente, tipo_cabina, duracion, fecha_ingreso, monto_total, registrada_por, estado)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'activa')
        `;

        conexion.query(
          insertarEstancia,
          [idCabina, idCliente, tipo, duracion, fechaIngreso, precio, idUsuario],
          (err, result) => {
            if (err) return res.status(500).json({ error: 'Error al registrar la estancia' });

            const nuevoIdEstancia = result.insertId; // <-- Obtenemos el id_estancia recién creado

            // Marcar la cabina como ocupada
            conexion.query(
              `UPDATE Cabinas SET estado = 'ocupada' WHERE id_cabina = ?`,
              [idCabina],
              (err2) => {
                if (err2) return res.status(500).json({ error: 'Error al actualizar cabina' });

                // Devolvemos mensaje + id_estancia
                res.json({ mensaje: 'Cabina asignada correctamente', id_estancia: nuevoIdEstancia });
              }
            );
          }
        );
      });
    };

    // Si el cliente existe, continuar. Si no, crearlo.
    if (clienteRows.length > 0) {
      continuar(clienteRows[0].id_cliente);
    } else {
      const insertarCliente = `INSERT INTO Clientes (placa) VALUES (?)`;
      conexion.query(insertarCliente, [placa], (err2, result2) => {
        if (err2) return res.status(500).json({ error: 'Error al crear cliente' });
        continuar(result2.insertId);
      });
    }
  });
});

// 🔥 NUEVA RUTA: Registrar un pago para una estancia
app.post('/api/registrar-pago', (req, res) => {
  const { id_estancia, metodo_pago, monto_pagado } = req.body;

  if (!id_estancia || !metodo_pago || !monto_pagado) {
    return res.status(400).json({ error: 'Datos incompletos para registrar el pago' });
  }

  const insertarPago = `
    INSERT INTO Pagos (id_estancia, metodo_pago, monto_pagado, fecha_pago)
    VALUES (?, ?, ?, NOW())
  `;

  conexion.query(
    insertarPago,
    [id_estancia, metodo_pago, monto_pagado],
    (err, result) => {
      if (err) {
        console.error('Error al registrar el pago:', err);
        return res.status(500).json({ error: 'Error al registrar el pago en la base de datos' });
      }
      res.json({ mensaje: 'Pago registrado correctamente', id_pago: result.insertId });
    }
  );
});

// 🔥 NUEVA RUTA: Obtener todos los pagos asociados a una estancia
app.get('/api/pagos/:id_estancia', (req, res) => {
  const { id_estancia } = req.params;

  const consultarPagos = `
    SELECT id_pago, metodo_pago, monto_pagado, fecha_pago
    FROM Pagos
    WHERE id_estancia = ?
    ORDER BY fecha_pago ASC
  `;

  conexion.query(consultarPagos, [id_estancia], (err, rows) => {
    if (err) {
      console.error('Error al consultar pagos:', err);
      return res.status(500).json({ error: 'Error al obtener pagos de la estancia' });
    }
    res.json(rows);
  });
});

// Inicio del servidor
app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});
