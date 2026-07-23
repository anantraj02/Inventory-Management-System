const express = require('express');
const router = express.Router();
const { createTransfer, updateTransferStatus, getTransfers } = require('../controllers/transferController');
const { protect, checkPermission } = require('../middlewares/auth');
const { transferRules } = require('../validators/rules');
const validate = require('../validators/validate');

router.use(protect);

router.route('/')
  .get(checkPermission('read:transfers'), getTransfers)
  .post(checkPermission('write:transfers'), transferRules, validate, createTransfer);

router.put('/:id/status', updateTransferStatus); // Permission checks are performed dynamically inside the controller

module.exports = router;
