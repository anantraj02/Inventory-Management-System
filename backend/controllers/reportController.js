const StockIn = require('../models/StockIn');
const StockOut = require('../models/StockOut');
const Transfer = require('../models/Transfer');
const Inventory = require('../models/Inventory');
const PurchaseRequisition = require('../models/PurchaseRequisition');
const Vendor = require('../models/Vendor');
const User = require('../models/User');
const mongoose = require('mongoose');

// Helper to construct date query
const getDateQuery = (startDate, endDate) => {
  if (!startDate && !endDate) return {};
  const query = {};
  if (startDate) query.$gte = new Date(startDate);
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    query.$lte = end;
  }
  return { createdAt: query };
};

// Helper for branch filters based on role
const getBranchFilter = (req, branchParam) => {
  if (req.user.role.name !== 'Main Admin' && req.user.role.name !== 'Auditor') {
    return { branch: req.user.branch._id };
  }
  return branchParam ? { branch: new mongoose.Types.ObjectId(branchParam) } : {};
};

// @desc    Get Stock Transactions Report
// @route   GET /api/reports/transactions
exports.getTransactionReport = async (req, res, next) => {
  try {
    const { startDate, endDate, branch } = req.query;
    const dateFilter = getDateQuery(startDate, endDate);
    const branchFilter = getBranchFilter(req, branch);
    const query = { ...dateFilter, ...branchFilter };

    const stockInTxns = await StockIn.find(query)
      .populate('vendor', 'name')
      .populate('branch', 'name code')
      .populate('receivedBy', 'name employeeId')
      .populate('items.item', 'name sku unitOfMeasure');

    const stockOutTxns = await StockOut.find(query)
      .populate('customer', 'name')
      .populate('recipientEmployee', 'name employeeId')
      .populate('branch', 'name code')
      .populate('performedBy', 'name employeeId')
      .populate('items.item', 'name sku unitOfMeasure');

    res.status(200).json({
      success: true,
      data: {
        stockIn: stockInTxns,
        stockOut: stockOutTxns
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Transfer Report
// @route   GET /api/reports/transfers
exports.getTransferReport = async (req, res, next) => {
  try {
    const { startDate, endDate, branch, status } = req.query;
    const dateFilter = getDateQuery(startDate, endDate);

    // If branch filter is set, find transfers where fromBranch or toBranch matches
    let branchQuery = {};
    if (req.user.role.name !== 'Main Admin' && req.user.role.name !== 'Auditor') {
      const uBranch = req.user.branch._id;
      branchQuery = { $or: [{ fromBranch: uBranch }, { toBranch: uBranch }] };
    } else if (branch) {
      const bObj = new mongoose.Types.ObjectId(branch);
      branchQuery = { $or: [{ fromBranch: bObj }, { toBranch: bObj }] };
    }

    const query = { ...dateFilter, ...branchQuery };
    if (status) {
      query.status = status;
    }

    const transfers = await Transfer.find(query)
      .populate('fromBranch', 'name code')
      .populate('toBranch', 'name code')
      .populate('createdBy', 'name employeeId')
      .populate('approvedBy', 'name employeeId')
      .populate('receivedBy', 'name employeeId')
      .populate('items.item', 'name sku unitOfMeasure');

    res.status(200).json({ success: true, data: transfers });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Low Stock Report
// @route   GET /api/reports/low-stock
exports.getLowStockReport = async (req, res, next) => {
  try {
    const { branch } = req.query;
    const pipeline = [];

    // Branch matching
    let targetBranchId = null;
    if (req.user.role.name !== 'Main Admin' && req.user.role.name !== 'Auditor') {
      targetBranchId = req.user.branch._id;
    } else if (branch) {
      targetBranchId = new mongoose.Types.ObjectId(branch);
    }

    if (targetBranchId) {
      pipeline.push({ $match: { branch: targetBranchId } });
    }

    pipeline.push(
      { $lookup: { from: 'items', localField: 'item', foreignField: '_id', as: 'itemDoc' } },
      { $unwind: '$itemDoc' },
      { $lookup: { from: 'categories', localField: 'itemDoc.category', foreignField: '_id', as: 'catDoc' } },
      { $unwind: '$catDoc' },
      { $lookup: { from: 'branches', localField: 'branch', foreignField: '_id', as: 'branchDoc' } },
      { $unwind: '$branchDoc' },
      { $match: { $expr: { $lt: ['$quantity', '$itemDoc.minStockLevel'] } } },
      {
        $project: {
          itemName: '$itemDoc.name',
          sku: '$itemDoc.sku',
          barcode: '$itemDoc.barcode',
          categoryName: '$catDoc.name',
          branchName: '$branchDoc.name',
          branchCode: '$branchDoc.code',
          quantity: 1,
          minStockLevel: '$itemDoc.minStockLevel',
          unitOfMeasure: '$itemDoc.unitOfMeasure',
          rackLocation: 1
        }
      }
    );

    const lowStockData = await Inventory.aggregate(pipeline);
    res.status(200).json({ success: true, data: lowStockData });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Vendor Purchase Report
// @route   GET /api/reports/vendor-purchases
exports.getVendorPurchaseReport = async (req, res, next) => {
  try {
    const { startDate, endDate, branch, vendor } = req.query;
    const dateFilter = getDateQuery(startDate, endDate);
    const branchFilter = getBranchFilter(req, branch);
    const query = { ...dateFilter, ...branchFilter };

    if (vendor) {
      query.vendor = new mongoose.Types.ObjectId(vendor);
    }

    const purchases = await StockIn.find(query)
      .populate('vendor', 'name contactName email')
      .populate('branch', 'name code')
      .populate('receivedBy', 'name employeeId')
      .populate('items.item', 'name sku unitOfMeasure');

    res.status(200).json({ success: true, data: purchases });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Employee Issue Report (Internal StockOuts)
// @route   GET /api/reports/employee-issues
exports.getEmployeeIssueReport = async (req, res, next) => {
  try {
    const { startDate, endDate, branch, employee } = req.query;
    const dateFilter = getDateQuery(startDate, endDate);
    const branchFilter = getBranchFilter(req, branch);
    const query = { ...dateFilter, ...branchFilter, type: 'Internal Use' };

    if (employee) {
      query.recipientEmployee = new mongoose.Types.ObjectId(employee);
    }

    const issues = await StockOut.find(query)
      .populate('recipientEmployee', 'name employeeId phone')
      .populate('branch', 'name code')
      .populate('performedBy', 'name employeeId')
      .populate('items.item', 'name sku unitOfMeasure');

    res.status(200).json({ success: true, data: issues });
  } catch (error) {
    next(error);
  }
};
