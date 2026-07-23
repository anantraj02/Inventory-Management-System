import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import API from '../services/api';
import Table from '../components/common/Table';
import Modal from '../components/common/Modal';
import { Plus, Edit2, Trash2, Search, UserCheck, Shield, Store, Phone, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';

const Users = () => {
  const { user: currentUser } = useSelector((state) => state.auth);

  const [data, setData] = useState([]);
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal controls
  const [isOpen, setIsOpen] = useState(false);
  const [activeUser, setActiveUser] = useState(null); // null means create mode

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const isWriteAllowed = () => {
    if (!currentUser || !currentUser.role) return false;
    if (currentUser.role.name === 'Main Admin') return true;
    return currentUser.role.permissions.includes('write:users');
  };

  const isGlobalUser = () => {
    return currentUser?.role?.name === 'Main Admin' || currentUser?.role?.name === 'Auditor';
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await API.get(
        `/users?search=${search}&role=${roleFilter}&branch=${branchFilter}&page=${page}&limit=10`
      );
      if (res.data.success) {
        setData(res.data.data);
        setTotalPages(res.data.totalPages);
        if (res.data.roles) {
          setRoles(res.data.roles);
        }
      }
    } catch (err) {
      toast.error('Failed to load users');
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

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter, branchFilter, page]);

  useEffect(() => {
    if (isGlobalUser()) {
      fetchBranches();
    }
  }, []);

  const openCreateModal = () => {
    setActiveUser(null);
    reset({
      employeeId: '',
      name: '',
      email: '',
      password: '',
      role: '',
      branch: isGlobalUser() ? '' : currentUser.branch?._id || '',
      phone: '',
      isActive: true
    });
    setIsOpen(true);
  };

  const openEditModal = (user) => {
    setActiveUser(user);
    reset({
      employeeId: user.employeeId,
      name: user.name,
      email: user.email,
      password: '', // blank password initially
      role: user.role?._id || '',
      branch: user.branch?._id || '',
      phone: user.phone || '',
      isActive: user.isActive
    });
    setIsOpen(true);
  };

  const onSubmit = async (formData) => {
    try {
      // Clean up fields
      if (formData.branch === '') delete formData.branch;
      if (activeUser && formData.password === '') delete formData.password; // don't send blank password on update

      if (activeUser) {
        const res = await API.put(`/users/${activeUser._id}`, formData);
        if (res.data.success) {
          toast.success('User updated successfully');
          fetchUsers();
          setIsOpen(false);
        }
      } else {
        const res = await API.post('/users', formData);
        if (res.data.success) {
          toast.success('New user account created');
          fetchUsers();
          setIsOpen(false);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Transaction failed');
    }
  };

  const onDelete = async (id) => {
    if (id === currentUser._id) {
      toast.error('You cannot delete your own logged-in account');
      return;
    }
    if (!window.confirm('Delete this user account? They will lose all access.')) return;
    try {
      const res = await API.delete(`/users/${id}`);
      if (res.data.success) {
        toast.success('User account deleted');
        fetchUsers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const columns = [
    { header: 'Emp ID', key: 'employeeId', sortable: true },
    { header: 'Name', key: 'name', sortable: true },
    { header: 'Email', key: 'email' },
    {
      header: 'Role',
      key: 'role',
      render: (row) => (
        <div className="flex items-center gap-1.5 text-xs">
          <Shield className="w-3.5 h-3.5 text-violet-400" />
          <span className="font-semibold text-slate-300">{row.role ? row.role.name : 'Unknown'}</span>
        </div>
      )
    },
    {
      header: 'Branch Location',
      key: 'branch',
      render: (row) => (
        <div className="flex items-center gap-1.5 text-slate-400">
          <Store className="w-3.5 h-3.5 text-slate-500" />
          <span>{row.branch ? row.branch.name : 'Global Head Office'}</span>
        </div>
      )
    },
    {
      header: 'Status',
      key: 'isActive',
      render: (row) => (
        row.isActive ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/40 text-emerald-400 border border-emerald-500/10">
            <CheckCircle className="w-3 h-3" /> Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-950/40 text-red-400 border border-red-500/10">
            <AlertCircle className="w-3 h-3" /> Inactive
          </span>
        )
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
            disabled={row._id === currentUser._id}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-red-400 hover:border-red-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
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
          <h1 className="text-xl font-bold text-slate-100">User Administration</h1>
          <p className="text-xs text-slate-500 mt-1">Manage system logins, roles, and employee records</p>
        </div>
        {isWriteAllowed() && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-950/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create User</span>
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900/20 border border-slate-800/80 rounded-2xl p-4">
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search by Employee ID, Name, or Email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-slate-950/40 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
          />
        </div>

        <div>
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
          >
            <option value="">All Roles</option>
            {roles.map(role => (
              <option key={role._id} value={role._id}>{role.name}</option>
            ))}
          </select>
        </div>

        {isGlobalUser() && (
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
        )}
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

      {/* Create / Edit User Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={activeUser ? 'Edit User Profile' : 'Create User Account'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Employee ID</label>
              <input
                type="text"
                placeholder="EMP002"
                className={`w-full bg-slate-950 border ${errors.employeeId ? 'border-red-500' : 'border-slate-800 focus:border-violet-500'} rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all`}
                {...register('employeeId', { required: 'Employee ID is required' })}
              />
              {errors.employeeId && <span className="text-[10px] text-red-400 mt-1 block">{errors.employeeId.message}</span>}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Full Name</label>
              <input
                type="text"
                placeholder="John Doe"
                className={`w-full bg-slate-950 border ${errors.name ? 'border-red-500' : 'border-slate-800 focus:border-violet-500'} rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all`}
                {...register('name', { required: 'Name is required' })}
              />
              {errors.name && <span className="text-[10px] text-red-400 mt-1 block">{errors.name.message}</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Email Address</label>
              <input
                type="email"
                placeholder="john@inventory.com"
                className={`w-full bg-slate-950 border ${errors.email ? 'border-red-500' : 'border-slate-800 focus:border-violet-500'} rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all`}
                {...register('email', { required: 'Email is required' })}
              />
              {errors.email && <span className="text-[10px] text-red-400 mt-1 block">{errors.email.message}</span>}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Password</label>
              <input
                type="password"
                placeholder={activeUser ? 'Leave blank to keep same' : '••••••••'}
                className={`w-full bg-slate-950 border ${errors.password ? 'border-red-500' : 'border-slate-800 focus:border-violet-500'} rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all`}
                {...register('password', {
                  required: activeUser ? false : 'Password is required',
                  minLength: activeUser ? undefined : { value: 6, message: 'Must be at least 6 characters' }
                })}
              />
              {errors.password && <span className="text-[10px] text-red-400 mt-1 block">{errors.password.message}</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Phone Number</label>
              <input
                type="text"
                placeholder="+919988776655"
                className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all"
                {...register('phone')}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Role Group</label>
              <select
                className={`w-full bg-slate-950 border ${errors.role ? 'border-red-500' : 'border-slate-800 focus:border-violet-500'} rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none transition-all`}
                {...register('role', { required: 'Please select a role' })}
              >
                <option value="">-- Choose Role --</option>
                {roles.map(role => (
                  <option key={role._id} value={role._id}>{role.name}</option>
                ))}
              </select>
              {errors.role && <span className="text-[10px] text-red-400 mt-1 block">{errors.role.message}</span>}
            </div>
          </div>

          {isGlobalUser() ? (
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Assign Branch</label>
              <select
                className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none transition-all"
                {...register('branch')}
              >
                <option value="">Global Head Office</option>
                {branches.map(br => (
                  <option key={br._id} value={br._id}>{br.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <input type="hidden" {...register('branch')} />
          )}

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isActive"
              className="rounded border-slate-800 bg-slate-950 text-violet-600 focus:ring-violet-500"
              {...register('isActive')}
            />
            <label htmlFor="isActive" className="text-xs font-semibold text-slate-300 select-none">
              Account Active
            </label>
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
              {activeUser ? 'Save Updates' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Users;
