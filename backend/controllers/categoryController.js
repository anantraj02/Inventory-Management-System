const Category = require('../models/Category');
const logAudit = require('../utils/auditLogger');

exports.getCategories = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    const count = await Category.countDocuments(query);
    const categories = await Category.find(query)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

exports.getCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.status(200).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

exports.createCategory = async (req, res, next) => {
  try {
    const category = new Category(req.body);
    await category.save();

    await logAudit({
      userId: req.user._id,
      branchId: req.user.branch || null,
      action: 'CREATE',
      module: 'Categories',
      recordId: category._id,
      details: category,
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

exports.updateCategory = async (req, res, next) => {
  try {
    let category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const oldValue = JSON.stringify(category);
    category = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    await logAudit({
      userId: req.user._id,
      branchId: req.user.branch || null,
      action: 'UPDATE',
      module: 'Categories',
      recordId: category._id,
      details: { old: JSON.parse(oldValue), new: category },
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    await Category.findByIdAndDelete(req.params.id);

    await logAudit({
      userId: req.user._id,
      branchId: req.user.branch || null,
      action: 'DELETE',
      module: 'Categories',
      recordId: category._id,
      details: category,
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    next(error);
  }
};
