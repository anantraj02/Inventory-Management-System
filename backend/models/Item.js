const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  barcode: {
    type: String,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  unitOfMeasure: {
    type: String,
    required: true,
    trim: true
  },
  minStockLevel: {
    type: Number,
    required: true,
    default: 10
  }
}, {
  timestamps: true
});

// Index SKU and Barcode for fast lookups
itemSchema.index({ sku: 1 });
itemSchema.index({ barcode: 1 });

module.exports = mongoose.model('Item', itemSchema);
