const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const Doctor = require('../models/Doctor');

const pickAllowed = (body, allowed) => {
    const picked = {};
    for (const key of allowed) {
        if (body[key] !== undefined) picked[key] = body[key];
    }
    return picked;
};

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files (JPEG, PNG, WebP, GIF) are allowed'), false);
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../uploads/doctors');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, Date.now() + '-' + Math.random().toString(36).slice(2, 8) + ext);
    }
});
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// List doctors (Public / Auth)
router.get('/', async (req, res) => {
    try {
        const { hospitalId, clinicId, view } = req.query;
        const q = {};
        if (hospitalId) q.hospitalId = hospitalId;
        if (clinicId) q.clinicId = clinicId;

        // If no auth, return basic public list
        if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
            const doctors = await Doctor.find(q, 'name specialization availability photo').lean();
            return res.json(doctors);
        }

        // Authenticated views
        if (view === 'count') {
            const doctors = await Doctor.find(q).lean();
            const byType = {};
            let available = 0;
            let unavailable = 0;
            
            doctors.forEach(d => {
                if (d.availability === 'Available') available++;
                else unavailable++;
                
                const spec = d.specialization || 'General';
                if (!byType[spec]) byType[spec] = 0;
                byType[spec]++;
            });
            
            return res.json({ available, unavailable, total: doctors.length, byType });
        }
        
        // Full view
        const doctors = await Doctor.find(q, '-password').lean();
        res.json(doctors);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/:doctorId', async (req, res) => {
    try {
        const d = await Doctor.findOne({ doctorId: req.params.doctorId }, '-password');
        if (!d) return res.status(404).json({ message: 'Not found' });
        res.json(d);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

const DOCTOR_ALLOWED = ['doctorId', 'name', 'password', 'specialization', 'speciality', 'contact', 'email', 'photo', 'hospitalId', 'clinicId', 'availability', 'forcePasswordChange'];

router.post('/', auth(['hospital', 'clinic']), async (req, res) => {
    try {
        const { hospitalId, clinicId } = req.body;
        if (!hospitalId && !clinicId) return res.status(400).json({ message: 'hospitalId or clinicId required' });
        if (!req.body.password) return res.status(400).json({ message: 'Password is required' });
        if (hospitalId && req.user.role === 'hospital' && req.user.ref !== hospitalId) {
            return res.status(403).json({ message: 'Forbidden: Cannot create doctor for another hospital' });
        }
        if (clinicId && req.user.role === 'clinic' && req.user.ref !== clinicId) {
            return res.status(403).json({ message: 'Forbidden: Cannot create doctor for another clinic' });
        }
        
        const data = pickAllowed(req.body, DOCTOR_ALLOWED);
        const d = new Doctor(data);
        await d.save();
        res.json(d);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

const DOCTOR_UPDATE_ALLOWED = ['name', 'specialization', 'speciality', 'contact', 'email', 'photo', 'availability'];

router.put('/:doctorId', auth(['doctor', 'hospital', 'clinic']), async (req, res) => {
    try {
        if (req.user.role === 'doctor' && req.user.ref !== req.params.doctorId) {
            return res.status(403).json({ message: 'Forbidden: Can only update own profile' });
        }
        const updates = pickAllowed(req.body, DOCTOR_UPDATE_ALLOWED);
        const d = await Doctor.findOneAndUpdate({ doctorId: req.params.doctorId }, { $set: updates }, { new: true }).select('-password');
        res.json(d);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/:doctorId/photo', auth(['doctor', 'hospital', 'clinic']), upload.single('photo'), async (req, res) => {
    try {
        if (req.user.role === 'doctor' && req.user.ref !== req.params.doctorId) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
        
        const url = `/uploads/doctors/${req.file.filename}`;
        const d = await Doctor.findOneAndUpdate({ doctorId: req.params.doctorId }, { photo: url }, { new: true }).select('-password');
        res.json({ doctor: d });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
