const express = require('express');
const router = express.Router();
const { createStockIn, getStockInTransactions } = require('../controllers/stockInController');
const { protect, checkPermission } = require('../middlewares/auth');
const upload = require('../utils/upload');
const { stockInRules } = require('../validators/rules');
const validate = require('../validators/validate');

router.use(protect);

router.route('/')
  .get(checkPermission('read:stock-in'), getStockInTransactions)
  .post(
    checkPermission('write:stock-in'),
    upload.single('invoice'),
    (req, res, next) => {
      // Parse items field since it is sent as stringified JSON when submitting multipart/form-data
      if (req.body.items && typeof req.body.items === 'string') {
        try {
          req.body.items = JSON.parse(req.body.items);
        } catch (e) {
          return res.status(400).json({ success: false, message: 'Invalid items format in request' });
        }
      }
      next();
    },
    stockInRules,
    validate,
    createStockIn
  );

module.exports = router;
