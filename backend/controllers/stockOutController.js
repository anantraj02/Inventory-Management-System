const StockOut = require('../models/StockOut');
const Inventory = require('../models/Inventory');
const Item = require('../models/Item');
const PurchaseRequisition = require('../models/PurchaseRequisition');
const logAudit = require('../utils/auditLogger');

// @desc    Record Stock Out transaction
// @route   POST /api/stock-out
// @access  Private (write:stock-out)
exports.createStockOut = async (req, res, next) => {
  const { type, customer, recipientEmployee, branch, notes, items } = req.body;

  try {
    // Branch lock check
    if (req.user.role.name !== 'Main Admin' && req.user.role.name !== 'Auditor') {
      if (branch !== req.user.branch.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to perform stock out for another branch' });
      }
    }

    // 1. Verify availability of all items
    for (const it of items) {
      const inv = await Inventory.findOne({ branch, item: it.item }).populate('item');
      if (!inv || inv.quantity < it.quantity) {
        const itemName = inv ? inv.item.name : 'Unknown Item';
        const currentQty = inv ? inv.quantity : 0;
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for [${itemName}]. Requested: ${it.quantity}, Available: ${currentQty}`
        });
      }
    }

    let totalAmount = 0;
    const computedItems = items.map(it => {
      const totalPrice = it.quantity * it.unitPrice;
      totalAmount += totalPrice;
      return {
        item: it.item,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        totalPrice
      };
    });

    // 2. Create the transaction
    const stockOut = new StockOut({
      type,
      customer: type === 'Sale' ? customer : undefined,
      recipientEmployee: type === 'Internal Use' ? recipientEmployee : undefined,
      branch,
      performedBy: req.user._id,
      items: computedItems,
      totalAmount,
      notes
    });

    await stockOut.save();

    // 3. Decrement Inventory and check minimum stock levels
    for (const itemObj of computedItems) {
      const updatedInv = await Inventory.findOneAndUpdate(
        { branch, item: itemObj.item },
        { $inc: { quantity: -itemObj.quantity } },
        { new: true }
      );

      // Load item definition to check minStockLevel
      const itemDef = await Item.findById(itemObj.item);
      if (itemDef && updatedInv.quantity < itemDef.minStockLevel) {
        // Check if there is already an active (non-received) PR
        const activePrExists = await PurchaseRequisition.findOne({
          branch,
          item: itemObj.item,
          status: { $ne: 'Received' }
        });

        if (!activePrExists) {
          // Trigger automatic requisition
          const requisitionQty = Math.max(itemDef.minStockLevel * 2, 20); // Seed a reasonable reorder quantity
          const autoRequisition = new PurchaseRequisition({
            branch,
            item: itemObj.item,
            quantity: requisitionQty,
            status: 'Pending',
            notes: `Auto-generated: Stock level (${updatedInv.quantity}) fell below minimum (${itemDef.minStockLevel}).`
          });
          await autoRequisition.save();

          console.log(`[AUTO-PR TRIGGERED] Item: ${itemDef.name}, Branch: ${branch}, Reorder Qty: ${requisitionQty}`);
        }
      }
    }

    await logAudit({
      userId: req.user._id,
      branchId: branch,
      action: 'CREATE',
      module: 'StockOut',
      recordId: stockOut._id,
      details: { type, totalAmount, itemsCount: computedItems.length },
      ipAddress: req.ip
    });

    const populatedStockOut = await StockOut.findById(stockOut._id)
      .populate('customer', 'name')
      .populate('recipientEmployee', 'name employeeId')
      .populate('branch', 'name code')
      .populate('performedBy', 'name')
      .populate('items.item', 'name sku');

    res.status(201).json({ success: true, data: populatedStockOut });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all Stock Out transactions
// @route   GET /api/stock-out
// @access  Private (read:stock-out)
exports.getStockOutTransactions = async (req, res, next) => {
  try {
    const { branch, type, page = 1, limit = 50 } = req.query;
    const query = {};

    if (req.user.role.name !== 'Main Admin' && req.user.role.name !== 'Auditor') {
      query.branch = req.user.branch;
    } else if (branch) {
      query.branch = branch;
    }

    if (type) {
      query.type = type;
    }

    const count = await StockOut.countDocuments(query);
    const transactions = await StockOut.find(query)
      .populate('customer', 'name contactName')
      .populate('recipientEmployee', 'name employeeId')
      .populate('branch', 'name code')
      .populate('performedBy', 'name employeeId')
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
