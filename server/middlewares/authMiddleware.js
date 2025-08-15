const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const getIp = (req) => {
  let ip =
    req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  if (ip && ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }

  if (ip && ip.includes('::ffff:')) {
    ip = ip.split(':').pop();
  }
  return ip || 'unknown';
};

const verifyToken = (req, res, next) => {
  let token;
  let authHeader = req.headers.Authorization || req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer')) {
    token = authHeader.split(' ')[1];

    if (!token) {
      return res
        .status(401)
        .json({ message: 'No token, authorization denied' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Recompute fingerprint from current request
      const currentIp = getIp(req);
      const currentUserAgent = req.get('User-Agent') || 'unknown';
      const currentFingerprint = crypto
        .createHash('sha256')
        .update(`${currentIp}${currentUserAgent}`)
        .digest('hex');

      // Check if fingerprint matches the one in the token
      if (decoded.fp !== currentFingerprint) {
        return res
          .status(401)
          .json({ message: 'Invalid token (device mismatch)' });
      }

      // Make sure this matches how you created the token
      req.user = {
        id: decoded.userId, // This is crucial
        role: decoded.role,
        email: decoded.email,
      };

      next();
    } catch (err) {
      console.error('Token verification error:', err);
      return res.status(401).json({ message: 'Token is not valid' });
    }
  } else {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }
};

module.exports = verifyToken;
