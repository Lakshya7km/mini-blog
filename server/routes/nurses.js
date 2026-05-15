const router = require('express').Router();
const auth = require('../middleware/auth');
const Nurse = require('../models/Nurse');
const Bed = require('../models/Bed');

// List nurses
router.get('/', auth(['hospital', 'superadmin', 'nurse', 'doctor']), async (req, res) => {
    try {
        const { hospitalId } = req.query;
        const q = hospitalId ? { hospitalId } : {};
        res.json(await Nurse.find(q, '-password'));
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Create nurse
router.post('/', auth(['hospital', 'superadmin']), async (req, res) => {
    try {
        if (!req.body.password) return res.status(400).json({ message: 'Password is required' });
        const n = new Nurse({ ...req.body });
        await n.save();
        res.json(n);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Beds for nurse (scoped to hospital)
router.get('/beds', auth(['nurse']), async (req, res) => {
    try {
        const beds = await Bed.find({ hospitalId: req.user.hospitalId }).sort({ wardNumber: 1, bedNumber: 1 });
        res.json(beds);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
