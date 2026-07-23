const express = require('express');
const router = express.Router();
const { getVendors, getVendor, createVendor, updateVendor, deleteVendor } = require('../controllers/vendorController');
const { protect, checkPermission } = require('../middlewares/auth');
const { vendorRules } = require('../validators/rules');
const validate = require('../validators/validate');

router.use(protect);

router.route('/')
  .get(checkPermission('read:vendors'), getVendors)
  .post(checkPermission('write:vendors'), vendorRules, validate, createVendor);

router.route('/:id')
  .get(checkPermission('read:vendors'), getVendor)
  .put(checkPermission('write:vendors'), vendorRules, validate, updateVendor)
  .delete(checkPermission('write:vendors'), deleteVendor);

module.exports = router;
