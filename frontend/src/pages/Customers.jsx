import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import API from '../services/api';
import Table from '../components/common/Table';
import Modal from '../components/common/Modal';
import { Plus, Edit2, Trash2, Search, User, Mail, Phone, MapPin } from 'lucide-react';
import { toast } from 'react-toastify';

const Customers = () => {
  const { user } = useSelector((state) => state.auth);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal controls
  const [isOpen, setIsOpen] = useState(false);
  const [activeCustomer, setActiveCustomer] = useState(null); // null means create mode

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const isWriteAllowed = () => {
    if (!user || !user.role) return false;
    if (user.role.name === 'Main Admin') return true;
    return user.role.permissions.includes('write:customers');
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/customers?search=${search}&page=${page}&limit=10`);
      if (res.data.success) {
        setData(res.data.data);
        setTotalPages(res.data.totalPages);
      }
    } catch (err) {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search, page]);

  const openCreateModal = () => {
    setActiveCustomer(null);
    reset({
      name: '',
      email: '',
      phone: '',
      address: '',
      isActive: true
    });
    setIsOpen(true);
  };

  const openEditModal = (customer) => {
    setActiveCustomer(customer);
    reset({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      isActive: customer.isActive
    });
    setIsOpen(true);
  };

  const onSubmit = async (formData) => {
    try {
      if (activeCustomer) {
        const res = await API.put(`/customers/${activeCustomer._id}`, formData);
        if (res.data.success) {
          toast.success('Customer details updated');
          fetchCustomers();
          setIsOpen(false);
        }
      } else {
        const res = await API.post('/customers', formData);
        if (res.data.success) {
          toast.success('Customer profile registered');
          fetchCustomers();
          setIsOpen(false);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Transaction failed');
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this customer profile?')) return;
    try {
      const res = await API.delete(`/customers/${id}`);
      if (res.data.success) {
        toast.success('Customer profile deleted');
        fetchCustomers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const columns = [
    { header: 'Customer Name', key: 'name', sortable: true },
    {
      header: 'Email Address',
      key: 'email',
      render: (row) => (
        <div className="flex items-center gap-1.5 text-slate-300">
          <Mail className="w-3.5 h-3.5 text-slate-500" />
          <span>{row.email || 'N/A'}</span>
        </div>
      )
    },
    {
      header: 'Phone Number',
      key: 'phone',
      render: (row) => (
        <div className="flex items-center gap-1.5 text-slate-300">
          <Phone className="w-3.5 h-3.5 text-slate-500" />
          <span>{row.phone || 'N/A'}</span>
        </div>
      )
    },
    {
      header: 'Billing Address',
      key: 'address',
      render: (row) => (
        <div className="flex items-center gap-1.5 text-slate-400">
          <MapPin className="w-3.5 h-3.5 text-slate-500" />
          <span className="truncate max-w-[200px]">{row.address || 'N/A'}</span>
        </div>
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
          <h1 className="text-xl font-bold text-slate-100">Customers Directory</h1>
          <p className="text-xs text-slate-500 mt-1">Manage corporate clients and sales ledger references</p>
        </div>
        {isWriteAllowed() && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-950/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center gap-4 bg-slate-900/20 border border-slate-800/80 rounded-2xl p-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search by customer name, email, or phone..."
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

      {/* Create / Edit Customer Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={activeCustomer ? 'Edit Customer details' : 'Register New Customer'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Customer Name</label>
            <input
              type="text"
              placeholder="Enterprise Client Inc"
              className={`w-full bg-slate-950 border ${errors.name ? 'border-red-500' : 'border-slate-800 focus:border-violet-500'} rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all`}
              {...register('name', { required: 'Customer name is required' })}
            />
            {errors.name && <span className="text-[10px] text-red-400 mt-1 block">{errors.name.message}</span>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Email Address</label>
              <input
                type="email"
                placeholder="purchasing@client.com"
                className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all"
                {...register('email')}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Phone Number</label>
              <input
                type="text"
                placeholder="+9876543210"
                className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all"
                {...register('phone')}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Billing / Delivery Address</label>
            <textarea
              placeholder="Corporate Office Suite 12B, Park Ave..."
              rows={2}
              className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all"
              {...register('address')}
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
              {activeCustomer ? 'Save Details' : 'Register Customer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Customers;
