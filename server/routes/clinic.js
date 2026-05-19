const router = require('express').Router();
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const Clinic = require('../models/Clinic');
const ClinicService = require('../models/ClinicService');
const Doctor = require('../models/Doctor');
const Announcement = require('../models/Announcement');
const AppointmentRequest = require('../models/AppointmentRequest');
const cache = require('../utils/cache');
const { sortByProximity } = require('../utils/proximity');
const { success, error } = require('../utils/response');

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files (JPEG, PNG, WebP, GIF) are allowed'), false);
};

const pickAllowed = (body, allowed) => {
    const picked = {};
    for (const key of allowed) {
        if (body[key] !== undefined) picked[key] = body[key];
    }
    return picked;
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../uploads/clinic');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, Date.now() + '-' + Math.random().toString(36).slice(2, 8) + ext);
    }
});
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// List clinics
router.get('/', async (req, res) => {
    try {
        const { type, lat, lng } = req.query;
        const cacheKey = `clinic:list:${type || ''}:${lat || ''}:${lng || ''}`;
        const hit = cache.get(cacheKey);
        if (hit) return res.json(hit);

        const q = type ? { clinicType: type } : {};
        let clinics = await Clinic.find(q, 'clinicId name clinicType address contact location').lean();
        clinics = sortByProximity(clinics, lat, lng);
        cache.set(cacheKey, clinics, 60);
        res.json(clinics);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Single clinic with details
router.get('/:clinicId', async (req, res) => {
    try {
        const cacheKey = `clinic:${req.params.clinicId}`;
        const hit = cache.get(cacheKey);
        if (hit) return res.json(hit);

        const c = await Clinic.findOne({ clinicId: req.params.clinicId }, '-password').lean();
        if (!c) return res.status(404).json({ message: 'Not found' });

        const [doctors, services] = await Promise.all([
            Doctor.find({ clinicId: c.clinicId }, '-password'),
            ClinicService.find({ clinicId: c.clinicId })
        ]);

        const payload = { ...c, doctors, services };
        cache.set(cacheKey, payload, 30);
        res.json(payload);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

const CLINIC_ALLOWED = ['name', 'contact', 'email', 'address', 'location', 'clinicType', 'gallery'];

// Update profile
router.put('/:clinicId', auth(['clinic']), async (req, res) => {
    try {
        if (req.user.ref !== req.params.clinicId) return res.status(403).json({ message: 'Forbidden' });
        const updates = pickAllowed(req.body, CLINIC_ALLOWED);
        const c = await Clinic.findOneAndUpdate({ clinicId: req.params.clinicId }, { $set: updates }, { new: true }).select('-password');
        cache.delByPrefix('clinic:list');
        cache.del(`clinic:${req.params.clinicId}`);
        res.json(c);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/:clinicId/appointment', async (req, res) => {
    try {
        const { name, phone, preferredTime } = req.body;
        if (!name?.trim() || !/^\d{10}$/.test(String(phone || ''))) {
            return error(res, 'Valid name and 10-digit phone required', 'VALIDATION', 400);
        }
        const clinic = await Clinic.findOne({ clinicId: req.params.clinicId });
        if (!clinic) return error(res, 'Clinic not found', 'NOT_FOUND', 404);

        await AppointmentRequest.create({
            clinicId: req.params.clinicId,
            name: name.trim(),
            phone: String(phone),
            preferredTime,
        });
        return success(res, {}, 'Request received. Clinic will contact you.', 201);
    } catch (e) {
        return error(res, e.message, 'ERROR', 500);
    }
});

router.get('/:clinicId/appointments', auth(['clinic']), async (req, res) => {
    try {
        if (req.user.ref !== req.params.clinicId) return error(res, 'Forbidden', 'FORBIDDEN', 403);
        const q = { clinicId: req.params.clinicId };
        if (req.query.status) q.status = req.query.status;
        const appointments = await AppointmentRequest.find(q).sort({ createdAt: -1 }).limit(100).lean();
        return success(res, appointments);
    } catch (e) {
        return error(res, e.message, 'ERROR', 500);
    }
});

router.put('/:clinicId/appointments/:requestId', auth(['clinic']), async (req, res) => {
    try {
        if (req.user.ref !== req.params.clinicId) return error(res, 'Forbidden', 'FORBIDDEN', 403);
        if (!mongoose.Types.ObjectId.isValid(req.params.requestId)) return error(res, 'Invalid request ID', 'VALIDATION', 400);
        const appt = await AppointmentRequest.findById(req.params.requestId);
        if (!appt || appt.clinicId !== req.params.clinicId) {
            return error(res, 'Appointment not found', 'NOT_FOUND', 404);
        }
        appt.status = req.body.status || appt.status;
        await appt.save();
        return success(res, appt, 'Appointment updated');
    } catch (e) {
        return error(res, e.message, 'ERROR', 500);
    }
});

// Internal stats
router.get('/:clinicId/stats', auth(['clinic']), async (req, res) => {
    try {
        if (req.user.ref !== req.params.clinicId) return res.status(403).json({ message: 'Forbidden' });
        const [doctors, services, announcements] = await Promise.all([
            Doctor.countDocuments({ clinicId: req.params.clinicId }),
            ClinicService.countDocuments({ clinicId: req.params.clinicId }),
            Announcement.countDocuments({
                clinicId: req.params.clinicId,
                $or: [
                    { expiresAt: { $gt: new Date() } },
                    { expiresAt: { $exists: false } },
                    { expiresAt: null }
                ]
            })
        ]);
        res.json({ doctors, services, activeAnnouncements: announcements });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Gallery upload
router.post('/:clinicId/gallery', auth(['clinic']), upload.array('images', 10), async (req, res) => {
    try {
        if (req.user.ref !== req.params.clinicId) return res.status(403).json({ message: 'Forbidden' });
        const urls = req.files.map(f => `/uploads/clinic/${f.filename}`);
        const c = await Clinic.findOneAndUpdate(
            { clinicId: req.params.clinicId }, 
            { $push: { gallery: { $each: urls } } }, 
            { new: true }
        ).select('-password');
        res.json(c);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Gallery delete
router.delete('/:clinicId/gallery', auth(['clinic']), async (req, res) => {
    try {
        if (req.user.ref !== req.params.clinicId) return res.status(403).json({ message: 'Forbidden' });
        const { imageUrl } = req.body;
        if (typeof imageUrl !== 'string') return res.status(400).json({ message: 'imageUrl must be a string' });
        const c = await Clinic.findOneAndUpdate(
            { clinicId: req.params.clinicId }, 
            { $pull: { gallery: imageUrl } }, 
            { new: true }
        ).select('-password');
        res.json(c);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Services routes
router.get('/:clinicId/services', async (req, res) => {
    try {
        res.json(await ClinicService.find({ clinicId: req.params.clinicId }));
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/:clinicId/services', auth(['clinic']), async (req, res) => {
    try {
        if (req.user.ref !== req.params.clinicId) return res.status(403).json({ message: 'Forbidden' });
        const s = new ClinicService({ ...pickAllowed(req.body, ['name', 'description', 'available']), clinicId: req.params.clinicId });
        await s.save();
        res.json(s);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/:clinicId/services/:serviceId', auth(['clinic']), async (req, res) => {
    try {
        if (req.user.ref !== req.params.clinicId) return res.status(403).json({ message: 'Forbidden' });
        const s = await ClinicService.findOneAndUpdate(
            { _id: req.params.serviceId, clinicId: req.params.clinicId },
            { available: req.body.available },
            { new: true }
        );
        res.json(s);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/:clinicId/services/:serviceId', auth(['clinic']), async (req, res) => {
    try {
        if (req.user.ref !== req.params.clinicId) return res.status(403).json({ message: 'Forbidden' });
        await ClinicService.deleteOne({ _id: req.params.serviceId, clinicId: req.params.clinicId });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
