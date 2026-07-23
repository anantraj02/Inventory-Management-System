const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },
  action: {
    type: String,
    required: true,
    enum: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'MONTHLY_CLOSE']
  },
  module: {
    type: String,
    required: true
  },
  recordId: {
    type: String
  },
  details: {
    type: mongoose.Schema.Types.Mixed // JSON or string of changes
  },
  ipAddress: {
    type: String
  }
}, {
  timestamps: { createdAt: true, updatedAt: false } // only createdAt is needed
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
