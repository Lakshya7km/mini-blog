const router = require('express').Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Hospital = require('../models/Hospital');
const Doctor = require('../models/Doctor');
const Nurse = require('../models/Nurse');
const Ambulance = require('../models/Ambulance');
const SuperAdmin = require('../models/SuperAdmin');

const sign = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

router.post('/login', async (req, res) => {
    try {
        let { role, username, password } = req.body;
        role = (role || '').toLowerCase().trim();
        username = (username || '').trim();

        let user = null;
        if (role === 'hospital') user = await Hospital.findOne({ hospitalId: username });
        else if (role === 'doctor') user = await Doctor.findOne({ doctorId: username });
        else if (role === 'nurse') user = await Nurse.findOne({ nurseId: username });
        else if (role === 'ambulance') user = await Ambulance.findOne({
            $or: [{ ambulanceId: username }, { 'emt.emtId': username }]
        });
        else if (role === 'superadmin') user = await SuperAdmin.findOne({ username });
        else return res.status(400).json({ message: 'Invalid role' });

        if (!user) return res.status(404).json({ message: 'User not found' });

        const ok = await user.comparePassword(password);
        if (!ok) return res.status(401).json({ message: 'Invalid password' });

        const payload = { role, id: user._id, ref: username };
        if (user.hospitalId) payload.hospitalId = user.hospitalId;

        const token = sign(payload);
        const userObj = {
            id: user._id,
            role,
            username: username,
            hospitalId: payload.hospitalId,
            ...(role === 'doctor' ? { name: user.name, speciality: user.speciality, doctorId: user.doctorId } : {}),
            ...(role === 'nurse' ? { name: user.name, nurseId: user.nurseId } : {}),
            ...(role === 'ambulance' ? { vehicleNumber: user.vehicleNumber, ambulanceId: user.ambulanceId } : {})
        };

        if (role === 'ambulance') {
            user.lastLogin = new Date(); user.status = 'On Duty';
            await user.save();
        }

        res.json({ token, user: userObj, forcePasswordChange: !!user.forcePasswordChange });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// Requires the caller to supply their current password for verification
router.post('/change-password', async (req, res) => {
    try {
        const { role, username, currentPassword, newPassword } = req.body;
        if (!currentPassword) return res.status(400).json({ message: 'Current password is required' });
        let Model, filter;
        if (role === 'hospital') { Model = Hospital; filter = { hospitalId: username }; }
        else if (role === 'doctor') { Model = Doctor; filter = { doctorId: username }; }
        else if (role === 'nurse') { Model = Nurse; filter = { nurseId: username }; }
        else if (role === 'ambulance') { Model = Ambulance; filter = { $or: [{ ambulanceId: username }, { 'emt.emtId': username }] }; }
        else if (role === 'superadmin') { Model = SuperAdmin; filter = { username }; }
        else return res.status(400).json({ message: 'Invalid role' });
        const doc = await Model.findOne(filter);
        if (!doc) return res.status(404).json({ message: 'User not found' });
        const valid = await doc.comparePassword(currentPassword);
        if (!valid) return res.status(401).json({ message: 'Current password is incorrect' });
        doc.password = newPassword;
        if (doc.forcePasswordChange !== undefined) doc.forcePasswordChange = false;
        await doc.save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
