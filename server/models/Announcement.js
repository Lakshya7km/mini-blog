const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    title:         { type: String, required: true },
    message:       { type: String, required: true },
    hospitalId:    { type: String },   // set if from hospital
    clinicId:      { type: String },   // set if from clinic
    expiresAt:     { type: Date },
    createdAt:     { type: Date, default: Date.now }
});

announcementSchema.index({ expiresAt: 1 });
announcementSchema.index({ hospitalId: 1 });
announcementSchema.index({ clinicId: 1 });

module.exports = mongoose.model('Announcement', announcementSchema);
