const express = require('express');
const router = express.Router();
const { getAuditLogs } = require('../controllers/auditController');
const { protect, checkPermission } = require('../middlewares/auth');

router.get('/', protect, checkPermission('read:audit-logs'), getAuditLogs);

module.exports = router;
