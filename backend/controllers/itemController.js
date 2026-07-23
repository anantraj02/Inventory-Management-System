const Item = require('../models/Item');
const logAudit = require('../utils/auditLogger');

exports.getItems = async (req, res, next) => {
  try {
    const { search, category, page = 1, limit = 50 } = req.query;
    const query = {};

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } }
      ];
    }

    const count = await Item.countDocuments(query);
    const items = await Item.find(query)
      .populate('category', 'name code')
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
      data: items
    });
  } catch (error) {
    next(error);
  }
};

exports.getItem = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id).populate('category', 'name code');
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

exports.getItemByBarcode = async (req, res, next) => {
  try {
    const { barcode } = req.params;
    const item = await Item.findOne({ barcode }).populate('category', 'name code');
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item with this barcode not found' });
    }
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

exports.createItem = async (req, res, next) => {
  try {
    const { sku, barcode } = req.body;

    // Check SKU
    const skuExists = await Item.findOne({ sku: sku.toUpperCase() });
    if (skuExists) {
      return res.status(400).json({ success: false, message: 'An item with this SKU already exists' });
    }

    // Check Barcode if provided
    if (barcode) {
      const barcodeExists = await Item.findOne({ barcode });
      if (barcodeExists) {
        return res.status(400).json({ success: false, message: 'An item with this barcode already exists' });
      }
    }

    const item = new Item(req.body);
    await item.save();

    await logAudit({
      userId: req.user._id,
      branchId: req.user.branch || null,
      action: 'CREATE',
      module: 'Items',
      recordId: item._id,
      details: item,
      ipAddress: req.ip
    });

    const populatedItem = await Item.findById(item._id).populate('category', 'name code');

    res.status(201).json({ success: true, data: populatedItem });
  } catch (error) {
    next(error);
  }
};

exports.updateItem = async (req, res, next) => {
  try {
    let item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    const oldValue = JSON.stringify(item);
    item = await Item.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    await logAudit({
      userId: req.user._id,
      branchId: req.user.branch || null,
      action: 'UPDATE',
      module: 'Items',
      recordId: item._id,
      details: { old: JSON.parse(oldValue), new: item },
      ipAddress: req.ip
    });

    const populatedItem = await Item.findById(item._id).populate('category', 'name code');

    res.status(200).json({ success: true, data: populatedItem });
  } catch (error) {
    next(error);
  }
};

exports.deleteItem = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    await Item.findByIdAndDelete(req.params.id);

    await logAudit({
      userId: req.user._id,
      branchId: req.user.branch || null,
      action: 'DELETE',
      module: 'Items',
      recordId: item._id,
      details: item,
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, message: 'Item deleted successfully' });
  } catch (error) {
    next(error);
  }
};
