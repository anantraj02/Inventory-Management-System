const express = require('express');
const router = express.Router();
const {
  getTransactionReport,
  getTransferReport,
  getLowStockReport,
  getVendorPurchaseReport,
  getEmployeeIssueReport
} = require('../controllers/reportController');
const { protect } = require('../middlewares/auth');

router.use(protect);

router.get('/transactions', getTransactionReport);
router.get('/transfers', getTransferReport);
router.get('/low-stock', getLowStockReport);
router.get('/vendor-purchases', getVendorPurchaseReport);
router.get('/employee-issues', getEmployeeIssueReport);

module.exports = router;
