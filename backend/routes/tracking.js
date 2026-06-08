const express = require('express');
const db      = require('../database/db');
const auth    = require('../middleware/auth');
const router  = express.Router();
router.use(auth);

async function owns(childId, userId) {
  const [r] = await db.query('SELECT id FROM children WHERE id=? AND user_id=?', [childId, userId]);
  return r.length > 0;
}

/* ── MOOD ─────────────────────────────────────────────────── */
router.post('/mood/:childId', async (req, res) => {
  const cid  = parseInt(req.params.childId);
  const { mood_emoji, mood_label, notes='', log_date } = req.body;
  const date = log_date || new Date().toISOString().split('T')[0];
  if (!(await owns(cid, req.userId))) return res.status(403).json({ error: 'Not authorised.' });
  try {
    await db.query(`
      INSERT INTO mood_logs (child_id,log_date,mood_emoji,mood_label,notes)
      VALUES (?,?,?,?,?)
      ON DUPLICATE KEY UPDATE mood_emoji=VALUES(mood_emoji),mood_label=VALUES(mood_label),notes=VALUES(notes)`,
      [cid, date, mood_emoji, mood_label, notes]);
    await db.query('UPDATE children SET mood=? WHERE id=?', [mood_emoji, cid]);
    res.json({ ok: true, mood_emoji, mood_label, log_date: date });
  } catch (e) { res.status(500).json({ error: 'Could not save mood.' }); }
});

router.get('/mood/:childId', async (req, res) => {
  const cid  = parseInt(req.params.childId);
  const date = req.query.date || new Date().toISOString().split('T')[0];
  if (!(await owns(cid, req.userId))) return res.status(403).json({ error: 'Not authorised.' });
  const [r] = await db.query('SELECT * FROM mood_logs WHERE child_id=? AND log_date=?', [cid, date]);
  res.json(r[0] || null);
});

