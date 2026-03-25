// routes/einheiten.js
const express = require('express');
const pool = require('../db');
const crypto = require('crypto');
const { generateQrPayload } = require('../services/qr-service');
const { requireRole } = require('../middleware/roles');
const router = express.Router();

// GET /api/einheiten
// Dozent: eigene Einheiten abrufen
// Verwaltung: alle Einheiten abrufen
router.get('/', async (req, res) => {
  try {
    let result;
    if (req.user.rolle === 'verwaltung') {
      result = await pool.query(`
        SELECT e.*, n.vorname, n.nachname
        FROM einheiten e
        JOIN nutzer n ON e.dozent_id = n.id
        ORDER BY e.datum DESC
      `);
    } else {
      result = await pool.query(
        'SELECT * FROM einheiten WHERE dozent_id = $1 ORDER BY datum DESC',
        [req.user.id]
      );
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// POST /api/einheiten
// Dozent legt neue Lehreinheit an
router.post('/', requireRole('dozent'), async (req, res) => {
  const { modul, kurs, datum, beginn, ende, raum } = req.body;

  if (!modul || !kurs || !datum || !beginn || !ende) {
    return res.status(400).json({ error: 'Pflichtfelder fehlen' });
  }

  // Einzigartiges QR-Secret für diese Einheit generieren
  // Dieses Secret rotiert nie — nur der daraus abgeleitete Hash rotiert alle 30s
  const qrSecret = crypto.randomBytes(32).toString('hex');

  try {
    const result = await pool.query(`
      INSERT INTO einheiten (dozent_id, modul, kurs, datum, beginn, ende, raum, qr_secret, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'geplant')
      RETURNING id, modul, kurs, datum, beginn, ende, raum, status
    `, [req.user.id, modul, kurs, datum, beginn, ende, raum || null, qrSecret]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// PATCH /api/einheiten/:id/aktivieren
// Dozent startet die Sitzung — ab jetzt können Studierende einchecken
router.patch('/:id/aktivieren', requireRole('dozent'), async (req, res) => {
  try {
    // Sicherstellen, dass nur der eigene Dozent aktivieren kann
    const result = await pool.query(`
      UPDATE einheiten SET status = 'aktiv'
      WHERE id = $1 AND dozent_id = $2
      RETURNING id, status, qr_secret
    `, [req.params.id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Einheit nicht gefunden' });
    }

    // Sofort den ersten QR-Payload zurückgeben
    const { qr_secret, id } = result.rows[0];
    const qrPayload = generateQrPayload(id, qr_secret);

    res.json({ status: 'aktiv', qrPayload });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// PATCH /api/einheiten/:id/beenden
// Dozent beendet die Sitzung — kein weiterer Check-in möglich
router.patch('/:id/beenden', requireRole('dozent'), async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE einheiten SET status = 'beendet'
      WHERE id = $1 AND dozent_id = $2
      RETURNING id, status
    `, [req.params.id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Einheit nicht gefunden' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// GET /api/einheiten/:id/qr
// Aktuellen QR-Payload für eine aktive Sitzung abrufen (rotiert alle 30s serverseitig)
router.get('/:id/qr', requireRole('dozent'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT qr_secret, status FROM einheiten WHERE id = $1 AND dozent_id = $2',
      [req.params.id, req.user.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Einheit nicht gefunden' });
    }
    if (result.rows[0].status !== 'aktiv') {
      return res.status(400).json({ error: 'Sitzung nicht aktiv' });
    }

    const qrPayload = generateQrPayload(req.params.id, result.rows[0].qr_secret);
    res.json({ qrPayload });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

module.exports = router;