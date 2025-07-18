// backend/index.js

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
require('dotenv').config();
const transporter = require('./mailer');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


/**
 * ───────────────────────────────────────────────────────────────────────────
 *  📦 Conexión a MySQL
 * ───────────────────────────────────────────────────────────────────────────
 */
const conexion = mysql.createConnection({
  host:     process.env.DB_HOST,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

conexion.connect(err => {
  if (err) {
    console.error('❌ Error al conectar a la base de datos:', err);
    process.exit(1);
  }
  console.log('✅ Conexión a MySQL exitosa');
});


/**
 * ───────────────────────────────────────────────────────────────────────────
 *  RUTA DE PRUEBA
 * ───────────────────────────────────────────────────────────────────────────
 */
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hola desde el backend con Node.js y Express!' });
});
app.get('/api/test-email', (req, res) => {
  transporter.sendMail({
    from: process.env.SMTP_USER,
    to:   process.env.EMAIL_TO,
    subject: '🔔 Prueba de email',
    text:    'Si estás viendo esto, el envío funciona correctamente.'
  }, (err, info) => {
    if (err) return res.status(500).json({ ok: false, error: err.message });
    res.json({ ok: true, info });
  });
});

/**
 * ───────────────────────────────────────────────────────────────────────────
 *  RUTA: /api/usuarios
 *  - Devuelve todos los usuarios (tabla Usuarios)
 * ───────────────────────────────────────────────────────────────────────────
 */
app.get('/api/usuarios', (req, res) => {
  const sql = 'SELECT * FROM Usuarios';
  conexion.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Error en la consulta de usuarios:', err);
      return res.status(500).json({ error: 'Error en la consulta' });
    }
    res.json(results);
  });
});


/**
 * ───────────────────────────────────────────────────────────────────────────
 *  RUTA: /api/login
 *  - Recibe { correo, contrasena } en el body y verifica credenciales
 *  - Devuelve { autenticado: true/false, usuario: {...} }
 * ───────────────────────────────────────────────────────────────────────────
 */
app.post('/api/login', (req, res) => {
  const { correo, contrasena } = req.body;
  const sql = 'SELECT * FROM Usuarios WHERE correo = ? AND contrasena = ? LIMIT 1';
  conexion.query(sql, [correo, contrasena], (err, rows) => {
    if (err) {
      console.error('❌ Error en login:', err);
      return res.status(500).json({ error: 'Error en el servidor' });
    }
    if (rows.length > 0) {
      res.json({ autenticado: true, usuario: rows[0] });
    } else {
      res.json({ autenticado: false });
    }
  });
});


/**
 * ───────────────────────────────────────────────────────────────────────────
 *  RUTA: /api/cabinas-disponibles
 *  - Devuelve un resumen agrupado de cuántas cabinas libres hay por tipo
 *  - Ejemplo: [ { tipo: 'SENCILLA', cantidad: 4 }, { tipo: 'VIP', cantidad: 3 } ]
 * ───────────────────────────────────────────────────────────────────────────
 */
app.get('/api/cabinas-disponibles', (req, res) => {
  const sql = `
    SELECT tipo, COUNT(*) AS cantidad
    FROM Cabinas
    WHERE estado = 'disponible'
    GROUP BY tipo
  `;
  conexion.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Error al consultar cabinas disponibles:', err);
      return res.status(500).json({ error: 'Error en la base de datos' });
    }
    res.json(results);
  });
});


/**
 * ───────────────────────────────────────────────────────────────────────────
 *  RUTA: /api/precios/:tipo
 *  - Recibe en params “tipo” = 'SENCILLA' o 'VIP'
 *  - Devuelve todos los precios asociados (duracion_horas, precio)
 * ───────────────────────────────────────────────────────────────────────────
 */
