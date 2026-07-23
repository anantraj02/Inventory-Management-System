const { body } = require('express-validator');

exports.loginRules = [
  body('emailOrEmpId')
    .notEmpty()
    .withMessage('Email or Employee ID is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

exports.forgotPasswordRules = [
  body('email')
    .isEmail()
    .withMessage('Please include a valid email')
];

exports.resetPasswordRules = [
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

exports.userCreateRules = [
  body('employeeId')
    .notEmpty()
    .withMessage('Employee ID is required'),
  body('name')
    .notEmpty()
    .withMessage('Name is required'),
  body('email')
    .isEmail()
    .withMessage('Please include a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('role')
    .isMongoId()
    .withMessage('Valid Role ID is required'),
  body('branch')
    .optional()
    .isMongoId()
    .withMessage('Valid Branch ID is required')
];

exports.userUpdateRules = [
  body('name')
    .optional()
    .notEmpty()
    .withMessage('Name cannot be empty'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please include a valid email'),
  body('role')
    .optional()
    .isMongoId()
    .withMessage('Valid Role ID is required'),
  body('branch')
    .optional()
    .isMongoId()
    .withMessage('Valid Branch ID is required'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

exports.branchRules = [
  body('name')
    .notEmpty()
    .withMessage('Branch name is required'),
  body('code')
    .notEmpty()
    .withMessage('Branch code is required')
];

exports.categoryRules = [
  body('name')
    .notEmpty()
    .withMessage('Category name is required'),
  body('code')
    .notEmpty()
    .withMessage('Category code is required')
];

exports.itemRules = [
  body('name')
    .notEmpty()
    .withMessage('Item name is required'),
  body('sku')
    .notEmpty()
    .withMessage('SKU is required'),
  body('category')
    .isMongoId()
    .withMessage('Valid Category ID is required'),
  body('unitOfMeasure')
    .notEmpty()
    .withMessage('Unit of Measure is required'),
  body('minStockLevel')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Min Stock Level must be a non-negative integer')
];

exports.vendorRules = [
  body('name')
    .notEmpty()
    .withMessage('Vendor name is required')
];

exports.customerRules = [
  body('name')
    .notEmpty()
    .withMessage('Customer name is required')
];

exports.stockInRules = [
  body('vendor')
    .isMongoId()
    .withMessage('Valid Vendor ID is required'),
  body('branch')
    .isMongoId()
    .withMessage('Valid Branch ID is required'),
  body('invoiceNumber')
    .notEmpty()
    .withMessage('Invoice number is required'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('Items must be an array with at least one item'),
  body('items.*.item')
    .isMongoId()
    .withMessage('Valid Item ID is required'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Item quantity must be a positive integer'),
  body('items.*.unitCost')
    .isFloat({ min: 0 })
    .withMessage('Item unit cost must be a non-negative number')
];

exports.stockOutRules = [
  body('type')
    .isIn(['Internal Use', 'Sale'])
    .withMessage('Type must be either "Internal Use" or "Sale"'),
  body('branch')
    .isMongoId()
    .withMessage('Valid Branch ID is required'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('Items must be an array with at least one item'),
  body('items.*.item')
    .isMongoId()
    .withMessage('Valid Item ID is required'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Item quantity must be a positive integer'),
  body('items.*.unitPrice')
    .isFloat({ min: 0 })
    .withMessage('Item unit price must be a non-negative number')
];

exports.transferRules = [
  body('fromBranch')
    .isMongoId()
    .withMessage('Valid From Branch ID is required'),
  body('toBranch')
    .isMongoId()
    .withMessage('Valid To Branch ID is required'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('Items must be an array with at least one item'),
  body('items.*.item')
    .isMongoId()
    .withMessage('Valid Item ID is required'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Item quantity must be a positive integer')
];

exports.requestRules = [
  body('item')
    .isMongoId()
    .withMessage('Valid Item ID is required'),
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),
  body('purpose')
    .notEmpty()
    .withMessage('Purpose is required')
];
