const jwt = require('jsonwebtoken');
const env = require('../config/env');

const auth = (roles = []) => (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer '))
        return res.status(401).json({ message: 'Unauthorized' });

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, env.JWT_SECRET);
        
        // Role check
        if (roles.length && !roles.includes(decoded.role))
            return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
        
        // SuperAdmin Write Block (allow only GET or DELETE on specific master routes)
        // Since superadmin uses specific admin routes for writes, if a superadmin hits a non-admin 
        // write endpoint, they should be blocked.
        if (decoded.role === 'superadmin') {
            const isWriteRequest = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
            const isAdminRoute = req.originalUrl.includes('/api/admin/');
            
            if (isWriteRequest && !isAdminRoute) {
                return res.status(403).json({ message: 'Forbidden: SuperAdmin has read-only access here' });
            }
        }

        req.user = decoded;
        next();
    } catch {
        res.status(401).json({ message: 'Invalid token' });
    }
};

module.exports = auth;
