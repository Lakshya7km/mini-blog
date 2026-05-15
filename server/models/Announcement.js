const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    hospitalId: { type: String, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
    expiresAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Announcement', announcementSchema);

