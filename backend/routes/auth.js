const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../database/db');
const router  = express.Router();

/* ── helpers ── */
function makeToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}
function safeJSON(str, fb = []) {
  try { return str ? JSON.parse(str) : fb; } catch { return fb; }
}
function formatChild(r) {
  return {
    id: r.id, name: r.name, gender: r.gender, dob: r.dob,
    age: r.age, weight: r.weight_kg, height: r.height_cm,
    blood: r.blood_group, bmi: r.bmi, avatar: r.avatar,
    mood: r.mood, streak: r.streak_days, healthScore: r.health_score,
    location: r.location, doctor: r.doctor_name, school: r.school,
  };
}

/* ── POST /api/auth/register ── */
router.post('/register', async (req, res) => {
  const { email, password, phone = '', location = '' } = req.body;
  if (!email?.includes('@'))
    return res.status(400).json({ error: 'Valid email required.' });
  if (!password || password.length < 6)
    return res.status(400).json({ error: 'Password must be 6+ characters.' });

  try {
    const [ex] = await db.query('SELECT id FROM users WHERE email=?', [email.toLowerCase()]);
    if (ex.length) return res.status(409).json({ error: 'Email already registered.' });

    const hash = await bcrypt.hash(password, 12);
    const [r] = await db.query(
      'INSERT INTO users (email,password_hash,phone,location) VALUES (?,?,?,?)',
      [email.toLowerCase(), hash, phone, location]
    );
    // Create empty parent_profile row
    await db.query('INSERT INTO parent_profiles (user_id) VALUES (?)', [r.insertId]);

    res.status(201).json({
      message: 'Account created!',
      token: makeToken(r.insertId),
      userId: r.insertId,
      email: email.toLowerCase(),
      children: [],
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ── POST /api/auth/login ── */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required.' });

  try {
    const [rows] = await db.query(
      'SELECT id,email,password_hash,phone,location FROM users WHERE email=?',
      [email.toLowerCase()]
    );
    if (!rows.length) return res.status(401).json({ error: 'No account with this email.' });

    const user = rows[0];
    if (!(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ error: 'Incorrect password.' });

    // Load children
    const [children] = await db.query(
      'SELECT * FROM children WHERE user_id=? ORDER BY id', [user.id]
    );
    // Load parent profile
    const [pp] = await db.query(
      'SELECT * FROM parent_profiles WHERE user_id=?', [user.id]
    );

    res.json({
      message: 'Logged in!',
      token: makeToken(user.id),
      userId: user.id,
      email: user.email,
      phone: user.phone,
      location: user.location,
      parentProfile: pp[0] || null,
      children: children.map(formatChild),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ── GET /api/auth/me  (verify token, return user data) ── */
const authMW = require('../middleware/auth');
router.get('/me', authMW, async (req, res) => {
  try {
    const [users]    = await db.query('SELECT id,email,phone,location FROM users WHERE id=?', [req.userId]);
    const [children] = await db.query('SELECT * FROM children WHERE user_id=? ORDER BY id', [req.userId]);
    const [pp]       = await db.query('SELECT * FROM parent_profiles WHERE user_id=?', [req.userId]);
    if (!users.length) return res.status(404).json({ error: 'User not found.' });
    res.json({
      ...users[0],
      parentProfile: pp[0] || null,
      children: children.map(formatChild),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
