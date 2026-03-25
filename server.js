// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();
 
const { verifyToken } = require('./middleware/auth');
const einheitenRoutes = require('./routes/einheiten');
const checkinRoutes = require('./routes/checkin');
const anwesenheitRoutes = require('./routes/anwesenheit');
const kalenderRoutes = require('./routes/kalender');
const mockIdpRoutes = require('./services/mock-idp');
 

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());

// Geschützte API-Routen
app.use('/api/mock-auth', mockIdpRoutes);  
app.use('/api/einheiten', verifyToken, einheitenRoutes);
app.use('/api/checkin', verifyToken, checkinRoutes);
app.use('/api/anwesenheit', verifyToken, anwesenheitRoutes);
app.use('/api/kalender', verifyToken, kalenderRoutes);
 
// Health-Check für Railway
app.get('/health', (_, res) => res.json({ status: 'ok' }));
 
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API läuft auf Port ${PORT}`));