/* ── CHECKLIST ────────────────────────────────────────────── */
router.post('/checklist/:childId', async (req, res) => {
  const cid  = parseInt(req.params.childId);
  const { task_index, task_label='', done, log_date } = req.body;
  const date = log_date || new Date().toISOString().split('T')[0];
  if (!(await owns(cid, req.userId))) return res.status(403).json({ error: 'Not authorised.' });
  try {
    await db.query(`
      INSERT INTO checklist_logs (child_id,log_date,task_index,task_label,done,done_at)
      VALUES (?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE done=VALUES(done),done_at=VALUES(done_at)`,
      [cid, date, task_index, task_label, done?1:0, done?new Date():null]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Could not save checklist.' }); }
});

router.get('/checklist/:childId', async (req, res) => {
  const cid  = parseInt(req.params.childId);
  const date = req.query.date || new Date().toISOString().split('T')[0];
  if (!(await owns(cid, req.userId))) return res.status(403).json({ error: 'Not authorised.' });
  const [rows] = await db.query(
    'SELECT task_index,done FROM checklist_logs WHERE child_id=? AND log_date=? ORDER BY task_index',
    [cid, date]);
  const state = Array(6).fill(false);
  rows.forEach(r => { state[r.task_index] = r.done===1; });
  res.json(state);
});

/* ── GROWTH RECORDS ───────────────────────────────────────── */
router.get('/growth/:childId', async (req, res) => {
  const cid = parseInt(req.params.childId);
  if (!(await owns(cid, req.userId))) return res.status(403).json({ error: 'Not authorised.' });
  const [rows] = await db.query(
    'SELECT * FROM growth_records WHERE child_id=? ORDER BY recorded_on DESC LIMIT 24', [cid]);
  res.json(rows);
});

router.post('/growth/:childId', async (req, res) => {
  const cid = parseInt(req.params.childId);
  if (!(await owns(cid, req.userId))) return res.status(403).json({ error: 'Not authorised.' });
  const { weight_kg, height_cm, head_circ_cm, bmi, notes, recorded_on } = req.body;
  const date = recorded_on || new Date().toISOString().split('T')[0];
  try {
    await db.query(`
      INSERT INTO growth_records (child_id,recorded_on,weight_kg,height_cm,head_circ_cm,bmi,notes)
      VALUES (?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE weight_kg=VALUES(weight_kg),height_cm=VALUES(height_cm),
        head_circ_cm=VALUES(head_circ_cm),bmi=VALUES(bmi),notes=VALUES(notes)`,
      [cid, date, weight_kg, height_cm, head_circ_cm||null, bmi||null, notes||'']);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Could not save growth.' }); }
});

/* ── VACCINES ─────────────────────────────────────────────── */
router.get('/vaccines/:childId', async (req, res) => {
  const cid = parseInt(req.params.childId);
  if (!(await owns(cid, req.userId))) return res.status(403).json({ error: 'Not authorised.' });
  const [rows] = await db.query(
    'SELECT * FROM vaccine_records WHERE child_id=? ORDER BY id', [cid]);
  res.json(rows);
});

router.post('/vaccines/:childId', async (req, res) => {
  const cid = parseInt(req.params.childId);
  if (!(await owns(cid, req.userId))) return res.status(403).json({ error: 'Not authorised.' });
  const v = req.body;
  try {
    const [r] = await db.query(`
      INSERT INTO vaccine_records
        (child_id,vaccine_name,vaccine_full,scheduled_age,status,given_on,given_at,dose_number,batch_number,notes)
      VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [cid, v.vaccine_name, v.vaccine_full||'', v.scheduled_age||'',
       v.status||'future', v.given_on||null, v.given_at||'',
       v.dose_number||1, v.batch_number||'', v.notes||'']);
    res.status(201).json({ id: r.insertId, ...v });
  } catch (e) { res.status(500).json({ error: 'Could not add vaccine.' }); }
});

router.put('/vaccines/:childId/:vaccId', async (req, res) => {
  const cid   = parseInt(req.params.childId);
  const vaccId = parseInt(req.params.vaccId);
  if (!(await owns(cid, req.userId))) return res.status(403).json({ error: 'Not authorised.' });
  const v = req.body;
  try {
    await db.query(`UPDATE vaccine_records SET status=?,given_on=?,given_at=?,notes=? WHERE id=? AND child_id=?`,
      [v.status, v.given_on||null, v.given_at||'', v.notes||'', vaccId, cid]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Could not update.' }); }
});

/* ── APPOINTMENTS ─────────────────────────────────────────── */
router.get('/appointments/:childId', async (req, res) => {
  const cid = parseInt(req.params.childId);
  if (!(await owns(cid, req.userId))) return res.status(403).json({ error: 'Not authorised.' });
  const [rows] = await db.query(
    'SELECT * FROM appointments WHERE child_id=? ORDER BY appointment_date,appointment_time', [cid]);
  res.json(rows);
});

router.post('/appointments/:childId', async (req, res) => {
  const cid = parseInt(req.params.childId);
  if (!(await owns(cid, req.userId))) return res.status(403).json({ error: 'Not authorised.' });
  const a = req.body;
  try {
    const [r] = await db.query(`
      INSERT INTO appointments
        (child_id,user_id,doctor_name,doctor_specialty,clinic_name,appointment_date,appointment_time,status,notes)
      VALUES (?,?,?,?,?,?,?,?,?)`,
      [cid, req.userId, a.doctor_name||'', a.doctor_specialty||'',
       a.clinic_name||'', a.appointment_date||null, a.appointment_time||null,
       a.status||'upcoming', a.notes||'']);
    res.status(201).json({ id: r.insertId, ...a });
  } catch (e) { res.status(500).json({ error: 'Could not add appointment.' }); }
});

/* ── MILESTONES ───────────────────────────────────────────── */
router.get('/milestones/:childId', async (req, res) => {
  const cid = parseInt(req.params.childId);
  if (!(await owns(cid, req.userId))) return res.status(403).json({ error: 'Not authorised.' });
  const [rows] = await db.query('SELECT * FROM milestones WHERE child_id=? ORDER BY id', [cid]);
  res.json(rows);
});

router.put('/milestones/:childId/:mileId', async (req, res) => {
  const cid    = parseInt(req.params.childId);
  const mileId = parseInt(req.params.mileId);
  if (!(await owns(cid, req.userId))) return res.status(403).json({ error: 'Not authorised.' });
  const { status, achieved_on, notes } = req.body;
  try {
    await db.query(
      'UPDATE milestones SET status=?,achieved_on=?,notes=? WHERE id=? AND child_id=?',
      [status, achieved_on||null, notes||'', mileId, cid]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Could not update milestone.' }); }
});

/* ── HEALTH POINTS ────────────────────────────────────────── */
router.post('/points/:childId', async (req, res) => {
  const cid = parseInt(req.params.childId);
  if (!(await owns(cid, req.userId))) return res.status(403).json({ error: 'Not authorised.' });
  const { points, reason } = req.body;
  const date = new Date().toISOString().split('T')[0];
  try {
    await db.query(
      'INSERT INTO health_points (child_id,log_date,points,reason) VALUES (?,?,?,?)',
      [cid, date, points||10, reason||'']);
    // Update streak
    await db.query('UPDATE children SET streak_days=streak_days+1 WHERE id=?', [cid]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Could not add points.' }); }
});

router.get('/points/:childId', async (req, res) => {
  const cid = parseInt(req.params.childId);
  if (!(await owns(cid, req.userId))) return res.status(403).json({ error: 'Not authorised.' });
  const [[total]] = await db.query(
    'SELECT COALESCE(SUM(points),0) AS total FROM health_points WHERE child_id=?', [cid]);
  res.json({ total: total.total });
});

module.exports = router;
