const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    hospitalId: { type: String, required: true },
    name: { type: String, required: true },
    bloodType: { type: String, required: true },
    contact: { type: String, required: true },
    city: { type: String, required: true },
    unitsDonated: { type: Number, default: 0 },
    status: { type: String, enum: ['Pending', 'Contacted', 'Received', 'Cancelled'], default: 'Pending' },
    remarks: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

schema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

module.exports = mongoose.model('Donor', schema);
