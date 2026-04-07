// routes/kalender.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const ical = require('node-ical');
const { requireRole } = require('../middleware/roles');

// verifyToken wird bereits in server.js auf alle /api/kalender Routen angewendet
// Hier nur noch requireRole für die Rollenprüfung

// PUT /api/kalender/ics-url
// Dozent speichert seine persönliche ICS-URL
router.put('/ics-url', requireRole('dozent'), async (req, res) => {
  const { ics_url } = req.body;

  if (!ics_url || !ics_url.startsWith('http')) {
    return res.status(400).json({ error: 'Ungültige URL' });
  }

  try {
    await db.query(
      'UPDATE nutzer SET ics_url = $1 WHERE id = $2',
      [ics_url, req.user.id]
    );
    res.json({ message: 'ICS-URL erfolgreich gespeichert' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Datenbankfehler' });
  }
});

// POST /api/kalender/import
// Dozent löst den Kalenderimport manuell aus
router.post('/import', requireRole('dozent'), async (req, res) => {
  try {
    const result = await db.query(
      'SELECT ics_url FROM nutzer WHERE id = $1',
      [req.user.id]
    );

    const ics_url = result.rows[0]?.ics_url;
    if (!ics_url) {
      return res.status(400).json({ error: 'Keine ICS-URL hinterlegt' });
    }

    const events = await ical.async.fromURL(ics_url);
    res.json({ message: 'Import erfolgreich', anzahl: Object.keys(events).length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Import fehlgeschlagen: ' + err.message });
  }
});

module.exports = router;