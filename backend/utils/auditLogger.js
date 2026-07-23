const AuditLog = require('../models/AuditLog');

/**
 * Helper to log system events for auditing
 * @param {Object} params
 * @param {string} params.userId - ID of the user performing the action
 * @param {string} params.branchId - ID of the branch associated with the action
 * @param {string} params.action - CREATE, UPDATE, DELETE, LOGIN, LOGOUT, MONTHLY_CLOSE
 * @param {string} params.module - The collection or section (e.g. 'Users', 'Inventory', 'StockIn')
 * @param {string} params.recordId - The ID of the affected document
 * @param {Object|string} params.details - Details about the action (e.g., changes made)
 * @param {string} params.ipAddress - The IP address of the request
 */
const logAudit = async ({ userId, branchId, action, module, recordId, details, ipAddress }) => {
  try {
    const log = new AuditLog({
      user: userId,
      branch: branchId || null,
      action,
      module,
      recordId: recordId ? recordId.toString() : null,
      details,
      ipAddress
    });
    await log.save();
  } catch (error) {
    console.error(`Audit logging failed: ${error.message}`);
  }
};

module.exports = logAudit;
