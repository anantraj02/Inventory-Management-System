import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import API from '../services/api';
import Table from '../components/common/Table';
import Modal from '../components/common/Modal';
import { Search, Tag, Barcode, AlertTriangle, Scan, Info, Store } from 'lucide-react';
import { toast } from 'react-toastify';

const Inventory = () => {
  const { user } = useSelector((state) => state.auth);

  const [data, setData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Barcode search emu
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeResult, setBarcodeResult] = useState(null);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);

  const isGlobalUser = () => {
    return user?.role?.name === 'Main Admin' || user?.role?.name === 'Auditor';
  };

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await API.get(
        `/inventory?search=${search}&category=${categoryFilter}&branch=${branchFilter}&lowStock=${lowStockFilter}&page=${page}&limit=10`
      );
      if (res.data.success) {
        setData(res.data.data);
        setTotalPages(res.data.totalPages);
      }
    } catch (err) {
      toast.error('Failed to load inventory levels');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await API.get('/categories?limit=100');
      if (res.data.success) {
        setCategories(res.data.data);
      }
    } catch (err) {
      console.error(err);
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

  useEffect(() => {
    fetchInventory();
  }, [search, categoryFilter, branchFilter, lowStockFilter, page]);

  useEffect(() => {
    fetchCategories();
    if (isGlobalUser()) {
      fetchBranches();
    }
  }, []);

  // Barcode lookup scan emulator
  const handleBarcodeScan = async (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    try {
      // Find item
      const itemRes = await API.get(`/items/barcode/${barcodeInput.trim()}`);
      const item = itemRes.data.data;

      // Find stock for this item in the user's active branch
      const branchId = isGlobalUser() ? (branchFilter || user.branch._id) : user.branch._id;
      const stockRes = await API.get(`/inventory/${branchId}/${item._id}`);
      
      setBarcodeResult(stockRes.data.data);
      setIsBarcodeModalOpen(true);
      setBarcodeInput('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Barcode not recognized in catalog');
    }
  };

  const columns = [
    { header: 'SKU Code', key: 'sku', render: (row) => <span className="font-semibold">{row.item.sku}</span> },
    { header: 'Item Name', key: 'name', render: (row) => <span>{row.item.name}</span> },
    {
      header: 'Category',
      key: 'category',
      render: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Tag className="w-3.5 h-3.5 text-violet-400" />
          <span>{row.item.category.name}</span>
        </div>
      )
    },
    {
      header: 'Location / Warehouse',
      key: 'branch',
      render: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Store className="w-3.5 h-3.5 text-slate-500" />
          <span>{row.branch.name}</span>
        </div>
      )
    },
    {
      header: 'Rack Location',
      key: 'rackLocation',
      render: (row) => (
        <span className="font-mono text-xs text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-900">
          {row.rackLocation || 'N/A'}
        </span>
      )
    },
    {
      header: 'Available Stock',
      key: 'quantity',
      sortable: true,
      render: (row) => {
        const isLow = row.quantity < row.item.minStockLevel;
        return (
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                isLow
                  ? 'bg-red-950/40 text-red-400 border-red-500/20'
                  : 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20'
              }`}
            >
              {row.quantity} {row.item.unitOfMeasure}
            </span>
            {isLow && (
              <span className="flex items-center gap-1 text-[10px] text-red-400 font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                <span>Low stock (Min: {row.item.minStockLevel})</span>
              </span>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Live Inventory Warehouse Levels</h1>
          <p className="text-xs text-slate-500 mt-1">Real-time status updates of active branch and regional stock levels</p>
        </div>

        {/* Barcode scan emulator */}
        <form onSubmit={handleBarcodeScan} className="flex items-center gap-2 bg-slate-900/60 border border-slate-800 rounded-xl p-1.5 w-full md:w-80">
          <Barcode className="w-5 h-5 text-slate-500 ml-2" />
          <input
            type="text"
            placeholder="Scan / enter barcode..."
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            className="w-full bg-transparent border-0 text-slate-100 placeholder-slate-600 text-xs focus:outline-none focus:ring-0"
          />
          <button
            type="submit"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0"
          >
            <Scan className="w-3.5 h-3.5" />
            <span>Lookup</span>
          </button>
        </form>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-slate-900/20 border border-slate-800/80 rounded-2xl p-4">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search stock by SKU code, item name, barcode..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-slate-950/40 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
          />
        </div>

        <div>
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat._id} value={cat._id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {isGlobalUser() ? (
          <div>
            <select
              value={branchFilter}
              onChange={(e) => { setBranchFilter(e.target.value); setPage(1); }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
            >
              <option value="">All Branches</option>
              {branches.map(br => (
                <option key={br._id} value={br._id}>{br.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex items-center">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={lowStockFilter}
                onChange={(e) => { setLowStockFilter(e.target.checked); setPage(1); }}
                className="rounded border-slate-800 bg-slate-950 text-violet-600 focus:ring-violet-500"
              />
              <span className="text-xs font-semibold text-slate-400 hover:text-white transition-colors">Show Low Stock Only</span>
            </label>
          </div>
        )}
      </div>

      {isGlobalUser() && (
        <div className="flex items-center px-2">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={lowStockFilter}
              onChange={(e) => { setLowStockFilter(e.target.checked); setPage(1); }}
              className="rounded border-slate-800 bg-slate-950 text-violet-600 focus:ring-violet-500"
            />
            <span className="text-xs font-semibold text-slate-400 hover:text-white transition-colors">Show Low Stock Only</span>
          </label>
        </div>
      )}

      {/* Data Table */}
      <Table
        columns={columns}
        data={data}
        totalPages={totalPages}
        currentPage={page}
        onPageChange={setPage}
        loading={loading}
      />

      {/* Barcode Search result modal */}
      <Modal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        title="Barcode Lookup Details"
      >
        {barcodeResult && (
          <div className="space-y-4">
            <div className="flex items-start gap-4 bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
              <Info className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-100">{barcodeResult.item.name}</h4>
                <p className="text-xs text-slate-500 font-mono">SKU: {barcodeResult.item.sku}</p>
                {barcodeResult.item.barcode && (
                  <p className="text-xs text-slate-500 font-mono">Barcode: {barcodeResult.item.barcode}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800/50 rounded-xl p-4">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Branch</span>
                <span className="text-xs text-slate-200 font-bold block truncate mt-1">
                  {barcodeResult.branch?.name || 'Headquarters'}
                </span>
              </div>
              
              <div className="bg-slate-900 border border-slate-800/50 rounded-xl p-4">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Rack Location</span>
                <span className="text-xs text-slate-200 font-bold block mt-1">
                  {barcodeResult.rackLocation || 'N/A'}
                </span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800/50 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Stock Level</span>
                <span className="text-lg font-bold text-slate-100 block mt-1">
                  {barcodeResult.quantity} {barcodeResult.item.unitOfMeasure}
                </span>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  barcodeResult.quantity < barcodeResult.item.minStockLevel
                    ? 'bg-red-950/40 text-red-400 border-red-500/20'
                    : 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20'
                }`}
              >
                {barcodeResult.quantity < barcodeResult.item.minStockLevel ? 'Critical Low' : 'Adequate'}
              </span>
            </div>

            <button
              onClick={() => setIsBarcodeModalOpen(false)}
              className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer mt-4"
            >
              Close Window
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Inventory;
