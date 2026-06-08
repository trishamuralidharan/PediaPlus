const express = require('express');
const db      = require('../database/db');
const auth    = require('../middleware/auth');
const router  = express.Router();
router.use(auth);

/* ── ownership check ── */
async function owns(childId, userId) {
  const [r] = await db.query(
    'SELECT id FROM children WHERE id=? AND user_id=?', [childId, userId]);
  return r.length > 0;
}

/* ── full child object with sub-tables ── */
async function fullChild(childId) {
  const [[c]]    = await db.query('SELECT * FROM children WHERE id=?', [childId]);
  if (!c) return null;
  const [allerg] = await db.query('SELECT * FROM child_allergies WHERE child_id=?', [childId]);
  const [diet]   = await db.query('SELECT preference FROM child_diet_preferences WHERE child_id=?', [childId]);
  const [miles]  = await db.query('SELECT * FROM milestones WHERE child_id=? ORDER BY id', [childId]);
  const [growth] = await db.query('SELECT * FROM growth_records WHERE child_id=? ORDER BY recorded_on DESC LIMIT 10', [childId]);
  return {
    id: c.id, name: c.name, gender: c.gender, dob: c.dob,
    age: c.age, weight: c.weight_kg, height: c.height_cm,
    blood: c.blood_group, bmi: c.bmi, avatar: c.avatar,
    mood: c.mood, streak: c.streak_days, healthScore: c.health_score,
    location: c.location, doctor: c.doctor_name, doctorPhone: c.doctor_phone,
    school: c.school,
    allergies:  allerg.map(a => ({ id:a.id, name:a.allergen, severity:a.severity, notes:a.notes })),
    diet:       diet.map(d => d.preference),
    milestones: miles,
    growthHistory: growth,
  };
}

/* ── GET /api/children ── */
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id FROM children WHERE user_id=? ORDER BY id', [req.userId]);
    const result = await Promise.all(rows.map(r => fullChild(r.id)));
    res.json(result.filter(Boolean));
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not fetch children.' }); }
});

/* ── POST /api/children ── */
router.post('/', async (req, res) => {
  const c = req.body;
  if (!c.name) return res.status(400).json({ error: 'Name required.' });
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Insert child
    const [ins] = await conn.query(`
      INSERT INTO children
        (user_id,name,gender,dob,age,weight_kg,height_cm,blood_group,bmi,avatar,
         mood,streak_days,health_score,location,doctor_name,doctor_phone,school)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [req.userId, c.name, c.gender||'boy', c.dob||null,
       c.age||3, c.weight||14, c.height||95,
       c.blood||'O+', c.bmi||'15.5', c.avatar||'👦',
       c.mood||'😊', c.streak||0, c.healthScore||95,
       c.location||'', c.doctor||'', c.doctorPhone||'', c.school||'']);

    const childId = ins.insertId;

    // Insert allergies
    for (const a of (c.allergies || [])) {
      const name = typeof a === 'string' ? a : a.name;
      if (name) await conn.query(
        'INSERT INTO child_allergies (child_id,allergen,severity) VALUES (?,?,?)',
        [childId, name, a.severity||'mild']);
    }

    // Insert diet preferences
    for (const d of (c.diet || [])) {
      if (d) await conn.query(
        'INSERT INTO child_diet_preferences (child_id,preference) VALUES (?,?)',
        [childId, d]);
    }

    // Insert default milestones
    const defaultMiles = [
      { emoji:'🚶', label:'Walking',   status: c.age>=1?'done':'future' },
      { emoji:'💬', label:'50+ Words', status: c.age>=1.5?'done':'future' },
      { emoji:'🖍️', label:'Drawing',   status: c.age>=2?'done':'future' },
      { emoji:'🧩', label:'Puzzles',   status: c.age>=3?'done':'future' },
      { emoji:'🚴', label:'Tricycle',  status: 'future' },
      { emoji:'✂️', label:'Scissors',  status: 'future' },
    ];
    for (const m of defaultMiles) {
      await conn.query(
        'INSERT INTO milestones (child_id,emoji,label,status) VALUES (?,?,?,?)',
        [childId, m.emoji, m.label, m.status]);
    }

    // Insert first growth record
    await conn.query(
      'INSERT INTO growth_records (child_id,recorded_on,weight_kg,height_cm,bmi) VALUES (?,CURDATE(),?,?,?)',
      [childId, c.weight||14, c.height||95, c.bmi||'15.5']);

    await conn.commit();
    const result = await fullChild(childId);
    res.status(201).json(result);
  } catch (e) {
    await conn.rollback();
    console.error(e);
    res.status(500).json({ error: 'Could not create child.' });
  } finally { conn.release(); }
});

/* ── PUT /api/children/:id ── */
router.put('/:id', async (req, res) => {
  const childId = parseInt(req.params.id);
  if (!(await owns(childId, req.userId)))
    return res.status(403).json({ error: 'Not authorised.' });

  const c = req.body;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(`
      UPDATE children SET
        name=?,gender=?,dob=?,age=?,weight_kg=?,height_cm=?,blood_group=?,bmi=?,avatar=?,
        mood=?,streak_days=?,health_score=?,location=?,doctor_name=?,doctor_phone=?,school=?
      WHERE id=?`,
      [c.name, c.gender||'boy', c.dob||null, c.age, c.weight, c.height,
       c.blood, c.bmi, c.avatar, c.mood, c.streak||0, c.healthScore||95,
       c.location||'', c.doctor||'', c.doctorPhone||'', c.school||'', childId]);

    // Replace allergies
    if (Array.isArray(c.allergies)) {
      await conn.query('DELETE FROM child_allergies WHERE child_id=?', [childId]);
      for (const a of c.allergies) {
        const name = typeof a === 'string' ? a : a.name;
        if (name) await conn.query(
          'INSERT INTO child_allergies (child_id,allergen,severity) VALUES (?,?,?)',
          [childId, name, a.severity||'mild']);
      }
    }

    // Replace diet
    if (Array.isArray(c.diet)) {
      await conn.query('DELETE FROM child_diet_preferences WHERE child_id=?', [childId]);
      for (const d of c.diet) {
        if (d) await conn.query(
          'INSERT INTO child_diet_preferences (child_id,preference) VALUES (?,?)',
          [childId, d]);
      }
    }

    // Add growth snapshot if weight/height changed
    await conn.query(`
      INSERT INTO growth_records (child_id,recorded_on,weight_kg,height_cm,bmi)
      VALUES (?,CURDATE(),?,?,?)
      ON DUPLICATE KEY UPDATE weight_kg=VALUES(weight_kg),height_cm=VALUES(height_cm),bmi=VALUES(bmi)`,
      [childId, c.weight, c.height, c.bmi]);

    await conn.commit();
    const result = await fullChild(childId);
    res.json(result);
  } catch (e) {
    await conn.rollback();
    console.error(e);
    res.status(500).json({ error: 'Could not update child.' });
  } finally { conn.release(); }
});

/* ── DELETE /api/children/:id ── */
router.delete('/:id', async (req, res) => {
  const childId = parseInt(req.params.id);
  try {
    const [r] = await db.query('DELETE FROM children WHERE id=? AND user_id=?', [childId, req.userId]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Not found.' });
    res.json({ message: 'Deleted.' });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not delete.' }); }
});

module.exports = router;
