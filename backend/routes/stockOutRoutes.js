const express = require('express');
const router = express.Router();
const { createStockOut, getStockOutTransactions } = require('../controllers/stockOutController');
const { protect, checkPermission } = require('../middlewares/auth');
const { stockOutRules } = require('../validators/rules');
const validate = require('../validators/validate');

router.use(protect);

router.route('/')
  .get(checkPermission('read:stock-out'), getStockOutTransactions)
  .post(checkPermission('write:stock-out'), stockOutRules, validate, createStockOut);

module.exports = router;
