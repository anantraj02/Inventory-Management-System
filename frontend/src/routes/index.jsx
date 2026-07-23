import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

// Layout
import DashboardLayout from '../layouts/DashboardLayout';

// Pages
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Inventory from '../pages/Inventory';
import StockIn from '../pages/StockIn';
import StockOut from '../pages/StockOut';
import Transfers from '../pages/Transfers';
import Requests from '../pages/Requests';
import Requisitions from '../pages/Requisitions';
import Closing from '../pages/Closing';
import Branches from '../pages/Branches';
import Users from '../pages/Users';
import Vendors from '../pages/Vendors';
import Customers from '../pages/Customers';
import Categories from '../pages/Categories';
import Items from '../pages/Items';
import Reports from '../pages/Reports';
import AuditLogs from '../pages/AuditLogs';

// Auth Route Guard
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isInitialized } = useSelector((state) => state.auth);

  if (!isInitialized) {
    // Show premium screen loader while checking authentication
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-slate-500 font-semibold tracking-widest uppercase">Initializing Vortex ERP...</span>
        </div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Permission Route Guard
const PermissionRoute = ({ children, requiredPermission }) => {
  const { user } = useSelector((state) => state.auth);

  if (!user || !user.role) {
    return <Navigate to="/login" replace />;
  }

  // Main Admin bypasses all checks
  if (user.role.name === 'Main Admin') {
    return children;
  }

  const hasPerm = user.role.permissions?.includes(requiredPermission);
  return hasPerm ? children : <Navigate to="/" replace />;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Landing & Login page */}
      <Route path="/login" element={<Login />} />

      {/* Protected ERP Workspace Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard */}
        <Route index element={<Dashboard />} />

        {/* Inventory & stock */}
        <Route path="inventory" element={<Inventory />} />
        
        <Route
          path="stock-in"
          element={
            <PermissionRoute requiredPermission="read:stock-in">
              <StockIn />
            </PermissionRoute>
          }
        />
        
        <Route
          path="stock-out"
          element={
            <PermissionRoute requiredPermission="read:stock-out">
              <StockOut />
            </PermissionRoute>
          }
        />
        
        <Route
          path="transfers"
          element={
            <PermissionRoute requiredPermission="read:transfers">
              <Transfers />
            </PermissionRoute>
          }
        />

        {/* Workflows */}
        <Route
          path="requests"
          element={
            <PermissionRoute requiredPermission="read:requests">
              <Requests />
            </PermissionRoute>
          }
        />
        
        <Route
          path="requisitions"
          element={
            <PermissionRoute requiredPermission="read:requisitions">
              <Requisitions />
            </PermissionRoute>
          }
        />
        
        <Route
          path="closing"
          element={
            <PermissionRoute requiredPermission="close:monthly">
              <Closing />
            </PermissionRoute>
          }
        />

        {/* Master Data */}
        <Route
          path="branches"
          element={
            <PermissionRoute requiredPermission="read:branches">
              <Branches />
            </PermissionRoute>
          }
        />
        
        <Route
          path="users"
          element={
            <PermissionRoute requiredPermission="read:users">
              <Users />
            </PermissionRoute>
          }
        />
        
        <Route
          path="vendors"
          element={
            <PermissionRoute requiredPermission="read:vendors">
              <Vendors />
            </PermissionRoute>
          }
        />
        
        <Route
          path="customers"
          element={
            <PermissionRoute requiredPermission="read:customers">
              <Customers />
            </PermissionRoute>
          }
        />
        
        <Route
          path="categories"
          element={
            <PermissionRoute requiredPermission="read:categories">
              <Categories />
            </PermissionRoute>
          }
        />
        
        <Route
          path="items"
          element={
            <PermissionRoute requiredPermission="read:items">
              <Items />
            </PermissionRoute>
          }
        />

        {/* Analytics & Compliance */}
        <Route path="reports" element={<Reports />} />
        
        <Route
          path="audit-logs"
          element={
            <PermissionRoute requiredPermission="read:audit-logs">
              <AuditLogs />
            </PermissionRoute>
          }
        />
      </Route>

      {/* Redirect fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
