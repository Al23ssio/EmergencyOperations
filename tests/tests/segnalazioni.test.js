const request = require('supertest');
const express = require('express');
const segnalazioniRouter = require('../../src/segnalazioni');
const pool = require('../../src/db');

jest.mock('../src/db');

const app = express();
app.use(express.json());
app.use('/segnalazioni', segnalazioniRouter);

describe('Suite di Test: Segnalazioni API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Happy Path', () => {
    it('deve creare una nuova segnalazione correttamente (HTTP 201)', async () => {
      const mockSegnalazione = { id: 1, titolo: 'Guasto semaforo', id_utente: 1, id_area: 1, stato: 'ricevuta' };
      pool.query.mockResolvedValueOnce({ rows: [mockSegnalazione] });

      const response = await request(app)
        .post('/segnalazioni')
        .send({ titolo: 'Guasto semaforo', id_utente: 1, id_area: 1 });

      expect(response.status).toBe(201);
      expect(response.body.titolo).toBe('Guasto semaforo');
    });

    it('deve recuperare la lista delle segnalazioni (HTTP 200)', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }] });

      const response = await request(app).get('/segnalazioni');

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
    });

    it('deve permettere una transizione di stato valida (ricevuta -> valutata)', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1, stato: 'ricevuta' }] });
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1, stato: 'valutata' }] });

      const response = await request(app)
        .patch('/segnalazioni/1/stato')
        .send({ stato: 'valutata' });

      expect(response.status).toBe(200);
      expect(response.body.stato).toBe('valutata');
    });
  });

  describe('Casi Negativi e Edge Cases', () => {
    it('deve fallire se mancano i campi obbligatori nella POST (HTTP 400)', async () => {
      const response = await request(app)
        .post('/segnalazioni')
        .send({ descrizione: 'Manca il titolo' });

      expect(response.status).toBe(400);
      expect(response.body.errore).toBeDefined();
    });

    it('deve bloccare una transizione di stato non consentita (ricevuta -> risolta) (HTTP 400)', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1, stato: 'ricevuta' }] });

      const response = await request(app)
        .patch('/segnalazioni/1/stato')
        .send({ stato: 'risolta' });

      expect(response.status).toBe(400);
      expect(response.body.errore).toMatch(/Transizione non valida/);
    });

    it('deve restituire 404 se la segnalazione non esiste', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app).get('/segnalazioni/999');

      expect(response.status).toBe(404);
    });
  });
});