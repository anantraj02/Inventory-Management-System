import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import API from '../services/api';
import Table from '../components/common/Table';
import Modal from '../components/common/Modal';
import { Plus, Trash, ArrowUpRight, ShoppingCart, UserCheck, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';

const StockOut = () => {
  const { user } = useSelector((state) => state.auth);

  const [transactions, setTransactions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [branchInventory, setBranchInventory] = useState([]); // List of items available in this branch
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Form State
  const [type, setType] = useState('Sale'); // 'Sale' or 'Internal Use'
  const [customer, setCustomer] = useState('');
  const [recipientEmployee, setRecipientEmployee] = useState('');
  const [branch, setBranch] = useState(user.branch?._id || '');
  const [notes, setNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState([{ item: '', quantity: 1, unitPrice: 0 }]);

  // Modal control
  const [isOpen, setIsOpen] = useState(false);

  const isGlobalUser = () => {
    return user?.role?.name === 'Main Admin' || user?.role?.name === 'Auditor';
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const branchQuery = isGlobalUser() ? '' : `&branch=${user.branch?._id}`;
      const res = await API.get(`/stock-out?page=${page}&limit=10${branchQuery}`);
      if (res.data.success) {
        setTransactions(res.data.data);
        setTotalPages(res.data.totalPages);
      }
    } catch (err) {
      toast.error('Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterData = async () => {
    try {
      const [cRes, eRes, bRes] = await Promise.all([
        API.get('/customers?limit=100'),
        API.get('/users?limit=100'),
        API.get('/branches?limit=100')
      ]);

      if (cRes.data.success) setCustomers(cRes.data.data);
      if (eRes.data.success) setEmployees(eRes.data.data);
      if (bRes.data.success) setBranches(bRes.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Load inventory of the selected branch to choose from
  const fetchBranchInventory = async () => {
    if (!branch) return;
    try {
      const res = await API.get(`/inventory?branch=${branch}&limit=200`);
      if (res.data.success) {
        setBranchInventory(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page]);

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    fetchBranchInventory();
    // Reset selected items when branch changes
    setSelectedItems([{ item: '', quantity: 1, unitPrice: 0 }]);
  }, [branch]);

  const handleAddItemRow = () => {
    setSelectedItems([...selectedItems, { item: '', quantity: 1, unitPrice: 0 }]);
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
    } else if (field === 'unitPrice') {
      values[idx].unitPrice = Math.max(0, parseFloat(value) || 0);
    } else {
      values[idx][field] = value;
    }
    setSelectedItems(values);
  };

  const calculateTotalAmount = () => {
    return selectedItems.reduce((sum, row) => sum + (row.quantity * row.unitPrice), 0);
  };

  const handleSubmitTransaction = async (e) => {
    e.preventDefault();
    if (type === 'Sale' && !customer) return toast.error('Please select a customer');
    if (type === 'Internal Use' && !recipientEmployee) return toast.error('Please select a recipient employee');

    // Verify item rows
    const invalidRow = selectedItems.find(it => !it.item || it.quantity < 1 || (type === 'Sale' && it.unitPrice < 0));
    if (invalidRow) {
      return toast.error('Please configure all item rows with a valid quantity and unit price.');
    }

    // Check availability client-side first
    for (const row of selectedItems) {
      const invItem = branchInventory.find(inv => inv.item._id === row.item);
      if (!invItem || invItem.quantity < row.quantity) {
        const name = invItem ? invItem.item.name : 'Selected Item';
        const av = invItem ? invItem.quantity : 0;
        return toast.error(`Insufficient stock for [${name}]. Available: ${av}, Requested: ${row.quantity}`);
      }
    }

    try {
      const payload = {
        type,
        customer: type === 'Sale' ? customer : undefined,
        recipientEmployee: type === 'Internal Use' ? recipientEmployee : undefined,
        branch,
        notes,
        items: selectedItems
      };

      const res = await API.post('/stock-out', payload);
      if (res.data.success) {
        toast.success('Stock dispatch completed!');
        setIsOpen(false);
        fetchTransactions();
        fetchBranchInventory(); // reload updated stock levels

        // Reset
        setCustomer('');
        setRecipientEmployee('');
        setNotes('');
        setSelectedItems([{ item: '', quantity: 1, unitPrice: 0 }]);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Transaction submission failed');
    }
  };

  const columns = [
    {
      header: 'Type',
      key: 'type',
      render: (row) => (
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
            row.type === 'Sale'
              ? 'bg-blue-950/40 text-blue-400 border-blue-500/10'
              : 'bg-amber-950/40 text-amber-400 border-amber-500/10'
          }`}
        >
          {row.type}
        </span>
      )
    },
    {
      header: 'Destination Party',
      key: 'party',
      render: (row) => (
        row.type === 'Sale'
          ? (row.customer ? row.customer.name : 'Unknown Customer')
          : (row.recipientEmployee ? row.recipientEmployee.name : 'Internal Use')
      )
    },
    {
      header: 'Branch Dispatch',
      key: 'branch',
      render: (row) => <span>{row.branch ? row.branch.name : 'Headquarters'}</span>
    },
    {
      header: 'Amount Value',
      key: 'totalAmount',
      sortable: true,
      render: (row) => <span className="font-semibold">₹{row.totalAmount.toLocaleString()}</span>
    },
    {
      header: 'Dispatcher',
      key: 'performedBy',
      render: (row) => <span>{row.performedBy ? row.performedBy.name : 'System'}</span>
    },
    {
      header: 'Timestamp',
      key: 'createdAt',
      render: (row) => <span className="text-slate-500 text-xs">{new Date(row.createdAt).toLocaleString()}</span>
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Stock Dispatch Ledger</h1>
          <p className="text-xs text-slate-500 mt-1">Issue stock for internal workspace consumption or register retail sales transactions</p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-950/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Record Stock Out</span>
        </button>
      </div>

      {/* List Table */}
      <Table
        columns={columns}
        data={transactions}
        totalPages={totalPages}
        currentPage={page}
        onPageChange={setPage}
        loading={loading}
      />

      {/* Entry Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Record Stock Out Dispatch"
      >
        <form onSubmit={handleSubmitTransaction} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Dispatch Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none transition-all"
                required
              >
                <option value="Sale">External Sale</option>
                <option value="Internal Use">Internal Use (Workspace)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Branch Dispatch Source</label>
              {isGlobalUser() ? (
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
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
          </div>

          <div className="grid grid-cols-1 gap-4">
            {type === 'Sale' ? (
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5">Select Customer</label>
                <select
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none transition-all"
                  required
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5">Recipient Employee</label>
                <select
                  value={recipientEmployee}
                  onChange={(e) => setRecipientEmployee(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none transition-all"
                  required
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>{emp.name} ({emp.employeeId})</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Multiple Items Builder */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Item Entries</span>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Row
              </button>
            </div>

            {selectedItems.map((itemRow, idx) => {
              // Find matching inv level details
              const matchedInvItem = branchInventory.find(inv => inv.item._id === itemRow.item);
              const maxStock = matchedInvItem ? matchedInvItem.quantity : 0;

              return (
                <div key={idx} className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-5">
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

                  <div className="col-span-3">
                    <input
                      type="number"
                      placeholder={type === 'Sale' ? 'Price (₹)' : 'FOC / Internal'}
                      step="0.01"
                      min="0"
                      disabled={type !== 'Sale'}
                      value={type === 'Sale' ? itemRow.unitPrice : 0}
                      onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      required={type === 'Sale'}
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
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Additional Notes</label>
            <textarea
              placeholder="Enter dispatch notes..."
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all"
            />
          </div>

          {/* Aggregated display for sales */}
          {type === 'Sale' && (
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-semibold">Total Invoice Amount:</span>
              <span className="text-lg font-black text-emerald-400">₹{calculateTotalAmount().toLocaleString()}</span>
            </div>
          )}

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
              Save Dispatch
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StockOut;
