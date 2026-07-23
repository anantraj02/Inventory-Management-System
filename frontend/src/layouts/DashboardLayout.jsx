import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logoutUser } from '../redux/authSlice';
import API from '../services/api';
import {
  LayoutDashboard,
  GitPullRequest,
  Users,
  GitFork,
  Library,
  ShoppingBag,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  FileCheck2,
  CalendarCheck,
  BarChart3,
  FileText,
  LogOut,
  ShieldCheck,
  User as UserIcon,
  Store
} from 'lucide-react';
import { toast } from 'react-toastify';

const DashboardLayout = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await API.post('/auth/logout');
      dispatch(logoutUser());
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (err) {
      toast.error('Logout failed');
    }
  };

  const hasPermission = (perm) => {
    if (!user || !user.role) return false;
    if (user.role.name === 'Main Admin') return true;
    return user.role.permissions.includes(perm);
  };

  // Sidebar Links config based on permission strings
  const menuGroups = [
    {
      title: 'General',
      items: [
        { label: 'Dashboard', path: '/', icon: LayoutDashboard, perm: 'read:inventory' }
      ]
    },
    {
      title: 'Inventory & Stock',
      items: [
        { label: 'Current Stock', path: '/inventory', icon: Library, perm: 'read:inventory' },
        { label: 'Stock In (Receive)', path: '/stock-in', icon: ArrowDownLeft, perm: 'read:stock-in' },
        { label: 'Stock Out (Issue)', path: '/stock-out', icon: ArrowUpRight, perm: 'read:stock-out' },
        { label: 'Transfers', path: '/transfers', icon: RefreshCw, perm: 'read:transfers' }
      ]
    },
    {
      title: 'Workflows',
      items: [
        { label: 'Employee Requests', path: '/requests', icon: FileCheck2, perm: 'read:requests' },
        { label: 'Purchase Requisitions', path: '/requisitions', icon: TrendingDown, perm: 'read:requisitions' },
        { label: 'Monthly Close', path: '/closing', icon: CalendarCheck, perm: 'close:monthly' }
      ]
    },
    {
      title: 'Masters',
      items: [
        { label: 'Branches', path: '/branches', icon: Store, perm: 'read:branches' },
        { label: 'Users & Employees', path: '/users', icon: Users, perm: 'read:users' },
        { label: 'Vendors', path: '/vendors', icon: GitFork, perm: 'read:vendors' },
        { label: 'Customers', path: '/customers', icon: ShieldCheck, perm: 'read:customers' },
        { label: 'Categories', path: '/categories', icon: GitPullRequest, perm: 'read:categories' },
        { label: 'Items Definition', path: '/items', icon: ShoppingBag, perm: 'read:items' }
      ]
    },
    {
      title: 'Analytics',
      items: [
        { label: 'Reports', path: '/reports', icon: BarChart3, perm: 'read:inventory' },
        { label: 'Audit Logs', path: '/audit-logs', icon: FileText, perm: 'read:audit-logs' }
      ]
    }
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <aside className="w-68 border-r border-slate-900 bg-slate-900/30 backdrop-blur-md flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-900 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-violet-600/20 text-violet-500 border border-violet-500/30">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-md font-bold leading-none tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-300">
              VORTEX
            </h1>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
              Inventory ERP
            </span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {menuGroups.map((group, gIdx) => {
            const filteredItems = group.items.filter(item => hasPermission(item.perm));
            if (filteredItems.length === 0) return null;

            return (
              <div key={gIdx} className="space-y-2">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider px-3 block">
                  {group.title}
                </span>
                <ul className="space-y-1">
                  {filteredItems.map((item, iIdx) => {
                    const isActive = location.pathname === item.path;
                    const Icon = item.icon;
                    return (
                      <li key={iIdx}>
                        <Link
                          to={item.path}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                            isActive
                              ? 'bg-violet-600 text-white shadow-lg shadow-violet-950/20 border border-violet-500/30'
                              : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-100 border border-transparent'
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span>{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        {/* Footer info & Logout */}
        <div className="p-4 border-t border-slate-900 bg-slate-900/10">
          <div className="flex items-center gap-3 px-2 py-3 mb-2">
            <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-semibold border border-slate-700">
              {user ? user.name.charAt(0) : 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{user ? user.name : 'User'}</p>
              <p className="text-[10px] text-slate-500 truncate capitalize">{user ? user.role.name : 'Role'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-800 hover:border-red-500/30 hover:bg-red-500/10 text-slate-400 hover:text-red-400 text-xs font-semibold transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout Account</span>
          </button>
        </div>
      </aside>

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-900 bg-slate-900/10 backdrop-blur-md px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500">Active Location:</span>
            <div className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 font-medium">
              <Store className="w-3.5 h-3.5 text-violet-400" />
              <span>{user && user.branch ? user.branch.name : 'Global headquarters'}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Employee ID</p>
              <p className="text-xs font-bold text-slate-300">{user ? user.employeeId : 'N/A'}</p>
            </div>
          </div>
        </header>

        {/* Content Canvas */}
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