app.get('/api/precios/:tipo', (req, res) => {
  const tipo = req.params.tipo.toUpperCase();
  const sql = `
    SELECT duracion_horas, precio
    FROM Precios
    WHERE tipo_cabina = ?
    ORDER BY duracion_horas ASC
  `;
  conexion.query(sql, [tipo], (err, rows) => {
    if (err) {
      console.error('❌ Error al consultar precios:', err);
      return res.status(500).json({ error: 'Error al obtener precios' });
    }
    res.json(rows);
  });
});


/**
 * ───────────────────────────────────────────────────────────────────────────
 *  RUTA: /api/cabinas-por-tipo/:tipo
 *  - Recibe en params “tipo” = 'SENCILLA' o 'VIP'
 *  - Devuelve { id_cabina, numero } de las cabinas cuyo estado = 'disponible'
 * ───────────────────────────────────────────────────────────────────────────
 */
app.get('/api/cabinas-por-tipo/:tipo', (req, res) => {
  const tipo = req.params.tipo.toUpperCase();
  const sql = `
    SELECT id_cabina, numero
    FROM Cabinas
    WHERE tipo = ? AND estado = 'disponible'
    ORDER BY numero
  `;
  conexion.query(sql, [tipo], (err, rows) => {
    if (err) {
      console.error('❌ Error al consultar cabinas por tipo:', err);
      return res.status(500).json({ error: 'Error al obtener cabinas' });
    }
    res.json(rows);
  });
});


/**
 * ───────────────────────────────────────────────────────────────────────────
 *  RUTA: /api/asignar-cabina
 *  - Recibe en body:
 *      {
 *        placa,           // string (placa o ID del cliente)
 *        personas,        // string o número (n.º de personas extras)
 *        descuento,       // string (monto de descuento)
 *        cabina,          // número de cabina (ej: '101', '202', etc.)
 *        tipo,            // 'SENCILLA' o 'VIP'
 *        duracion,        // horas (número)
 *        precio           // monto total (decimal)
 *      }
 *  - Busca (o crea) un cliente en tabla Clientes (por placa)
 *  - Inserta un registro en Estancias con estado='activa'
 *  - Marca la cabina como estado='ocupada'
 *  - Devuelve JSON { mensaje: 'Cabina asignada correctamente', id_estancia: <nuevo_id> }
 * ───────────────────────────────────────────────────────────────────────────
 */
app.post('/api/asignar-cabina', (req, res) => {
  const { placa, personas, descuento, cabina, tipo, duracion, precio } = req.body;

  // Validación básica
  if (!placa || !cabina || !tipo || duracion == null || precio == null) {
    return res.status(400).json({ error: 'Datos incompletos para asignar la cabina' });
  }

  // 1) Buscar cliente por placa
  const sqlBuscarCliente = `SELECT id_cliente FROM Clientes WHERE placa = ? LIMIT 1`;
  conexion.query(sqlBuscarCliente, [placa], (err, clienteRows) => {
    if (err) {
      console.error('❌ Error al buscar cliente:', err);
      return res.status(500).json({ error: 'Error al buscar cliente' });
    }

    // Función para continuar una vez tengamos id_cliente
    const continuarConCliente = (idCliente) => {
      // 2) Buscar el id_cabina real según el “numero” de cabina
      const sqlBuscarCabina = `SELECT id_cabina FROM Cabinas WHERE numero = ? LIMIT 1`;
      conexion.query(sqlBuscarCabina, [cabina], (err2, cabinaRows) => {
        if (err2) {
          console.error('❌ Error al buscar cabina:', err2);
          return res.status(500).json({ error: 'Error con la cabina seleccionada' });
        }
        if (cabinaRows.length === 0) {
          return res.status(400).json({ error: 'Cabina no existe' });
        }

        const idCabina = cabinaRows[0].id_cabina;
        const fechaIngreso = new Date();
        const idUsuario   = 1; // Aquí podrías reemplazar por el usuario que esté logueado

        // 3) Insertar la estancia en Estancias
        const sqlInsertarEstancia = `
          INSERT INTO Estancias
            (id_cabina, id_cliente, tipo_cabina, duracion, fecha_ingreso, monto_total, registrada_por, estado)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'activa')
        `;
        conexion.query(
          sqlInsertarEstancia,
          [idCabina, idCliente, tipo, duracion, fechaIngreso, precio, idUsuario],
          (err3, resultEstancia) => {
            if (err3) {
              console.error('❌ Error al insertar Estancia:', err3);
              return res.status(500).json({ error: 'Error al registrar la estancia' });
            }

            const nuevoIdEstancia = resultEstancia.insertId;

            // 4) Marcar la cabina como “ocupada”
            const sqlMarcarOcupada = `UPDATE Cabinas SET estado = 'ocupada' WHERE id_cabina = ?`;
            conexion.query(sqlMarcarOcupada, [idCabina], (err4) => {
              if (err4) {
                console.error('❌ Error al actualizar estado de cabina:', err4);
                return res.status(500).json({ error: 'Error al actualizar cabina' });
              }

              // 5) Devolver el id_estancia
              return res.json({
                mensaje: 'Cabina asignada correctamente',
                id_estancia: nuevoIdEstancia
              });
            });
          }
        );
      });
    };

    // Si existe cliente, continuar; si no, crearlo
    if (clienteRows.length > 0) {
      continuarConCliente(clienteRows[0].id_cliente);
    } else {
      // Insertar nuevo cliente con “placa”
      const sqlInsertarCliente = `INSERT INTO Clientes (placa) VALUES (?)`;
      conexion.query(sqlInsertarCliente, [placa], (err5, resultCliente) => {
        if (err5) {
          console.error('❌ Error al crear Cliente:', err5);
          return res.status(500).json({ error: 'Error al crear cliente' });
        }
        continuarConCliente(resultCliente.insertId);
      });
    }
  });
});


