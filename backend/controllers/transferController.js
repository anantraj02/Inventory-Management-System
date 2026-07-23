const Transfer = require('../models/Transfer');
const Inventory = require('../models/Inventory');
const logAudit = require('../utils/auditLogger');

// @desc    Create a stock transfer request
// @route   POST /api/transfers
// @access  Private (write:transfers)
exports.createTransfer = async (req, res, next) => {
  const { fromBranch, toBranch, items, notes } = req.body;

  try {
    if (fromBranch === toBranch) {
      return res.status(400).json({ success: false, message: 'Source and destination branches must be different' });
    }

    // Branch lock: User must belong to the source branch (fromBranch) unless they are Main Admin
    if (req.user.role.name !== 'Main Admin' && req.user.role.name !== 'Auditor') {
      if (fromBranch !== req.user.branch._id.toString()) {
        return res.status(403).json({ success: false, message: 'You can only initiate transfers from your own branch' });
      }
    }

    // 1. Verify and reserve stock in fromBranch
    for (const it of items) {
      const inv = await Inventory.findOne({ branch: fromBranch, item: it.item }).populate('item');
      if (!inv || inv.quantity < it.quantity) {
        const itemName = inv ? inv.item.name : 'Unknown Item';
        return res.status(400).json({
          success: false,
          message: `Insufficient stock in source branch for [${itemName}]. Requested: ${it.quantity}`
        });
      }
    }

    // 2. Decrement/Reserve the stock immediately
    for (const it of items) {
      await Inventory.findOneAndUpdate(
        { branch: fromBranch, item: it.item },
        { $inc: { quantity: -it.quantity } }
      );
    }

    // 3. Create transfer record
    const transfer = new Transfer({
      fromBranch,
      toBranch,
      items,
      status: 'Pending',
      createdBy: req.user._id,
      notes
    });

    await transfer.save();

    await logAudit({
      userId: req.user._id,
      branchId: fromBranch,
      action: 'CREATE',
      module: 'Transfers',
      recordId: transfer._id,
      details: { fromBranch, toBranch, itemsCount: items.length },
      ipAddress: req.ip
    });

    const populatedTransfer = await Transfer.findById(transfer._id)
      .populate('fromBranch', 'name code')
      .populate('toBranch', 'name code')
      .populate('createdBy', 'name')
      .populate('items.item', 'name sku');

    res.status(201).json({ success: true, data: populatedTransfer });
  } catch (error) {
    next(error);
  }
};

// @desc    Update transfer status (Pending -> In Transit -> Completed)
// @route   PUT /api/transfers/:id/status
// @access  Private (approve:transfers or write:transfers)
exports.updateTransferStatus = async (req, res, next) => {
  const { status } = req.body; // 'In Transit', 'Completed', or 'Cancelled'

  try {
    const transfer = await Transfer.findById(req.params.id);
    if (!transfer) {
      return res.status(404).json({ success: false, message: 'Transfer not found' });
    }

    const prevStatus = transfer.status;

    if (prevStatus === 'Completed') {
      return res.status(400).json({ success: false, message: 'Completed transfers cannot be modified' });
    }

    if (prevStatus === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'Cancelled transfers cannot be modified' });
    }

    // Handle status transitions
    if (status === 'In Transit') {
      if (prevStatus !== 'Pending') {
        return res.status(400).json({ success: false, message: 'Transfer must be Pending to go In Transit' });
      }

      transfer.status = 'In Transit';
      transfer.approvedBy = req.user._id;
    } 
    else if (status === 'Completed') {
      if (prevStatus !== 'In Transit') {
        return res.status(400).json({ success: false, message: 'Transfer must be In Transit to be Completed' });
      }

      // Branch authorization check: only managers/admins at the DESTINATION branch (toBranch) can mark it Completed
      if (req.user.role.name !== 'Main Admin') {
        if (req.user.branch._id.toString() !== transfer.toBranch.toString()) {
          return res.status(403).json({ success: false, message: 'Only the destination branch can mark a transfer as Completed' });
        }
      }

      // Increment destination branch stock
      for (const it of transfer.items) {
        await Inventory.findOneAndUpdate(
          { branch: transfer.toBranch, item: it.item },
          { $inc: { quantity: it.quantity } },
          { upsert: true, new: true }
        );
      }

      transfer.status = 'Completed';
      transfer.receivedBy = req.user._id;
    } 
    else if (status === 'Cancelled') {
      // Revert the reserved stock in the source branch
      for (const it of transfer.items) {
        await Inventory.findOneAndUpdate(
          { branch: transfer.fromBranch, item: it.item },
          { $inc: { quantity: it.quantity } }
        );
      }

      transfer.status = 'Cancelled';
      // Mark approvedBy or log it
    } 
    else {
      return res.status(400).json({ success: false, message: 'Invalid status transition' });
    }

    await transfer.save();

    await logAudit({
      userId: req.user._id,
      branchId: transfer.fromBranch,
      action: 'UPDATE',
      module: 'Transfers',
      recordId: transfer._id,
      details: { fromStatus: prevStatus, toStatus: status },
      ipAddress: req.ip
    });

    const populatedTransfer = await Transfer.findById(transfer._id)
      .populate('fromBranch', 'name code')
      .populate('toBranch', 'name code')
      .populate('createdBy', 'name')
      .populate('approvedBy', 'name')
      .populate('receivedBy', 'name')
      .populate('items.item', 'name sku');

    res.status(200).json({ success: true, data: populatedTransfer });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all transfers
// @route   GET /api/transfers
// @access  Private (read:transfers)
exports.getTransfers = async (req, res, next) => {
  try {
    const { branch, status, direction = 'all', page = 1, limit = 50 } = req.query;
    const query = {};

    // Branch lock logic:
    // Non-global users can only see transfers involving their branch
    if (req.user.role.name !== 'Main Admin' && req.user.role.name !== 'Auditor') {
      const userBranchId = req.user.branch;
      if (direction === 'incoming') {
        query.toBranch = userBranchId;
      } else if (direction === 'outgoing') {
        query.fromBranch = userBranchId;
      } else {
        query.$or = [
          { fromBranch: userBranchId },
          { toBranch: userBranchId }
        ];
      }
    } else if (branch) {
      if (direction === 'incoming') {
        query.toBranch = branch;
      } else if (direction === 'outgoing') {
        query.fromBranch = branch;
      } else {
        query.$or = [
          { fromBranch: branch },
          { toBranch: branch }
        ];
      }
    }

    if (status) {
      query.status = status;
    }

    const count = await Transfer.countDocuments(query);
    const transfers = await Transfer.find(query)
      .populate('fromBranch', 'name code')
      .populate('toBranch', 'name code')
      .populate('createdBy', 'name employeeId')
      .populate('approvedBy', 'name employeeId')
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
      data: transfers
    });
  } catch (error) {
    next(error);
  }
};
