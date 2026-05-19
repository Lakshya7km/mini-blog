const router = require('express').Router();
const auth = require('../middleware/auth');
const Pharmacy = require('../models/Pharmacy');
const Medicine = require('../models/Medicine');
const cache = require('../utils/cache');
const { sortByProximity } = require('../utils/proximity');

const pickAllowed = (body, allowed) => {
    const picked = {};
    for (const key of allowed) {
        if (body[key] !== undefined) picked[key] = body[key];
    }
    return picked;
};

// Public List of pharmacies
router.get('/', async (req, res) => {
    try {
        const { lat, lng } = req.query;
        const cacheKey = `pharmacy:list:${lat || ''}:${lng || ''}`;
        const hit = cache.get(cacheKey);
        if (hit) return res.json(hit);

        let pharmacies = await Pharmacy.find({}, '-password').lean();
        pharmacies = sortByProximity(pharmacies, lat, lng);
        cache.set(cacheKey, pharmacies, 60);
        res.json(pharmacies);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Cross-pharmacy medicine search
router.get('/search', async (req, res) => {
    try {
        const { medicine, city } = req.query;
        if (!medicine) return res.json([]);
        
        const escaped = medicine.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const meds = await Medicine.find({ 
            name: new RegExp(escaped, 'i'),
            inStock: true 
        }).lean();
        
        const pharmacyIds = [...new Set(meds.map(m => m.pharmacyId))];
        let pharmacies = await Pharmacy.find({ pharmacyId: { $in: pharmacyIds } }, '-password').lean();
        
        if (city) {
            pharmacies = pharmacies.filter(p => p.address?.city?.toLowerCase() === city.toLowerCase());
        }
        
        res.json({ results: pharmacies, medsFound: meds.length });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Single pharmacy profile
router.get('/:pharmacyId', async (req, res) => {
    try {
        const cacheKey = `pharmacy:${req.params.pharmacyId}`;
        const hit = cache.get(cacheKey);
        if (hit) return res.json(hit);

        const p = await Pharmacy.findOne({ pharmacyId: req.params.pharmacyId }, '-password').lean();
        if (!p) return res.status(404).json({ message: 'Not found' });

        const medicines = await Medicine.find({ pharmacyId: p.pharmacyId });
        const payload = { ...p, medicines };
        cache.set(cacheKey, payload, 30);
        res.json(payload);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

const PHARMACY_ALLOWED = ['name', 'contact', 'email', 'address', 'location'];

// Update own profile
router.put('/:pharmacyId', auth(['pharmacy']), async (req, res) => {
    try {
        if (req.user.ref !== req.params.pharmacyId) return res.status(403).json({ message: 'Forbidden' });
        const updates = pickAllowed(req.body, PHARMACY_ALLOWED);
        const p = await Pharmacy.findOneAndUpdate({ pharmacyId: req.params.pharmacyId }, { $set: updates }, { new: true }).select('-password');
        cache.del(`pharmacy:${req.params.pharmacyId}`);
        res.json(p);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Medicine Routes
router.get('/:pharmacyId/medicines', async (req, res) => {
    try {
        const { search, inStock } = req.query;
        const q = { pharmacyId: req.params.pharmacyId };
        
        if (search) {
            const term = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(term, 'i');
            q.$or = [{ name: regex }, { medicineNumber: regex }];
        }
        if (inStock !== undefined) q.inStock = inStock === 'true';
        
        res.json(await Medicine.find(q));
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/:pharmacyId/medicines', auth(['pharmacy']), async (req, res) => {
    try {
        if (req.user.ref !== req.params.pharmacyId) return res.status(403).json({ message: 'Forbidden' });
        const m = new Medicine({ ...req.body, pharmacyId: req.params.pharmacyId });
        await m.save();
        res.json(m);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.patch('/:pharmacyId/medicines/:medicineId', auth(['pharmacy']), async (req, res) => {
    try {
        if (req.user.ref !== req.params.pharmacyId) return res.status(403).json({ message: 'Forbidden' });
        
        const m = await Medicine.findOneAndUpdate(
            { _id: req.params.medicineId, pharmacyId: req.params.pharmacyId },
            { inStock: req.body.inStock, updatedAt: new Date() },
            { new: true }
        );
        
        cache.del(`pharmacy:${req.params.pharmacyId}`);
        cache.del('pharmacy:list');

        if (m && global.io) {
            global.io.to(`pharmacy:${m.pharmacyId}`).emit('pharmacy:stock', {
                pharmacyId: m.pharmacyId,
                medicineId: m._id,
                name: m.name,
                inStock: m.inStock
            });
        }
        
        res.json(m);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/:pharmacyId/medicines/:medicineId', auth(['pharmacy']), async (req, res) => {
    try {
        if (req.user.ref !== req.params.pharmacyId) return res.status(403).json({ message: 'Forbidden' });
        await Medicine.deleteOne({ _id: req.params.medicineId, pharmacyId: req.params.pharmacyId });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
