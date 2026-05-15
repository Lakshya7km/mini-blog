const router = require('express').Router();
const auth = require('../middleware/auth');
const BloodBank = require('../models/BloodBank');

router.get('/', async (req, res) => {
    try {
        const { hospitalId } = req.query;
        res.json(await BloodBank.find(hospitalId ? { hospitalId } : {}));
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Upsert by blood type (used by reception BloodBankSection)
router.post('/upsert', auth(['hospital', 'superadmin']), async (req, res) => {
    try {
        const { hospitalId, bloodType, units } = req.body;
        let b = await BloodBank.findOne({ hospitalId, bloodType });
        if (b) { b.units = units; await b.save(); }
        else { b = await new BloodBank({ hospitalId, bloodType, units }).save(); }
        res.json(b);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

const Donor = require('../models/Donor');

// Get donors for a hospital
router.get('/donors', async (req, res) => {
    try {
        const { hospitalId } = req.query;
        res.json(await Donor.find(hospitalId ? { hospitalId } : {}).sort({ createdAt: -1 }));
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Submit a new donor request (from Public page)
router.post('/donors', async (req, res) => {
    try {
        const { name, contact, hospitalId } = req.body;
        if (!name || !contact || !hospitalId) {
            return res.status(400).json({ message: 'Name, Contact, and Hospital ID are required' });
        }
        const d = new Donor(req.body);
        await d.save();
        res.json(d);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Update donor status (Reception)
router.put('/donors/:id', auth(['hospital']), async (req, res) => {
    try {
        const d = await Donor.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedAt: new Date() },
            { new: true }
        );
        res.json(d);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/', auth(['hospital']), async (req, res) => {
    try {
        const { hospitalId, bloodType } = req.body;
        let b = await BloodBank.findOne({ hospitalId, bloodType });
        if (b) { Object.assign(b, req.body); await b.save(); }
        else { b = await new BloodBank(req.body).save(); }
        res.json(b);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/:id', auth(['hospital']), async (req, res) => {
    try {
        const b = await BloodBank.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(b);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
