const Inventory = require('../models/Inventory');
const Item = require('../models/Item');
const mongoose = require('mongoose');

// @desc    Get current inventory levels
// @route   GET /api/inventory
// @access  Private (read:inventory)
exports.getInventory = async (req, res, next) => {
  try {
    const { branch, search, category, lowStock, page = 1, limit = 50 } = req.query;

    const pipeline = [];

    // 1. Branch Lock / Filtering
    const matchStage = {};
    if (req.user.role.name !== 'Main Admin' && req.user.role.name !== 'Auditor') {
      matchStage.branch = new mongoose.Types.ObjectId(req.user.branch);
    } else if (branch) {
      matchStage.branch = new mongoose.Types.ObjectId(branch);
    }
    
    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    // 2. Lookup Item definition
    pipeline.push({
      $lookup: {
        from: 'items',
        localField: 'item',
        foreignField: '_id',
        as: 'item'
      }
    });
    pipeline.push({ $unwind: '$item' });

    // 3. Lookup Item Category
    pipeline.push({
      $lookup: {
        from: 'categories',
        localField: 'item.category',
        foreignField: '_id',
        as: 'item.category'
      }
    });
    pipeline.push({ $unwind: '$item.category' });

    // 4. Lookup Branch details
    pipeline.push({
      $lookup: {
        from: 'branches',
        localField: 'branch',
        foreignField: '_id',
        as: 'branch'
      }
    });
    pipeline.push({ $unwind: '$branch' });

    // 5. Search & Category Filters
    const filterStage = {};
    if (category) {
      filterStage['item.category._id'] = new mongoose.Types.ObjectId(category);
    }

    if (search) {
      filterStage.$or = [
        { 'item.name': { $regex: search, $options: 'i' } },
        { 'item.sku': { $regex: search, $options: 'i' } },
        { 'item.barcode': { $regex: search, $options: 'i' } }
      ];
    }

    // Low stock filter: quantity < minStockLevel
    if (lowStock === 'true') {
      filterStage.$expr = { $lt: ['$quantity', '$item.minStockLevel'] };
    }

    if (Object.keys(filterStage).length > 0) {
      pipeline.push({ $match: filterStage });
    }

    // 6. Pagination & Counts
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await Inventory.aggregate(countPipeline);
    const total = countResult[0] ? countResult[0].total : 0;

    pipeline.push({ $sort: { 'item.name': 1 } });
    pipeline.push({ $skip: (Number(page) - 1) * Number(limit) });
    pipeline.push({ $limit: Number(limit) });

    const inventoryData = await Inventory.aggregate(pipeline);

    res.status(200).json({
      success: true,
      count: total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      data: inventoryData
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get inventory detail for specific item in branch
// @route   GET /api/inventory/:branchId/:itemId
// @access  Private (read:inventory)
exports.getInventoryItem = async (req, res, next) => {
  try {
    const { branchId, itemId } = req.params;

    // Permissions check: Branch Admin/Manager lock
    if (req.user.role.name !== 'Main Admin' && req.user.role.name !== 'Auditor') {
      if (branchId !== req.user.branch.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to view other branch stock' });
      }
    }

    const inventory = await Inventory.findOne({ branch: branchId, item: itemId })
      .populate({
        path: 'item',
        populate: { path: 'category', select: 'name code' }
      })
      .populate('branch', 'name code');

    if (!inventory) {
      // Return zeroed out object so UI doesn't crash and knows item has no stock
      const itemDef = await Item.findById(itemId).populate('category', 'name code');
      if (!itemDef) {
        return res.status(404).json({ success: false, message: 'Item definition not found' });
      }
      return res.status(200).json({
        success: true,
        data: {
          branch: branchId,
          item: itemDef,
          quantity: 0,
          rackLocation: 'N/A'
        }
      });
    }

    res.status(200).json({ success: true, data: inventory });
  } catch (error) {
    next(error);
  }
};
