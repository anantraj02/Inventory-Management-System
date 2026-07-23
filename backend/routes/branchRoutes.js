const express = require('express');
const router = express.Router();
const { getBranches, getBranch, createBranch, updateBranch, deleteBranch } = require('../controllers/branchController');
const { protect, checkPermission } = require('../middlewares/auth');
const { branchRules } = require('../validators/rules');
const validate = require('../validators/validate');

router.use(protect); // protect all routes

router.route('/')
  .get(checkPermission('read:branches'), getBranches)
  .post(checkPermission('write:branches'), branchRules, validate, createBranch);

router.route('/:id')
  .get(checkPermission('read:branches'), getBranch)
  .put(checkPermission('write:branches'), branchRules, validate, updateBranch)
  .delete(checkPermission('write:branches'), deleteBranch);

module.exports = router;
