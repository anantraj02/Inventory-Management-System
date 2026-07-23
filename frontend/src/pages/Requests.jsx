import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import API from '../services/api';
import Table from '../components/common/Table';
import Modal from '../components/common/Modal';
import { Plus, Check, X, FileText, Search, UserCheck } from 'lucide-react';
import { toast } from 'react-toastify';

const Requests = () => {
  const { user } = useSelector((state) => state.auth);

  const [requests, setRequests] = useState([]);
  const [itemsCatalog, setItemsCatalog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals controls
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isResolveOpen, setIsResolveOpen] = useState(false);
  const [activeRequest, setActiveRequest] = useState(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [decisionStatus, setDecisionStatus] = useState(''); // 'Approved' or 'Rejected'

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const isEmployee = () => {
    return user?.role?.name === 'Employee';
  };

  const isManager = () => {
    if (!user || !user.role) return false;
    return user.role.permissions.includes('approve:requests');
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/requests?page=${page}&limit=10`);
      if (res.data.success) {
        setRequests(res.data.data);
        setTotalPages(res.data.totalPages);
      }
    } catch (err) {
      toast.error('Failed to load item requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchItemsCatalog = async () => {
    try {
      const res = await API.get('/items?limit=100');
      if (res.data.success) {
        setItemsCatalog(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [page]);

  useEffect(() => {
    if (isEmployee()) {
      fetchItemsCatalog();
    }
  }, []);

  const openCreateModal = () => {
    reset({
      item: '',
      quantity: 1,
      purpose: ''
    });
    setIsCreateOpen(true);
  };

  const onSubmitRequest = async (formData) => {
    try {
      const res = await API.post('/requests', formData);
      if (res.data.success) {
        toast.success('Your item request has been submitted successfully.');
        setIsCreateOpen(false);
        fetchRequests();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    }
  };

  const openResolveModal = (reqObj, status) => {
    setActiveRequest(reqObj);
    setDecisionStatus(status);
    setDecisionNotes('');
    setIsResolveOpen(true);
  };

  const handleResolveRequest = async () => {
    try {
      const res = await API.put(`/requests/${activeRequest._id}/status`, {
        status: decisionStatus,
        notes: decisionNotes
      });

      if (res.data.success) {
        toast.success(`Request successfully ${decisionStatus}`);
        setIsResolveOpen(false);
        fetchRequests();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Resolution failed');
    }
  };

  const columns = [
    {
      header: 'Employee',
      key: 'employee',
      render: (row) => (
        <div>
          <span className="font-semibold text-slate-200 block">{row.employee?.name}</span>
          <span className="text-[10px] text-slate-505 font-mono text-slate-500">{row.employee?.employeeId}</span>
        </div>
      )
    },
    {
      header: 'Requested Item',
      key: 'item',
      render: (row) => (
        <div>
          <span className="font-semibold text-slate-300 block">{row.item?.name}</span>
          <span className="text-[10px] text-slate-500 font-mono">SKU: {row.item?.sku}</span>
        </div>
      )
    },
    {
      header: 'Qty',
      key: 'quantity',
      render: (row) => <span>{row.quantity} {row.item?.unitOfMeasure}</span>
    },
    {
      header: 'Purpose / Reason',
      key: 'purpose',
      render: (row) => <span className="text-slate-400 text-xs italic">{row.purpose}</span>
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => {
        let colors = 'bg-slate-950 text-slate-400 border-slate-900';
        if (row.status === 'Pending') colors = 'bg-amber-950/40 text-amber-400 border-amber-500/10';
        if (row.status === 'Approved') colors = 'bg-emerald-950/40 text-emerald-400 border-emerald-500/10';
        if (row.status === 'Rejected') colors = 'bg-red-950/40 text-red-400 border-red-500/10';

        return (
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${colors}`}>
            {row.status}
          </span>
        );
      }
    },
    {
      header: 'Actions / Resolution',
      key: 'actions',
      render: (row) => {
        if (row.status === 'Pending' && isManager()) {
          return (
            <div className="flex gap-2">
              <button
                onClick={() => openResolveModal(row, 'Approved')}
                className="p-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg border border-emerald-500/20 transition-all cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => openResolveModal(row, 'Rejected')}
                className="p-1.5 bg-red-950/40 text-red-400 hover:bg-red-500 hover:text-white rounded-lg border border-red-500/10 transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        }

        return (
          <span className="text-[10px] text-slate-500 italic">
            {row.status === 'Pending' ? 'Awaiting Decision' : `Resolved by ${row.managedBy?.name || 'Manager'}`}
          </span>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Employee Requests Ledger</h1>
          <p className="text-xs text-slate-500 mt-1">Submit internal asset requests or authorize stock issues for team operations</p>
        </div>
        {isEmployee() && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-950/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Submit Item Request</span>
          </button>
        )}
      </div>

      {/* List Table */}
      <Table
        columns={columns}
        data={requests}
        totalPages={totalPages}
        currentPage={page}
        onPageChange={setPage}
        loading={loading}
      />

      {/* Submit Request Modal (Employee only) */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Submit New Asset Request"
      >
        <form onSubmit={handleSubmit(onSubmitRequest)} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Select Item from Catalog</label>
            <select
              className={`w-full bg-slate-950 border ${errors.item ? 'border-red-500' : 'border-slate-800 focus:border-violet-500'} rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none transition-all`}
              {...register('item', { required: 'Please select an item' })}
            >
              <option value="">-- Choose Product --</option>
              {itemsCatalog.map(item => (
                <option key={item._id} value={item._id}>{item.name} ({item.sku})</option>
              ))}
            </select>
            {errors.item && <span className="text-[10px] text-red-400 mt-1 block">{errors.item.message}</span>}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Quantity Requested</label>
            <input
              type="number"
              placeholder="1"
              className={`w-full bg-slate-950 border ${errors.quantity ? 'border-red-500' : 'border-slate-800 focus:border-violet-500'} rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all`}
              {...register('quantity', { required: 'Quantity is required', min: { value: 1, message: 'Must request at least 1' } })}
            />
            {errors.quantity && <span className="text-[10px] text-red-400 mt-1 block">{errors.quantity.message}</span>}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Purpose / Reason for allocation</label>
            <textarea
              placeholder="E.g. ThinkPad keyboard keys broken, requesting replacement laptop."
              rows={3}
              className={`w-full bg-slate-950 border ${errors.purpose ? 'border-red-500' : 'border-slate-800 focus:border-violet-500'} rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all`}
              {...register('purpose', { required: 'Purpose is required' })}
            />
            {errors.purpose && <span className="text-[10px] text-red-400 mt-1 block">{errors.purpose.message}</span>}
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2.5 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              Submit Request
            </button>
          </div>
        </form>
      </Modal>

      {/* Resolve Request Modal (Manager only) */}
      <Modal
        isOpen={isResolveOpen}
        onClose={() => setIsResolveOpen(false)}
        title={decisionStatus === 'Approved' ? 'Approve Item Request' : 'Reject Item Request'}
      >
        <div className="space-y-4">
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
            <p className="text-xs text-slate-500">REQUEST DETAILS</p>
            <p className="text-xs font-bold text-slate-200">
              Employee: {activeRequest?.employee?.name} ({activeRequest?.employee?.employeeId})
            </p>
            <p className="text-xs font-bold text-slate-200">
              Requested Asset: {activeRequest?.item?.name} (x{activeRequest?.quantity})
            </p>
            <p className="text-xs font-bold text-slate-400 italic">
              Purpose: "{activeRequest?.purpose}"
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Decision Notes / Comments</label>
            <textarea
              placeholder="Provide context or comments for approval/rejection..."
              rows={2}
              value={decisionNotes}
              onChange={(e) => setDecisionNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all"
            />
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              onClick={() => setIsResolveOpen(false)}
              className="px-4 py-2.5 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleResolveRequest}
              className={`px-4 py-2.5 ${decisionStatus === 'Approved' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'} text-white rounded-xl text-xs font-semibold transition-all cursor-pointer`}
            >
              {decisionStatus === 'Approved' ? 'Approve & Issue' : 'Confirm Rejection'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Requests;
