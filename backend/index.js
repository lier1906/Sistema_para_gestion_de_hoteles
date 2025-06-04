  // ==============================
  // backend/index.js
  // ==============================
  const express       = require('express');
  const cors          = require('cors');
  const mysql         = require('mysql2');
  require('dotenv').config();

  const app     = express();
  const PORT    = process.env.PORT || 5000;

  app.use(cors());
  app.use(express.json());

  /** ──────────────────────────────────────────────────────────────────────────
   *  📦 Conexión a la base de datos MySQL
   *  - Asegúrate de tener el .env configurado con DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
   *  ────────────────────────────────────────────────────────────────────────── */
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
   *  - Ejemplo de respuesta: [ { tipo: 'SENCILLA', cantidad: 4 }, { tipo: 'VIP', cantidad: 3 } ]
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
    const tipo = req.params.tipo.toUpperCase(); // Aseguramos mayúsculas
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
   *        placa,           // string
   *        personas,        // string o número (no lo usamos directamente en BD, pero se guarda en “descuento”)
   *        descuento,       // string (monto de descuento)
   *        cabina,          // número de cabina (ej: '101', '202', etc.)
   *        tipo,            // 'SENCILLA' o 'VIP'
   *        duracion,        // horas (número)
   *        precio           // monto total (decimal, p.ej. 12000)
   *      }
   *  - Genera (o busca) un cliente en tabla Clientes (por placa)
   *  - Inserta un registro en Estancias con estado='activa'
   *  - Marca la cabina como estado='ocupada'
   *  - Devuelve JSON { mensaje: 'Cabina asignada correctamente', id_estancia: <nuevo_id> }
   * ───────────────────────────────────────────────────────────────────────────
   */
  app.post('/api/asignar-cabina', (req, res) => {
    const { placa, personas, descuento, cabina, tipo, duracion, precio } = req.body;

    // Validación básica de campos obligatorios
    if (!placa || !cabina || !tipo || !duracion || !precio) {
      return res.status(400).json({ error: 'Datos incompletos para asignar la cabina' });
    }

    // 1) Buscamos al cliente por placa; si no existe, lo creamos
    const sqlBuscarCliente = `SELECT id_cliente FROM Clientes WHERE placa = ? LIMIT 1`;
    conexion.query(sqlBuscarCliente, [placa], (err, clienteRows) => {
      if (err) {
        console.error('❌ Error al buscar cliente:', err);
        return res.status(500).json({ error: 'Error al buscar cliente' });
      }

      // Función “continuar” luego de obtener id_cliente (ya existente o recién creado)
      const continuarConCliente = (idCliente) => {
        // 2) Buscamos el id_cabina real según el “numero” de cabina
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
          const idUsuario   = 1; // Aquí podrías reemplazar con el usuario “loggeado” en frontend

          // 3) Insertamos la estancia en Estancias
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

              // 4) Marcamos la cabina como “ocupada”
              const sqlMarcarOcupada = `UPDATE Cabinas SET estado = 'ocupada' WHERE id_cabina = ?`;
              conexion.query(sqlMarcarOcupada, [idCabina], (err4) => {
                if (err4) {
                  console.error('❌ Error al actualizar estado de cabina:', err4);
                  return res.status(500).json({ error: 'Error al actualizar cabina' });
                }

                // 5) Devolvemos el id_estancia creado
                return res.json({
                  mensaje: 'Cabina asignada correctamente',
                  id_estancia: nuevoIdEstancia
                });
              });
            }
          );
        });
      };

      // Si existe cliente, continuamos; si no, lo insertamos primero
      if (clienteRows.length > 0) {
        continuarConCliente(clienteRows[0].id_cliente);
      } else {
        // Insertamos nuevo cliente con “placa”
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
   *    junto con datos de cabina, cliente, tiempo transcurrido, botones de acción, etc.
   *
   *  La idea es que el frontend las recorra con .map() para mostrarlas en “Cabinas Ocupadas”.
   *
   *  SELECT básico (puedes expandir campos a tu gusto):
   *    SELECT
   *      e.id_estancia,
   *      c.numero AS numero_cabina,
   *      e.tipo_cabina,
   *      e.duracion,
   *      e.fecha_ingreso,
   *      cl.placa,
   *      u.nombre_completo AS recepcionista
   *    FROM Estancias e
   *    JOIN Cabinas c ON e.id_cabina = c.id_cabina
   *    LEFT JOIN Clientes cl ON e.id_cliente = cl.id_cliente
   *    JOIN Usuarios u ON e.registrada_por = u.id_usuario
   *    WHERE e.estado = 'activa'
   *
   *  (Opcionalmente, podrías calcular “fecha_salida_estimada” sumando la duracion a fecha_ingreso,
   *   pero eso a veces conviene calcularlo en el frontend.)
   * ───────────────────────────────────────────────────────────────────────────
   */
  app.get('/api/estancias-activas', (req, res) => {
    const sql = `
      SELECT
        e.id_estancia,
        c.numero            AS numero_cabina,
        e.tipo_cabina,
        e.duracion,
        e.fecha_ingreso,
        cl.placa            AS placa_cliente
      FROM Estancias e
      JOIN Cabinas c   ON e.id_cabina = c.id_cabina
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
    if (!id_estancia || !metodo_pago || !monto_pagado) {
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
   *  RUTA: /api/finalizar-estancia
   *  - Recibe en body { id_estancia }
   *  - Actualiza Estancias:
   *      * fecha_salida = NOW()
   *      * estado = 'finalizada'
   *    También marca Cabinas como estado = 'limpieza' (para que la sección de Limpieza lo tome).
   *  - Devuelve { mensaje: 'Estancia finalizada' }
   * ───────────────────────────────────────────────────────────────────────────
   */
  app.post('/api/finalizar-estancia', (req, res) => {
    const { id_estancia } = req.body;
    if (!id_estancia) {
      return res.status(400).json({ error: 'ID de estancia requerido' });
    }

    // 1) Buscamos el id_cabina asociado a esa estancia
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

      // 2) Marcamos la estancia como finalizada, guardamos fecha_salida = NOW()
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

        // 3) Marcamos la cabina como “limpieza” para que pase a la sección de limpieza
        const sqlCabinaLimpieza = `UPDATE Cabinas SET estado = 'limpieza' WHERE id_cabina = ?`;
        conexion.query(sqlCabinaLimpieza, [idCabina], (err3) => {
          if (err3) {
            console.error('❌ Error al pasar cabina a limpieza:', err3);
            return res.status(500).json({ error: 'Error al actualizar cabina' });
          }
          res.json({ mensaje: 'Estancia finalizada. Cabina marcada para limpieza.' });
        });
      });
    });
  });

  /**
   * ───────────────────────────────────────────────────────────────────────────
   *  RUTA: /api/estancias-limpieza
   *  - Devuelve la lista de cabinas cuyo estado = 'limpieza' junto con la fecha en que pasó a limpieza.
   *  - Se usa para mostrar en la sección “Limpieza” del frontend.
   *
   *  JOIN entre Cabinas y Estancias, obteniendo la fecha de salida (mínima),
   *  pero en esta implementación simplificamos y guardamos directamente la fecha en tabla Limpieza:
   *
   *  Tabla Limpieza: (id_limpieza, id_cabina, realizada_por, fecha, observaciones)
   *
   *  Devuelve:
   *   {
   *     id_limpieza,
   *     id_cabina,
   *     numero_cabina,
   *     fecha_inicio_limpieza,
   *     realizada_por
   *   }
   * ───────────────────────────────────────────────────────────────────────────
   */
  app.get('/api/estancias-limpieza', (req, res) => {
    const sql = `
      SELECT
        l.id_limpieza,
        l.id_cabina,
        c.numero AS numero_cabina,
        l.fecha AS fecha_inicio_limpieza,
        l.realizada_por
      FROM Limpieza l
      JOIN Cabinas c ON l.id_cabina = c.id_cabina
      WHERE c.estado = 'limpieza'
      ORDER BY l.fecha DESC
    `;
    conexion.query(sql, (err, rows) => {
      if (err) {
        console.error('❌ Error al consultar limpieza:', err);
        return res.status(500).json({ error: 'Error al obtener limpieza' });
      }
      res.json(rows);
    });
  });

  /**
   * ───────────────────────────────────────────────────────────────────────────
   *  RUTA: /api/finalizar-limpieza
   *  - Recibe en body { id_limpieza, usuario_id, observaciones }
   *  - Actualiza:
   *      * Cabinas → estado = 'disponible'
   *      * En tabla Limpieza, puedes opcionalmente actualizar observaciones o eliminar el registro (según tu lógica)
   *  - Devuelve { mensaje: 'Limpieza finalizada y cabina disponible' }
   * ───────────────────────────────────────────────────────────────────────────
   */
  app.post('/api/finalizar-limpieza', (req, res) => {
    const { id_limpieza, usuario_id, observaciones } = req.body;
    if (!id_limpieza) {
      return res.status(400).json({ error: 'ID de limpieza requerido' });
    }

    // 1) Buscamos el id_cabina en registro de Limpieza
    const sqlGetCabina = `SELECT id_cabina FROM Limpieza WHERE id_limpieza = ? LIMIT 1`;
    conexion.query(sqlGetCabina, [id_limpieza], (err, rows) => {
      if (err) {
        console.error('❌ Error al buscar registro de limpieza:', err);
        return res.status(500).json({ error: 'Error en la BD' });
      }
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Registro de limpieza no encontrado' });
      }
      const idCabina = rows[0].id_cabina;

      // 2) Marcamos la cabina como 'disponible'
      const sqlCabinaDisponible = `UPDATE Cabinas SET estado = 'disponible' WHERE id_cabina = ?`;
      conexion.query(sqlCabinaDisponible, [idCabina], (err2) => {
        if (err2) {
          console.error('❌ Error al actualizar cabina a disponible:', err2);
          return res.status(500).json({ error: 'Error al actualizar cabina' });
        }

        // 3) (Opcional) Podrías eliminar o actualizar el registro en Limpieza
        //    Por simplicidad, aquí lo borramos:
        const sqlEliminarLimpieza = `DELETE FROM Limpieza WHERE id_limpieza = ?`;
        conexion.query(sqlEliminarLimpieza, [id_limpieza], (err3) => {
          if (err3) {
            console.error('❌ Error al eliminar registro de limpieza:', err3);
            return res.status(500).json({ error: 'Error al eliminar registro de limpieza' });
          }
          res.json({ mensaje: 'Limpieza finalizada. Cabina disponible.' });
        });
      });
    });
  });

  /**
   * ───────────────────────────────────────────────────────────────────────────
   *  RUTA: /api/registrar-limpieza
   *  - Recibe en body { id_cabina, realizada_por, observaciones }
   *  - Inserta en tabla Limpieza, marcando la cabina con estado='limpieza'
   *  - Devuelve { mensaje: 'Limpieza registrada' }
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
      // Marcamos la cabina en tabla Cabinas → estado = 'limpieza'
      const sqlCabina = `UPDATE Cabinas SET estado = 'limpieza' WHERE id_cabina = ?`;
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
   *  RUTA: /api/mantenimiento-pendiente
   *  - Devuelve todas las cabinas con estado = 'mantenimiento'
   *    junto con el registro de Mantenimiento (fecha, descripción, quien lo solicitó).
   *  - Esto para mostrar en la sección “Mantenimiento” del frontend.
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
   *  - Recibe { id_cabina, descripcion, registrado_por }
   *  - Inserta en tabla Mantenimiento, luego marca Cabinas estado='mantenimiento'
   *  - Devuelve { mensaje: 'Mantenimiento registrado' }
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
      // Marcamos la cabina en tabla Cabinas → estado = 'mantenimiento'
      const sqlCabina = `UPDATE Cabinas SET estado = 'mantenimiento' WHERE id_cabina = ?`;
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
   *  - Recibe { id_mantenimiento, usuario_id (quien finaliza) }
   *  - Actualiza:
   *      * Mantenimiento.estado = 'completado'
   *      * Cabinas.estado = 'disponible'
   *  - Devuelve { mensaje: 'Mantenimiento finalizado, cabina disponible' }
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

      // 2) Marcamos mantenimiento como completado
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

        // 3) Marcamos la cabina como ‘disponible’
        const sqlCabinaDisp = `UPDATE Cabinas SET estado = 'disponible' WHERE id_cabina = ?`;
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
   *  ARRANCA EL SERVIDOR
   * ───────────────────────────────────────────────────────────────────────────
   */
  app.listen(PORT, () => {
    console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
  });
