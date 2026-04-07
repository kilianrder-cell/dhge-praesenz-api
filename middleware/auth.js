// middleware/auth.js
const jwt = require('jsonwebtoken');
const pool = require('../db');

async function verifyToken(req, res, next) {
  // Authorization-Header auslesen: Format ist "Bearer <token>"
  // Optional Chaining (?.) verhindert einen Fehler wenn der Header komplett fehlt
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Kein Token' });

  try {
    // Token verifizieren – derselbe JWT_SECRET wie im Mock-IdP
    // Schlägt fehl wenn der Token abgelaufen, manipuliert oder ungültig ist
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
  issuer: 'dhge-mock-idp',
  audience: 'dhge-praesenz-api'
});

    // Just-in-Time Provisioning:
    // Beim allerersten Login wird der Nutzer automatisch angelegt.
    // Bei allen weiteren Logins greift ON CONFLICT und es passiert nichts.
    const result = await pool.query(`
      INSERT INTO nutzer (ldap_uid, vorname, nachname, email, rolle, kurs, matrikelnr)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (ldap_uid) DO NOTHING
      RETURNING id, rolle
    `, [
      decoded.sub,            // Eindeutige Nutzer-ID aus dem Token (LDAP-UID)
      decoded.given_name,     // Vorname
      decoded.family_name,    // Nachname
      decoded.email,
      decoded.role,           // 'dozent', 'studierender', 'verwaltung'
      decoded.kurs || null,   // Nur bei Studierenden gefüllt, sonst NULL
      decoded.matrikelnr || null
    ]);

    // Falls ON CONFLICT gegriffen hat (Nutzer existiert bereits),
    // die bestehende ID und Rolle aus der Datenbank nachladen.
    // RETURNING liefert in diesem Fall keine Zeile zurück.
    if (result.rows.length === 0) {
      const existing = await pool.query(
        'SELECT id, rolle FROM nutzer WHERE ldap_uid = $1',
        [decoded.sub]
      );
      req.user = {
        id: existing.rows[0].id,
        rolle: existing.rows[0].rolle,
        ...decoded  // Alle weiteren Token-Claims (sub, email, etc.) ebenfalls verfügbar machen
      };
    } else {
      // Neu angelegter Nutzer: ID und Rolle direkt aus dem INSERT-Ergebnis
      req.user = {
        id: result.rows[0].id,
        rolle: result.rows[0].rolle,
        ...decoded
      };
    }

    // Nächste Middleware oder Route-Handler aufrufen
    next();
  } catch (err) {
    // jwt.verify wirft eine Exception bei ungültigem oder abgelaufenem Token
    return res.status(401).json({ error: 'Ungültiger Token' });
  }
}

// Export – ohne diese Zeile kann keine andere Datei verifyToken importieren
module.exports = { verifyToken };