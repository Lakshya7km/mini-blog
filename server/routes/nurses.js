const router = require('express').Router();
const auth = require('../middleware/auth');
const Nurse = require('../models/Nurse');

const pickAllowed = (body, allowed) => {
    const picked = {};
    for (const key of allowed) {
        if (body[key] !== undefined) picked[key] = body[key];
    }
    return picked;
};

router.get('/', auth(['hospital', 'superadmin', 'nurse']), async (req, res) => {
    try {
        const { hospitalId } = req.query;
        const q = {};
        if (hospitalId) q.hospitalId = hospitalId;
        
        // Nurse JWT scoped to own hospital
        if (req.user.role === 'nurse') {
            q.hospitalId = req.user.hospitalId;
        }

        res.json(await Nurse.find(q, '-password'));
    } catch (e) { res.status(500).json({ message: e.message }); }
});

const NURSE_ALLOWED = ['nurseId', 'name', 'password', 'contact', 'hospitalId'];

router.post('/', auth(['hospital']), async (req, res) => {
    try {
        if (!req.body.password) return res.status(400).json({ message: 'Password is required' });
        if (req.user.ref !== req.body.hospitalId) return res.status(403).json({ message: 'Forbidden' });
        
        const data = pickAllowed(req.body, NURSE_ALLOWED);
        const n = new Nurse(data);
        await n.save();
        res.json(n);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
