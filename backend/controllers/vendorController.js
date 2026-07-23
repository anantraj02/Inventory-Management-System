const Vendor = require('../models/Vendor');
const logAudit = require('../utils/auditLogger');

exports.getVendors = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { contactName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const count = await Vendor.countDocuments(query);
    const vendors = await Vendor.find(query)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
      data: vendors
    });
  } catch (error) {
    next(error);
  }
};

exports.getVendor = async (req, res, next) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }
    res.status(200).json({ success: true, data: vendor });
  } catch (error) {
    next(error);
  }
};

exports.createVendor = async (req, res, next) => {
  try {
    const vendor = new Vendor(req.body);
    await vendor.save();

    await logAudit({
      userId: req.user._id,
      branchId: req.user.branch || null,
      action: 'CREATE',
      module: 'Vendors',
      recordId: vendor._id,
      details: vendor,
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, data: vendor });
  } catch (error) {
    next(error);
  }
};

exports.updateVendor = async (req, res, next) => {
  try {
    let vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    const oldValue = JSON.stringify(vendor);
    vendor = await Vendor.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    await logAudit({
      userId: req.user._id,
      branchId: req.user.branch || null,
      action: 'UPDATE',
      module: 'Vendors',
      recordId: vendor._id,
      details: { old: JSON.parse(oldValue), new: vendor },
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, data: vendor });
  } catch (error) {
    next(error);
  }
};

exports.deleteVendor = async (req, res, next) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    await Vendor.findByIdAndDelete(req.params.id);

    await logAudit({
      userId: req.user._id,
      branchId: req.user.branch || null,
      action: 'DELETE',
      module: 'Vendors',
      recordId: vendor._id,
      details: vendor,
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, message: 'Vendor deleted successfully' });
  } catch (error) {
    next(error);
  }
};
