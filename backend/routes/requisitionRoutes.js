const express = require('express');
const router = express.Router();
const { createRequisition, updateRequisitionStatus, getRequisitions } = require('../controllers/requisitionController');
const { protect, checkPermission } = require('../middlewares/auth');

router.use(protect);

router.route('/')
  .get(checkPermission('read:requisitions'), getRequisitions)
  .post(checkPermission('write:requisitions'), createRequisition);

router.put('/:id/status', updateRequisitionStatus);

module.exports = router;
