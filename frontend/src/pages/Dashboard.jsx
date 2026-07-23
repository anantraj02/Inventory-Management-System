import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import API from '../services/api';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import {
  Boxes,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Truck,
  Users2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'react-toastify';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#6366f1'];

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const [metrics, setMetrics] = useState({
    totalItems: 0,
    lowStock: 0,
    inventoryIn: 0,
    inventoryOut: 0,
    pendingTransfers: 0,
    totalVendors: 0,
    totalEmployees: 0
  });

  const [charts, setCharts] = useState({
    monthlyTrends: [],
    categoryDistribution: [],
    lowStockItems: []
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // If employee or manager, API filters automatically on server-side based on user's branch
        const res = await API.get('/dashboard');
        if (res.data.success) {
          setMetrics(res.data.metrics);
          setCharts(res.data.charts);
        }
      } catch (err) {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const cardData = [
    {
      title: 'Total Items',
      value: metrics.totalItems,
      icon: Boxes,
      color: 'from-violet-500/20 to-fuchsia-500/20',
      iconColor: 'text-violet-400',
      borderColor: 'border-violet-500/10'
    },
    {
      title: 'Low Stock Alerts',
      value: metrics.lowStock,
      icon: AlertTriangle,
      color: 'from-red-500/20 to-orange-500/20',
      iconColor: 'text-red-400',
      borderColor: 'border-red-500/10'
    },
    {
      title: 'Inventory In (Month)',
      value: `₹${metrics.inventoryIn.toLocaleString()}`,
      icon: ArrowDownLeft,
      color: 'from-emerald-500/20 to-teal-500/20',
      iconColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/10'
    },
    {
      title: 'Inventory Out (Month)',
      value: `₹${metrics.inventoryOut.toLocaleString()}`,
      icon: ArrowUpRight,
      color: 'from-blue-500/20 to-cyan-500/20',
      iconColor: 'text-blue-400',
      borderColor: 'border-blue-500/10'
    },
    {
      title: 'Pending Transfers',
      value: metrics.pendingTransfers,
      icon: RefreshCw,
      color: 'from-amber-500/20 to-yellow-500/20',
      iconColor: 'text-amber-400',
      borderColor: 'border-amber-500/10'
    },
    {
      title: 'Active Vendors',
      value: metrics.totalVendors,
      icon: Truck,
      color: 'from-indigo-500/20 to-sky-500/20',
      iconColor: 'text-indigo-400',
      borderColor: 'border-indigo-500/10'
    },
    {
      title: 'Active Employees',
      value: metrics.totalEmployees,
      icon: Users2,
      color: 'from-pink-500/20 to-rose-500/20',
      iconColor: 'text-pink-400',
      borderColor: 'border-pink-500/10'
    }
  ];

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        {/* Title skeleton */}
        <div className="h-8 bg-slate-800 rounded-md w-1/4"></div>
        {/* Metric grids skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-32 bg-slate-900 border border-slate-800 rounded-2xl"></div>
          ))}
        </div>
        {/* Charts skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-96 bg-slate-900 border border-slate-800 rounded-2xl lg:col-span-2"></div>
          <div className="h-96 bg-slate-900 border border-slate-800 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Title */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-100">
          Executive Workspace Summary
        </h1>
        <p className="text-xs text-slate-400">
          Real-time aggregates for {user && user.branch ? user.branch.name : 'Main Headquarters'}
        </p>
      </div>

      {/* Metrics Cards Deck */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cardData.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`bg-slate-900/60 backdrop-blur-md border ${card.borderColor} rounded-2xl p-6 flex items-center justify-between transition-all duration-300 hover:-translate-y-1 hover:border-violet-500/20 hover:shadow-xl`}
            >
              <div className="space-y-2">
                <span className="text-xs text-slate-500 font-semibold">{card.title}</span>
                <p className="text-2xl font-bold text-slate-100">{card.value}</p>
              </div>
              <div className={`p-3 rounded-xl bg-gradient-to-br ${card.color} ${card.iconColor}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Charts Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Activity Trend */}
        <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-slate-200 mb-6 uppercase tracking-wider">
            Inventory Cash Flows (Stock In vs Stock Out)
          </h2>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.monthlyTrends}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#475569" fontSize={11} />
                <YAxis stroke="#475569" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                  labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  name="Stock In (Cost)"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#incomeGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  name="Stock Out (Sales)"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#expenseGrad)"
                />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category distribution */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-slate-200 mb-6 uppercase tracking-wider">
            Category Distribution
          </h2>
          <div className="h-64 w-full flex items-center justify-center">
            {charts.categoryDistribution.length === 0 ? (
              <p className="text-xs text-slate-500">No categories to display</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.categoryDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {charts.categoryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {/* Legend */}
          <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] text-slate-400">
            {charts.categoryDistribution.map((entry, index) => (
              <div key={index} className="flex items-center gap-1.5 truncate">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                ></span>
                <span className="truncate">{entry.name} ({entry.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Alert / Warning Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Low Stock Watchlist */}
        <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              Critical Low Stock Alert
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 font-semibold">SKU</th>
                  <th className="py-2.5 font-semibold">Item Name</th>
                  <th className="py-2.5 font-semibold text-center">Branch Stock</th>
                  <th className="py-2.5 font-semibold text-center">Safety Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-slate-300">
                {charts.lowStockItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-500">
                      All item stock levels are healthy.
                    </td>
                  </tr>
                ) : (
                  charts.lowStockItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/10">
                      <td className="py-3 font-semibold text-slate-400">{item.sku}</td>
                      <td className="py-3">{item.name}</td>
                      <td className="py-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-red-950/40 text-red-400 border border-red-500/10 font-bold">
                          {item.quantity}
                        </span>
                      </td>
                      <td className="py-3 text-center text-slate-500">{item.minStockLevel}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Short Instructions panel */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quick Actions Guidance</h3>
            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex gap-2">
                <span className="text-violet-400 font-bold shrink-0">1.</span>
                <span>Audit reports monthly before conducting step close reconciliations.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 font-bold shrink-0">2.</span>
                <span>Automatic Purchase Requisitions trigger whenever branch quantities drop below the safety limit.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 font-bold shrink-0">3.</span>
                <span>Stock in files require verified invoice attachments (PDF/Images).</span>
              </li>
            </ul>
          </div>
          <div className="p-3.5 bg-violet-950/20 border border-violet-500/10 rounded-xl mt-6 text-[10px] text-violet-300 leading-normal">
            <strong>System Audit Active:</strong> All changes, user sessions, and inventory transactions are logged for compliance review.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
