import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Middleware to verify JWT token and optional role check.
 * @param {Array} allowedRoles - roles allowed to access this route
 */
export const verifyToken = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      console.log('verifyToken called, headers:', req.headers);

      const authHeader = req.headers['authorization']; // Expect: Bearer <token>
      if (!authHeader) {
        console.warn('No Authorization header');
        return res.status(401).json({ message: 'No token provided' });
      }

      const parts = authHeader.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        console.warn('Malformed Authorization header');
        return res.status(401).json({ message: 'Invalid token format' });
      }

      const token = parts[1];
      if (!token) {
        console.warn('Token missing after Bearer');
        return res.status(401).json({ message: 'Token missing' });
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded; // Attach user info to request

      console.log('Token verified:', decoded);

      // Role-based access check
      if (allowedRoles.length && !allowedRoles.includes(decoded.role)) {
        console.warn('User role not allowed:', decoded.role);
        return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
      }

      next(); // ✅ Pass control to the next middleware
    } catch (err) {
      console.error('Token verification error:', err.message);
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
  };
};
