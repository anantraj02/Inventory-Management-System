const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Role = require('../models/Role');
const Branch = require('../models/Branch');
const User = require('../models/User');

dotenv.config({ path: '../.env' }); // load dotenv from backend directory

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/inventory_db';
    console.log(`Connecting to database at ${mongoUri}...`);
    await mongoose.connect(mongoUri);
    console.log('Connected to database.');

    // 1. Define Permissions
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

    // 2. Seed Roles
    const rolesToSeed = [
      { name: 'Main Admin', description: 'Global Administrator with full rights', permissions: allPermissions },
      { name: 'Branch Admin', description: 'Branch Level Administrator', permissions: branchAdminPermissions },
      { name: 'Inventory Manager', description: 'Handles stock receipts, counts, and transfers', permissions: inventoryManagerPermissions },
      { name: 'Employee', description: 'Branch employee requesting assets', permissions: employeePermissions },
      { name: 'Auditor', description: 'Read-only investigator of inventory and audit logs', permissions: auditorPermissions }
    ];

    console.log('Seeding Roles...');
    const seededRoles = {};
    for (const r of rolesToSeed) {
      let roleDoc = await Role.findOne({ name: r.name });
      if (!roleDoc) {
        roleDoc = new Role(r);
        await roleDoc.save();
        console.log(`Seeded Role: ${r.name}`);
      } else {
        roleDoc.permissions = r.permissions;
        roleDoc.description = r.description;
        await roleDoc.save();
        console.log(`Updated Role: ${r.name}`);
      }
      seededRoles[r.name] = roleDoc;
    }

    // 3. Seed Default Branch
    console.log('Seeding Default Branch...');
    let branchDoc = await Branch.findOne({ code: 'BR001' });
    if (!branchDoc) {
      branchDoc = new Branch({
        name: 'Main Branch Headquarters',
        code: 'BR001',
        location: 'Mumbai, India',
        contactNumber: '+919999999999'
      });
      await branchDoc.save();
      console.log(`Seeded Branch: Main Branch Headquarters (BR001)`);
    } else {
      console.log(`Branch BR001 already exists`);
    }

    // 4. Seed Default Main Admin User
    console.log('Seeding Default Main Admin User...');
    const adminUserEmail = 'admin@inventory.com';
    let adminUser = await User.findOne({ email: adminUserEmail });
    if (!adminUser) {
      adminUser = new User({
        employeeId: 'EMP001',
        name: 'Main Administrator',
        email: adminUserEmail,
        password: 'adminpassword', // Will be encrypted by pre-save hook
        role: seededRoles['Main Admin']._id,
        branch: branchDoc._id,
        phone: '+918888888888',
        isActive: true
      });
      await adminUser.save();
      console.log(`Seeded User: Main Administrator (${adminUserEmail} / adminpassword)`);
    } else {
      console.log(`Admin User already exists`);
    }

    console.log('Database Seeding Completed Successfully.');
    process.exit(0);
  } catch (error) {
    console.error(`Seeding failed: ${error.message}`);
    process.exit(1);
  }
};

seedDatabase();
