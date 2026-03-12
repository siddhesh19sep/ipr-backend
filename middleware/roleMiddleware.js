const jwt = require("jsonwebtoken");

/**
 * Middleware to restrict access based on user roles
 * @param {string[]} roles Array of allowed roles (e.g., ['Admin', 'Verifier'])
 */
const verifyRole = (roles) => {
    return (req, res, next) => {
        // req.user is set by the existing authMiddleware 
        // which decodes the JWT token
        if (!req.user || !req.user.role) {
            return res.status(401).json({ message: "Access denied. Role not found in authentication token." });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Forbidden: You do not have the required permissions to access this resource." });
        }

        next();
    };
};

module.exports = verifyRole;
