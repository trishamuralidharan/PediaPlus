const express = require('express');
const db      = require('../database/db');
const auth    = require('../middleware/auth');
const router  = express.Router();
router.use(auth);

/* GET /api/parent */
router.get('/', async (req, res) => {
  try {
    const [r] = await db.query('SELECT * FROM parent_profiles WHERE user_id=?', [req.userId]);
    res.json(r[0] || {});
  } catch (e) { res.status(500).json({ error: 'Could not fetch profile.' }); }
});

/* PUT /api/parent */
router.put('/', async (req, res) => {
  const p = req.body;
  try {
    await db.query(`
      INSERT INTO parent_profiles
        (user_id,mom_name,mom_phone,mom_dob,mom_email,dad_name,dad_phone,dad_dob,dad_email,address,city,state,pincode)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE
        mom_name=VALUES(mom_name),mom_phone=VALUES(mom_phone),mom_dob=VALUES(mom_dob),mom_email=VALUES(mom_email),
        dad_name=VALUES(dad_name),dad_phone=VALUES(dad_phone),dad_dob=VALUES(dad_dob),dad_email=VALUES(dad_email),
        address=VALUES(address),city=VALUES(city),state=VALUES(state),pincode=VALUES(pincode)`,
      [req.userId,
       p.momName||'', p.momPhone||'', p.momDob||null, p.momEmail||'',
       p.dadName||'', p.dadPhone||'', p.dadDob||null, p.dadEmail||'',
       p.address||'', p.city||'', p.state||'', p.pincode||'']);
    const [r] = await db.query('SELECT * FROM parent_profiles WHERE user_id=?', [req.userId]);
    res.json(r[0]);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not save.' }); }
});

module.exports = router;
