const Branch = require('../models/Branch');
const logAudit = require('../utils/auditLogger');

// @desc    Get all branches
// @route   GET /api/branches
// @access  Private (read:branches)
exports.getBranches = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    const count = await Branch.countDocuments(query);
    const branches = await Branch.find(query)
      .populate('manager', 'name email employeeId')
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
      data: branches
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single branch
// @route   GET /api/branches/:id
// @access  Private (read:branches)
exports.getBranch = async (req, res, next) => {
  try {
    const branch = await Branch.findById(req.params.id).populate('manager', 'name email employeeId');
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }
    res.status(200).json({ success: true, data: branch });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new branch
// @route   POST /api/branches
// @access  Private (write:branches)
exports.createBranch = async (req, res, next) => {
  try {
    const { name, code, location, contactNumber, manager } = req.body;

    const branch = new Branch({
      name,
      code,
      location,
      contactNumber,
      manager: manager || undefined
    });

    await branch.save();

    await logAudit({
      userId: req.user._id,
      branchId: branch._id,
      action: 'CREATE',
      module: 'Branches',
      recordId: branch._id,
      details: branch,
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, data: branch });
  } catch (error) {
    next(error);
  }
};

// @desc    Update branch
// @route   PUT /api/branches/:id
// @access  Private (write:branches)
exports.updateBranch = async (req, res, next) => {
  try {
    let branch = await Branch.findById(req.params.id);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    const oldValue = JSON.stringify(branch);
    branch = await Branch.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    await logAudit({
      userId: req.user._id,
      branchId: branch._id,
      action: 'UPDATE',
      module: 'Branches',
      recordId: branch._id,
      details: { old: JSON.parse(oldValue), new: branch },
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, data: branch });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete branch
// @route   DELETE /api/branches/:id
// @access  Private (write:branches)
exports.deleteBranch = async (req, res, next) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    await Branch.findByIdAndDelete(req.params.id);

    await logAudit({
      userId: req.user._id,
      branchId: branch._id,
      action: 'DELETE',
      module: 'Branches',
      recordId: branch._id,
      details: branch,
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, message: 'Branch deleted successfully' });
  } catch (error) {
    next(error);
  }
};
