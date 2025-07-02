const request = require('supertest');
const app = require('../index');


jest.mock('../mailer', () => ({
  sendMail: jest.fn((mailOptions, callback) => {
    
    if (callback) {
      callback(null, { messageId: 'test-email-sent' });
    }
  })
}));

const transporter = require('../mailer');

describe('Test de Email al Finalizar Limpieza', () => {
  let id_estancia_creada = null;
  let id_limpieza_creada = null;

  beforeEach(() => {
   
    transporter.sendMail.mockClear();
  });

 
  test('Setup: Crear estancia y enviar a limpieza', async () => {
   
    const nuevaEstancia = {
      placa: 'TEST123',
      personas: '2',
      descuento: '0',
      cabina: '101',
      tipo: 'SENCILLA',
      duracion: 2,
      precio: 8000
    };

    const resAsignar = await request(app)
      .post('/api/asignar-cabina')
      .send(nuevaEstancia);

    expect(resAsignar.statusCode).toBe(200);
    id_estancia_creada = resAsignar.body.id_estancia;

    
    const resLimpieza = await request(app)
      .put(`/api/finalizar-estancia-limpieza/${id_estancia_creada}`);

    expect(resLimpieza.statusCode).toBe(200);

  
    const resListaLimpieza = await request(app).get('/api/estancias-limpieza');
    const limpieza = resListaLimpieza.body.find(item => item.numero_cabina === '101');
    expect(limpieza).toBeDefined();
    id_limpieza_creada = limpieza.id_limpieza;

  }, 15000);

  
  test('POST /api/finalizar-limpieza → envía email correctamente', async () => {
    const datosFinalizacion = {
      id_limpieza: id_limpieza_creada,
      limpiador: 'Juan Pérez'
    };

    const res = await request(app)
      .post('/api/finalizar-limpieza')
      .send(datosFinalizacion);
  
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('mensaje');
    expect(res.body.mensaje).toMatch(/limpieza.*finalizada.*correo/i);

    expect(transporter.sendMail).toHaveBeenCalledTimes(1);

    const emailEnviado = transporter.sendMail.mock.calls[0][0];
    expect(emailEnviado).toHaveProperty('from');
    expect(emailEnviado).toHaveProperty('to');
    expect(emailEnviado).toHaveProperty('subject');
    expect(emailEnviado).toHaveProperty('text');

    
    expect(emailEnviado.subject).toContain('limpiada');
    expect(emailEnviado.text).toContain('Juan Pérez');

    console.log('✅ Email enviado correctamente:', emailEnviado.subject);

  }, 10000);

});