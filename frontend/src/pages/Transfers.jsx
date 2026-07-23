import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import API from '../services/api';
import Table from '../components/common/Table';
import Modal from '../components/common/Modal';
import { Plus, Trash, RefreshCw, Send, Check, X, ArrowLeftRight, Store } from 'lucide-react';
import { toast } from 'react-toastify';

const Transfers = () => {
  const { user } = useSelector((state) => state.auth);

  const [transfers, setTransfers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [branchInventory, setBranchInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Form State
  const [fromBranch, setFromBranch] = useState(user.branch?._id || '');
  const [toBranch, setToBranch] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState([{ item: '', quantity: 1 }]);

  // Modal & Tab control
  const [isOpen, setIsOpen] = useState(false);
  const [directionFilter, setDirectionFilter] = useState('all'); // 'all', 'incoming', 'outgoing'
  const [statusFilter, setStatusFilter] = useState('');

  const isGlobalUser = () => {
    return user?.role?.name === 'Main Admin' || user?.role?.name === 'Auditor';
  };

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      const res = await API.get(
        `/transfers?direction=${directionFilter}&status=${statusFilter}&page=${page}&limit=10`
      );
      if (res.data.success) {
        setTransfers(res.data.data);
        setTotalPages(res.data.totalPages);
      }
    } catch (err) {
      toast.error('Failed to load transfers');
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await API.get('/branches?limit=100');
      if (res.data.success) {
        setBranches(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBranchInventory = async () => {
    if (!fromBranch) return;
    try {
      const res = await API.get(`/inventory?branch=${fromBranch}&limit=200`);
      if (res.data.success) {
        setBranchInventory(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, [directionFilter, statusFilter, page]);

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchBranchInventory();
    setSelectedItems([{ item: '', quantity: 1 }]);
  }, [fromBranch]);

  const handleAddItemRow = () => {
    setSelectedItems([...selectedItems, { item: '', quantity: 1 }]);
  };

  const handleRemoveItemRow = (idx) => {
    const values = [...selectedItems];
    values.splice(idx, 1);
    setSelectedItems(values);
  };

  const handleItemChange = (idx, field, value) => {
    const values = [...selectedItems];
    if (field === 'quantity') {
      values[idx].quantity = Math.max(1, parseInt(value) || 0);
    } else {
      values[idx][field] = value;
    }
    setSelectedItems(values);
  };

  const handleSubmitTransfer = async (e) => {
    e.preventDefault();
    if (!fromBranch) return toast.error('Select source branch');
    if (!toBranch) return toast.error('Select destination branch');
    if (fromBranch === toBranch) return toast.error('Source and destination branches must be different');

    const invalidRow = selectedItems.find(it => !it.item || it.quantity < 1);
    if (invalidRow) {
      return toast.error('Please configure all item rows with a valid quantity.');
    }

    // Verify source stock quantity client side
    for (const row of selectedItems) {
      const invItem = branchInventory.find(inv => inv.item._id === row.item);
      if (!invItem || invItem.quantity < row.quantity) {
        const name = invItem ? invItem.item.name : 'Selected Item';
        const av = invItem ? invItem.quantity : 0;
        return toast.error(`Insufficient stock in source for [${name}]. Available: ${av}`);
      }
    }

    try {
      const res = await API.post('/transfers', {
        fromBranch,
        toBranch,
        notes,
        items: selectedItems
      });

      if (res.data.success) {
        toast.success('Stock transfer request created and reserved successfully!');
        setIsOpen(false);
        fetchTransfers();
        fetchBranchInventory();

        // Reset
        setToBranch('');
        setNotes('');
        setSelectedItems([{ item: '', quantity: 1 }]);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create transfer');
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      const res = await API.put(`/transfers/${id}/status`, { status });
      if (res.data.success) {
        toast.success(`Transfer status updated to ${status}`);
        fetchTransfers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Status transition failed');
    }
  };

  // Check if current user is manager of destination branch to approve Completion
  const isDestBranchManager = (transfer) => {
    if (!user) return false;
    if (user.role.name === 'Main Admin') return true;
    return user.branch?._id === transfer.toBranch?._id;
  };

  // Check if current user is manager of source branch to dispatch In Transit
  const isSourceBranchManager = (transfer) => {
    if (!user) return false;
    if (user.role.name === 'Main Admin') return true;
    return user.branch?._id === transfer.fromBranch?._id;
  };

  const columns = [
    {
      header: 'Source / From',
      key: 'fromBranch',
      render: (row) => <span>{row.fromBranch?.name}</span>
    },
    {
      header: 'Dest / To',
      key: 'toBranch',
      render: (row) => <span>{row.toBranch?.name}</span>
    },
    {
      header: 'Transfer Items',
      key: 'items',
      render: (row) => (
        <span className="text-xs text-slate-400 block truncate max-w-[180px]">
          {row.items.map(it => `${it.item.name} (x${it.quantity})`).join(', ')}
        </span>
      )
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => {
        let colors = 'bg-slate-950 text-slate-400 border-slate-900';
        if (row.status === 'Pending') colors = 'bg-amber-950/40 text-amber-400 border-amber-500/10';
        if (row.status === 'In Transit') colors = 'bg-blue-950/40 text-blue-400 border-blue-500/10';
        if (row.status === 'Completed') colors = 'bg-emerald-950/40 text-emerald-400 border-emerald-500/10';
        if (row.status === 'Cancelled') colors = 'bg-red-950/40 text-red-400 border-red-500/10';

        return (
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${colors}`}>
            {row.status}
          </span>
        );
      }
    },
    {
      header: 'Created By',
      key: 'createdBy',
      render: (row) => <span>{row.createdBy?.name}</span>
    },
    {
      header: 'Workflow Actions',
      key: 'actions',
      render: (row) => {
        if (row.status === 'Pending' && isSourceBranchManager(row)) {
          return (
            <div className="flex gap-2">
              <button
                onClick={() => handleUpdateStatus(row._id, 'In Transit')}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" /> Dispatch
              </button>
              <button
                onClick={() => handleUpdateStatus(row._id, 'Cancelled')}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-red-950 hover:bg-red-900 text-red-400 rounded-lg text-xs font-semibold transition-all cursor-pointer border border-red-500/20"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
            </div>
          );
        }

        if (row.status === 'In Transit' && isDestBranchManager(row)) {
          return (
            <button
              onClick={() => handleUpdateStatus(row._id, 'Completed')}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" /> Receive Stock
            </button>
          );
        }

        return <span className="text-slate-500 text-xs italic">Closed</span>;
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Stock Branch Transfers</h1>
          <p className="text-xs text-slate-500 mt-1">Request, authorize, and receive stock transfers across physical warehouse branches</p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-950/20 transition-all cursor-pointer"
        >
          <ArrowLeftRight className="w-4 h-4" />
          <span>New Transfer Request</span>
        </button>
      </div>

      {/* Filter Tabs & Status Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/20 border border-slate-800/80 rounded-2xl p-4">
        {/* Direction Filter */}
        <div className="flex bg-slate-950/50 p-1 rounded-xl border border-slate-800 shrink-0">
          <button
            onClick={() => { setDirectionFilter('all'); setPage(1); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              directionFilter === 'all' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Transfers
          </button>
          <button
            onClick={() => { setDirectionFilter('incoming'); setPage(1); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              directionFilter === 'incoming' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Incoming to Me
          </button>
          <button
            onClick={() => { setDirectionFilter('outgoing'); setPage(1); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              directionFilter === 'outgoing' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Outgoing from Me
          </button>
        </div>

        {/* Status Dropdown */}
        <div className="w-full sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-300 focus:outline-none transition-all"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending Dispatch</option>
            <option value="In Transit">In Transit</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* List Table */}
      <Table
        columns={columns}
        data={transfers}
        totalPages={totalPages}
        currentPage={page}
        onPageChange={setPage}
        loading={loading}
      />

      {/* Create Request Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Initiate Stock Transfer Request"
      >
        <form onSubmit={handleSubmitTransfer} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Source Branch</label>
              {isGlobalUser() ? (
                <select
                  value={fromBranch}
                  onChange={(e) => setFromBranch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none transition-all"
                  required
                >
                  <option value="">-- Choose Branch --</option>
                  {branches.map(br => (
                    <option key={br._id} value={br._id}>{br.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-500 cursor-not-allowed"
                  value={user.branch?.name || 'Headquarters'}
                  disabled
                />
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Destination Branch</label>
              <select
                value={toBranch}
                onChange={(e) => setToBranch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none transition-all"
                required
              >
                <option value="">-- Choose Branch --</option>
                {branches.map(br => (
                  <option key={br._id} value={br._id}>{br.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Items array */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Transfer Items</span>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Row
              </button>
            </div>

            {selectedItems.map((itemRow, idx) => {
              const matchedInvItem = branchInventory.find(inv => inv.item._id === itemRow.item);
              const maxStock = matchedInvItem ? matchedInvItem.quantity : 0;

              return (
                <div key={idx} className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-8">
                    <select
                      value={itemRow.item}
                      onChange={(e) => handleItemChange(idx, 'item', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none transition-all"
                      required
                    >
                      <option value="">-- Choose Product --</option>
                      {branchInventory.map(inv => (
                        <option key={inv.item._id} value={inv.item._id}>
                          {inv.item.name} (Stock: {inv.quantity})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-3">
                    <input
                      type="number"
                      placeholder="Qty"
                      min="1"
                      max={maxStock}
                      value={itemRow.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none transition-all"
                      required
                    />
                  </div>

                  <div className="col-span-1 text-center">
                    <button
                      type="button"
                      disabled={selectedItems.length === 1}
                      onClick={() => handleRemoveItemRow(idx)}
                      className="text-slate-500 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Transfer Notes</label>
            <textarea
              placeholder="Explain reason for transfer..."
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all"
            />
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2.5 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              Dispatch Request
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Transfers;