/**
 * ───────────────────────────────────────────────────────────────────────────
 *  RUTA: /api/estancias-activas
 *  - Devuelve todas las estancias con estado='activa'
 *    junto con datos: id_cabina, número de cabina, tipo, duracion_horas, fecha_ingreso, placa_cliente.
 * ───────────────────────────────────────────────────────────────────────────
 */
app.get('/api/estancias-activas', (req, res) => {
  const sql = `
    SELECT
      e.id_estancia,
      e.id_cabina,
      c.numero            AS numero_cabina,
      e.tipo_cabina,
      e.duracion          AS duracion_horas,
      e.fecha_ingreso,
      cl.placa            AS placa_cliente
    FROM Estancias e
    JOIN Cabinas c       ON e.id_cabina = c.id_cabina
    LEFT JOIN Clientes cl ON e.id_cliente = cl.id_cliente
    WHERE e.estado = 'activa'
    ORDER BY e.fecha_ingreso ASC
  `;
  conexion.query(sql, (err, rows) => {
    if (err) {
      console.error('❌ Error al consultar estancias activas:', err);
      return res.status(500).json({ error: 'Error al obtener estancias' });
    }
    res.json(rows);
  });
});


/**
 * ───────────────────────────────────────────────────────────────────────────
 *  RUTA: /api/pagos/:id_estancia
 *  - Recibe en params “id_estancia”
 *  - Devuelve el historial de pagos de esa estancia, ordenado por fecha_pago ASC
 * ───────────────────────────────────────────────────────────────────────────
 */
app.get('/api/pagos/:id_estancia', (req, res) => {
  const id_estancia = parseInt(req.params.id_estancia, 10);
  const sql = `
    SELECT id_pago, metodo_pago, monto_pagado, fecha_pago
    FROM Pagos
    WHERE id_estancia = ?
    ORDER BY fecha_pago ASC
  `;
  conexion.query(sql, [id_estancia], (err, rows) => {
    if (err) {
      console.error('❌ Error al consultar pagos:', err);
      return res.status(500).json({ error: 'Error al obtener pagos' });
    }
    res.json(rows);
  });
});


