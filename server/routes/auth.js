const router = require('express').Router();
const jwt = require('jsonwebtoken');
const Hospital = require('../models/Hospital');
const Doctor = require('../models/Doctor');
const Nurse = require('../models/Nurse');
const Ambulance = require('../models/Ambulance');
const SuperAdmin = require('../models/SuperAdmin');
const Pharmacy = require('../models/Pharmacy');
const Clinic = require('../models/Clinic');
const DiagnosticCenter = require('../models/DiagnosticCenter');
const OtpToken = require('../models/OtpToken');
const env = require('../config/env');
const { authLimiter, otpLimiter } = require('../config/rateLimit');
const { generateOtp, hashOtp, verifyOtp } = require('../utils/otp');
const { sendOtpEmail } = require('../utils/mailer');
const { success, error } = require('../utils/response');

const sign = (payload) => jwt.sign(payload, env.JWT_SECRET, { expiresIn: '24h' });

const OTP_EXPIRY_MS = (parseInt(env.OTP_EXPIRY_MIN, 10) || 10) * 60 * 1000;

const getModelAndFilter = (role, username) => {
    switch (role) {
        case 'hospital':
            return { Model: Hospital, filter: { hospitalId: username }, ref: 'hospitalId' };
        case 'doctor':
            return { Model: Doctor, filter: { doctorId: username }, ref: 'doctorId' };
        case 'nurse':
            return { Model: Nurse, filter: { nurseId: username }, ref: 'nurseId' };
        case 'ambulance':
            return { Model: Ambulance, filter: { ambulanceId: username }, ref: 'ambulanceId' };
        case 'superadmin':
            return { Model: SuperAdmin, filter: { username }, ref: 'username' };
        case 'pharmacy':
            return { Model: Pharmacy, filter: { pharmacyId: username }, ref: 'pharmacyId' };
        case 'clinic':
            return { Model: Clinic, filter: { clinicId: username }, ref: 'clinicId' };
        case 'diagnostic':
            return { Model: DiagnosticCenter, filter: { diagnosticId: username }, ref: 'diagnosticId', selectPassword: true };
        default:
            return null;
    }
};

const findUser = async (modelInfo) => {
    if (modelInfo.selectPassword) {
        return modelInfo.Model.findOne(modelInfo.filter).select('+password');
    }
    return modelInfo.Model.findOne(modelInfo.filter);
};

const isStrongPassword = (password) =>
    typeof password === 'string'
    && password.length >= 8
    && /[A-Za-z]/.test(password)
    && /\d/.test(password);

router.post('/login', authLimiter, async (req, res) => {
    try {
        let { role, username, password } = req.body;
        role = (role || '').toLowerCase().trim();
        username = (username || '').trim();

        const modelInfo = getModelAndFilter(role, username);
        if (!modelInfo) return res.status(400).json({ message: 'Invalid role' });

        const user = await findUser(modelInfo);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const ok = await user.comparePassword(password);
        if (!ok) return res.status(401).json({ message: 'Invalid password' });

        const payload = { role, id: user._id, ref: username };
        if (user.hospitalId) payload.hospitalId = user.hospitalId;
        if (user.clinicId) payload.clinicId = user.clinicId;
        if (role === 'hospital') payload.hospitalId = user.hospitalId || username;
        if (role === 'diagnostic') payload.diagnosticId = user.diagnosticId;

        const token = sign(payload);
        const userObj = {
            id: user._id,
            role,
            username,
            hospitalId: payload.hospitalId,
            clinicId: payload.clinicId,
            diagnosticId: payload.diagnosticId,
            name: user.name,
            email: user.email,
            emailVerified: user.emailVerified,
        };

        if (role === 'ambulance') {
            user.lastLogin = new Date();
            user.status = 'On Duty';
            await user.save();
        }

        res.json({ token, user: userObj, forcePasswordChange: !!user.forcePasswordChange });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

router.post('/request-otp', otpLimiter, async (req, res) => {
    try {
        const { role, username } = req.body;
        const modelInfo = getModelAndFilter(role, username);

        const generic = { success: true, message: 'OTP sent if account exists' };

        if (!modelInfo) return res.json(generic);

        const user = await modelInfo.Model.findOne(modelInfo.filter);
        if (!user?.email) return res.json(generic);

        const otp = generateOtp();
        const hashedOtp = await hashOtp(otp);
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

        await OtpToken.findOneAndUpdate(
            { email: user.email, purpose: 'password-change' },
            { otpHash: hashedOtp, attempts: 0, expiresAt },
            { upsert: true, new: true }
        );

        sendOtpEmail(user.email, otp).catch(() => {});
        return res.json(generic);
    } catch (e) {
        return res.json({ success: true, message: 'OTP sent if account exists' });
    }
});

router.post('/change-password', otpLimiter, async (req, res) => {
    try {
        const { role, username, otp, newPassword } = req.body;

        if (!isStrongPassword(newPassword)) {
            return error(
                res,
                'Password must be at least 8 characters with one letter and one number',
                'VALIDATION',
                400
            );
        }

        const modelInfo = getModelAndFilter(role, username);
        if (!modelInfo) return error(res, 'Invalid role', 'VALIDATION', 400);

        const user = await modelInfo.Model.findOne(modelInfo.filter);
        if (!user) return error(res, 'User not found', 'NOT_FOUND', 404);

        const email = user.email;
        if (!email) return error(res, 'No registered email found for this user', 'VALIDATION', 400);

        const tokenDoc = await OtpToken.findOne({ email, purpose: 'password-change' }).sort({ createdAt: -1 });
        if (!tokenDoc || tokenDoc.expiresAt < new Date()) {
            if (tokenDoc) await OtpToken.deleteOne({ _id: tokenDoc._id });
            return error(res, 'Invalid or expired OTP', 'OTP_EXPIRED', 400);
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

        user.password = newPassword;
        if (user.forcePasswordChange !== undefined) user.forcePasswordChange = false;
        await user.save();
        await OtpToken.deleteOne({ _id: tokenDoc._id });

        return success(res, {}, 'Password updated successfully');
    } catch (e) {
        return error(res, e.message, 'ERROR', 500);
    }
});

module.exports = router;
