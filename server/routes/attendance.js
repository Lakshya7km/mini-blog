const router = require('express').Router();
const auth = require('../middleware/auth');
const Attendance = require('../models/Attendance');
const Doctor = require('../models/Doctor');
const { success, error } = require('../utils/response');

const todayStr = () => {
    const now = new Date();
    const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    return ist.toISOString().slice(0, 10);
};

const emitDoctorAvailability = (doctor, availability) => {
    if (!global.io || !doctor?.hospitalId) return;
    global.io.to(`hospital:${doctor.hospitalId}`).emit('doctor:availability', {
        doctorId: doctor.doctorId,
        hospitalId: doctor.hospitalId,
        name: doctor.name,
        specialization: doctor.specialization,
        availability,
    });
};

router.post('/self', auth(['doctor']), async (req, res) => {
    try {
        const doctorId = req.user.ref;
        const { status } = req.body;
        if (!['Present', 'Absent'].includes(status)) {
            return error(res, 'status must be Present or Absent', 'VALIDATION', 400);
        }

        const doctor = await Doctor.findOne({ doctorId });
        if (!doctor?.hospitalId) {
            return error(res, 'Doctor is not assigned to a hospital', 'FORBIDDEN', 403);
        }

        const today = todayStr();
        const existing = await Attendance.findOne({ doctorId, date: today });
        if (existing && existing.markedBy === 'doctor') {
            return error(res, 'Already marked today.', 'CONFLICT', 409);
        }

        const attendance = await Attendance.findOneAndUpdate(
            { doctorId, date: today },
            {
                status,
                markedBy: 'doctor',
                markedAt: new Date(),
                hospitalId: doctor.hospitalId,
            },
            { upsert: true, new: true }
        );

        const availability = status === 'Present' ? 'Available' : 'Unavailable';
        await Doctor.findOneAndUpdate({ doctorId }, { availability });

        emitDoctorAvailability(doctor, availability);
        return success(res, attendance, 'Attendance recorded');
    } catch (e) {
        return error(res, e.message, 'ERROR', 500);
    }
});

router.post('/override', auth(['hospital']), async (req, res) => {
    try {
        const hospitalId = req.user.hospitalId || req.user.ref;
        const { doctorId, date, status } = req.body;
        if (!doctorId || !date || !['Present', 'Absent'].includes(status)) {
            return error(res, 'doctorId, date, and status are required', 'VALIDATION', 400);
        }

        const doctor = await Doctor.findOne({ doctorId, hospitalId });
        if (!doctor) return error(res, 'Doctor not in your hospital.', 'FORBIDDEN', 403);

        const attendance = await Attendance.findOneAndUpdate(
            { doctorId, date },
            {
                status,
                markedBy: 'reception',
                markedAt: new Date(),
                hospitalId: doctor.hospitalId,
            },
            { upsert: true, new: true }
        );

        const availability = status === 'Present' ? 'Available' : 'Unavailable';
        await Doctor.findOneAndUpdate({ doctorId }, { availability });

        emitDoctorAvailability(doctor, availability);
        return success(res, attendance, 'Attendance updated');
    } catch (e) {
        return error(res, e.message, 'ERROR', 500);
    }
});

router.get('/:doctorId', auth(['doctor', 'hospital']), async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { from, to } = req.query;

        if (req.user.role === 'doctor' && req.user.ref !== doctorId) {
            return error(res, 'Forbidden', 'FORBIDDEN', 403);
        }

        if (req.user.role === 'hospital') {
            const hospitalId = req.user.hospitalId || req.user.ref;
            const doctor = await Doctor.findOne({ doctorId, hospitalId });
            if (!doctor) return error(res, 'Doctor not in your hospital.', 'FORBIDDEN', 403);
        }

        const q = { doctorId };
        if (from || to) {
            q.date = {};
            if (from) q.date.$gte = from;
            if (to) q.date.$lte = to;
        }

        const records = await Attendance.find(q).sort({ date: -1 }).limit(31).lean();
        return success(res, records);
    } catch (e) {
        return error(res, e.message, 'ERROR', 500);
    }
});

module.exports = router;
