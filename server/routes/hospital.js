const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const Hospital = require('../models/Hospital');
const Bed = require('../models/Bed');
const Doctor = require('../models/Doctor');
const Ambulance = require('../models/Ambulance');
const Attendance = require('../models/Attendance');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../uploads/photos');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET all hospitals (public)
router.get('/', async (req, res) => {
    try {
        const hospitals = await Hospital.find({}, '-password');
        res.json(hospitals);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// GET single hospital
router.get('/:id', async (req, res) => {
    try {
        const h = await Hospital.findOne({ hospitalId: req.params.id }, '-password');
        if (!h) return res.status(404).json({ message: 'Not found' });
        res.json(h);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// UPDATE hospital
router.put('/:id', auth(['hospital', 'superadmin']), async (req, res) => {
    try {
        const h = await Hospital.findOneAndUpdate({ hospitalId: req.params.id }, req.body, { new: true }).select('-password');
        res.json(h);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Upload gallery
router.post('/:id/gallery', auth(['hospital']), upload.array('images', 10), async (req, res) => {
    try {
        const urls = req.files.map(f => `/uploads/photos/${f.filename}`);
        await Hospital.findOneAndUpdate({ hospitalId: req.params.id }, { $push: { gallery: { $each: urls } } });
        res.json({ success: true, urls });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Delete gallery image
router.delete('/:id/gallery', auth(['hospital']), async (req, res) => {
    try {
        const { url } = req.body;
        await Hospital.findOneAndUpdate({ hospitalId: req.params.id }, { $pull: { gallery: url } });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Dashboard stats
router.get('/:id/stats', auth(['hospital']), async (req, res) => {
    try {
        const hid = req.params.id;
        const beds = await Bed.find({ hospitalId: hid });
        const availableBeds = beds.filter(b => b.status === 'Vacant').length;
        const doctors = await Doctor.find({ hospitalId: hid });
        const activeDocs = doctors.filter(d => d.availability === 'Available').length;
        const ambulances = await Ambulance.find({ hospitalId: hid });
        const activeAmbs = ambulances.filter(a => a.status === 'On Duty').length;
        res.json({ totalBeds: beds.length, availableBeds, totalDoctors: doctors.length, activeDocs, totalAmbulances: ambulances.length, activeAmbs });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Attendance QR scan endpoint
router.get('/:id/attendance-scan', auth(['hospital', 'nurse', 'superadmin']), async (req, res) => {
    try {
        const { type, doctorId } = req.query;
        if (!doctorId) return res.status(400).json({ message: 'doctorId required' });
        const today = new Date(); today.setHours(0, 0, 0, 0);
        let attendance = await Attendance.findOne({ doctorId, date: today });
        if (type === 'Present') {
            if (!attendance) attendance = new Attendance({ doctorId, hospitalId: req.params.id, date: today, availability: 'Present', checkIn: new Date(), method: 'QR' });
            else { attendance.checkIn = new Date(); attendance.availability = 'Present'; }
        } else {
            if (attendance && attendance.checkIn) {
                const hours = ((new Date() - attendance.checkIn) / 3600000).toFixed(1);
                attendance.checkOut = new Date(); attendance.totalHours = hours;
            }
        }
        if (attendance) await attendance.save();
        res.send(`<h2>Attendance ${type === 'Present' ? 'Check-In' : 'Check-Out'} recorded!</h2><a href="/">Back</a>`);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
