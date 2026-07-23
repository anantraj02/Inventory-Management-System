import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import API from '../services/api';
import Table from '../components/common/Table';
import Modal from '../components/common/Modal';
import { Plus, Check, Truck, CheckCircle2, Search, ArrowRight, ShoppingBag } from 'lucide-react';
import { toast } from 'react-toastify';

const Requisitions = () => {
  const { user } = useSelector((state) => state.auth);

  const [requisitions, setRequisitions] = useState([]);
  const [itemsCatalog, setItemsCatalog] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals controls
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isOrderOpen, setIsOrderOpen] = useState(false);
  const [activePr, setActivePr] = useState(null);
  
  // Order selection Form state
  const [orderVendor, setOrderVendor] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const isWriteAllowed = () => {
    if (!user || !user.role) return false;
    if (user.role.name === 'Main Admin') return true;
    return user.role.permissions.includes('write:requisitions');
  };

  const fetchRequisitions = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/requisitions?page=${page}&limit=10`);
      if (res.data.success) {
        setRequisitions(res.data.data);
        setTotalPages(res.data.totalPages);
      }
    } catch (err) {
      toast.error('Failed to load requisitions');
    } finally {
      setLoading(false);
    }
  };

  const fetchMasters = async () => {
    try {
      const [iRes, vRes] = await Promise.all([
        API.get('/items?limit=100'),
        API.get('/vendors?limit=100')
      ]);

      if (iRes.data.success) setItemsCatalog(iRes.data.data);
      if (vRes.data.success) setVendors(vRes.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRequisitions();
  }, [page]);

  useEffect(() => {
    fetchMasters();
  }, []);

  const openCreateModal = () => {
    reset({
      item: '',
      quantity: 1,
      vendor: '',
      notes: ''
    });
    setIsCreateOpen(true);
  };

  const onSubmitPr = async (formData) => {
    try {
      if (formData.vendor === '') delete formData.vendor;
      const res = await API.post('/requisitions', formData);
      if (res.data.success) {
        toast.success('Purchase requisition submitted');
        setIsCreateOpen(false);
        fetchRequisitions();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    }
  };

  const handleUpdateStatus = async (id, status, extraData = {}) => {
    try {
      const res = await API.put(`/requisitions/${id}/status`, {
        status,
        ...extraData
      });
      if (res.data.success) {
        toast.success(`Requisition updated to: ${status}`);
        fetchRequisitions();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Transition failed');
    }
  };

  const openOrderModal = (pr) => {
    setActivePr(pr);
    setOrderVendor(pr.vendor?._id || '');
    setOrderNotes('');
    setIsOrderOpen(true);
  };

  const handleConfirmOrder = async () => {
    if (!orderVendor) return toast.error('Please assign a vendor to order from');
    try {
      await handleUpdateStatus(activePr._id, 'Ordered', {
        vendor: orderVendor,
        notes: orderNotes
      });
      setIsOrderOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const columns = [
    {
      header: 'Product Item',
      key: 'item',
      render: (row) => (
        <div>
          <span className="font-semibold text-slate-200 block">{row.item?.name}</span>
          <span className="text-[10px] text-slate-500 font-mono">SKU: {row.item?.sku}</span>
        </div>
      )
    },
    {
      header: 'Req Qty',
      key: 'quantity',
      render: (row) => <span>{row.quantity} {row.item?.unitOfMeasure}</span>
    },
    {
      header: 'Branch Location',
      key: 'branch',
      render: (row) => <span>{row.branch?.name}</span>
    },
    {
      header: 'Supplier / Vendor',
      key: 'vendor',
      render: (row) => <span>{row.vendor ? row.vendor.name : <span className="text-slate-500 italic">Unassigned</span>}</span>
    },
    {
      header: 'Workflow Status',
      key: 'status',
      render: (row) => {
        let colors = 'bg-slate-950 text-slate-400 border-slate-900';
        if (row.status === 'Pending') colors = 'bg-amber-955/40 text-amber-400 border-amber-500/10';
        if (row.status === 'Approved') colors = 'bg-blue-955/40 text-blue-400 border-blue-500/10';
        if (row.status === 'Ordered') colors = 'bg-indigo-955/40 text-indigo-400 border-indigo-500/10';
        if (row.status === 'Received') colors = 'bg-emerald-950/40 text-emerald-400 border-emerald-500/10';

        return (
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${colors}`}>
            {row.status}
          </span>
        );
      }
    },
    {
      header: 'Flow Actions',
      key: 'actions',
      render: (row) => {
        if (!isWriteAllowed()) return <span className="text-slate-600 text-xs italic">View only</span>;

        if (row.status === 'Pending') {
          return (
            <button
              onClick={() => handleUpdateStatus(row._id, 'Approved')}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" /> Approve PR
            </button>
          );
        }

        if (row.status === 'Approved') {
          return (
            <button
              onClick={() => openOrderModal(row)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5" /> Order Asset
            </button>
          );
        }

        if (row.status === 'Ordered') {
          return (
            <button
              onClick={() => handleUpdateStatus(row._id, 'Received')}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Mark Received
            </button>
          );
        }

        return <span className="text-slate-500 text-xs italic">Closed / Fulfilled</span>;
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Purchase Requisitions</h1>
          <p className="text-xs text-slate-500 mt-1">Manage procurement orders, vendor dispatch updates, and auto-restock triggers</p>
        </div>
        {isWriteAllowed() && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-950/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Requisition</span>
          </button>
        )}
      </div>

      {/* List Table */}
      <Table
        columns={columns}
        data={requisitions}
        totalPages={totalPages}
        currentPage={page}
        onPageChange={setPage}
        loading={loading}
      />

      {/* Manual Request Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Initiate Purchase Requisition"
      >
        <form onSubmit={handleSubmit(onSubmitPr)} className="space-y-4">
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Reorder Quantity</label>
              <input
                type="number"
                placeholder="20"
                className={`w-full bg-slate-950 border ${errors.quantity ? 'border-red-500' : 'border-slate-800 focus:border-violet-500'} rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all`}
                {...register('quantity', { required: 'Quantity is required', min: { value: 1, message: 'Must order at least 1' } })}
              />
              {errors.quantity && <span className="text-[10px] text-red-400 mt-1 block">{errors.quantity.message}</span>}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Preferred Vendor</label>
              <select
                className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none transition-all"
                {...register('vendor')}
              >
                <option value="">-- Choose Supplier (Optional) --</option>
                {vendors.map(v => (
                  <option key={v._id} value={v._id}>{v.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Requisition Notes</label>
            <textarea
              placeholder="E.g. low stock restock request..."
              rows={2}
              className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all"
              {...register('notes')}
            />
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
              Submit Requisition
            </button>
          </div>
        </form>
      </Modal>

      {/* Place Order Modal */}
      <Modal
        isOpen={isOrderOpen}
        onClose={() => setIsOrderOpen(false)}
        title="Send Requisition Order to Vendor"
      >
        <div className="space-y-4">
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
            <p className="text-xs text-slate-500">REQUISITION DETAILS</p>
            <p className="text-xs font-bold text-slate-200">
              Product: {activePr?.item?.name} (x{activePr?.quantity})
            </p>
            <p className="text-xs font-bold text-slate-200">
              Destination Location: {activePr?.branch?.name}
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Assign Vendor / Supplier</label>
            <select
              value={orderVendor}
              onChange={(e) => setOrderVendor(e.target.value)}
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
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Purchase Order Notes</label>
            <textarea
              placeholder="E.g. PO number, terms of delivery..."
              rows={2}
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all"
            />
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              onClick={() => setIsOrderOpen(false)}
              className="px-4 py-2.5 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmOrder}
              className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              Confirm Purchase Order
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Requisitions;
