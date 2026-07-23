const Inventory = require('../models/Inventory');
const StockIn = require('../models/StockIn');
const StockOut = require('../models/StockOut');
const Transfer = require('../models/Transfer');
const logAudit = require('../utils/auditLogger');
const mongoose = require('mongoose');

// @desc    Reconcile stock (Step 1) - Get comparison data & apply updates
// @route   POST /api/closing/reconcile
// @access  Private (close:monthly)
exports.reconcileStock = async (req, res, next) => {
  const { branch, adjustments } = req.body; // adjustments: [{ item: id, actualQuantity: num, notes: string }]

  try {
    const targetBranch = req.user.role.name === 'Main Admin' ? branch : req.user.branch._id;

    if (!targetBranch) {
      return res.status(400).json({ success: false, message: 'Please specify a branch for reconciliation' });
    }

    const appliedAdjustments = [];

    if (adjustments && adjustments.length > 0) {
      for (const adj of adjustments) {
        const inv = await Inventory.findOne({ branch: targetBranch, item: adj.item }).populate('item');
        if (inv) {
          const oldQty = inv.quantity;
          inv.quantity = adj.actualQuantity;
          if (adj.rackLocation) {
            inv.rackLocation = adj.rackLocation;
          }
          await inv.save();

          appliedAdjustments.push({
            itemId: adj.item,
            itemName: inv.item.name,
            oldQuantity: oldQty,
            newQuantity: adj.actualQuantity,
            difference: adj.actualQuantity - oldQty,
            notes: adj.notes
          });

          // Log audit adjustment
          await logAudit({
            userId: req.user._id,
            branchId: targetBranch,
            action: 'UPDATE',
            module: 'Inventory-Reconciliation',
            recordId: inv._id,
            details: { itemId: adj.item, oldQuantity: oldQty, newQuantity: adj.actualQuantity, notes: adj.notes },
            ipAddress: req.ip
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Reconciliation updates applied successfully',
      adjustments: appliedAdjustments
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate monthly close report (Step 2 & 3)
// @route   GET /api/closing/report
// @access  Private (close:monthly)
exports.getMonthlyCloseReport = async (req, res, next) => {
  const { branch } = req.query;

  try {
    const targetBranch = req.user.role.name === 'Main Admin' ? branch : req.user.branch._id;
    if (!targetBranch) {
      return res.status(400).json({ success: false, message: 'Please specify a branch' });
    }

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);

    const matchQuery = {
      branch: new mongoose.Types.ObjectId(targetBranch),
      createdAt: { $gte: startOfMonth, $lte: endOfMonth }
    };

    // Calculate Stock In Metrics
    const stockInTransactions = await StockIn.find(matchQuery);
    const totalStockInAmt = stockInTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
    const totalStockInItems = stockInTransactions.reduce((sum, t) => sum + t.items.reduce((s, it) => s + it.quantity, 0), 0);

    // Calculate Stock Out Metrics
    const stockOutTransactions = await StockOut.find(matchQuery);
    const totalStockOutAmt = stockOutTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
    const totalStockOutItems = stockOutTransactions.reduce((sum, t) => sum + t.items.reduce((s, it) => s + it.quantity, 0), 0);

    // Calculate Transfers
    const transfersCount = await Transfer.countDocuments({
      status: 'Completed',
      updatedAt: { $gte: startOfMonth, $lte: endOfMonth },
      $or: [
        { fromBranch: targetBranch },
        { toBranch: targetBranch }
      ]
    });

    // Current Stock Status
    const currentStock = await Inventory.find({ branch: targetBranch }).populate('item', 'name sku unitOfMeasure');

    res.status(200).json({
      success: true,
      data: {
        month: startOfMonth.toLocaleString('default', { month: 'long', year: 'numeric' }),
        stockIn: {
          transactionsCount: stockInTransactions.length,
          totalQuantity: totalStockInItems,
          totalValue: totalStockInAmt
        },
        stockOut: {
          transactionsCount: stockOutTransactions.length,
          totalQuantity: totalStockOutItems,
          totalValue: totalStockOutAmt
        },
        transfersCount,
        stockItemsCount: currentStock.length,
        currentStock: currentStock.map(c => ({
          item: c.item.name,
          sku: c.item.sku,
          quantity: c.quantity,
          unit: c.item.unitOfMeasure
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Archive month (Step 4)
// @route   POST /api/closing/archive
// @access  Private (close:monthly)
exports.archiveMonth = async (req, res, next) => {
  const { branch } = req.body;

  try {
    const targetBranch = req.user.role.name === 'Main Admin' ? branch : req.user.branch._id;
    if (!targetBranch) {
      return res.status(400).json({ success: false, message: 'Please specify a branch' });
    }

    const currentStock = await Inventory.find({ branch: targetBranch }).populate('item', 'name sku minStockLevel');
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthString = startOfMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

    // Snapshot details
    const snapshotDetails = currentStock.map(c => ({
      item: c.item.name,
      sku: c.item.sku,
      quantity: c.quantity
    }));

    // Record close/archive event in Audit Logs
    await logAudit({
      userId: req.user._id,
      branchId: targetBranch,
      action: 'MONTHLY_CLOSE',
      module: 'MonthlyClosing',
      recordId: null,
      details: {
        month: monthString,
        timestamp: new Date(),
        reconciledBy: req.user.name,
        inventorySnapshot: snapshotDetails
      },
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: `Month ${monthString} successfully closed and archived.`
    });
  } catch (error) {
    next(error);
  }
};
