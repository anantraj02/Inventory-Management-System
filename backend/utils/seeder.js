const mongoose = require('mongoose');
const Role = require('../models/Role');
const Branch = require('../models/Branch');
const User = require('../models/User');

const seedDatabase = async () => {
  try {
    // 1. Check if roles already exist
    const roleCount = await Role.countDocuments();
    if (roleCount > 0) {
      console.log('Database already has roles. Skipping automatic seeding.');
      return;
    }

    console.log('Seeding database with default parameters...');

    // Define Permissions
    const allPermissions = [
      'read:branches', 'write:branches',
      'read:users', 'write:users',
      'read:vendors', 'write:vendors',
      'read:categories', 'write:categories',
      'read:items', 'write:items',
      'read:customers', 'write:customers',
      'read:inventory',
      'read:stock-in', 'write:stock-in',
      'read:stock-out', 'write:stock-out',
      'read:transfers', 'write:transfers', 'approve:transfers',
      'read:requests', 'write:requests', 'approve:requests',
      'read:requisitions', 'write:requisitions', 'approve:requisitions',
      'read:audit-logs',
      'close:monthly'
    ];

    const branchAdminPermissions = [
      'read:branches',
      'read:users', 'write:users',
      'read:vendors', 'write:vendors',
      'read:categories',
      'read:items',
      'read:customers', 'write:customers',
      'read:inventory',
      'read:stock-in', 'write:stock-in',
      'read:stock-out', 'write:stock-out',
      'read:transfers', 'write:transfers', 'approve:transfers',
      'read:requests', 'approve:requests',
      'read:requisitions', 'write:requisitions'
    ];

    const inventoryManagerPermissions = [
      'read:branches',
      'read:vendors',
      'read:categories',
      'read:items',
      'read:customers',
      'read:inventory',
      'read:stock-in', 'write:stock-in',
      'read:stock-out', 'write:stock-out',
      'read:transfers', 'write:transfers',
      'read:requests', 'approve:requests',
      'read:requisitions', 'write:requisitions'
    ];

    const employeePermissions = [
      'read:branches',
      'read:items',
      'read:inventory',
      'read:requests', 'write:requests'
    ];

    const auditorPermissions = [
      'read:branches',
      'read:users',
      'read:vendors',
      'read:categories',
      'read:items',
      'read:customers',
      'read:inventory',
      'read:stock-in',
      'read:stock-out',
      'read:transfers',
      'read:requests',
      'read:requisitions',
      'read:audit-logs'
    ];

    // Seed Roles
    const rolesToSeed = [
      { name: 'Main Admin', description: 'Global Administrator with full rights', permissions: allPermissions },
      { name: 'Branch Admin', description: 'Branch Level Administrator', permissions: branchAdminPermissions },
      { name: 'Inventory Manager', description: 'Handles stock receipts, counts, and transfers', permissions: inventoryManagerPermissions },
      { name: 'Employee', description: 'Branch employee requesting assets', permissions: employeePermissions },
      { name: 'Auditor', description: 'Read-only investigator of inventory and audit logs', permissions: auditorPermissions }
    ];

    const seededRoles = {};
    for (const r of rolesToSeed) {
      const roleDoc = new Role(r);
      await roleDoc.save();
      seededRoles[r.name] = roleDoc;
      console.log(`Seeded Role: ${r.name}`);
    }

    // Seed Default Branch
    const branchDoc = new Branch({
      name: 'Main Branch Headquarters',
      code: 'BR001',
      location: 'Mumbai, India',
      contactNumber: '+919999999999'
    });
    await branchDoc.save();
    console.log(`Seeded Branch: Main Branch Headquarters (BR001)`);

    // Seed Default Main Admin User
    const adminUser = new User({
      employeeId: 'EMP001',
      name: 'Main Administrator',
      email: 'admin@inventory.com',
      password: 'adminpassword', // Will be encrypted by pre-save hook
      role: seededRoles['Main Admin']._id,
      branch: branchDoc._id,
      phone: '+918888888888',
      isActive: true
    });
    await adminUser.save();
    console.log(`Seeded User: Main Administrator (admin@inventory.com / adminpassword)`);

    console.log('Seeding Completed.');
  } catch (error) {
    console.error(`Automatic Seeding failed: ${error.message}`);
  }
};

module.exports = seedDatabase;
