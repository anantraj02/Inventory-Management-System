const PurchaseRequisition = require('../models/PurchaseRequisition');
const logAudit = require('../utils/auditLogger');

// @desc    Create manual Purchase Requisition
// @route   POST /api/requisitions
// @access  Private (write:requisitions)
exports.createRequisition = async (req, res, next) => {
  const { branch, item, quantity, vendor, notes } = req.body;

  try {
    let assignedBranch = branch;
    if (req.user.role.name !== 'Main Admin') {
      assignedBranch = req.user.branch._id;
    }

    const requisition = new PurchaseRequisition({
      branch: assignedBranch,
      item,
      quantity,
      status: 'Pending',
      createdBy: req.user._id,
      vendor: vendor || undefined,
      notes
    });

    await requisition.save();

    await logAudit({
      userId: req.user._id,
      branchId: assignedBranch,
      action: 'CREATE',
      module: 'PurchaseRequisitions',
      recordId: requisition._id,
      details: { item, quantity, vendor },
      ipAddress: req.ip
    });

    const populatedPr = await PurchaseRequisition.findById(requisition._id)
      .populate('branch', 'name code')
      .populate('item', 'name sku')
      .populate('vendor', 'name')
      .populate('createdBy', 'name');

    res.status(201).json({ success: true, data: populatedPr });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Purchase Requisition Status
// @route   PUT /api/requisitions/:id/status
// @access  Private (approve:requisitions or write:requisitions)
exports.updateRequisitionStatus = async (req, res, next) => {
  const { status, vendor, notes } = req.body; // Pending -> Approved -> Ordered -> Received

  try {
    const requisition = await PurchaseRequisition.findById(req.params.id);
    if (!requisition) {
      return res.status(404).json({ success: false, message: 'Requisition not found' });
    }

    // Branch lock check
    if (req.user.role.name !== 'Main Admin') {
      if (requisition.branch.toString() !== req.user.branch._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to manage requisitions for another branch' });
      }
    }

    const oldStatus = requisition.status;
    requisition.status = status;
    if (vendor) requisition.vendor = vendor;
    if (notes) requisition.notes = notes;

    await requisition.save();

    await logAudit({
      userId: req.user._id,
      branchId: requisition.branch,
      action: 'UPDATE',
      module: 'PurchaseRequisitions',
      recordId: requisition._id,
      details: { oldStatus, newStatus: status },
      ipAddress: req.ip
    });

    const populatedPr = await PurchaseRequisition.findById(requisition._id)
      .populate('branch', 'name code')
      .populate('item', 'name sku')
      .populate('vendor', 'name')
      .populate('createdBy', 'name');

    res.status(200).json({ success: true, data: populatedPr });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all Purchase Requisitions
// @route   GET /api/requisitions
// @access  Private (read:requisitions)
exports.getRequisitions = async (req, res, next) => {
  try {
    const { branch, status, page = 1, limit = 50 } = req.query;
    const query = {};

    if (req.user.role.name !== 'Main Admin' && req.user.role.name !== 'Auditor') {
      query.branch = req.user.branch;
    } else if (branch) {
      query.branch = branch;
    }

    if (status) {
      query.status = status;
    }

    const count = await PurchaseRequisition.countDocuments(query);
    const requisitions = await PurchaseRequisition.find(query)
      .populate('branch', 'name code')
      .populate('item', 'name sku unitOfMeasure minStockLevel')
      .populate('vendor', 'name contactName email')
      .populate('createdBy', 'name employeeId')
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
      data: requisitions
    });
  } catch (error) {
    next(error);
  }
};
