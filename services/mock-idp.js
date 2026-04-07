// services/mock-idp.js
// Fallback-Identity-Provider für die Entwicklungs- und Pilotphase.
// Wird verwendet wenn die DHGE-IT noch keine OAuth2/OIDC-Redirect-URI
// für die Anwendung registriert hat.
//
// WICHTIG: Diese Datei darf NUR in Entwicklung/Staging verwendet werden.
// In Produktion mit echtem DHGE-IdP muss dieser Endpunkt deaktiviert werden.

const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Vordefinierte Testnutzer — repräsentieren die drei Rollen des Systems
const TESTNUTZER = [
  {
    sub: 'dozent-001',          // Entspricht der LDAP-UID im echten System
    given_name: 'Thomas',
    family_name: 'Müller',
    email: 'thomas.mueller@dhge.de',
    role: 'dozent',
    kurs: null,
    matrikelnr: null
  },
  {
    sub: 'student-001',
    given_name: 'Anna',
    family_name: 'Schmidt',
    email: 'anna.schmidt@dhge.de',
    role: 'studierender',
    kurs: 'MD23',
    matrikelnr: '2023001'
  },
  {
    sub: 'verwaltung-001',
    given_name: 'Sandra',
    family_name: 'Weber',
    email: 'sandra.weber@dhge.de',
    role: 'verwaltung',
    kurs: null,
    matrikelnr: null
  }
];

// POST /api/mock-auth/token
// Body: { rolle: 'dozent' | 'studierender' | 'verwaltung' }
// Gibt einen signierten JWT zurück, der vom echten auth-Middleware
// akzeptiert wird — identisches Format wie ein echter OIDC-Token.
router.post('/token', (req, res) => {
  const { rolle } = req.body;

  // Nur in Entwicklungsumgebung erlaubt
  //if (process.env.NODE_ENV === 'production') {
  //  return res.status(403).json({
  //    error: 'Mock-IdP ist in der Produktionsumgebung deaktiviert'
  //  });
  //}

  const nutzer = TESTNUTZER.find(n => n.role === rolle);
  if (!nutzer) {
    return res.status(400).json({
      error: 'Ungültige Rolle. Erlaubt: dozent, studierender, verwaltung'
    });
  }

  const token = jwt.sign(
    nutzer,
    process.env.JWT_SECRET,
    {
      expiresIn: '8h',    // Ausreichend für einen Arbeitstag
      issuer: 'dhge-mock-idp',
      audience: 'dhge-praesenz-api'
    }
  );

  res.json({
    access_token: token,
    token_type: 'Bearer',
    expires_in: 28800,
    nutzer: {
      name: `${nutzer.given_name} ${nutzer.family_name}`,
      rolle: nutzer.role
    }
  });
});

// GET /api/mock-auth/nutzer
// Listet alle verfügbaren Testnutzer auf (nur zur Übersicht)
router.get('/nutzer', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Nicht verfügbar' });
  }

  res.json(TESTNUTZER.map(n => ({
    rolle: n.role,
    name: `${n.given_name} ${n.family_name}`,
    email: n.email,
    kurs: n.kurs,
    matrikelnr: n.matrikelnr
  })));
});

module.exports = router;