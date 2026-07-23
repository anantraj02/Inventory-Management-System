const Customer = require('../models/Customer');
const logAudit = require('../utils/auditLogger');

exports.getCustomers = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const count = await Customer.countDocuments(query);
    const customers = await Customer.find(query)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
      data: customers
    });
  } catch (error) {
    next(error);
  }
};

exports.getCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    res.status(200).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

exports.createCustomer = async (req, res, next) => {
  try {
    const customer = new Customer(req.body);
    await customer.save();

    await logAudit({
      userId: req.user._id,
      branchId: req.user.branch || null,
      action: 'CREATE',
      module: 'Customers',
      recordId: customer._id,
      details: customer,
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

exports.updateCustomer = async (req, res, next) => {
  try {
    let customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const oldValue = JSON.stringify(customer);
    customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    await logAudit({
      userId: req.user._id,
      branchId: req.user.branch || null,
      action: 'UPDATE',
      module: 'Customers',
      recordId: customer._id,
      details: { old: JSON.parse(oldValue), new: customer },
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

exports.deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    await Customer.findByIdAndDelete(req.params.id);

    await logAudit({
      userId: req.user._id,
      branchId: req.user.branch || null,
      action: 'DELETE',
      module: 'Customers',
      recordId: customer._id,
      details: customer,
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    next(error);
  }
};
