# Vortex Enterprise Inventory ERP

Vortex is an enterprise-grade, multi-branch Inventory Management System (ERP) built using the MERN stack (React, Node.js, Express, MongoDB). It provides permission-based access control, automatic purchase order triggers, branch transfer workflows, compliance audit trails, and financial monthly closing wizards.

---

## 🔑 Default Login Credentials
Upon initial database setup, the system automatically seeds the default administrator profile:
* **Admin Email**: `admin@inventory.com` (or Employee ID: `EMP001`)
* **Admin Password**: `adminpassword`

---

## 🚀 Getting Started

### 1. Run the Backend
The backend includes an automatic fallback to an in-memory MongoDB database if you do not have local MongoDB running.
```bash
cd backend
npm install
npm run dev
```
*Port: `http://localhost:5000`*

### 2. Run the Frontend
```bash
cd frontend
npm install
npm run dev
```
*Port: `http://localhost:5173`*

---

## 📖 Operational User Manual (4-Step Flow)

Follow these phases to test and run the ERP system end-to-end:

### 📁 Phase 1: Configuration & Master Data
Before registering transactions, set up your master directories:
1. **Branches**: Define warehouse locations (e.g., `Headquarters`, `East Wing Warehouse`).
2. **Categories**: Create inventory categories (e.g., Code: `CAT-ELEC`, Name: `Electronics`).
3. **Items Definition**: Add products to your catalogue.
   * *Important*: Set the **Min Stock Level** threshold (e.g., `5`). If stock drops below this number, the system automatically alerts you and flags a Purchase Requisition.
4. **Vendors & Customers**: Define suppliers you purchase from and corporate clients you sell to.
5. **Users (Employees)**: Register team members and assign roles (e.g., *Main Admin*, *Store Manager*, *Employee*, or *Auditor*) that restrict access to specific sidebars.

### 📦 Phase 2: Stock Transactions
Manage stock levels on a daily basis:
1. **Record Stock In (Receiving)**:
   * Navigate to `Stock In` ➜ Click `Record Stock In`.
   * Input the Vendor, Invoice #, items, quantity received, and cost price.
   * *(Optional)* Upload an invoice image or PDF.
2. **Record Stock Out (Dispatches)**:
   * Navigate to `Stock Out` ➜ Click `Record Stock Out`.
   * Select **Sale** (requires customer and selling price) or **Internal Use** (requires recipient employee selection).
   * Input item quantities. The system blocks dispatches exceeding actual available stock.

### 🔄 Phase 3: Shipping & Procurement Workflows
1. **Branch Stock Transfers**:
   * Create a transfer request: select source branch, destination branch, items, and quantity.
   * **Workflow steps**: Origin manager clicks `Dispatch` (sets to *In Transit*) ➜ Destination manager clicks `Receive` (sets to *Completed*, which shifts the stock balances).
2. **Reorder Requisitions**:
   * If stock falls below the configured safety limits, the system triggers a **Purchase Requisition (PR)** automatically.
   * Admins review and approve PRs, select suppliers, place the purchase order, and log items received when they arrive.

### 📉 Phase 4: Financial Closing & Audits
1. **Monthly Close Wizard**:
   * Run the 4-step wizard to close the ledger.
   * Reconcile counts, compile monthly profit/loss reports, review metrics, and lock database snapshots.
2. **Reports & Exports**:
   * Query transactions or stock warnings.
   * Download data directly as formatted **Excel Spreadsheets** or **PDF Documents**.
3. **Audit Trails**:
   * Access read-only compliance logs recording every change (creates, updates, logins, closes) with timestamps and operator IDs.

---

## 🛠️ Tech Stack
* **Frontend**: React (Vite), Tailwind CSS v4, Redux Toolkit, React Router DOM, jsPDF, SheetJS (xlsx), Recharts.
* **Backend**: Node.js, Express.js, MongoDB (Mongoose), JWT Cookies, Express-Validator, Multer.
