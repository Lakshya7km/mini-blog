const router = require('express').Router();
const auth = require('../middleware/auth');
const BloodBank = require('../models/BloodBank');
const Donor = require('../models/Donor');
const cache = require('../utils/cache');

const pickAllowed = (body, allowed) => {
    const picked = {};
    for (const key of allowed) {
        if (body[key] !== undefined) picked[key] = body[key];
    }
    return picked;
};

// Inventory
router.get('/', async (req, res) => {
    try {
        const { hospitalId } = req.query;
        if (hospitalId) {
            const cacheKey = `bloodbank:${hospitalId}`;
            const hit = cache.get(cacheKey);
            if (hit) return res.json(hit);
            const rows = await BloodBank.find({ hospitalId });
            cache.set(cacheKey, rows, 60);
            return res.json(rows);
        }
        res.json(await BloodBank.find({}));
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/upsert', auth(['hospital']), async (req, res) => {
    try {
        const { hospitalId, bloodType, units } = req.body;
        if (req.user.ref !== hospitalId) return res.status(403).json({ message: 'Forbidden' });
        
        const b = await BloodBank.findOneAndUpdate(
            { hospitalId, bloodType },
            { units, updatedAt: new Date() },
            { new: true, upsert: true }
        );
        cache.del(`bloodbank:${hospitalId}`);
        res.json(b);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Donors
router.get('/donors', async (req, res) => {
    try {
        const { hospitalId } = req.query;
        const q = hospitalId ? { hospitalId } : {};
        res.json(await Donor.find(q).select('-contact')); // Hide contact from public list
    } catch (e) { res.status(500).json({ message: e.message }); }
});

const DONOR_ALLOWED = ['name', 'contact', 'bloodType', 'hospitalId', 'city'];

router.post('/donors', async (req, res) => {
    try {
        const data = pickAllowed(req.body, DONOR_ALLOWED);
        const d = new Donor(data);
        await d.save();
        res.json(d);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/donors/:id', auth(['hospital']), async (req, res) => {
    try {
        const d = await Donor.findById(req.params.id);
        if (!d) return res.status(404).json({ message: 'Not found' });
        if (req.user.ref !== d.hospitalId) return res.status(403).json({ message: 'Forbidden' });
        
        d.status = req.body.status || d.status;
        d.updatedAt = new Date();
        await d.save();
        res.json(d);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
