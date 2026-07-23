const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const PORT = 5050; // Use test port
process.env.PORT = PORT;
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/inventory_db_test'; // separate db for tests
process.env.NODE_ENV = 'test';

console.log('--- Starting Backend Verification Tests ---');

// Helper to make HTTP Requests
const request = (method, urlPath, headers = {}, body = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: urlPath,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ statusCode: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

const pollServer = async (maxAttempts = 40) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await request('GET', '/');
      if (res.statusCode === 200) {
        console.log(`Server is ready after ${attempt} seconds!`);
        return true;
      }
    } catch (e) {
      // Server not ready yet
    }
    console.log(`Waiting for server to spin up (attempt ${attempt}/${maxAttempts})...`);
    await new Promise(r => setTimeout(r, 1000));
  }
  return false;
};

const runTests = async () => {
  // Start server
  const serverPath = path.join(__dirname, '../server.js');
  console.log(`Starting server process: node ${serverPath}...`);
  const serverProcess = spawn('node', [serverPath], {
    env: { ...process.env, PORT }
  });

  serverProcess.stdout.on('data', (data) => {
    console.log(`[Server Log]: ${data.toString().trim()}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`[Server Error Log]: ${data.toString().trim()}`);
  });

  // Poll server until ready
  const isReady = await pollServer(40);
  if (!isReady) {
    console.error('Timeout waiting for server to start.');
    serverProcess.kill();
    process.exit(1);
  }

  let token = '';
  let employeeId = 'EMP001';
  let branchId = '';
  let categoryId = '';
  let itemId = '';
  let vendorId = '';
  let customerId = '';

  try {
    // Test 1: Hit API index
    console.log('\nTest 1: Verify Server Status');
    const indexRes = await request('GET', '/');
    console.log(`Response Status: ${indexRes.statusCode}`);
    console.log(`Response Body:`, indexRes.body);
    if (indexRes.statusCode !== 200) throw new Error('API server failed to respond');

    // Test 2: Login with Email
    console.log('\nTest 2: Login with Email & Password (admin@inventory.com)');
    const loginRes = await request('POST', '/api/auth/login', {}, {
      emailOrEmpId: 'admin@inventory.com',
      password: 'adminpassword'
    });
    console.log(`Response Status: ${loginRes.statusCode}`);
    if (loginRes.statusCode !== 200) {
      throw new Error(`Login failed: ${JSON.stringify(loginRes.body)}`);
    }
    token = loginRes.body.accessToken;
    branchId = loginRes.body.user.branch._id;
    console.log(`Login Successful! Token length: ${token.length}`);
    console.log(`Branch ID: ${branchId}`);

    const authHeader = { 'Authorization': `Bearer ${token}` };

    // Test 3: Attempt protected route without token
    console.log('\nTest 3: Attempt protected route without token (Should be 401)');
    const protFailRes = await request('GET', '/api/branches');
    console.log(`Response Status: ${protFailRes.statusCode} (Expected: 401)`);
    if (protFailRes.statusCode !== 401) throw new Error('Protected guard failed');

    // Test 4: Create Category
    console.log('\nTest 4: Create Inventory Category');
    const catRes = await request('POST', '/api/categories', authHeader, {
      name: 'Electronics & Gadgets',
      code: 'CAT-ELEC',
      description: 'High tech electronics'
    });
    console.log(`Response Status: ${catRes.statusCode}`);
    console.log('Category Data:', catRes.body.data);
    if (catRes.statusCode !== 201) throw new Error('Category creation failed');
    categoryId = catRes.body.data._id;

    // Test 5: Create Vendor
    console.log('\nTest 5: Create Vendor');
    const vendRes = await request('POST', '/api/vendors', authHeader, {
      name: 'Global Tech Suppliers Ltd',
      contactName: 'John Doe',
      email: 'sales@globaltech.com',
      phone: '+1234567890',
      address: '100 Silicon Way'
    });
    console.log(`Response Status: ${vendRes.statusCode}`);
    if (vendRes.statusCode !== 201) throw new Error('Vendor creation failed');
    vendorId = vendRes.body.data._id;

    // Test 6: Create Item
    console.log('\nTest 6: Create Item Definition');
    const itemRes = await request('POST', '/api/items', authHeader, {
      name: 'ThinkPad X1 Carbon Gen 11',
      sku: 'SKU-TPX1-G11',
      barcode: '888392019230',
      description: 'Business laptop',
      category: categoryId,
      unitOfMeasure: 'pcs',
      minStockLevel: 5
    });
    console.log(`Response Status: ${itemRes.statusCode}`);
    console.log('Item SKU:', itemRes.body.data.sku);
    if (itemRes.statusCode !== 201) throw new Error('Item creation failed');
    itemId = itemRes.body.data._id;

    // Test 7: Create Customer
    console.log('\nTest 7: Create Customer');
    const custRes = await request('POST', '/api/customers', authHeader, {
      name: 'Enterprise Client Inc',
      email: 'procurement@enterprise.com',
      phone: '+9876543210',
      address: 'Corporate Headquarters Office'
    });
    console.log(`Response Status: ${custRes.statusCode}`);
    if (custRes.statusCode !== 201) throw new Error('Customer creation failed');
    customerId = custRes.body.data._id;

    // Test 8: Stock In (Add 10 units)
    console.log('\nTest 8: Perform Stock In');
    const stockInRes = await request('POST', '/api/stock-in', authHeader, {
      vendor: vendorId,
      branch: branchId,
      invoiceNumber: 'INV-2026-001',
      items: [{
        item: itemId,
        quantity: 10,
        unitCost: 1200
      }],
      notes: 'Initial delivery'
    });
    console.log(`Response Status: ${stockInRes.statusCode}`);
    console.log('Stock In Total Amount:', stockInRes.body.data.totalAmount);
    if (stockInRes.statusCode !== 201) throw new Error('Stock In failed');

    // Test 9: Verify current stock
    console.log('\nTest 9: Verify inventory levels');
    const invRes = await request('GET', `/api/inventory?branch=${branchId}`, authHeader);
    console.log(`Response Status: ${invRes.statusCode}`);
    console.log('Branch stock count:', invRes.body.count);
    const stockItem = invRes.body.data[0];
    console.log(`Item: ${stockItem.item.name}, Stock Qty: ${stockItem.quantity}`);
    if (stockItem.quantity !== 10) throw new Error('Inventory quantity mismatch (Expected 10)');

    // Test 10: Stock Out (Sale of 6 units) - Should drop quantity to 4 (which is below min level 5)
    // This should automatically trigger a PurchaseRequisition!
    console.log('\nTest 10: Perform Stock Out (drops below min limit, triggers auto-PR)');
    const stockOutRes = await request('POST', '/api/stock-out', authHeader, {
      type: 'Sale',
      branch: branchId,
      customer: customerId,
      items: [{
        item: itemId,
        quantity: 6,
        unitPrice: 1500
      }],
      notes: 'Bulk purchase'
    });
    console.log(`Response Status: ${stockOutRes.statusCode}`);
    console.log('Stock Out Total Amount:', stockOutRes.body.data.totalAmount);
    if (stockOutRes.statusCode !== 201) throw new Error('Stock Out failed');

    // Check inventory again
    const invRes2 = await request('GET', `/api/inventory?branch=${branchId}`, authHeader);
    console.log(`Updated inventory Qty: ${invRes2.body.data[0].quantity}`);
    if (invRes2.body.data[0].quantity !== 4) throw new Error('Inventory quantity mismatch (Expected 4)');

    // Verify Purchase Requisition was auto-created
    console.log('\nTest 10b: Verify Auto-Generated Purchase Requisition');
    const prRes = await request('GET', `/api/requisitions?branch=${branchId}`, authHeader);
    console.log(`Response Status: ${prRes.statusCode}`);
    console.log(`PRs found: ${prRes.body.count}`);
    if (prRes.body.count === 0) throw new Error('Auto-PR trigger failed');
    console.log('Auto PR Details:', {
      item: prRes.body.data[0].item.name,
      quantity: prRes.body.data[0].quantity,
      status: prRes.body.data[0].status,
      notes: prRes.body.data[0].notes
    });

    // Test 11: Dashboard API
    console.log('\nTest 11: Get Dashboard Metrics');
    const dashRes = await request('GET', `/api/dashboard?branch=${branchId}`, authHeader);
    console.log(`Response Status: ${dashRes.statusCode}`);
    console.log('Dashboard Cards metrics:', dashRes.body.metrics);
    console.log('Dashboard Low stock chart count:', dashRes.body.charts.lowStockItems.length);
    if (dashRes.statusCode !== 200) throw new Error('Dashboard API failed');

    // Test 12: Audit Log API
    console.log('\nTest 12: Retrieve Audit Logs');
    const auditRes = await request('GET', '/api/audit-logs', authHeader);
    console.log(`Response Status: ${auditRes.statusCode}`);
    console.log(`Audit Logs count: ${auditRes.body.count}`);
    if (auditRes.body.count === 0) throw new Error('Audit logging not working');
    console.log(`Recent action: [${auditRes.body.data[0].action}] in module: [${auditRes.body.data[0].module}]`);

    console.log('\n--- ALL BACKEND VERIFICATION TESTS PASSED SUCCESSFULLY! ---');
  } catch (error) {
    console.error('\nTEST SUITE FAILED:', error);
  } finally {
    // Terminate server
    console.log('Stopping test server process...');
    serverProcess.kill();
    process.exit(0);
  }
};

runTests();
