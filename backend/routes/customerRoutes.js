const express = require('express');
const router = express.Router();
const { getCustomers, getCustomer, createCustomer, updateUser, updateCustomer, deleteCustomer } = require('../controllers/customerController');
const { protect, checkPermission } = require('../middlewares/auth');
const { customerRules } = require('../validators/rules');
const validate = require('../validators/validate');

router.use(protect);

router.route('/')
  .get(checkPermission('read:customers'), getCustomers)
  .post(checkPermission('write:customers'), customerRules, validate, createCustomer);

router.route('/:id')
  .get(checkPermission('read:customers'), getCustomer)
  .put(checkPermission('write:customers'), customerRules, validate, updateCustomer)
  .delete(checkPermission('write:customers'), deleteCustomer);

module.exports = router;
