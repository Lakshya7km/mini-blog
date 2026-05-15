const router = require('express').Router();
const auth = require('../middleware/auth');
const Announcement = require('../models/Announcement');

router.get('/', async (req, res) => {
    try {
        const { hospitalId } = req.query;
        const q = hospitalId ? { hospitalId } : {};
        // Filter out expired announcements
        q.$or = [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }];
        res.json(await Announcement.find(q).sort({ createdAt: -1 }));
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/', auth(['hospital']), async (req, res) => {
    try {
        const a = await new Announcement(req.body).save();
        if (global.io) global.io.to(req.body.hospitalId).emit('announcement:new', a);
        res.json(a);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/:id', auth(['hospital', 'superadmin']), async (req, res) => {
    try {
        await Announcement.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
