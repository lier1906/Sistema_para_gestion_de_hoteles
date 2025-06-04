const request = require('supertest');
const app = require('../index'); // asegúrate que index.js exporte `app`

describe('API de Usuarios', () => {
  test('GET /api/usuarios → responde con lista de usuarios', async () => {
    const response = await request(app).get('/api/usuarios');
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});
