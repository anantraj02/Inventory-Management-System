import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import API from '../services/api';
import Table from '../components/common/Table';
import Modal from '../components/common/Modal';
import { Plus, Edit2, Trash2, Search, Tag, Barcode, ShoppingBag } from 'lucide-react';
import { toast } from 'react-toastify';

const Items = () => {
  const { user } = useSelector((state) => state.auth);

  const [data, setData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal controls
  const [isOpen, setIsOpen] = useState(false);
  const [activeItem, setActiveItem] = useState(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const isWriteAllowed = () => {
    if (!user || !user.role) return false;
    if (user.role.name === 'Main Admin') return true;
    return user.role.permissions.includes('write:items');
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/items?search=${search}&category=${categoryFilter}&page=${page}&limit=10`);
      if (res.data.success) {
        setData(res.data.data);
        setTotalPages(res.data.totalPages);
      }
    } catch (err) {
      toast.error('Failed to load items catalogue');
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

  useEffect(() => {
    fetchItems();
  }, [search, categoryFilter, page]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const openCreateModal = () => {
    setActiveItem(null);
    reset({
      name: '',
      sku: '',
      barcode: '',
      description: '',
      category: '',
      unitOfMeasure: 'pcs',
      minStockLevel: 10
    });
    setIsOpen(true);
  };

  const openEditModal = (item) => {
    setActiveItem(item);
    reset({
      name: item.name,
      sku: item.sku,
      barcode: item.barcode || '',
      description: item.description || '',
      category: item.category?._id || '',
      unitOfMeasure: item.unitOfMeasure,
      minStockLevel: item.minStockLevel
    });
    setIsOpen(true);
  };

  const onSubmit = async (formData) => {
    try {
      if (activeItem) {
        const res = await API.put(`/items/${activeItem._id}`, formData);
        if (res.data.success) {
          toast.success('Item details updated');
          fetchItems();
          setIsOpen(false);
        }
      } else {
        const res = await API.post('/items', formData);
        if (res.data.success) {
          toast.success('New item catalog created');
          fetchItems();
          setIsOpen(false);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Transaction failed');
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this product from catalog? Branch stocks and logs referencing it will break.')) return;
    try {
      const res = await API.delete(`/items/${id}`);
      if (res.data.success) {
        toast.success('Item catalog deleted');
        fetchItems();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const columns = [
    { header: 'SKU Code', key: 'sku', sortable: true },
    { header: 'Item Name', key: 'name', sortable: true },
    {
      header: 'Category',
      key: 'category',
      render: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Tag className="w-3.5 h-3.5 text-violet-400" />
          <span>{row.category ? row.category.name : 'Uncategorized'}</span>
        </div>
      )
    },
    {
      header: 'Barcode',
      key: 'barcode',
      render: (row) => (
        row.barcode ? (
          <div className="flex items-center gap-1 text-slate-500 font-mono text-xs">
            <Barcode className="w-3.5 h-3.5 text-slate-400" />
            <span>{row.barcode}</span>
          </div>
        ) : <span className="text-slate-600 italic">None</span>
      )
    },
    { header: 'UoM', key: 'unitOfMeasure' },
    {
      header: 'Min Stock Level',
      key: 'minStockLevel',
      render: (row) => (
        <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-400 font-semibold border border-slate-900">
          {row.minStockLevel} {row.unitOfMeasure}
        </span>
      )
    }
  ];

  if (isWriteAllowed()) {
    columns.push({
      header: 'Actions',
      key: 'actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEditModal(row)}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(row._id)}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-red-400 hover:border-red-500/20 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    });
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Global Items Catalogue</h1>
          <p className="text-xs text-slate-500 mt-1">Configure global product parameters and minimum inventory thresholds</p>
        </div>
        {isWriteAllowed() && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-950/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item Catalog</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/20 border border-slate-800/80 rounded-2xl p-4">
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search items by SKU, barcode, or name..."
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
      </div>

      {/* Data Table */}
      <Table
        columns={columns}
        data={data}
        totalPages={totalPages}
        currentPage={page}
        onPageChange={setPage}
        loading={loading}
      />

      {/* Create / Edit Item Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={activeItem ? 'Edit Product Definition' : 'Add Product to Catalogue'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">SKU Code</label>
              <input
                type="text"
                placeholder="SKU-TPX1-G11"
                className={`w-full bg-slate-950 border ${errors.sku ? 'border-red-500' : 'border-slate-800 focus:border-violet-500'} rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all`}
                {...register('sku', { required: 'SKU is required' })}
              />
              {errors.sku && <span className="text-[10px] text-red-400 mt-1 block">{errors.sku.message}</span>}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Barcode ID</label>
              <input
                type="text"
                placeholder="888392019230"
                className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all"
                {...register('barcode')}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Item / Product Name</label>
            <input
              type="text"
              placeholder="ThinkPad X1 Carbon Gen 11"
              className={`w-full bg-slate-950 border ${errors.name ? 'border-red-500' : 'border-slate-800 focus:border-violet-500'} rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all`}
              {...register('name', { required: 'Item name is required' })}
            />
            {errors.name && <span className="text-[10px] text-red-400 mt-1 block">{errors.name.message}</span>}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Product Category</label>
              <select
                className={`w-full bg-slate-950 border ${errors.category ? 'border-red-500' : 'border-slate-800 focus:border-violet-500'} rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none transition-all`}
                {...register('category', { required: 'Please select a category' })}
              >
                <option value="">-- Choose Category --</option>
                {categories.map(cat => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
              {errors.category && <span className="text-[10px] text-red-400 mt-1 block">{errors.category.message}</span>}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Unit (UoM)</label>
              <input
                type="text"
                placeholder="pcs"
                className={`w-full bg-slate-950 border ${errors.unitOfMeasure ? 'border-red-500' : 'border-slate-800 focus:border-violet-500'} rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all`}
                {...register('unitOfMeasure', { required: 'UoM is required' })}
              />
              {errors.unitOfMeasure && <span className="text-[10px] text-red-400 mt-1 block">{errors.unitOfMeasure.message}</span>}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Safety Min Stock Level</label>
            <input
              type="number"
              placeholder="10"
              className={`w-full bg-slate-950 border ${errors.minStockLevel ? 'border-red-500' : 'border-slate-800 focus:border-violet-500'} rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all`}
              {...register('minStockLevel', { required: 'Min stock level is required', min: 0 })}
            />
            {errors.minStockLevel && <span className="text-[10px] text-red-400 mt-1 block">{errors.minStockLevel.message}</span>}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Description</label>
            <textarea
              placeholder="Enterprise business laptop..."
              rows={2}
              className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all"
              {...register('description')}
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
              {activeItem ? 'Save Updates' : 'Add to Catalog'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Items;
