const Inventory = require('../models/Inventory');
const Item = require('../models/Item');
const StockIn = require('../models/StockIn');
const StockOut = require('../models/StockOut');
const Transfer = require('../models/Transfer');
const Vendor = require('../models/Vendor');
const User = require('../models/User');
const Role = require('../models/Role');
const Category = require('../models/Category');
const mongoose = require('mongoose');

// @desc    Get dashboard metrics & chart data
// @route   GET /api/dashboard
// @access  Private (read:inventory)
exports.getDashboardData = async (req, res, next) => {
  try {
    const { branch } = req.query;
    let targetBranchId = null;

    // Determine branch filter based on user role
    if (req.user.role.name !== 'Main Admin' && req.user.role.name !== 'Auditor') {
      targetBranchId = req.user.branch._id;
    } else if (branch) {
      targetBranchId = new mongoose.Types.ObjectId(branch);
    }

    const matchBranchQuery = targetBranchId ? { branch: targetBranchId } : {};

    // 1. Fetch Cards Metrics
    // 1.1 Total Items Count
    const totalItems = await Inventory.countDocuments(matchBranchQuery);

    // 1.2 Low Stock Count (quantity < minStockLevel)
    const lowStockPipeline = [];
    if (targetBranchId) {
      lowStockPipeline.push({ $match: { branch: targetBranchId } });
    }
    lowStockPipeline.push(
      { $lookup: { from: 'items', localField: 'item', foreignField: '_id', as: 'itemDoc' } },
      { $unwind: '$itemDoc' },
      { $match: { $expr: { $lt: ['$quantity', '$itemDoc.minStockLevel'] } } },
      { $count: 'count' }
    );
    const lowStockResult = await Inventory.aggregate(lowStockPipeline);
    const lowStockCount = lowStockResult[0] ? lowStockResult[0].count : 0;

    // 1.3 Inventory In (total transaction amount in the current month)
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const stockInQuery = { createdAt: { $gte: startOfMonth } };
    if (targetBranchId) stockInQuery.branch = targetBranchId;
    const stockInTransactions = await StockIn.find(stockInQuery);
    const stockInSum = stockInTransactions.reduce((sum, txn) => sum + txn.totalAmount, 0);

    // 1.4 Inventory Out (total transaction amount in the current month)
    const stockOutQuery = { createdAt: { $gte: startOfMonth } };
    if (targetBranchId) stockOutQuery.branch = targetBranchId;
    const stockOutTransactions = await StockOut.find(stockOutQuery);
    const stockOutSum = stockOutTransactions.reduce((sum, txn) => sum + txn.totalAmount, 0);

    // 1.5 Pending Transfers Count
    const transferQuery = { status: { $in: ['Pending', 'In Transit'] } };
    if (targetBranchId) {
      transferQuery.$or = [
        { fromBranch: targetBranchId },
        { toBranch: targetBranchId }
      ];
    }
    const pendingTransfersCount = await Transfer.countDocuments(transferQuery);

    // 1.6 Total Vendors (Global count)
    const totalVendors = await Vendor.countDocuments({ isActive: true });

    // 1.7 Total Employees (Branch specific or Global)
    const employeeRole = await Role.findOne({ name: 'Employee' });
    const employeeQuery = { isActive: true };
    if (employeeRole) employeeQuery.role = employeeRole._id;
    if (targetBranchId) employeeQuery.branch = targetBranchId;
    const totalEmployees = await User.countDocuments(employeeQuery);

    // 2. Fetch Chart Data
    // 2.1 Category Distribution (Aggregate stock qty by Category)
    const categoryPipeline = [];
    if (targetBranchId) {
      categoryPipeline.push({ $match: { branch: targetBranchId } });
    }
    categoryPipeline.push(
      { $lookup: { from: 'items', localField: 'item', foreignField: '_id', as: 'itemDoc' } },
      { $unwind: '$itemDoc' },
      { $lookup: { from: 'categories', localField: 'itemDoc.category', foreignField: '_id', as: 'catDoc' } },
      { $unwind: '$catDoc' },
      {
        $group: {
          _id: '$catDoc.name',
          value: { $sum: '$quantity' }
        }
      },
      {
        $project: {
          name: '$_id',
          value: 1,
          _id: 0
        }
      }
    );
    const categoryDistribution = await Inventory.aggregate(categoryPipeline);

    // 2.2 Low Stock items details
    const lowStockItemsPipeline = [];
    if (targetBranchId) {
      lowStockItemsPipeline.push({ $match: { branch: targetBranchId } });
    }
    lowStockItemsPipeline.push(
      { $lookup: { from: 'items', localField: 'item', foreignField: '_id', as: 'itemDoc' } },
      { $unwind: '$itemDoc' },
      { $match: { $expr: { $lt: ['$quantity', '$itemDoc.minStockLevel'] } } },
      { $project: { name: '$itemDoc.name', sku: '$itemDoc.sku', quantity: 1, minStockLevel: '$itemDoc.minStockLevel', _id: 0 } },
      { $limit: 10 }
    );
    const lowStockItems = await Inventory.aggregate(lowStockItemsPipeline);

    // 2.3 Monthly Inventory trends (Stock In vs Stock Out over last 6 months)
    const monthlyTrends = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

      const inQuery = { createdAt: { $gte: monthStart, $lte: monthEnd } };
      const outQuery = { createdAt: { $gte: monthStart, $lte: monthEnd } };
      if (targetBranchId) {
        inQuery.branch = targetBranchId;
        outQuery.branch = targetBranchId;
      }

      const mIn = await StockIn.find(inQuery);
      const mOut = await StockOut.find(outQuery);

      const sumIn = mIn.reduce((acc, curr) => acc + curr.totalAmount, 0);
      const sumOut = mOut.reduce((acc, curr) => acc + curr.totalAmount, 0);

      const monthName = date.toLocaleString('default', { month: 'short' });
      monthlyTrends.push({
        month: monthName,
        income: sumIn,
        expense: sumOut
      });
    }

    res.status(200).json({
      success: true,
      metrics: {
        totalItems,
        lowStock: lowStockCount,
        inventoryIn: stockInSum,
        inventoryOut: stockOutSum,
        pendingTransfers: pendingTransfersCount,
        totalVendors,
        totalEmployees
      },
      charts: {
        monthlyTrends,
        categoryDistribution,
        lowStockItems
      }
    });
  } catch (error) {
    next(error);
  }
};
