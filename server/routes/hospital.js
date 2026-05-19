const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const Hospital = require('../models/Hospital');
const cache = require('../utils/cache');
const Bed = require('../models/Bed');
const Doctor = require('../models/Doctor');
const BloodBank = require('../models/BloodBank');
const Ambulance = require('../models/Ambulance');
const Nurse = require('../models/Nurse');

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files (JPEG, PNG, WebP, GIF) are allowed'), false);
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../uploads/gallery');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, Date.now() + '-' + Math.random().toString(36).slice(2, 8) + ext);
    }
});
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// List all
router.get('/', async (req, res) => {
    try {
        const cacheKey = 'hospitals:list';
        const hit = cache.get(cacheKey);
        if (hit) return res.json(hit);

        const hospitals = await Hospital.find({}, 'hospitalId name location address services contact').lean();
        cache.set(cacheKey, hospitals, 60);
        res.json(hospitals);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Single with details
router.get('/:id', async (req, res) => {
    try {
        const cacheKey = `hospital:${req.params.id}`;
        const hit = cache.get(cacheKey);
        if (hit) return res.json(hit);

        const h = await Hospital.findOne({ hospitalId: req.params.id }, '-password').lean();
        if (!h) return res.status(404).json({ message: 'Not found' });

        const [beds, doctorCount, bloodBank] = await Promise.all([
            Bed.find({ hospitalId: h.hospitalId }),
            Doctor.countDocuments({ hospitalId: h.hospitalId, availability: 'Available' }),
            BloodBank.find({ hospitalId: h.hospitalId })
        ]);

        const bedSummary = { total: beds.length, vacant: beds.filter(b => b.status === 'Available').length };

        const payload = { ...h, bedSummary, availableDoctors: doctorCount, bloodBank };
        cache.set(cacheKey, payload, 30);
        res.json(payload);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

const HOSPITAL_ALLOWED = ['name', 'contact', 'email', 'address', 'location', 'services', 'facilities', 'insurance', 'procedures', 'surgery', 'therapy', 'googleMapUrl', 'gallery'];

const pickAllowed = (body, allowed) => {
    const picked = {};
    for (const key of allowed) {
        if (body[key] !== undefined) picked[key] = body[key];
    }
    return picked;
};

// Update own profile
router.put('/:id', auth(['hospital']), async (req, res) => {
    try {
        if (req.user.ref !== req.params.id) return res.status(403).json({ message: 'Forbidden: Can only update own profile' });
        const updates = pickAllowed(req.body, HOSPITAL_ALLOWED);
        const h = await Hospital.findOneAndUpdate({ hospitalId: req.params.id }, { $set: updates }, { new: true }).select('-password');
        cache.del('hospitals:list');
        cache.del(`hospital:${req.params.id}`);
        res.json(h);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Internal stats
router.get('/:id/stats', auth(['hospital']), async (req, res) => {
    try {
        if (req.user.ref !== req.params.id) return res.status(403).json({ message: 'Forbidden' });
        const [beds, doctors, ambulances, nurses] = await Promise.all([
            Bed.find({ hospitalId: req.params.id }),
            Doctor.countDocuments({ hospitalId: req.params.id }),
            Ambulance.countDocuments({ hospitalId: req.params.id }),
            Nurse.countDocuments({ hospitalId: req.params.id })
        ]);

        const bedCounts = {};
        beds.forEach(b => {
            if (!bedCounts[b.bedType]) bedCounts[b.bedType] = 0;
            bedCounts[b.bedType]++;
        });

        res.json({ bedCounts, doctors, ambulances, nurses });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Gallery upload
router.post('/:id/gallery', auth(['hospital']), upload.array('images', 10), async (req, res) => {
    try {
        if (req.user.ref !== req.params.id) return res.status(403).json({ message: 'Forbidden' });
        const urls = req.files.map(f => `/uploads/gallery/${f.filename}`);
        const h = await Hospital.findOneAndUpdate(
            { hospitalId: req.params.id }, 
            { $push: { gallery: { $each: urls } } }, 
            { new: true }
        ).select('-password');
        res.json(h);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Gallery delete
router.delete('/:id/gallery', auth(['hospital']), async (req, res) => {
    try {
        if (req.user.ref !== req.params.id) return res.status(403).json({ message: 'Forbidden' });
        const { imageUrl } = req.body;
        if (typeof imageUrl !== 'string') return res.status(400).json({ message: 'imageUrl must be a string' });
        const h = await Hospital.findOneAndUpdate(
            { hospitalId: req.params.id }, 
            { $pull: { gallery: imageUrl } }, 
            { new: true }
        ).select('-password');
        res.json(h);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
