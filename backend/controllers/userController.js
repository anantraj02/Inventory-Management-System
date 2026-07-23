const User = require('../models/User');
const Role = require('../models/Role');
const logAudit = require('../utils/auditLogger');

// @desc    Get all users
// @route   GET /api/users
// @access  Private (read:users)
exports.getUsers = async (req, res, next) => {
  try {
    const { search, role, branch, page = 1, limit = 50 } = req.query;
    const query = {};

    // Branch Admins, Inventory Managers, and Employees can only see users of their own branch
    if (req.user.role.name !== 'Main Admin' && req.user.role.name !== 'Auditor') {
      query.branch = req.user.branch;
    } else if (branch) {
      query.branch = branch;
    }

    if (role) {
      query.role = role;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }

    const count = await User.countDocuments(query);
    const users = await User.find(query)
      .populate('role', 'name description permissions')
      .populate('branch', 'name code')
      .select('-password')
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ createdAt: -1 });

    // Fetch all roles for client reference convenience
    const roles = await Role.find({});

    res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
      data: users,
      roles
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private (read:users)
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('role', 'name description permissions')
      .populate('branch', 'name code')
      .select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Branch Admin can only view users in their branch
    if (req.user.role.name !== 'Main Admin' && req.user.role.name !== 'Auditor') {
      if (user.branch && user.branch.toString() !== req.user.branch.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to view users in another branch' });
      }
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new user
// @route   POST /api/users
// @access  Private (write:users)
exports.createUser = async (req, res, next) => {
  try {
    const { employeeId, name, email, password, role, branch, phone } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { employeeId: employeeId.toUpperCase() }
      ]
    });

    if (userExists) {
      return res.status(400).json({ success: false, message: 'User with this Email or Employee ID already exists' });
    }

    // Branch Admin can only create users within their own branch
    let assignedBranch = branch;
    if (req.user.role.name !== 'Main Admin') {
      assignedBranch = req.user.branch;
    }

    const user = new User({
      employeeId,
      name,
      email,
      password, // Pre-save hook hashes this
      role,
      branch: assignedBranch || undefined,
      phone
    });

    await user.save();

    await logAudit({
      userId: req.user._id,
      branchId: user.branch || null,
      action: 'CREATE',
      module: 'Users',
      recordId: user._id,
      details: { employeeId: user.employeeId, name: user.name, email: user.email, role, branch: user.branch },
      ipAddress: req.ip
    });

    // Populate role and branch details to return to UI
    const populatedUser = await User.findById(user._id)
      .populate('role', 'name description')
      .populate('branch', 'name code')
      .select('-password');

    res.status(201).json({ success: true, data: populatedUser });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (write:users)
exports.updateUser = async (req, res, next) => {
  try {
    let user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Branch Admin can only update users in their branch
    if (req.user.role.name !== 'Main Admin') {
      if (user.branch && user.branch.toString() !== req.user.branch.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to update users in another branch' });
      }
    }

    const { password, ...updateData } = req.body;

    // Handle password update if present
    if (password) {
      user.password = password; // Trigger mongoose pre-save hash hook
    }

    // Assign other values
    Object.keys(updateData).forEach((key) => {
      user[key] = updateData[key];
    });

    const oldValue = JSON.stringify(user);
    await user.save();

    await logAudit({
      userId: req.user._id,
      branchId: user.branch || null,
      action: 'UPDATE',
      module: 'Users',
      recordId: user._id,
      details: { old: JSON.parse(oldValue), new: user },
      ipAddress: req.ip
    });

    const populatedUser = await User.findById(user._id)
      .populate('role', 'name description')
      .populate('branch', 'name code')
      .select('-password');

    res.status(200).json({ success: true, data: populatedUser });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (write:users)
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Branch Admin restrictions
    if (req.user.role.name !== 'Main Admin') {
      if (user.branch && user.branch.toString() !== req.user.branch.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to delete users in another branch' });
      }
    }

    // Prevent deleting oneself
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
    }

    await User.findByIdAndDelete(req.params.id);

    await logAudit({
      userId: req.user._id,
      branchId: user.branch || null,
      action: 'DELETE',
      module: 'Users',
      recordId: user._id,
      details: user,
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};
