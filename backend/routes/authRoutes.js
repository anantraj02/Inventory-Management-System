const express = require('express');
const router = express.Router();
const { login, logout, refresh, forgotPassword, resetPassword, getMe } = require('../controllers/authController');
const { protect } = require('../middlewares/auth');
const { loginRules, forgotPasswordRules, resetPasswordRules } = require('../validators/rules');
const validate = require('../validators/validate');

router.post('/login', loginRules, validate, login);
router.post('/logout', protect, logout);
router.post('/refresh', refresh);
router.post('/forgot-password', forgotPasswordRules, validate, forgotPassword);
router.post('/reset-password/:resetToken', resetPasswordRules, validate, resetPassword);
router.get('/me', protect, getMe);

module.exports = router;
