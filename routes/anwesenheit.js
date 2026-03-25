// routes/anwesenheit.js
const express = require('express');
const pool = require('../db');
const { requireRole } = require('../middleware/roles');
const router = express.Router();

// GET /api/anwesenheit/einheit/:id
// Dozent oder Verwaltung ruft die Anwesenheitsliste einer bestimmten Einheit ab
router.get('/einheit/:id', async (req, res) => {
  if (!['dozent', 'verwaltung'].includes(req.user.rolle)) {
    return res.status(403).json({ error: 'Keine Berechtigung' });
  }

  try {
    const result = await pool.query(`
      SELECT
        a.id,
        a.eingecheckt_am,
        n.vorname,
        n.nachname,
        n.matrikelnr,
        n.kurs
      FROM anwesenheit a
      JOIN nutzer n ON a.nutzer_id = n.id
      WHERE a.einheit_id = $1
      ORDER BY a.eingecheckt_am ASC
    `, [req.params.id]);

    res.json({
      anzahl: result.rows.length,
      eintraege: result.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// GET /api/anwesenheit/meine
// Studierender sieht seine eigene Anwesenheitshistorie
router.get('/meine', requireRole('studierender'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        a.eingecheckt_am,
        e.modul,
        e.kurs,
        e.datum,
        e.beginn,
        e.ende
      FROM anwesenheit a
      JOIN einheiten e ON a.einheit_id = e.id
      WHERE a.nutzer_id = $1
      ORDER BY e.datum DESC
    `, [req.user.id]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// GET /api/anwesenheit/kurs/:kurs
// Verwaltung: Anwesenheitsübersicht eines ganzen Kurses
router.get('/kurs/:kurs', requireRole('verwaltung'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        n.vorname,
        n.nachname,
        n.matrikelnr,
        COUNT(a.id) AS anwesenheiten_gesamt,
        COUNT(DISTINCT e.modul) AS module_belegt
      FROM nutzer n
      LEFT JOIN anwesenheit a ON a.nutzer_id = n.id
      LEFT JOIN einheiten e ON a.einheit_id = e.id
      WHERE n.kurs = $1 AND n.rolle = 'studierender'
      GROUP BY n.id, n.vorname, n.nachname, n.matrikelnr
      ORDER BY n.nachname ASC
    `, [req.params.kurs]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

module.exports = router;