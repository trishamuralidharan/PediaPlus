require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const app     = express();
const PORT    = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/children',  require('./routes/children'));
app.use('/api/parent',    require('./routes/parent'));
app.use('/api/meals',     require('./routes/meals'));
app.use('/api/tracking',  require('./routes/tracking'));

// Health check
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', time: new Date().toISOString() }));

// 404
app.use((_req, res) => res.status(404).json({ error: 'Endpoint not found.' }));

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('🚀  PediaPlus API  →  http://localhost:' + PORT);
  console.log('');
  console.log('  Auth       POST /api/auth/register');
  console.log('             POST /api/auth/login');
  console.log('             GET  /api/auth/me');
  console.log('  Parent     GET/PUT /api/parent');
  console.log('  Children   GET/POST/PUT/DELETE /api/children/:id');
  console.log('  Meals      GET/POST/DELETE /api/meals/:childId');
  console.log('  Tracking   /api/tracking/mood|checklist|growth|vaccines|appointments|milestones|points');
  console.log('');
});
