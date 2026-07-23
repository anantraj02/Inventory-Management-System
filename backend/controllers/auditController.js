const AuditLog = require('../models/AuditLog');

// @desc    Get all audit logs
// @route   GET /api/audit-logs
// @access  Private (read:audit-logs)
exports.getAuditLogs = async (req, res, next) => {
  try {
    const { branch, action, module: modName, startDate, endDate, page = 1, limit = 50 } = req.query;
    const query = {};

    if (branch) {
      query.branch = branch;
    }

    if (action) {
      query.action = action;
    }

    if (modName) {
      query.module = modName;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const count = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .populate('user', 'name employeeId email')
      .populate('branch', 'name code')
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
      data: logs
    });
  } catch (error) {
    next(error);
  }
};
