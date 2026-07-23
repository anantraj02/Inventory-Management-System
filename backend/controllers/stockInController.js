const StockIn = require('../models/StockIn');
const Inventory = require('../models/Inventory');
const PurchaseRequisition = require('../models/PurchaseRequisition');
const logAudit = require('../utils/auditLogger');

// @desc    Record a Stock In transaction
// @route   POST /api/stock-in
// @access  Private (write:stock-in)
exports.createStockIn = async (req, res, next) => {
  const { vendor, branch, invoiceNumber, notes, items } = req.body;

  try {
    // Branch locks - Branch Admin/Inventory Manager can only stock in to their own branch
    if (req.user.role.name !== 'Main Admin' && req.user.role.name !== 'Auditor') {
      if (branch !== req.user.branch.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to stock in to another branch' });
      }
    }

    let totalAmount = 0;
    const computedItems = items.map(it => {
      const totalCost = it.quantity * it.unitCost;
      totalAmount += totalCost;
      return {
        item: it.item,
        quantity: it.quantity,
        unitCost: it.unitCost,
        totalCost
      };
    });

    // Create the transaction
    const stockIn = new StockIn({
      vendor,
      branch,
      receivedBy: req.user._id,
      invoiceNumber,
      notes,
      items: computedItems,
      totalAmount,
      invoiceFile: req.file ? `/uploads/${req.file.filename}` : undefined
    });

    await stockIn.save();

    // Update Inventory for each item
    for (const itemObj of computedItems) {
      await Inventory.findOneAndUpdate(
        { branch, item: itemObj.item },
        { $inc: { quantity: itemObj.quantity } },
        { upsert: true, new: true }
      );

      // Auto-resolve any matching Purchase Requisitions that were 'Ordered' or 'Approved'
      await PurchaseRequisition.updateMany(
        { branch, item: itemObj.item, status: { $in: ['Approved', 'Ordered'] } },
        { $set: { status: 'Received' } }
      );
    }

    await logAudit({
      userId: req.user._id,
      branchId: branch,
      action: 'CREATE',
      module: 'StockIn',
      recordId: stockIn._id,
      details: { invoiceNumber, totalAmount, itemsCount: computedItems.length },
      ipAddress: req.ip
    });

    const populatedStockIn = await StockIn.findById(stockIn._id)
      .populate('vendor', 'name')
      .populate('branch', 'name code')
      .populate('receivedBy', 'name')
      .populate('items.item', 'name sku');

    res.status(201).json({ success: true, data: populatedStockIn });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all Stock In transactions
// @route   GET /api/stock-in
// @access  Private (read:stock-in)
exports.getStockInTransactions = async (req, res, next) => {
  try {
    const { branch, vendor, page = 1, limit = 50 } = req.query;
    const query = {};

    if (req.user.role.name !== 'Main Admin' && req.user.role.name !== 'Auditor') {
      query.branch = req.user.branch;
    } else if (branch) {
      query.branch = branch;
    }

    if (vendor) {
      query.vendor = vendor;
    }

    const count = await StockIn.countDocuments(query);
    const transactions = await StockIn.find(query)
      .populate('vendor', 'name contactName')
      .populate('branch', 'name code')
      .populate('receivedBy', 'name employeeId')
      .populate('items.item', 'name sku unitOfMeasure')
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
      data: transactions
    });
  } catch (error) {
    next(error);
  }
};
