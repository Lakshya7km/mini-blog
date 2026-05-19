const router = require('express').Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const SuperAdmin = require('../models/SuperAdmin');
const Hospital = require('../models/Hospital');
const Pharmacy = require('../models/Pharmacy');
const Clinic = require('../models/Clinic');
const DiagnosticCenter = require('../models/DiagnosticCenter');
const Doctor = require('../models/Doctor');
const Nurse = require('../models/Nurse');
const Ambulance = require('../models/Ambulance');
const OtpToken = require('../models/OtpToken');
const cache = require('../utils/cache');
const { generateOtp, hashOtp, verifyOtp } = require('../utils/otp');
const { sendOtpEmail } = require('../utils/mailer');
const { success, error } = require('../utils/response');

const COLLECTIONS = {
    hospitals: Hospital,
    pharmacies: Pharmacy,
    clinics: Clinic,
    diagnostics: DiagnosticCenter,
    doctors: Doctor,
    nurses: Nurse,
    ambulances: Ambulance,
};

const cacheColKey = (col) => `${col}:list`;

router.get('/stats', auth(['superadmin']), async (req, res) => {
    try {
        const [hospitals, pharmacies, clinics, diagnostics, doctors, nurses, ambulances] = await Promise.all([
            Hospital.countDocuments(),
            Pharmacy.countDocuments(),
            Clinic.countDocuments(),
            DiagnosticCenter.countDocuments(),
            Doctor.countDocuments(),
            Nurse.countDocuments(),
            Ambulance.countDocuments(),
        ]);
        res.json({ hospitals, pharmacies, clinics, diagnostics, doctors, nurses, ambulances });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

const HOSPITAL_ALLOWED = ['name', 'contact', 'email', 'address', 'location', 'services', 'facilities', 'insurance', 'tests', 'googleMapUrl', 'gallery'];

router.post('/register-hospital', auth(['superadmin']), async (req, res) => {
    try {
        const { hospitalId, password } = req.body;
        if (await Hospital.findOne({ hospitalId })) return res.status(400).json({ message: 'Hospital ID exists' });
        if (!password) return res.status(400).json({ message: 'Password is required' });
        const h = new Hospital({ hospitalId, password, ...pickAllowed(req.body, HOSPITAL_ALLOWED) });
        await h.save();
        cache.del('hospitals:list');
        res.json({ message: 'Hospital registered', hospital: { hospitalId: h.hospitalId, name: h.name } });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

const PHARMACY_ALLOWED = ['name', 'contact', 'email', 'address', 'location', 'openingHours', 'licenseNumber'];

router.post('/register-pharmacy', auth(['superadmin']), async (req, res) => {
    try {
        const { pharmacyId, password } = req.body;
        if (await Pharmacy.findOne({ pharmacyId })) return res.status(400).json({ message: 'Pharmacy ID exists' });
        if (!password) return res.status(400).json({ message: 'Password is required' });
        const p = new Pharmacy({ pharmacyId, password, ...pickAllowed(req.body, PHARMACY_ALLOWED) });
        await p.save();
        cache.delByPrefix('pharmacy:list');
        res.json({ message: 'Pharmacy registered', pharmacy: { pharmacyId: p.pharmacyId, name: p.name } });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

const CLINIC_ALLOWED = ['name', 'contact', 'email', 'address', 'location', 'specialties', 'openingHours'];

router.post('/register-clinic', auth(['superadmin']), async (req, res) => {
    try {
        const { clinicId, password } = req.body;
        if (await Clinic.findOne({ clinicId })) return res.status(400).json({ message: 'Clinic ID exists' });
        if (!password) return res.status(400).json({ message: 'Password is required' });
        const c = new Clinic({ clinicId, password, ...pickAllowed(req.body, CLINIC_ALLOWED) });
        await c.save();
        cache.delByPrefix('clinic:list');
        res.json({ message: 'Clinic registered', clinic: { clinicId: c.clinicId, name: c.name } });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/register-diagnostic', auth(['superadmin']), async (req, res) => {
    try {
        const { diagnosticId, password, name, email, contact, address, specialties, openingHours, ...rest } = req.body;
        if (await DiagnosticCenter.findOne({ diagnosticId })) {
            return error(res, 'Diagnostic ID exists', 'DUPLICATE', 400);
        }
        if (!password) return error(res, 'Password is required', 'VALIDATION', 400);
        const center = new DiagnosticCenter({
            diagnosticId,
            name,
            password,
            email,
            contact,
            address,
            specialties,
            openingHours,
        });
        await center.save();
        cache.delByPrefix('diagnostic:list');
        return success(res, { diagnosticId: center.diagnosticId, name: center.name }, 'Diagnostic center registered', 201);
    } catch (e) {
        return error(res, e.message, 'ERROR', 500);
    }
});

router.get('/master/:col', auth(['superadmin']), async (req, res) => {
    try {
        const Model = COLLECTIONS[req.params.col];
        if (!Model) return res.status(404).json({ message: 'Collection not found' });
        res.json(await Model.find({}, '-password').limit(200));
    } catch (e) { res.status(500).json({ message: e.message }); }
});

const isValidEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

router.post('/send-email-otp', auth(['superadmin']), async (req, res) => {
    try {
        const { newEmail } = req.body;
        if (!isValidEmail(newEmail)) return error(res, 'Invalid email format', 'VALIDATION', 400);

        const admin = await SuperAdmin.findById(req.user.id);
        admin.pendingEmail = newEmail;
        await admin.save();

        const otp = generateOtp();
        const hashedOtp = await hashOtp(otp);

        await OtpToken.findOneAndUpdate(
            { email: newEmail, purpose: 'email-verify' },
            { otpHash: hashedOtp, attempts: 0, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
            { upsert: true, new: true }
        );

        sendOtpEmail(newEmail, otp).catch(() => {});
        res.json({ message: 'OTP sent to the provided email' });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/verify-email-otp', auth(['superadmin']), async (req, res) => {
    try {
        const { otp } = req.body;

        const admin = await SuperAdmin.findById(req.user.id);
        if (!admin.pendingEmail) return error(res, 'No pending email verification', 'VALIDATION', 400);

        const tokenDoc = await OtpToken.findOne({ email: admin.pendingEmail, purpose: 'email-verify' });
        if (!tokenDoc || tokenDoc.expiresAt < new Date()) {
            if (tokenDoc) await OtpToken.deleteOne({ _id: tokenDoc._id });
            return error(res, 'OTP expired. Request a new one.', 'OTP_EXPIRED', 400);
        }

        const isValid = await verifyOtp(otp, tokenDoc.otpHash);
        if (!isValid) {
            tokenDoc.attempts = (tokenDoc.attempts || 0) + 1;
            await tokenDoc.save();
            if (tokenDoc.attempts >= 5) {
                await OtpToken.deleteOne({ _id: tokenDoc._id });
                return error(res, 'Too many failed attempts. Request a new OTP.', 'OTP_LOCKED', 400);
            }
            return error(res, 'Invalid OTP', 'OTP_INVALID', 400);
        }

        admin.email = admin.pendingEmail;
        admin.emailVerified = true;
        admin.pendingEmail = undefined;
        await admin.save();
        await OtpToken.deleteOne({ _id: tokenDoc._id });

        res.json({ email: admin.email, emailVerified: true });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/request-delete-otp', auth(['superadmin']), async (req, res) => {
    try {
        const { col, id } = req.body;
        const Model = COLLECTIONS[col];
        if (!Model) return error(res, 'Collection not found', 'NOT_FOUND', 404);
        if (!mongoose.Types.ObjectId.isValid(id)) return error(res, 'Invalid ID', 'VALIDATION', 400);

        const doc = await Model.findById(id);
        if (!doc) return error(res, 'Document not found.', 'NOT_FOUND', 404);

        const admin = await SuperAdmin.findById(req.user.id);
        const email = admin.email || process.env.EMAIL_USER;
        if (!email) return error(res, 'Superadmin email not configured', 'CONFIG', 500);

        const otp = generateOtp();
        const hashedOtp = await hashOtp(otp);

        await OtpToken.findOneAndUpdate(
            { email, purpose: 'master-delete' },
            { otpHash: hashedOtp, attempts: 0, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
            { upsert: true, new: true }
        );

        sendOtpEmail(email, otp).catch(() => {});
        res.json({ message: 'OTP sent to superadmin email for deletion' });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/master/:col/:id', auth(['superadmin']), async (req, res) => {
    try {
        const { otp, confirmation } = req.body;
        if (confirmation !== 'DELETE') {
            return error(res, 'Send confirmation: "DELETE"', 'VALIDATION', 400);
        }

        const admin = await SuperAdmin.findById(req.user.id);
        const email = admin.email || process.env.EMAIL_USER;

        const tokenDoc = await OtpToken.findOne({ email, purpose: 'master-delete' }).sort({ createdAt: -1 });
        if (!tokenDoc || tokenDoc.expiresAt < new Date()) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        const isValid = await verifyOtp(otp, tokenDoc.otpHash);
        if (!isValid) {
            tokenDoc.attempts = (tokenDoc.attempts || 0) + 1;
            await tokenDoc.save();
            if (tokenDoc.attempts >= 5) {
                await OtpToken.deleteOne({ _id: tokenDoc._id });
                return error(res, 'Too many failed attempts. Request a new OTP.', 'OTP_LOCKED', 400);
            }
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        const Model = COLLECTIONS[req.params.col];
        if (!Model) return res.status(404).json({ message: 'Collection not found' });
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return error(res, 'Invalid ID', 'VALIDATION', 400);

        const doc = await Model.findById(req.params.id);
        if (!doc) return error(res, 'Document not found.', 'NOT_FOUND', 404);

        await Model.findByIdAndDelete(req.params.id);
        await OtpToken.deleteOne({ _id: tokenDoc._id });

        cache.delByPrefix(cacheColKey(req.params.col));
        const idField = doc.hospitalId || doc.pharmacyId || doc.clinicId || doc.diagnosticId || doc.doctorId || doc.nurseId || doc.ambulanceId;
        if (idField) cache.del(`${req.params.col.replace(/s$/, '')}:${idField}`);

        res.json({ message: 'Deleted' });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
