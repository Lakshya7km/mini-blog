const router = require('express').Router();
const auth = require('../middleware/auth');
const Ambulance = require('../models/Ambulance');

const pickAllowed = (body, allowed) => {
    const picked = {};
    for (const key of allowed) {
        if (body[key] !== undefined) picked[key] = body[key];
    }
    return picked;
};

router.get('/', auth(['hospital', 'superadmin']), async (req, res) => {
    try {
        const { hospitalId } = req.query;
        const q = hospitalId ? { hospitalId } : {};
        res.json(await Ambulance.find(q, '-password'));
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/:ambulanceId', auth(['hospital', 'ambulance', 'superadmin']), async (req, res) => {
    try {
        if (req.user.role === 'ambulance' && req.user.ref !== req.params.ambulanceId) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        const a = await Ambulance.findOne({ ambulanceId: req.params.ambulanceId }, '-password');
        if (!a) return res.status(404).json({ message: 'Not found' });
        res.json(a);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

const AMBULANCE_ALLOWED = ['ambulanceId', 'vehicleNumber', 'password', 'driverName', 'contact', 'hospitalId', 'status', 'emt', 'pilot', 'assignedTask'];

router.post('/', auth(['hospital']), async (req, res) => {
    try {
        if (!req.body.password) return res.status(400).json({ message: 'Password is required' });
        const data = pickAllowed(req.body, AMBULANCE_ALLOWED);
        if (data.hospitalId && req.user.ref !== data.hospitalId) {
            return res.status(403).json({ message: 'Forbidden: Cannot create ambulance for another hospital' });
        }
        const a = new Ambulance(data);
        await a.save();
        res.json(a);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

const AMBULANCE_UPDATE_ALLOWED = ['vehicleNumber', 'driverName', 'contact', 'status', 'location', 'emt', 'pilot', 'assignedTask'];

router.put('/:ambulanceId', auth(['ambulance', 'hospital']), async (req, res) => {
    try {
        if (req.user.role === 'ambulance' && req.user.ref !== req.params.ambulanceId) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        const updates = pickAllowed(req.body, AMBULANCE_UPDATE_ALLOWED);
        updates.updatedAt = new Date();
        const a = await Ambulance.findOneAndUpdate({ ambulanceId: req.params.ambulanceId }, { $set: updates }, { new: true }).select('-password');
        res.json(a);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/:ambulanceId/location', auth(['ambulance']), async (req, res) => {
    try {
        if (req.user.ref !== req.params.ambulanceId) return res.status(403).json({ message: 'Forbidden' });
        
        const { lat, lng } = req.body;
        const a = await Ambulance.findOneAndUpdate(
            { ambulanceId: req.params.ambulanceId }, 
            { location: { lat, lng }, updatedAt: new Date() },
            { new: true }
        );
        
        if (global.io && a.hospitalId) {
            global.io.to(`hospital:${a.hospitalId}`).emit('ambulance:location', {
                ambulanceId: a.ambulanceId,
                hospitalId: a.hospitalId,
                lat,
                lng,
            });
        }
        
        res.json({ success: true });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
