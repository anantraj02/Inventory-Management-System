const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');

// Protect routes - JWT authentication
exports.protect = async (req, res, next) => {
  let token;

  // 1. Get token from authorization header (Bearer <token>)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } 
  // 2. Get token from cookies
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // Check if token exists
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'super_secret_access_token_123456789!');

    // Get user from database, populate role
    const user = await User.findById(decoded.id).populate('role').populate('branch');

    if (!user) {
      return res.status(401).json({ success: false, message: 'User no longer exists' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Your account is deactivated' });
    }

    // Attach user object to request
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route', error: error.message });
  }
};

// Grant access to specific permissions
exports.checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ success: false, message: 'Access denied: Role permissions not found' });
    }

    const { name, permissions } = req.user.role;

    // Main Admin gets a pass on everything
    if (name === 'Main Admin') {
      return next();
    }

    // Check if the role permissions list includes the required permission
    if (permissions && permissions.includes(permission)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access denied: You do not have permission to [${permission}]`
    });
  };
};

// Roles fallback check (if ever needed alongside permissions)
exports.checkRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role || !roles.includes(req.user.role.name)) {
      return res.status(403).json({
        success: false,
        message: `Role unauthorized. Required: ${roles.join(', ')}`
      });
    }
    next();
  };
};
