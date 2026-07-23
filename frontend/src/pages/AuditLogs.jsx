import React, { useEffect, useState } from 'react';
import API from '../services/api';
import Table from '../components/common/Table';
import { Search, Calendar, FileText, ArrowRight } from 'lucide-react';
import { toast } from 'react-toastify';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionFilter, setActionFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const query = `?action=${actionFilter}&module=${moduleFilter}&startDate=${startDate}&endDate=${endDate}&page=${page}&limit=15`;
      const res = await API.get(`/audit-logs${query}`);
      if (res.data.success) {
        setLogs(res.data.data);
        setTotalPages(res.data.totalPages);
      }
    } catch (err) {
      toast.error('Failed to load system audit trails');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [actionFilter, moduleFilter, startDate, endDate, page]);

  const columns = [
    {
      header: 'Timestamp',
      key: 'createdAt',
      render: (row) => <span className="text-slate-500 font-mono text-xs">{new Date(row.createdAt).toLocaleString()}</span>
    },
    {
      header: 'Operator / User',
      key: 'user',
      render: (row) => (
        row.user ? (
          <div>
            <span className="font-semibold text-slate-200 block">{row.user.name}</span>
            <span className="text-[10px] text-slate-500 font-mono">{row.user.employeeId}</span>
          </div>
        ) : <span className="text-slate-600">System</span>
      )
    },
    {
      header: 'Branch context',
      key: 'branch',
      render: (row) => <span>{row.branch ? row.branch.name : 'Global Head Office'}</span>
    },
    {
      header: 'Action',
      key: 'action',
      render: (row) => {
        let colors = 'bg-slate-950 text-slate-400 border-slate-900';
        if (row.action === 'CREATE') colors = 'bg-emerald-950/40 text-emerald-400 border-emerald-500/10';
        if (row.action === 'UPDATE') colors = 'bg-blue-950/40 text-blue-400 border-blue-500/10';
        if (row.action === 'DELETE') colors = 'bg-red-950/40 text-red-400 border-red-500/10';
        if (row.action === 'LOGIN') colors = 'bg-indigo-950/40 text-indigo-400 border-indigo-500/10';
        if (row.action === 'MONTHLY_CLOSE') colors = 'bg-violet-950/40 text-violet-400 border-violet-500/10';

        return (
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${colors}`}>
            {row.action}
          </span>
        );
      }
    },
    { header: 'Module / Section', key: 'module' },
    {
      header: 'Change summary details',
      key: 'details',
      render: (row) => (
        <span className="text-slate-400 text-xs font-mono block max-w-sm truncate" title={JSON.stringify(row.details)}>
          {JSON.stringify(row.details)}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div>
        <h1 className="text-xl font-bold text-slate-100">Compliance Audit Trails</h1>
        <p className="text-xs text-slate-500 mt-1">Read-only system log capturing user mutations and transaction logs</p>
      </div>

      {/* Query Filter panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-slate-900/20 border border-slate-800/80 rounded-2xl p-4">
        <div>
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Action Type</label>
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none transition-all"
          >
            <option value="">All Actions</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="LOGIN">LOGIN</option>
            <option value="LOGOUT">LOGOUT</option>
            <option value="MONTHLY_CLOSE">MONTHLY CLOSE</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Module / Section</label>
          <select
            value={moduleFilter}
            onChange={(e) => { setModuleFilter(e.target.value); setPage(1); }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none transition-all"
          >
            <option value="">All Modules</option>
            <option value="Auth">Auth</option>
            <option value="Branches">Branches</option>
            <option value="Users">Users</option>
            <option value="Vendors">Vendors</option>
            <option value="Customers">Customers</option>
            <option value="Categories">Categories</option>
            <option value="Items">Items Definition</option>
            <option value="StockIn">Stock Receipts (In)</option>
            <option value="StockOut">Stock Dispatches (Out)</option>
            <option value="Transfers">Stock Transfers</option>
            <option value="RequestApprovals">Employee Requests</option>
            <option value="PurchaseRequisitions">Purchase Requisitions</option>
            <option value="MonthlyClosing">Monthly Closings</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none transition-all"
          />
        </div>

        <div>
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={logs}
        totalPages={totalPages}
        currentPage={page}
        onPageChange={setPage}
        loading={loading}
      />
    </div>
  );
};

export default AuditLogs;
