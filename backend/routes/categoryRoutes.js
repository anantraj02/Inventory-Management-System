const express = require('express');
const router = express.Router();
const { getCategories, getCategory, createCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');
const { protect, checkPermission } = require('../middlewares/auth');
const { categoryRules } = require('../validators/rules');
const validate = require('../validators/validate');

router.use(protect);

router.route('/')
  .get(checkPermission('read:categories'), getCategories)
  .post(checkPermission('write:categories'), categoryRules, validate, createCategory);

router.route('/:id')
  .get(checkPermission('read:categories'), getCategory)
  .put(checkPermission('write:categories'), categoryRules, validate, updateCategory)
  .delete(checkPermission('write:categories'), deleteCategory);

module.exports = router;
