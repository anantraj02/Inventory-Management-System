const express = require('express');
const router = express.Router();
const { createRequest, updateRequestStatus, getRequests } = require('../controllers/requestController');
const { protect, checkPermission } = require('../middlewares/auth');
const { requestRules } = require('../validators/rules');
const validate = require('../validators/validate');

router.use(protect);

router.route('/')
  .get(checkPermission('read:requests'), getRequests)
  .post(checkPermission('write:requests'), requestRules, validate, createRequest);

router.put('/:id/status', checkPermission('approve:requests'), updateRequestStatus);

module.exports = router;
