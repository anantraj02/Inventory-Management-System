const express = require('express');
const router = express.Router();
const { getItems, getItem, getItemByBarcode, createItem, updateItem, deleteItem } = require('../controllers/itemController');
const { protect, checkPermission } = require('../middlewares/auth');
const { itemRules } = require('../validators/rules');
const validate = require('../validators/validate');

router.use(protect);

router.route('/barcode/:barcode')
  .get(checkPermission('read:items'), getItemByBarcode);

router.route('/')
  .get(checkPermission('read:items'), getItems)
  .post(checkPermission('write:items'), itemRules, validate, createItem);

router.route('/:id')
  .get(checkPermission('read:items'), getItem)
  .put(checkPermission('write:items'), itemRules, validate, updateItem)
  .delete(checkPermission('write:items'), deleteItem);

module.exports = router;