/**
 * ───────────────────────────────────────────────────────────────────────────
 *  RUTA: /api/registrar-pago
 *  - Recibe en body { id_estancia, metodo_pago, monto_pagado }
 *  - Inserta en tabla Pagos y devuelve id_pago
 * ───────────────────────────────────────────────────────────────────────────
 */
app.post('/api/registrar-pago', (req, res) => {
  const { id_estancia, metodo_pago, monto_pagado } = req.body;
  if (!id_estancia || !metodo_pago || monto_pagado == null) {
    return res.status(400).json({ error: 'Datos incompletos para registrar el pago' });
  }
  const sql = `
    INSERT INTO Pagos (id_estancia, metodo_pago, monto_pagado, fecha_pago)
    VALUES (?, ?, ?, NOW())
  `;
  conexion.query(sql, [id_estancia, metodo_pago, monto_pagado], (err, result) => {
    if (err) {
      console.error('❌ Error al insertar pago:', err);
      return res.status(500).json({ error: 'Error al registrar el pago en la BD' });
    }
    res.json({ mensaje: 'Pago registrado correctamente', id_pago: result.insertId });
  });
});


/**
 * ───────────────────────────────────────────────────────────────────────────
 *  NUEVA RUTA: /api/finalizar-estancia-limpieza/:id_estancia
 *  - Método: PUT
 *  - Recibe en params “id_estancia”
 *  - Actualiza:
 *      * Estancias.fecha_salida = NOW(), estado = 'finalizada'
 *    Luego:
 *      * Inserta en tabla Limpieza (id_cabina, realizada_por, fecha, observaciones)
 *      * Actualiza Cabinas.estado = 'limpieza', fecha_estado = NOW()
 *  - Devuelve { mensaje: 'Estancia finalizada. Cabina en limpieza.' }
 * ───────────────────────────────────────────────────────────────────────────
 */
