const mongoose = require('mongoose');

const emergencySchema = new mongoose.Schema({
    hospitalId: { type: String, required: true },
    ambulanceId: String,
    source: { type: String, enum: ['Ambulance', 'Public'], default: 'Public' },
    patientName: { type: String, required: true },
    age: Number,
    gender: String,
    mobile: String,
    address: String,
    emergencyType: String,
    equipment: String,
    symptoms: String,
    ambulanceNotes: String, // from ambulance UI
    condition: String, // from ambulance UI
    reason: String,
    denialReason: String, // added by reception
    assignedDoctor: String, // added by reception
    replyMessage: String, // added by reception
    status: { type: String, enum: ['Pending', 'Accepted', 'Rejected', 'Transferred', 'Admitted', 'En Route', 'Arrived', 'Referred', 'Completed'], default: 'Pending' },
    transferredTo: String,
    referredFrom: String, // Source hospital that transferred the patient
    bedId: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('EmergencyRequest', emergencySchema);
