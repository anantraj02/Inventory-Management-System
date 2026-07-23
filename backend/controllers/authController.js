const User = require('../models/User');
const Role = require('../models/Role');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logAudit = require('../utils/auditLogger');

// Generate JWT Access Token
const generateAccessToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_ACCESS_SECRET || 'super_secret_access_token_123456789!', {
    expiresIn: '15m' // short-lived
  });
};

// Generate JWT Refresh Token
const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_token_987654321!', {
    expiresIn: '7d' // long-lived
  });
};

// @desc    Auth user & get tokens
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  const { emailOrEmpId, password } = req.body;

  try {
    // Check for user by email or employeeId
    const user = await User.findOne({
      $or: [
        { email: emailOrEmpId.toLowerCase() },
        { employeeId: emailOrEmpId.toUpperCase() }
      ]
    }).populate('role').populate('branch');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Your account is deactivated' });
    }

    // Create tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Set refresh token as cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction, // HTTPS in production
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Log login activity
    await logAudit({
      userId: user._id,
      branchId: user.branch ? user.branch._id : null,
      action: 'LOGIN',
      module: 'Auth',
      recordId: user._id,
      details: { email: user.email, employeeId: user.employeeId },
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      accessToken,
      user: {
        _id: user._id,
        employeeId: user.employeeId,
        name: user.name,
        email: user.email,
        role: user.role,
        branch: user.branch
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user & clear cookie
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  try {
    if (req.user) {
      await logAudit({
        userId: req.user._id,
        branchId: req.user.branch ? req.user.branch._id : null,
        action: 'LOGOUT',
        module: 'Auth',
        recordId: req.user._id,
        details: 'User logged out',
        ipAddress: req.ip
      });
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      sameSite: 'strict'
    });

    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
exports.refresh = async (req, res, next) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ success: false, message: 'No refresh token provided' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_token_987654321!');

    const user = await User.findById(decoded.id).populate('role').populate('branch');

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid token or inactive user' });
    }

    const accessToken = generateAccessToken(user._id);

    res.status(200).json({
      success: true,
      accessToken,
      user: {
        _id: user._id,
        employeeId: user.employeeId,
        name: user.name,
        email: user.email,
        role: user.role,
        branch: user.branch
      }
    });
  } catch (error) {
    res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'strict' });
    return res.status(401).json({ success: false, message: 'Token refresh failed', error: error.message });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No user found with that email' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set expire (1 hour)
    user.resetPasswordExpire = Date.now() + 60 * 60 * 1000;

    await user.save();

    // Since sending real email requires credentials, we mock it by returning the reset token.
    // In a production system, you would send an email with a link like: `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`
    console.log(`[MOCK EMAIL SENT to ${email}]: Reset Token is "${resetToken}"`);

    res.status(200).json({
      success: true,
      message: 'Email sent with reset instructions (Simulated)',
      resetToken // Returned for testing convenience
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password/:resetToken
// @access  Public
exports.resetPassword = async (req, res, next) => {
  const { resetToken } = req.params;
  const { password } = req.body;

  try {
    // Hash token to match saved token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({ success: true, message: 'Password reset successful. You can now login.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('role').populate('branch');
    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};
