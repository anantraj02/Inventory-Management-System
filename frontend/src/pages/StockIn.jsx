import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import API, { BACKEND_HOST } from '../services/api';
import Table from '../components/common/Table';
import Modal from '../components/common/Modal';
import { Plus, Trash, FileDown, Search, ArrowDownLeft, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';

const StockIn = () => {
  const { user } = useSelector((state) => state.auth);

  const [transactions, setTransactions] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [branches, setBranches] = useState([]);
  const [itemsCatalog, setItemsCatalog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Form State
  const [vendor, setVendor] = useState('');
  const [branch, setBranch] = useState(user.branch?._id || '');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [notes, setNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState([{ item: '', quantity: 1, unitCost: 0 }]);

  // Modal control
  const [isOpen, setIsOpen] = useState(false);

  const isGlobalUser = () => {
    return user?.role?.name === 'Main Admin' || user?.role?.name === 'Auditor';
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const branchQuery = isGlobalUser() ? '' : `&branch=${user.branch?._id}`;
      const res = await API.get(`/stock-in?page=${page}&limit=10${branchQuery}`);
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
      const [vRes, bRes, iRes] = await Promise.all([
        API.get('/vendors?limit=100'),
        API.get('/branches?limit=100'),
        API.get('/items?limit=100')
      ]);

      if (vRes.data.success) setVendors(vRes.data.data);
      if (bRes.data.success) setBranches(bRes.data.data);
      if (iRes.data.success) setItemsCatalog(iRes.data.data);
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

  const handleAddItemRow = () => {
    setSelectedItems([...selectedItems, { item: '', quantity: 1, unitCost: 0 }]);
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
    } else if (field === 'unitCost') {
      values[idx].unitCost = Math.max(0, parseFloat(value) || 0);
    } else {
      values[idx][field] = value;
    }
    setSelectedItems(values);
  };

  const calculateTotalAmount = () => {
    return selectedItems.reduce((sum, row) => sum + (row.quantity * row.unitCost), 0);
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setInvoiceFile(e.target.files[0]);
    }
  };

  const handleSubmitTransaction = async (e) => {
    e.preventDefault();
    if (!vendor) return toast.error('Please select a vendor');
    if (!invoiceNumber.trim()) return toast.error('Invoice number is required');

    // Verify item rows
    const invalidRow = selectedItems.find(it => !it.item || it.quantity < 1 || it.unitCost < 0);
    if (invalidRow) {
      return toast.error('Please configure all item rows with a valid quantity and unit cost.');
    }

    try {
      const dataPayload = new FormData();
      dataPayload.append('vendor', vendor);
      dataPayload.append('branch', branch);
      dataPayload.append('invoiceNumber', invoiceNumber);
      dataPayload.append('notes', notes);
      dataPayload.append('items', JSON.stringify(selectedItems));
      if (invoiceFile) {
        dataPayload.append('invoice', invoiceFile);
      }

      const res = await API.post('/stock-in', dataPayload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        toast.success('Stock receipt completed successfully!');
        setIsOpen(false);
        fetchTransactions();

        // Reset Form
        setVendor('');
        setInvoiceNumber('');
        setInvoiceFile(null);
        setNotes('');
        setSelectedItems([{ item: '', quantity: 1, unitCost: 0 }]);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Transaction submission failed');
    }
  };

  const columns = [
    { header: 'Invoice #', key: 'invoiceNumber', sortable: true },
    {
      header: 'Supplier / Vendor',
      key: 'vendor',
      render: (row) => <span>{row.vendor ? row.vendor.name : 'Unknown'}</span>
    },
    {
      header: 'Branch Received',
      key: 'branch',
      render: (row) => <span>{row.branch ? row.branch.name : 'Headquarters'}</span>
    },
    {
      header: 'Total Value',
      key: 'totalAmount',
      sortable: true,
      render: (row) => <span className="font-semibold">₹{row.totalAmount.toLocaleString()}</span>
    },
    {
      header: 'Received By',
      key: 'receivedBy',
      render: (row) => <span>{row.receivedBy ? row.receivedBy.name : 'System'}</span>
    },
    {
      header: 'Invoice File',
      key: 'invoiceFile',
      render: (row) => (
        row.invoiceFile ? (
          <a
            href={`${BACKEND_HOST}${row.invoiceFile}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 font-semibold transition-colors"
          >
            <FileDown className="w-3.5 h-3.5" /> Download
          </a>
        ) : <span className="text-slate-600 italic text-xs">No upload</span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Stock Receipts Ledger</h1>
          <p className="text-xs text-slate-500 mt-1">Receive product batches into branch warehouses and process vendor invoices</p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-950/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Record Stock In</span>
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

      {/* Stock In Entry Form Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Record Stock In Receipt"
      >
        <form onSubmit={handleSubmitTransaction} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Supplier / Vendor</label>
              <select
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none transition-all"
                required
              >
                <option value="">-- Choose Vendor --</option>
                {vendors.map(v => (
                  <option key={v._id} value={v._id}>{v.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Invoice / Reference #</label>
              <input
                type="text"
                placeholder="INV-2026-X"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Branch Destination</label>
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

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Attach Invoice File</label>
              <input
                type="file"
                accept=".pdf,image/*"
                onChange={handleFileChange}
                className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2 text-xs text-slate-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-violet-600/20 file:text-violet-400 hover:file:bg-violet-600/30 transition-all"
              />
            </div>
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

            {selectedItems.map((itemRow, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-5">
                  <select
                    value={itemRow.item}
                    onChange={(e) => handleItemChange(idx, 'item', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none transition-all"
                    required
                  >
                    <option value="">-- Choose Product --</option>
                    {itemsCatalog.map(item => (
                      <option key={item._id} value={item._id}>{item.name} ({item.sku})</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-3">
                  <input
                    type="number"
                    placeholder="Qty"
                    min="1"
                    value={itemRow.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none transition-all"
                    required
                  />
                </div>

                <div className="col-span-3">
                  <input
                    type="number"
                    placeholder="Cost (₹)"
                    step="0.01"
                    min="0"
                    value={itemRow.unitCost}
                    onChange={(e) => handleItemChange(idx, 'unitCost', e.target.value)}
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
            ))}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Additional Notes</label>
            <textarea
              placeholder="Enter batch comments..."
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all"
            />
          </div>

          {/* Aggregated math display */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">Total Cost Value:</span>
            <span className="text-lg font-black text-emerald-400">₹{calculateTotalAmount().toLocaleString()}</span>
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
              Save Receipt
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StockIn;
