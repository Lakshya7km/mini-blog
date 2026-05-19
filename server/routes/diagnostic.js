const router = require('express').Router();
const auth = require('../middleware/auth');
const DiagnosticCenter = require('../models/DiagnosticCenter');
const cache = require('../utils/cache');
const { sortByProximity } = require('../utils/proximity');
const { success, error } = require('../utils/response');

const pickAllowed = (body, allowed) => {
    const picked = {};
    for (const key of allowed) {
        if (body[key] !== undefined) picked[key] = body[key];
    }
    return picked;
};

const ROOM_PREFIX = 'diagnostic';

router.get('/', async (req, res) => {
    try {
        const { city, specialty, lat, lng } = req.query;
        const cacheKey = `diagnostic:list:${city || ''}:${specialty || ''}:${lat || ''}:${lng || ''}`;
        const hit = cache.get(cacheKey);
        if (hit) return res.json(hit);

        const filter = { isActive: { $ne: false } };
        if (city) {
            const escaped = city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            filter['address.city'] = new RegExp(escaped, 'i');
        }
        if (specialty) filter.specialties = specialty;

        let centers = await DiagnosticCenter.find(filter, '-password').lean();
        centers = sortByProximity(centers, lat, lng);

        cache.set(cacheKey, centers, 60);
        res.json(centers);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

router.get('/:diagnosticId', async (req, res) => {
    try {
        const cacheKey = `diagnostic:${req.params.diagnosticId}`;
        const hit = cache.get(cacheKey);
        if (hit) return res.json(hit);

        const center = await DiagnosticCenter.findOne(
            { diagnosticId: req.params.diagnosticId },
            '-password'
        ).lean();
        if (!center) return res.status(404).json({ success: false, message: 'Not found' });

        cache.set(cacheKey, center, 30);
        res.json(center);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

const DIAGNOSTIC_ALLOWED = ['name', 'contact', 'email', 'address', 'specialties', 'openingHours', 'isActive'];

router.put('/:diagnosticId', auth(['diagnostic', 'combined']), async (req, res) => {
    try {
        if (req.user.ref !== req.params.diagnosticId) {
            return error(res, 'Forbidden', 'FORBIDDEN', 403);
        }
        const updates = pickAllowed(req.body, DIAGNOSTIC_ALLOWED);
        const center = await DiagnosticCenter.findOneAndUpdate(
            { diagnosticId: req.params.diagnosticId },
            { $set: updates },
            { new: true }
        ).select('-password');
        cache.delByPrefix('diagnostic:list');
        cache.del(`diagnostic:${req.params.diagnosticId}`);
        return success(res, center, 'Profile updated');
    } catch (e) {
        return error(res, e.message, 'ERROR', 500);
    }
});

router.post('/:diagnosticId/imageUrls', auth(['diagnostic', 'combined']), async (req, res) => {
    try {
        if (req.user.ref !== req.params.diagnosticId) {
            return error(res, 'Forbidden', 'FORBIDDEN', 403);
        }
        const { imageUrl } = req.body;
        if (!imageUrl) return error(res, 'imageUrl required', 'VALIDATION', 400);

        const center = await DiagnosticCenter.findOne({ diagnosticId: req.params.diagnosticId });
        if (!center) return error(res, 'Not found', 'NOT_FOUND', 404);
        if ((center.imageUrls || []).length >= 10) {
            return error(res, 'Maximum 10 images allowed', 'LIMIT', 400);
        }

        center.imageUrls = [...(center.imageUrls || []), imageUrl];
        await center.save();

        cache.delByPrefix('diagnostic:list');
        cache.del(`diagnostic:${req.params.diagnosticId}`);
        return success(res, center.toObject(), 'Image added');
    } catch (e) {
        return error(res, e.message, 'ERROR', 500);
    }
});

router.delete('/:diagnosticId/imageUrls', auth(['diagnostic', 'combined']), async (req, res) => {
    try {
        if (req.user.ref !== req.params.diagnosticId) {
            return error(res, 'Forbidden', 'FORBIDDEN', 403);
        }
        const { imageUrl } = req.body;
        if (typeof imageUrl !== 'string') return error(res, 'imageUrl must be a string', 'VALIDATION', 400);
        const center = await DiagnosticCenter.findOneAndUpdate(
            { diagnosticId: req.params.diagnosticId },
            { $pull: { imageUrls: imageUrl } },
            { new: true }
        ).select('-password');

        cache.delByPrefix('diagnostic:list');
        cache.del(`diagnostic:${req.params.diagnosticId}`);
        return success(res, center, 'Image removed');
    } catch (e) {
        return error(res, e.message, 'ERROR', 500);
    }
});

module.exports = router;
