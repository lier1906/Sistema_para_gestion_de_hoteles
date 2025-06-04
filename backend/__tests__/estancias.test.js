const request = require('supertest');
const app = require('../index');

describe('API de Estancias', () => {
  let id_estancia_creada = null;

  test('POST /api/asignar-cabina → asigna una estancia nueva', async () => {
    const nuevaEstancia = {
      placa: 'TEST123',
      personas: '2',
      descuento: '0',
      cabina: '101',
      tipo: 'SENCILLA',
      duracion: 2,
      precio: 8000
    };

    const res = await request(app)
      .post('/api/asignar-cabina')
      .send(nuevaEstancia);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('id_estancia');
    id_estancia_creada = res.body.id_estancia;
  });

  test('PUT /api/finalizar-estancia-limpieza/:id_estancia → finaliza la estancia', async () => {
    const res = await request(app).put(`/api/finalizar-estancia-limpieza/${id_estancia_creada}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('mensaje');
    expect(res.body.mensaje).toMatch(/Cabina.*limpieza/i);
  });
});
