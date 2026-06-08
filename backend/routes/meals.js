const express = require('express');
const db      = require('../database/db');
const auth    = require('../middleware/auth');
const router  = express.Router();
router.use(auth);

async function owns(childId, userId) {
  const [r] = await db.query('SELECT id FROM children WHERE id=? AND user_id=?', [childId, userId]);
  return r.length > 0;
}
function fmt(r) {
  return {
    id: r.id, child_id: r.child_id, log_date: r.log_date,
    meal_type: r.meal_type, name: r.food_name, emoji: r.emoji,
    qty: r.quantity, unit: r.unit,
    kcal: r.kcal, protein: r.protein_g, calcium: r.calcium_mg,
    iron: r.iron_mg, vitC: r.vit_c_mg, fat: r.fat_g,
    fromRecipe: r.from_recipe===1, recipeName: r.recipe_name,
  };
}

/* GET /api/meals/:childId?date=YYYY-MM-DD */
router.get('/:childId', async (req, res) => {
  const cid  = parseInt(req.params.childId);
  const date = req.query.date || new Date().toISOString().split('T')[0];
  if (!(await owns(cid, req.userId))) return res.status(403).json({ error: 'Not authorised.' });
  try {
    const [rows] = await db.query(
      'SELECT * FROM meal_logs WHERE child_id=? AND log_date=? ORDER BY created_at', [cid, date]);
    res.json(rows.map(fmt));
  } catch (e) { res.status(500).json({ error: 'Could not fetch meals.' }); }
});

/* POST /api/meals/:childId */
router.post('/:childId', async (req, res) => {
  const cid = parseInt(req.params.childId);
  const m   = req.body;
  if (!(await owns(cid, req.userId))) return res.status(403).json({ error: 'Not authorised.' });
  if (!m.food_name) return res.status(400).json({ error: 'food_name required.' });
  const date = m.log_date || new Date().toISOString().split('T')[0];
  try {
    const [r] = await db.query(`
      INSERT INTO meal_logs
        (child_id,log_date,meal_type,food_name,emoji,quantity,unit,kcal,protein_g,calcium_mg,iron_mg,vit_c_mg,fat_g,from_recipe,recipe_name)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [cid, date, m.meal_type||'other', m.food_name, m.emoji||'🍽️',
       m.qty||1, m.unit||'serving', m.kcal||0, m.protein||0,
       m.calcium||0, m.iron||0, m.vit_c||0, m.fat||0,
       m.from_recipe?1:0, m.recipe_name||null]);
    const [[row]] = await db.query('SELECT * FROM meal_logs WHERE id=?', [r.insertId]);
    res.status(201).json(fmt(row));
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not add meal.' }); }
});

/* DELETE /api/meals/:childId/:logId */
router.delete('/:childId/:logId', async (req, res) => {
  const cid = parseInt(req.params.childId);
  const lid = parseInt(req.params.logId);
  if (!(await owns(cid, req.userId))) return res.status(403).json({ error: 'Not authorised.' });
  try {
    await db.query('DELETE FROM meal_logs WHERE id=? AND child_id=?', [lid, cid]);
    res.json({ message: 'Deleted.' });
  } catch (e) { res.status(500).json({ error: 'Could not delete.' }); }
});

/* DELETE /api/meals/:childId  (clear today) */
router.delete('/:childId', async (req, res) => {
  const cid  = parseInt(req.params.childId);
  const date = req.query.date || new Date().toISOString().split('T')[0];
  if (!(await owns(cid, req.userId))) return res.status(403).json({ error: 'Not authorised.' });
  try {
    await db.query('DELETE FROM meal_logs WHERE child_id=? AND log_date=?', [cid, date]);
    res.json({ message: 'Cleared.' });
  } catch (e) { res.status(500).json({ error: 'Could not clear.' }); }
});

module.exports = router;
