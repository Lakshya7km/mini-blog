const router = require('express').Router();
const auth = require('../middleware/auth');
const Ambulance = require('../models/Ambulance');

router.get('/', auth(['hospital', 'superadmin']), async (req, res) => {
    try {
        const { hospitalId } = req.query;
        const q = hospitalId ? { hospitalId } : {};
        res.json(await Ambulance.find(q, '-password'));
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/:ambulanceId', auth(['hospital', 'ambulance', 'superadmin']), async (req, res) => {
    try {
        const a = await Ambulance.findOne({ ambulanceId: req.params.ambulanceId }, '-password');
        if (!a) return res.status(404).json({ message: 'Not found' });
        res.json(a);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/', auth(['hospital', 'superadmin']), async (req, res) => {
    try {
        if (!req.body.password) return res.status(400).json({ message: 'Password is required' });
        const a = new Ambulance({ ...req.body });
        await a.save();
        res.json(a);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/:ambulanceId', auth(['ambulance', 'hospital', 'superadmin']), async (req, res) => {
    try {
        const a = await Ambulance.findOneAndUpdate({ ambulanceId: req.params.ambulanceId }, req.body, { new: true }).select('-password');
        if (global.io) {
            global.io.emit('ambulance:update', a);
        }
        res.json(a);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Update location
router.post('/:ambulanceId/location', auth(['ambulance']), async (req, res) => {
    try {
        const { lat, lng } = req.body;
        await Ambulance.findOneAndUpdate({ ambulanceId: req.params.ambulanceId }, { location: { lat, lng, updatedAt: new Date() } });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
