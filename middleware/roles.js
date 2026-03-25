const requireRole = (rolle) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }
    if (req.user.rolle !== rolle) {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }
    next();
  };
};

module.exports = { requireRole };