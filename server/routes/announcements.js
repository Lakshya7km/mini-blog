const router = require('express').Router();
const auth = require('../middleware/auth');
const Announcement = require('../models/Announcement');
const cache = require('../utils/cache');

router.get('/', async (req, res) => {
    try {
        const { hospitalId, clinicId } = req.query;
        const scopeId = hospitalId || clinicId;
        const cacheKey = scopeId ? `announcements:${scopeId}` : null;
        if (cacheKey) {
            const hit = cache.get(cacheKey);
            if (hit) return res.json(hit);
        }

        const q = {
            $or: [
                { expiresAt: { $gt: new Date() } },
                { expiresAt: { $exists: false } },
                { expiresAt: null }
            ]
        };
        if (hospitalId) q.hospitalId = hospitalId;
        if (clinicId) q.clinicId = clinicId;

        const rows = await Announcement.find(q).sort({ createdAt: -1 });
        if (cacheKey) cache.set(cacheKey, rows, 30);
        res.json(rows);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/', auth(['hospital', 'clinic']), async (req, res) => {
    try {
        const { hospitalId, clinicId, title, message, expiresAt } = req.body;
        
        // Ownership checks
        if (req.user.role === 'hospital' && req.user.ref !== hospitalId) return res.status(403).json({ message: 'Forbidden' });
        if (req.user.role === 'clinic' && req.user.ref !== clinicId) return res.status(403).json({ message: 'Forbidden' });
        
        const a = new Announcement({ hospitalId, clinicId, title, message, expiresAt });
        await a.save();
        
        if (hospitalId) cache.del(`announcements:${hospitalId}`);
        if (clinicId) cache.del(`announcements:${clinicId}`);

        if (global.io) {
            const room = hospitalId ? `hospital:${hospitalId}` : `clinic:${clinicId}`;
            global.io.to(room).emit('announcement:new', a);
        }

        res.json(a);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/:id', auth(['hospital', 'clinic']), async (req, res) => {
    try {
        const a = await Announcement.findById(req.params.id);
        if (!a) return res.status(404).json({ message: 'Not found' });
        
        if (a.hospitalId && req.user.ref !== a.hospitalId) return res.status(403).json({ message: 'Forbidden' });
        if (a.clinicId && req.user.ref !== a.clinicId) return res.status(403).json({ message: 'Forbidden' });
        
        if (a.hospitalId) cache.del(`announcements:${a.hospitalId}`);
        if (a.clinicId) cache.del(`announcements:${a.clinicId}`);

        await Announcement.deleteOne({ _id: a._id });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
