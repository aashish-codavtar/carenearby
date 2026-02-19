const jwt  = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Verifies the Bearer JWT from the Authorization header.
 * Attaches the full User document to req.user.
 */
async function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = header.slice(7); // remove "Bearer "

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(payload.userId).lean();

    if (!user) return res.status(401).json({ error: 'User not found' });

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Factory: returns middleware that restricts access to users with one of the given roles.
 * Must be used after `authenticate`.
 *
 * @example
 *   router.get('/secret', authenticate, requireRole('ADMIN'), handler)
 *   router.get('/job',    authenticate, requireRole('PSW', 'ADMIN'), handler)
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
