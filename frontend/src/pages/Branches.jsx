import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import API from '../services/api';
import Table from '../components/common/Table';
import Modal from '../components/common/Modal';
import { Plus, Edit2, Trash2, Search, MapPin, Phone } from 'lucide-react';
import { toast } from 'react-toastify';

const Branches = () => {
  const { user } = useSelector((state) => state.auth);
  
  const [data, setData] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal control
  const [isOpen, setIsOpen] = useState(false);
  const [activeBranch, setActiveBranch] = useState(null); // null means create mode

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();

  const isWriteAllowed = () => {
    if (!user || !user.role) return false;
    if (user.role.name === 'Main Admin') return true;
    return user.role.permissions.includes('write:branches');
  };

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/branches?search=${search}&page=${page}&limit=10`);
      if (res.data.success) {
        setData(res.data.data);
        setTotalPages(res.data.totalPages);
      }
    } catch (err) {
      toast.error('Failed to load branches data');
    } finally {
      setLoading(false);
    }
  };

  const fetchEligibleManagers = async () => {
    try {
      // Load all users to select a manager
      const res = await API.get('/users?limit=100');
      if (res.data.success) {
        setManagers(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, [search, page]);

  useEffect(() => {
    if (isWriteAllowed()) {
      fetchEligibleManagers();
    }
  }, []);

  const openCreateModal = () => {
    setActiveBranch(null);
    reset({
      name: '',
      code: '',
      location: '',
      contactNumber: '',
      manager: ''
    });
    setIsOpen(true);
  };

  const openEditModal = (branch) => {
    setActiveBranch(branch);
    reset({
      name: branch.name,
      code: branch.code,
      location: branch.location,
      contactNumber: branch.contactNumber,
      manager: branch.manager?._id || ''
    });
    setIsOpen(true);
  };

  const onSubmit = async (formData) => {
    try {
      // Empty string manager fallback
      if (formData.manager === '') delete formData.manager;

      if (activeBranch) {
        // Update
        const res = await API.put(`/branches/${activeBranch._id}`, formData);
        if (res.data.success) {
          toast.success('Branch details updated');
          fetchBranches();
          setIsOpen(false);
        }
      } else {
        // Create
        const res = await API.post('/branches', formData);
        if (res.data.success) {
          toast.success('New branch registered successfully');
          fetchBranches();
          setIsOpen(false);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Transaction failed');
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this branch? This action is irreversible.')) return;
    try {
      const res = await API.delete(`/branches/${id}`);
      if (res.data.success) {
        toast.success('Branch deleted');
        fetchBranches();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  // Define Columns
  const columns = [
    { header: 'Code', key: 'code', sortable: true },
    { header: 'Branch Name', key: 'name', sortable: true },
    {
      header: 'Location',
      key: 'location',
      render: (row) => (
        <div className="flex items-center gap-1.5 text-slate-400">
          <MapPin className="w-3.5 h-3.5 text-violet-400" />
          <span>{row.location || 'N/A'}</span>
        </div>
      )
    },
    {
      header: 'Contact Info',
      key: 'contactNumber',
      render: (row) => (
        <div className="flex items-center gap-1.5 text-slate-400">
          <Phone className="w-3.5 h-3.5 text-violet-400" />
          <span>{row.contactNumber || 'N/A'}</span>
        </div>
      )
    },
    {
      header: 'Branch Manager',
      key: 'manager',
      render: (row) => (row.manager ? row.manager.name : <span className="text-slate-500 italic">Unassigned</span>)
    }
  ];

  // Append actions column if permission allows
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
          <h1 className="text-xl font-bold text-slate-100">Branches Administration</h1>
          <p className="text-xs text-slate-500 mt-1">Manage physical warehouses and regional headquarters locations</p>
        </div>
        {isWriteAllowed() && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-950/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Branch</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center gap-4 bg-slate-900/20 border border-slate-800/80 rounded-2xl p-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search by code, branch name, or location..."
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

      {/* Create / Edit Modal Dialog */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={activeBranch ? 'Edit Branch details' : 'Register New Branch'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Branch Code</label>
              <input
                type="text"
                placeholder="BR001"
                className={`w-full bg-slate-950 border ${errors.code ? 'border-red-500' : 'border-slate-800 focus:border-violet-500'} rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all`}
                {...register('code', { required: 'Branch code is required' })}
              />
              {errors.code && <span className="text-[10px] text-red-400 mt-1 block">{errors.code.message}</span>}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Branch Name</label>
              <input
                type="text"
                placeholder="HQ Office"
                className={`w-full bg-slate-950 border ${errors.name ? 'border-red-500' : 'border-slate-800 focus:border-violet-500'} rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all`}
                {...register('name', { required: 'Branch name is required' })}
              />
              {errors.name && <span className="text-[10px] text-red-400 mt-1 block">{errors.name.message}</span>}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Physical Location</label>
            <input
              type="text"
              placeholder="Mumbai, India"
              className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all"
              {...register('location')}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Contact Number</label>
            <input
              type="text"
              placeholder="+919999999999"
              className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all"
              {...register('contactNumber')}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Assign Branch Manager</label>
            <select
              className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none transition-all"
              {...register('manager')}
            >
              <option value="">-- Select Employee (Optional) --</option>
              {managers.map(mgr => (
                <option key={mgr._id} value={mgr._id}>{mgr.name} ({mgr.employeeId})</option>
              ))}
            </select>
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
              {activeBranch ? 'Save Changes' : 'Register Branch'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Branches;
