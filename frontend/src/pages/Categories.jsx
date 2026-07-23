import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import API from '../services/api';
import Table from '../components/common/Table';
import Modal from '../components/common/Modal';
import { Plus, Edit2, Trash2, Search, Library } from 'lucide-react';
import { toast } from 'react-toastify';

const Categories = () => {
  const { user } = useSelector((state) => state.auth);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal controls
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const isWriteAllowed = () => {
    if (!user || !user.role) return false;
    if (user.role.name === 'Main Admin') return true;
    return user.role.permissions.includes('write:categories');
  };

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/categories?search=${search}&page=${page}&limit=10`);
      if (res.data.success) {
        setData(res.data.data);
        setTotalPages(res.data.totalPages);
      }
    } catch (err) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [search, page]);

  const openCreateModal = () => {
    setActiveCategory(null);
    reset({
      name: '',
      code: '',
      description: ''
    });
    setIsOpen(true);
  };

  const openEditModal = (cat) => {
    setActiveCategory(cat);
    reset({
      name: cat.name,
      code: cat.code,
      description: cat.description || ''
    });
    setIsOpen(true);
  };

  const onSubmit = async (formData) => {
    try {
      if (activeCategory) {
        const res = await API.put(`/categories/${activeCategory._id}`, formData);
        if (res.data.success) {
          toast.success('Category details updated');
          fetchCategories();
          setIsOpen(false);
        }
      } else {
        const res = await API.post('/categories', formData);
        if (res.data.success) {
          toast.success('New category created');
          fetchCategories();
          setIsOpen(false);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Transaction failed');
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this product category? Definitions associated might break.')) return;
    try {
      const res = await API.delete(`/categories/${id}`);
      if (res.data.success) {
        toast.success('Category deleted');
        fetchCategories();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const columns = [
    { header: 'Category Code', key: 'code', sortable: true },
    { header: 'Category Name', key: 'name', sortable: true },
    {
      header: 'Description',
      key: 'description',
      render: (row) => (
        <span className="text-slate-400 text-xs italic">{row.description || 'No description provided'}</span>
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
          <h1 className="text-xl font-bold text-slate-100">Product Categories</h1>
          <p className="text-xs text-slate-500 mt-1">Configure global product categories for inventory sorting</p>
        </div>
        {isWriteAllowed() && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-950/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Category</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center gap-4 bg-slate-900/20 border border-slate-800/80 rounded-2xl p-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search categories by code or name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-slate-950/40 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
          />
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

      {/* Create / Edit Category Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={activeCategory ? 'Edit Category Details' : 'Create New Category'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Category Code</label>
              <input
                type="text"
                placeholder="CAT-ELEC"
                className={`w-full bg-slate-950 border ${errors.code ? 'border-red-500' : 'border-slate-800 focus:border-violet-500'} rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all`}
                {...register('code', { required: 'Category code is required' })}
              />
              {errors.code && <span className="text-[10px] text-red-400 mt-1 block">{errors.code.message}</span>}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Category Name</label>
              <input
                type="text"
                placeholder="Electronics"
                className={`w-full bg-slate-950 border ${errors.name ? 'border-red-500' : 'border-slate-800 focus:border-violet-500'} rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all`}
                {...register('name', { required: 'Category name is required' })}
              />
              {errors.name && <span className="text-[10px] text-red-400 mt-1 block">{errors.name.message}</span>}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Description</label>
            <textarea
              placeholder="High tech appliances and computers..."
              rows={3}
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
              {activeCategory ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Categories;
