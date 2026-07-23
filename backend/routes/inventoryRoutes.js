const express = require('express');
const router = express.Router();
const { getInventory, getInventoryItem } = require('../controllers/inventoryController');
const { protect, checkPermission } = require('../middlewares/auth');

router.use(protect);

router.get('/', checkPermission('read:inventory'), getInventory);
router.get('/:branchId/:itemId', checkPermission('read:inventory'), getInventoryItem);

module.exports = router;
