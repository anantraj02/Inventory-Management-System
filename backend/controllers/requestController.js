const RequestApproval = require('../models/RequestApproval');
const Inventory = require('../models/Inventory');
const StockOut = require('../models/StockOut');
const PurchaseRequisition = require('../models/PurchaseRequisition');
const logAudit = require('../utils/auditLogger');

// @desc    Submit item request
// @route   POST /api/requests
// @access  Private (write:requests)
exports.createRequest = async (req, res, next) => {
  const { item, quantity, purpose } = req.body;

  try {
    if (!req.user.branch) {
      return res.status(400).json({ success: false, message: 'You must be assigned to a branch to request items' });
    }

    const request = new RequestApproval({
      branch: req.user.branch._id,
      employee: req.user._id,
      item,
      quantity,
      purpose,
      status: 'Pending'
    });

    await request.save();

    await logAudit({
      userId: req.user._id,
      branchId: req.user.branch._id,
      action: 'CREATE',
      module: 'RequestApprovals',
      recordId: request._id,
      details: { item, quantity, purpose },
      ipAddress: req.ip
    });

    const populatedRequest = await RequestApproval.findById(request._id)
      .populate('branch', 'name code')
      .populate('employee', 'name employeeId')
      .populate('item', 'name sku');

    res.status(201).json({ success: true, data: populatedRequest });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve or reject a request
// @route   PUT /api/requests/:id/status
// @access  Private (approve:requests)
exports.updateRequestStatus = async (req, res, next) => {
  const { status, notes } = req.body; // 'Approved' or 'Rejected'

  try {
    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Choose Approved or Rejected.' });
    }

    const request = await RequestApproval.findById(req.params.id).populate('employee');
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.status !== 'Pending') {
      return res.status(400).json({ success: false, message: `Request is already resolved: ${request.status}` });
    }

    // Branch lock: managers can only manage requests in their own branch
    if (req.user.role.name !== 'Main Admin') {
      if (request.branch.toString() !== req.user.branch._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to manage requests in another branch' });
      }
    }

    if (status === 'Approved') {
      // 1. Check stock availability in the branch
      const inv = await Inventory.findOne({ branch: request.branch, item: request.item }).populate('item');
      if (!inv || inv.quantity < request.quantity) {
        const itemName = inv ? inv.item.name : 'Requested Item';
        return res.status(400).json({
          success: false,
          message: `Insufficient stock in branch inventory for [${itemName}]. Cannot approve request.`
        });
      }

      // 2. Decrement stock
      const updatedInv = await Inventory.findOneAndUpdate(
        { branch: request.branch, item: request.item },
        { $inc: { quantity: -request.quantity } },
        { new: true }
      );

      // Trigger auto-PR if stock falls below min limit
      if (inv.item && updatedInv.quantity < inv.item.minStockLevel) {
        const activePrExists = await PurchaseRequisition.findOne({
          branch: request.branch,
          item: request.item,
          status: { $ne: 'Received' }
        });
        if (!activePrExists) {
          const requisitionQty = Math.max(inv.item.minStockLevel * 2, 20);
          const autoRequisition = new PurchaseRequisition({
            branch: request.branch,
            item: request.item,
            quantity: requisitionQty,
            status: 'Pending',
            notes: `Auto-generated: Stock level (${updatedInv.quantity}) fell below minimum (${inv.item.minStockLevel}) via request approval.`
          });
          await autoRequisition.save();
        }
      }

      // 3. Create Stock Out transaction (Internal Use)
      const stockOut = new StockOut({
        type: 'Internal Use',
        branch: request.branch,
        performedBy: req.user._id,
        recipientEmployee: request.employee._id,
        items: [{
          item: request.item,
          quantity: request.quantity,
          unitPrice: 0, // internal transfers/allocations are not priced or costed at sale value
          totalPrice: 0
        }],
        totalAmount: 0,
        notes: `Issued via Employee Request Approval #${request._id}. Purpose: ${request.purpose}`
      });

      await stockOut.save();
    }

    // 4. Update request status
    request.status = status;
    request.managedBy = req.user._id;
    request.decisionDate = new Date();
    request.notes = notes;

    await request.save();

    await logAudit({
      userId: req.user._id,
      branchId: request.branch,
      action: 'UPDATE',
      module: 'RequestApprovals',
      recordId: request._id,
      details: { status, notes },
      ipAddress: req.ip
    });

    const populatedRequest = await RequestApproval.findById(request._id)
      .populate('branch', 'name code')
      .populate('employee', 'name employeeId')
      .populate('managedBy', 'name employeeId')
      .populate('item', 'name sku');

    res.status(200).json({ success: true, data: populatedRequest });
  } catch (error) {
    next(error);
  }
};

// @desc    Get requests list
// @route   GET /api/requests
// @access  Private (read:requests)
exports.getRequests = async (req, res, next) => {
  try {
    const { branch, status, page = 1, limit = 50 } = req.query;
    const query = {};

    // Role-based data visibility
    // Employees can ONLY see their own requests
    if (req.user.role.name === 'Employee') {
      query.employee = req.user._id;
    } 
    // Branch managers see all requests for their branch
    else if (req.user.role.name !== 'Main Admin' && req.user.role.name !== 'Auditor') {
      query.branch = req.user.branch;
    } 
    // Main Admin / Auditor can filter by branch optionally
    else if (branch) {
      query.branch = branch;
    }

    if (status) {
      query.status = status;
    }

    const count = await RequestApproval.countDocuments(query);
    const requests = await RequestApproval.find(query)
      .populate('branch', 'name code')
      .populate('employee', 'name employeeId')
      .populate('managedBy', 'name employeeId')
      .populate('item', 'name sku unitOfMeasure')
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
      data: requests
    });
  } catch (error) {
    next(error);
  }
};
