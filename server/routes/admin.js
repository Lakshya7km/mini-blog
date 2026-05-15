const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const SuperAdmin = require('../models/SuperAdmin');
const Hospital = require('../models/Hospital');
const Doctor = require('../models/Doctor');
const Nurse = require('../models/Nurse');
const Ambulance = require('../models/Ambulance');
const EmergencyRequest = require('../models/EmergencyRequest');

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const admin = await SuperAdmin.findOne({ username });
        if (!admin) return res.status(404).json({ message: 'Admin not found' });
        const ok = await admin.comparePassword(password);
        if (!ok) return res.status(401).json({ message: 'Invalid password' });
        const token = jwt.sign({ role: 'superadmin', id: admin._id, ref: username }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, admin: { username: admin.username } });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/stats', auth(['superadmin']), async (req, res) => {
    try {
        const [hospitals, doctors, ambulances, nurses, activeEmergencies] = await Promise.all([
            Hospital.countDocuments(),
            Doctor.countDocuments(),
            Ambulance.countDocuments(),
            Nurse.countDocuments(),
            EmergencyRequest.countDocuments({ status: { $in: ['Pending', 'Accepted'] } })
        ]);
        res.json({ hospitals, doctors, ambulances, nurses, activeEmergencies });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/register-hospital', auth(['superadmin']), async (req, res) => {
    try {
        const { hospitalId } = req.body;
        if (await Hospital.findOne({ hospitalId })) return res.status(400).json({ message: 'Hospital ID exists' });
        const h = new Hospital({ ...req.body, password: req.body.password || 'test@1234' });
        await h.save();
        res.json({ message: 'Hospital registered', hospital: h });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Master DBMS — list any collection
const COLLECTIONS = { hospitals: Hospital, doctors: Doctor, nurses: Nurse, ambulances: Ambulance, emergencies: EmergencyRequest };
router.get('/master/:col', auth(['superadmin']), async (req, res) => {
    try {
        const Model = COLLECTIONS[req.params.col];
        if (!Model) return res.status(404).json({ message: 'Collection not found' });
        res.json(await Model.find({}, '-password').limit(200));
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/master/:col/:id', auth(['superadmin']), async (req, res) => {
    try {
        const Model = COLLECTIONS[req.params.col];
        if (!Model) return res.status(404).json({ message: 'Collection not found' });
        await Model.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
