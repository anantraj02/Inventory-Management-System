const express = require('express');
const router = express.Router();
const { reconcileStock, getMonthlyCloseReport, archiveMonth } = require('../controllers/closingController');
const { protect, checkPermission } = require('../middlewares/auth');

router.use(protect);
router.use(checkPermission('close:monthly'));

router.post('/reconcile', reconcileStock);
router.get('/report', getMonthlyCloseReport);
router.post('/archive', archiveMonth);

module.exports = router;
