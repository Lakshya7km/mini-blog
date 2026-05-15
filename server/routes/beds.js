const router = require('express').Router();
const auth = require('../middleware/auth');
const Bed = require('../models/Bed');

router.get('/', auth(['hospital', 'nurse', 'superadmin']), async (req, res) => {
    try {
        const { hospitalId, status, bedType } = req.query;
        const q = {};
        if (hospitalId) q.hospitalId = hospitalId;
        if (status) q.status = status;
        if (bedType) q.bedType = bedType;
        res.json(await Bed.find(q).sort({ wardNumber: 1, bedNumber: 1 }));
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Public: get a single bed by bedId (used by QR scan landing page)
router.get('/public/:bedId', async (req, res) => {
    try {
        const bed = await Bed.findOne({ bedId: req.params.bedId });
        if (!bed) return res.status(404).json({ message: 'Bed not found' });
        res.json(bed);
    } catch (e) { res.status(500).json({ message: e.message }); }
});



router.post('/bulk', auth(['hospital']), async (req, res) => {
    try {
        const { hospitalId, wardNumber, bedType, startNum, endNum } = req.body;
        const beds = [];
        for (let i = startNum; i <= endNum; i++) {
            const num = String(i).padStart(3, '0');
            const bedId = `${hospitalId}-${wardNumber}-B${num}`;
            const exists = await Bed.findOne({ bedId });
            if (!exists) beds.push({ bedId, hospitalId, bedNumber: `B${num}`, wardNumber, bedType: bedType || 'General', status: 'Vacant' });
        }
        if (beds.length) await Bed.insertMany(beds);
        res.json({ created: beds.length });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.patch('/:bedId/status', auth(['hospital', 'nurse']), async (req, res) => {
    try {
        const { status, patientName } = req.body;
        const update = { status, updatedAt: new Date() };
        if (patientName) update.patientName = patientName;
        if (status === 'Occupied') update.admittedAt = new Date();
        if (status === 'Vacant') { update.patientName = null; update.admittedAt = null; }
        const b = await Bed.findOneAndUpdate({ bedId: req.params.bedId }, update, { new: true });
        res.json(b);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/:bedId', auth(['hospital', 'superadmin']), async (req, res) => {
    try {
        await Bed.deleteOne({ bedId: req.params.bedId });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/summary/:hospitalId', async (req, res) => {
    try {
        const beds = await Bed.find({ hospitalId: req.params.hospitalId });
        const summary = {};
        beds.forEach(b => {
            if (!summary[b.bedType]) summary[b.bedType] = { total: 0, vacant: 0, occupied: 0 };
            summary[b.bedType].total++;
            if (b.status === 'Vacant') summary[b.bedType].vacant++;
            if (b.status === 'Occupied') summary[b.bedType].occupied++;
        });
        res.json(summary);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