app.put('/api/finalizar-estancia-limpieza/:id_estancia', (req, res) => {
  const idEst = +req.params.id_estancia;
  if (!idEst) return res.status(400).json({ error: 'ID requerido' });

  // 1) Finalizar estancia y sacar id_cabina
  conexion.query(
    `UPDATE Estancias
       SET fecha_salida = NOW(), estado = 'finalizada'
     WHERE id_estancia = ?`,
    [idEst],
    err => {
      if (err) return res.status(500).json({ error: err.message });

      // 2) Leer id_cabina + su numero desde la BD
      conexion.query(
        `SELECT e.id_cabina, c.numero AS numero_cabina
           FROM Estancias e
           JOIN Cabinas c ON e.id_cabina = c.id_cabina
          WHERE e.id_estancia = ?`,
        [idEst],
        (err2, rows) => {
          if (err2 || !rows.length) return res.status(500).json({ error: 'Error leyendo cabina' });
          const { id_cabina: idCab, numero_cabina: numCab } = rows[0];

          // 3) Insertar registro en Limpieza y marcar la cabina
          const userId = 1;
          conexion.query(
            `INSERT INTO Limpieza (id_cabina, realizada_por, fecha, observaciones)
             VALUES (?, ?, NOW(), 'Enviado a limpieza desde frontend')`,
            [idCab, userId],
            err3 => {
              if (err3) return res.status(500).json({ error: err3.message });

              conexion.query(
                `UPDATE Cabinas
                    SET estado = 'limpieza', fecha_estado = NOW()
                  WHERE id_cabina = ?`,
                [idCab],
                err4 => {
                  if (err4) return res.status(500).json({ error: err4.message });

                  // 4) Enviar email
                  transporter.sendMail({
                    from: process.env.SMTP_USER,
                    to: process.env.EMAIL_TO,
                    subject: `Cabina ${numCab} enviada a limpieza`,
                    text:    `La cabina ${numCab} fue *enviada* a limpieza el ${new Date().toLocaleString()}.`,
                  }, mailErr => {
                    if (mailErr) console.error(mailErr);
                    return res.json({ mensaje: 'Cabina enviada a limpieza y correo disparado.' });
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});




/**
 * ───────────────────────────────────────────────────────────────────────────
 *  NUEVA RUTA: /api/finalizar-estancia-mantenimiento/:id_estancia
 *  - Método: PUT
 *  - Recibe en params “id_estancia”
 *  - Actualiza:
 *      * Estancias.fecha_salida = NOW(), estado = 'finalizada'
 *    Luego:
 *      * Inserta en tabla Mantenimiento (id_cabina, descripcion, fecha, estado='pendiente', registrado_por)
 *      * Actualiza Cabinas.estado = 'mantenimiento', fecha_estado = NOW()
 *  - Devuelve { mensaje: 'Estancia finalizada. Cabina en mantenimiento.' }
 * ───────────────────────────────────────────────────────────────────────────
 */
app.put('/api/finalizar-estancia-mantenimiento/:id_estancia', (req, res) => {
  const id_estancia = parseInt(req.params.id_estancia, 10);
  if (!id_estancia) {
    return res.status(400).json({ error: 'ID de estancia requerido' });
  }

  // 1) Obtener el id_cabina de esa estancia
  const sqlGetCabina = `SELECT id_cabina FROM Estancias WHERE id_estancia = ? LIMIT 1`;
  conexion.query(sqlGetCabina, [id_estancia], (err, rows) => {
    if (err) {
      console.error('❌ Error al buscar cabina de la estancia:', err);
      return res.status(500).json({ error: 'Error en la BD' });
    }
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Estancia no encontrada' });
    }
    const idCabina = rows[0].id_cabina;

    // 2) Actualizar la estancia: fecha_salida = NOW(), estado = 'finalizada'
    const sqlFinalizar = `
      UPDATE Estancias
      SET fecha_salida = NOW(), estado = 'finalizada'
      WHERE id_estancia = ?
    `;
    conexion.query(sqlFinalizar, [id_estancia], (err2) => {
      if (err2) {
        console.error('❌ Error al finalizar estancia:', err2);
        return res.status(500).json({ error: 'Error al finalizar estancia' });
      }

      // 3) Insertar un registro en Mantenimiento
      const idUsuario = 1; // Podrías reemplazar por el usuario logueado
      const sqlInsertarMant = `
        INSERT INTO Mantenimiento (id_cabina, descripcion, fecha, estado, registrado_por)
        VALUES (?, 'Enviado desde el frontend al finalizar estancia', NOW(), 'pendiente', ?)
      `;
      conexion.query(sqlInsertarMant, [idCabina, idUsuario], (err3, resultMant) => {
        if (err3) {
          console.error('❌ Error al insertar registro de mantenimiento:', err3);
          return res.status(500).json({ error: 'Error al registrar mantenimiento' });
        }

        // 4) Actualizar la cabina a "mantenimiento"
        const sqlCabinaMant = `
          UPDATE Cabinas
          SET estado = 'mantenimiento', fecha_estado = NOW()
          WHERE id_cabina = ?
        `;
        conexion.query(sqlCabinaMant, [idCabina], (err4) => {
          if (err4) {
            console.error('❌ Error al actualizar cabina a mantenimiento:', err4);
            return res.status(500).json({ error: 'Error al actualizar cabina' });
          }
          res.json({ mensaje: 'Estancia finalizada. Cabina marcada para mantenimiento.' });
        });
      });
    });
  });
});


/**
 * ───────────────────────────────────────────────────────────────────────────
 *  RUTA: /api/ampliar-estancia/:id_estancia
 *  - Método: PUT
 *  - Recibe en params “id_estancia” y en body { horas_extra }
 *  - Suma `horas_extra` a la columna `duracion` de Estancias
 *  - Devuelve { mensaje: 'Estancia ampliada', nueva_duracion: <valor> }
 * ───────────────────────────────────────────────────────────────────────────
 */
app.put('/api/ampliar-estancia/:id_estancia', (req, res) => {
  const id_estancia = parseInt(req.params.id_estancia, 10);
  const { horas_extra } = req.body;

  if (!id_estancia || !horas_extra || isNaN(horas_extra) || horas_extra <= 0) {
    return res.status(400).json({ error: 'Datos inválidos para ampliar estancia' });
  }

  // 1) Obtener la duración actual
  const sqlGetDuracion = `SELECT duracion FROM Estancias WHERE id_estancia = ? LIMIT 1`;
  conexion.query(sqlGetDuracion, [id_estancia], (err, rows) => {
    if (err) {
      console.error('❌ Error al buscar duración de estancia:', err);
      return res.status(500).json({ error: 'Error en la BD' });
    }
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Estancia no encontrada' });
    }

    const duracionActual = rows[0].duracion || 0;
    const nuevaDuracion = duracionActual + parseInt(horas_extra, 10);

    // 2) Actualizar la duración
    const sqlUpdateDuracion = `
      UPDATE Estancias
      SET duracion = ?
      WHERE id_estancia = ?
    `;
    conexion.query(sqlUpdateDuracion, [nuevaDuracion, id_estancia], (err2) => {
      if (err2) {
        console.error('❌ Error al ampliar estancia:', err2);
        return res.status(500).json({ error: 'Error al ampliar estancia' });
      }
      res.json({ mensaje: 'Estancia ampliada exitosamente', nueva_duracion: nuevaDuracion });
    });
  });
});


/**
 * ───────────────────────────────────────────────────────────────────────────
 *  RUTA: /api/estancias-limpieza
 *  - Devuelve la lista de cabinas cuyo estado = 'limpieza' junto con la fecha de inicio
 *    de la limpieza (tabla Limpieza).
 * ───────────────────────────────────────────────────────────────────────────
 */
app.get('/api/estancias-limpieza', (req, res) => {
  const sql = `
    SELECT
      l.id_limpieza,
      l.id_cabina,
      c.numero         AS numero_cabina,
      l.fecha          AS fecha_inicio_limpieza,
      l.realizada_por
    FROM Limpieza l
    JOIN Cabinas c ON l.id_cabina = c.id_cabina
    WHERE c.estado = 'limpieza'
      AND l.fecha_finalizacion IS NULL
    ORDER BY l.fecha DESC
  `;
  conexion.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error al obtener limpieza' });
    res.json(rows);
  });
});



/**
 * ───────────────────────────────────────────────────────────────────────────
 *  RUTA: /api/registrar-limpieza
 *  - Método: POST
 *  - Recibe { id_cabina, realizada_por, observaciones } en el body
 *  - Inserta en tabla Limpieza y marca Cabinas.estado = 'limpieza'
 * ───────────────────────────────────────────────────────────────────────────
 */
app.post('/api/registrar-limpieza', (req, res) => {
  const { id_cabina, realizada_por, observaciones } = req.body;
  if (!id_cabina || !realizada_por) {
    return res.status(400).json({ error: 'Datos incompletos para registrar limpieza' });
  }
  const sqlInsertar = `
    INSERT INTO Limpieza (id_cabina, realizada_por, fecha, observaciones)
    VALUES (?, ?, NOW(), ?)
  `;
  conexion.query(sqlInsertar, [id_cabina, realizada_por, observaciones || ''], (err, result) => {
    if (err) {
      console.error('❌ Error al insertar limpieza:', err);
      return res.status(500).json({ error: 'Error al registrar limpieza' });
    }
    // Marcar la cabina en tabla Cabinas → estado = 'limpieza'
    const sqlCabina = `UPDATE Cabinas SET estado = 'limpieza', fecha_estado = NOW() WHERE id_cabina = ?`;
    conexion.query(sqlCabina, [id_cabina], (err2) => {
      if (err2) {
        console.error('❌ Error al actualizar estado de cabina a limpieza:', err2);
        return res.status(500).json({ error: 'Error al actualizar cabina' });
      }
      res.json({ mensaje: 'Limpieza registrada', id_limpieza: result.insertId });
    });
  });
});


/**
 * ───────────────────────────────────────────────────────────────────────────
 *  RUTA: /api/finalizar-limpieza
 *  - Método: POST
 *  - Recibe { id_limpieza, usuario_id, observaciones } en el body
 *  - Actualiza:
 *      * Cabinas.estado = 'disponible'
 *      * Elimina el registro de Limpieza
 *  - Devuelve { mensaje: 'Limpieza finalizada. Cabina disponible.' }
 * ───────────────────────────────────────────────────────────────────────────
 */
app.post('/api/finalizar-limpieza', (req, res) => {
  const { id_limpieza, limpiador } = req.body;
  if (!id_limpieza || !limpiador?.trim()) {
    return res.status(400).json({ error: 'ID y nombre del responsable requeridos' });
  }

  // 1) Obtener id_cabina + numero
  conexion.query(
    `SELECT l.id_cabina, c.numero AS numero_cabina
       FROM Limpieza l
       JOIN Cabinas c ON l.id_cabina = c.id_cabina
      WHERE l.id_limpieza = ?`,
    [id_limpieza],
    (err, rows) => {
      if (err || !rows.length) return res.status(404).json({ error: 'Registro no encontrado' });
      const { id_cabina: idCab, numero_cabina } = rows[0];

      // 2) Eliminar el registro de limpieza
conexion.query(
  `DELETE FROM Limpieza WHERE id_limpieza = ?`,
  [id_limpieza],
  err2 => {
    if (err2) return res.status(500).json({ error: err2.message });

    // 3) Marcar cabina disponible
    conexion.query(
      `UPDATE Cabinas
         SET estado = 'disponible', fecha_estado = NOW()
       WHERE id_cabina = ?`,
      [idCab],
      err3 => {
        if (err3) return res.status(500).json({ error: err3.message });

        // 4) Disparar el correo
        transporter.sendMail({
          from: process.env.SMTP_USER,
          to:   process.env.EMAIL_TO,
          subject: `Cabina ${numero_cabina} limpiada`,
          text:    `La cabina ${numero_cabina} fue limpiada por ${limpiador} el ${new Date().toLocaleString()}.`
        }, mailErr => {
          if (mailErr) console.error(mailErr);
          return res.json({ mensaje: 'Limpieza finalizada y correo enviado.' });
        });
            }
          );
        }
      );
    }
  );
});


/**
 * ───────────────────────────────────────────────────────────────────────────
 *  RUTA: /api/mantenimiento-pendiente
 *  - Devuelve todas las cabinas con estado = 'mantenimiento'
 *    junto con el registro de Mantenimiento (fecha, descripción, quien lo solicitó).
 * ───────────────────────────────────────────────────────────────────────────
 */
app.get('/api/mantenimiento-pendiente', (req, res) => {
  const sql = `
    SELECT
      m.id_mantenimiento,
      m.id_cabina,
      c.numero AS numero_cabina,
      m.descripcion,
      m.fecha AS fecha_inicio_mantenimiento,
      m.estado AS estado_mantenimiento,
      m.registrado_por
    FROM Mantenimiento m
    JOIN Cabinas c ON m.id_cabina = c.id_cabina
    WHERE c.estado = 'mantenimiento'
    ORDER BY m.fecha DESC
  `;
  conexion.query(sql, (err, rows) => {
    if (err) {
      console.error('❌ Error al consultar mantenimiento pendiente:', err);
      return res.status(500).json({ error: 'Error en la BD' });
    }
    res.json(rows);
  });
});


/**
 * ───────────────────────────────────────────────────────────────────────────
 *  RUTA: /api/registrar-mantenimiento
 *  - Método: POST
 *  - Recibe { id_cabina, descripcion, registrado_por } en el body
 *  - Inserta en tabla Mantenimiento y marca Cabinas.estado = 'mantenimiento'
 * ───────────────────────────────────────────────────────────────────────────
 */
app.post('/api/registrar-mantenimiento', (req, res) => {
  const { id_cabina, descripcion, registrado_por } = req.body;
  if (!id_cabina || !descripcion || !registrado_por) {
    return res.status(400).json({ error: 'Datos incompletos para registrar mantenimiento' });
  }
  const sqlInsertar = `
    INSERT INTO Mantenimiento (id_cabina, descripcion, fecha, estado, registrado_por)
    VALUES (?, ?, NOW(), 'pendiente', ?)
  `;
  conexion.query(sqlInsertar, [id_cabina, descripcion, registrado_por], (err, result) => {
    if (err) {
      console.error('❌ Error al insertar mantenimiento:', err);
      return res.status(500).json({ error: 'Error al registrar mantenimiento' });
    }
    // Marcar la cabina en Cabinas → estado = 'mantenimiento'
    const sqlCabina = `UPDATE Cabinas SET estado = 'mantenimiento', fecha_estado = NOW() WHERE id_cabina = ?`;
    conexion.query(sqlCabina, [id_cabina], (err2) => {
      if (err2) {
        console.error('❌ Error al actualizar estado de cabina a mantenimiento:', err2);
        return res.status(500).json({ error: 'Error al actualizar cabina' });
      }
      res.json({ mensaje: 'Mantenimiento registrado', id_mantenimiento: result.insertId });
    });
  });
});


/**
 * ───────────────────────────────────────────────────────────────────────────
 *  RUTA: /api/finalizar-mantenimiento
 *  - Método: POST
 *  - Recibe { id_mantenimiento, usuario_id } en el body
 *  - Actualiza:
 *      * Mantenimiento.estado = 'completado'
 *      * Cabinas.estado      = 'disponible'
 *      * Actualiza fecha_estado en cabina
 *  - Devuelve { mensaje: 'Mantenimiento finalizado. Cabina disponible.' }
 * ───────────────────────────────────────────────────────────────────────────
 */
app.post('/api/finalizar-mantenimiento', (req, res) => {
  const { id_mantenimiento, usuario_id } = req.body;
  if (!id_mantenimiento) {
    return res.status(400).json({ error: 'ID de mantenimiento requerido' });
  }

  // 1) Obtener id_cabina
  const sqlGetCabina = `SELECT id_cabina FROM Mantenimiento WHERE id_mantenimiento = ? LIMIT 1`;
  conexion.query(sqlGetCabina, [id_mantenimiento], (err, rows) => {
    if (err) {
      console.error('❌ Error al buscar mantenimiento:', err);
      return res.status(500).json({ error: 'Error en la BD' });
    }
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Registro de mantenimiento no encontrado' });
    }
    const idCabina = rows[0].id_cabina;

    // 2) Marcar mantenimiento como completado
    const sqlFinalizarMant = `
      UPDATE Mantenimiento
      SET estado = 'completado'
      WHERE id_mantenimiento = ?
    `;
    conexion.query(sqlFinalizarMant, [id_mantenimiento], (err2) => {
      if (err2) {
        console.error('❌ Error al finalizar mantenimiento:', err2);
        return res.status(500).json({ error: 'Error al finalizar mantenimiento' });
      }

      // 3) Marcar la cabina como “disponible” y actualizar fecha_estado
      const sqlCabinaDisp = `UPDATE Cabinas SET estado = 'disponible', fecha_estado = NOW() WHERE id_cabina = ?`;
      conexion.query(sqlCabinaDisp, [idCabina], (err3) => {
        if (err3) {
          console.error('❌ Error al actualizar cabina a disponible:', err3);
          return res.status(500).json({ error: 'Error al actualizar cabina' });
        }
        res.json({ mensaje: 'Mantenimiento finalizado. Cabina disponible.' });
      });
    });
  });
});


/**
 * ───────────────────────────────────────────────────────────────────────────
 *  INICIAR SERVIDOR
 * ───────────────────────────────────────────────────────────────────────────
 */
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
  });
}

module.exports = app;