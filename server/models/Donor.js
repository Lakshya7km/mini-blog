const mongoose = require('mongoose');

const donorSchema = new mongoose.Schema({
    name:          { type: String, required: true },
    contact:       { type: String, required: true },
    bloodType:     { type: String },
    hospitalId:    { type: String, required: true },
    city:          { type: String },
    remarks:       { type: String },
    status:        { type: String, enum: ['Pending', 'Contacted', 'Received', 'Cancelled', 'Donated'], default: 'Pending' },
    createdAt:     { type: Date, default: Date.now },
    updatedAt:     { type: Date, default: Date.now }
});

module.exports = mongoose.model('Donor', donorSchema);
