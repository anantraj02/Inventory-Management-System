const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  rackLocation: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Ensure a single branch only has one inventory record for a specific item
inventorySchema.index({ branch: 1, item: 1 }, { unique: true });

module.exports = mongoose.model('Inventory', inventorySchema);
