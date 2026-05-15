const router = require('express').Router();
const auth = require('../middleware/auth');
const EmergencyRequest = require('../models/EmergencyRequest');
const Bed = require('../models/Bed');

router.get('/', auth(['hospital', 'ambulance', 'superadmin']), async (req, res) => {
    try {
        const { hospitalId, ambulanceId, status } = req.query;
        const q = {};
        if (hospitalId) q.hospitalId = hospitalId;
        if (ambulanceId) q.ambulanceId = ambulanceId;
        if (status) q.status = status;
        res.json(await EmergencyRequest.find(q).sort({ createdAt: -1 }));
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/', auth(['hospital', 'ambulance', 'superadmin']), async (req, res) => {
    try {
        const { hospitalId, patientName, emergencyType } = req.body;
        if (!hospitalId || !patientName || !emergencyType) {
            return res.status(400).json({ message: 'Hospital ID, Patient Name, and Emergency Type are required' });
        }
        const er = new EmergencyRequest(req.body);
        await er.save();
        // Emit via socket (referenced in server.js)
        if (global.io) global.io.to(req.body.hospitalId).emit('emergency:new', er);
        res.json(er);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/:id/status', auth(['hospital']), async (req, res) => {
    try {
        const { status, transferredTo, denialReason, replyMessage, assignedDoctor } = req.body;
        const update = { status, updatedAt: new Date() };
        if (transferredTo) update.transferredTo = transferredTo;
        if (denialReason) update.denialReason = denialReason;
        if (replyMessage) update.replyMessage = replyMessage;
        if (assignedDoctor) update.assignedDoctor = assignedDoctor;

        const er = await EmergencyRequest.findByIdAndUpdate(req.params.id, update, { new: true });

        if (status === 'Transferred' && transferredTo) {
            if (er.referredFrom === transferredTo) {
                return res.status(400).json({ message: 'Cannot refer patient back to the origin hospital' });
            }
            // Clone the request for the receiving hospital
            const cloneData = er.toObject();
            delete cloneData._id;
            delete cloneData.createdAt;
            delete cloneData.updatedAt;

            cloneData.hospitalId = transferredTo;
            cloneData.referredFrom = er.hospitalId; // Target hospital knows who sent it
            cloneData.status = 'Pending';
            cloneData.transferredTo = undefined;
            cloneData.denialReason = undefined;
            cloneData.replyMessage = undefined;
            cloneData.assignedDoctor = undefined;
            cloneData.bedId = undefined;

            const newReq = await EmergencyRequest.create(cloneData);
            if (global.io) {
                global.io.to(transferredTo).emit('emergency:new', newReq);
            }
        }

        if (global.io) {
            global.io.to(er.hospitalId).emit('emergency:update', er);
            if (er.ambulanceId) global.io.to(er.ambulanceId).emit('emergency:update', er);
        }
        res.json(er);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/:id/admit', auth(['hospital']), async (req, res) => {
    try {
        const { bedId, patientName, assignedDoctor, replyMessage } = req.body;
        const update = { status: 'Admitted', bedId, updatedAt: new Date() };
        if (assignedDoctor) update.assignedDoctor = assignedDoctor;
        if (replyMessage) update.replyMessage = replyMessage;

        const er = await EmergencyRequest.findByIdAndUpdate(req.params.id, update, { new: true });
        if (bedId) await Bed.findOneAndUpdate({ bedId }, { status: 'Occupied', patientName: patientName || er.patientName, admittedAt: new Date(), updatedAt: new Date() });
        if (global.io) global.io.to(er.hospitalId).emit('bed:update', { bedId });
        res.json(er);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
