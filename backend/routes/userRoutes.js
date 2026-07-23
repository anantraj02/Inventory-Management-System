const express = require('express');
const router = express.Router();
const { getUsers, getUser, createUser, updateUser, deleteUser } = require('../controllers/userController');
const { protect, checkPermission } = require('../middlewares/auth');
const { userCreateRules, userUpdateRules } = require('../validators/rules');
const validate = require('../validators/validate');

router.use(protect);

router.route('/')
  .get(checkPermission('read:users'), getUsers)
  .post(checkPermission('write:users'), userCreateRules, validate, createUser);

router.route('/:id')
  .get(checkPermission('read:users'), getUser)
  .put(checkPermission('write:users'), userUpdateRules, validate, updateUser)
  .delete(checkPermission('write:users'), deleteUser);

module.exports = router;
