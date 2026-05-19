const router = require('express').Router();
const auth = require('../middleware/auth');
const Bed = require('../models/Bed');
const cache = require('../utils/cache');

const invalidateBedCache = (hospitalId) => {
    cache.del(`beds:summary:${hospitalId}`);
    cache.del(`hospital:${hospitalId}`);
    cache.del('hospitals:list');
};

function formatBed(doc) {
    if (!doc) return null;
    const b = doc.toObject ? doc.toObject() : doc;
    return {
        ...b,
        bedNumber: b.bedNumber || b.bedId,
        wardNumber: b.wardNumber || b.ward || '',
    };
}

router.get('/public/:bedId', async (req, res) => {
    try {
        const bed = await Bed.findOne({ bedId: req.params.bedId });
        if (!bed) return res.status(404).json({ message: 'Bed not found' });
        res.json(formatBed(bed));
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/', auth(['hospital', 'nurse', 'superadmin']), async (req, res) => {
    try {
        const { hospitalId, status, bedType } = req.query;
        const q = {};
        if (hospitalId) q.hospitalId = hospitalId;
        if (status) q.status = status;
        if (bedType) q.bedType = bedType;
        const beds = await Bed.find(q);
        res.json(beds.map(formatBed));
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/summary/:hospitalId', async (req, res) => {
    try {
        const cacheKey = `beds:summary:${req.params.hospitalId}`;
        const hit = cache.get(cacheKey);
        if (hit) return res.json(hit);

        const beds = await Bed.find({ hospitalId: req.params.hospitalId });
        const summary = {};
        let totalAvailable = 0;

        beds.forEach(b => {
            if (!summary[b.bedType]) summary[b.bedType] = { total: 0, available: 0, occupied: 0, cleaning: 0 };
            summary[b.bedType].total++;
            if (b.status === 'Available') { summary[b.bedType].available++; totalAvailable++; }
            else if (b.status === 'Occupied') summary[b.bedType].occupied++;
            else if (b.status === 'Cleaning') summary[b.bedType].cleaning++;
        });

        const payload = { counts: summary, totalAvailable };
        cache.set(cacheKey, payload, 15);
        res.json(payload);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/bulk', auth(['hospital']), async (req, res) => {
    try {
        const { hospitalId, bedType, ward, wardNumber, count, startNum, endNum } = req.body;
        if (req.user.ref !== hospitalId) return res.status(403).json({ message: 'Forbidden' });

        const wardLabel = wardNumber || ward || 'W1';
        const beds = [];

        if (startNum != null && endNum != null) {
            for (let n = Number(startNum); n <= Number(endNum); n++) {
                const bedId = `${hospitalId}-W${wardLabel}-${n}`;
                beds.push({
                    bedId,
                    hospitalId,
                    bedType: bedType || 'General',
                    ward: wardLabel,
                    wardNumber: wardLabel,
                    bedNumber: String(n),
                    status: 'Available',
                });
            }
        } else {
            const total = Math.max(1, Number(count) || 1);
            for (let i = 0; i < total; i++) {
                const num = String(Date.now() + i).slice(-4);
                const bedId = `${hospitalId}-B${num}`;
                beds.push({
                    bedId,
                    hospitalId,
                    bedType: bedType || 'General',
                    ward: wardLabel,
                    wardNumber: wardLabel,
                    bedNumber: num,
                    status: 'Available',
                });
            }
        }

        await Bed.insertMany(beds, { ordered: false }).catch((err) => {
            if (err.code !== 11000) throw err;
        });
        invalidateBedCache(hospitalId);
        res.json({ created: beds.length });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.patch('/:bedId/status', auth(['hospital', 'nurse']), async (req, res) => {
    try {
        const { status, patientName } = req.body;
        const update = { status, updatedAt: new Date() };
        if (patientName !== undefined) {
            update.patientName = status === 'Occupied' ? patientName : '';
        }

        const b = await Bed.findOneAndUpdate(
            { bedId: req.params.bedId },
            update,
            { new: true }
        );

        if (!b) return res.status(404).json({ message: 'Bed not found' });

        invalidateBedCache(b.hospitalId);

        if (global.io) {
            global.io.to(`hospital:${b.hospitalId}`).emit('bed:update', {
                bedId: b.bedId,
                hospitalId: b.hospitalId,
                status: b.status,
                bedType: b.bedType,
                patientName: b.patientName,
            });
        }
        res.json(formatBed(b));
    } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
