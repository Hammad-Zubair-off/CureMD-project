import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import {
    Activity, LogOut, Users, UserCheck, UserX, Stethoscope,
    Search, ChevronLeft, ChevronRight, CheckCircle, XCircle,
    Trash2, ShieldOff, ShieldCheck, RefreshCw, X, AlertTriangle, ShieldUser,
    Crown
} from 'lucide-react';

//  Confirmation Modal 
const ConfirmModal = ({ isOpen, title, message, confirmLabel, confirmStyle, onConfirm, onCancel }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
            <div className="relative bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
                <div className="flex items-start space-x-4 mb-6">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900 mb-1">{title}</h3>
                        <p className="text-sm text-slate-500">{message}</p>
                    </div>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-all ${confirmStyle}`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

//  Role Badge 
const RoleBadge = ({ role }) => {
    const styles = {
        patient: 'bg-blue-50 text-blue-700 border-blue-200',
        doctor: 'bg-purple-50 text-purple-700 border-purple-200',
        admin: 'bg-orange-50 text-orange-700 border-orange-200',
        superadmin: 'bg-red-50 text-red-700 border-red-200',
    };
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[role] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
            {role}
        </span>
    );
};

//  Status Badge 
const StatusBadge = ({ isActive, isApproved, role }) => {
    if (!isActive) return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
            Deactivated
        </span>
    );
    if (role === 'doctor' && !isApproved) return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block"></span>
            <span>Pending</span>
        </span>
    );
    return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
            Active
        </span>
    );
};

//  Main Component 
export default function AdminDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // Data
    const [users, setUsers] = useState([]);
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(1);
    const [loading, setLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [page, setPage] = useState(1);
    const LIMIT = 10;

    // Action state
    const [actionLoading, setActionLoading] = useState(null);
    const [modal, setModal] = useState(null);
    const [toast, setToast] = useState(null);

    const [showCreateAdmin, setShowCreateAdmin] = useState(false);
    const [createAdminForm, setCreateAdminForm] = useState({
        firstName: '', lastName: '', email: '', password: ''
    });
    const [createAdminError, setCreateAdminError] = useState('');
    const [createAdminLoading, setCreateAdminLoading] = useState(false);

    //  Stats derived from current users list 
    const stats = {
        total,
        doctors: users.filter(u => u.role === 'doctor').length,
        patients: users.filter(u => u.role === 'patient').length,
        pending: users.filter(u => u.role === 'doctor' && !u.isApproved && u.isActive).length,
    };

    //  Show toast 
    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    //  Fetch users 
    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page, limit: LIMIT };
            if (search) params.search = search;
            if (roleFilter) params.role = roleFilter;

            const data = await authService.getAllUsers(params);
            setUsers(data.users || []);
            setTotal(data.total || 0);
            setPages(data.pages || 1);
        } catch (err) {
            console.error('fetchUsers error:', err); // ← add this
            showToast('Failed to load users', 'error');
        } finally {
            setLoading(false);
        }
    }, [page, search, roleFilter]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    // Reset to page 1 when filters change
    useEffect(() => { setPage(1); }, [search, roleFilter]);

    //  Actions 
    const handleAction = async (type, userId) => {
        setActionLoading(userId);
        try {
            switch (type) {
                case 'approve': await authService.approveDoctor(userId); showToast('Doctor approved successfully'); break;
                case 'reject': await authService.rejectDoctor(userId); showToast('Doctor rejected'); break;
                case 'activate': await authService.activateUser(userId); showToast('User activated'); break;
                case 'deactivate': await authService.deactivateUser(userId); showToast('User deactivated'); break;
                case 'delete': await authService.deleteUser(userId); showToast('User deleted'); break;
            }
            fetchUsers();
        } catch (err) {
            showToast(err.error || 'Action failed', 'error');
        } finally {
            setActionLoading(null);
            setModal(null);
        }
    };

    const handleCreateAdmin = async (e) => {
        e.preventDefault();
        setCreateAdminError('');
        setCreateAdminLoading(true);
        try {
            await authService.createAdmin(createAdminForm);
            showToast('Admin account created successfully');
            setShowCreateAdmin(false);
            setCreateAdminForm({ firstName: '', lastName: '', email: '', password: '' });
            fetchUsers();
        } catch (err) {
            setCreateAdminError(err.error || err.message || 'Failed to create admin');
        } finally {
            setCreateAdminLoading(false);
        }
    };

    const openModal = (type, userId, userName) => setModal({ type, userId, userName });

    const modalConfig = {
        reject: { title: 'Reject Doctor', message: `Reject ${modal?.userName}'s doctor registration?`, confirmLabel: 'Reject', confirmStyle: 'bg-red-600 hover:bg-red-700' },
        deactivate: { title: 'Deactivate Account', message: `Deactivate ${modal?.userName}'s account?`, confirmLabel: 'Deactivate', confirmStyle: 'bg-red-600 hover:bg-red-700' },
        delete: { title: 'Delete User', message: `Permanently delete ${modal?.userName}? Cannot undo.`, confirmLabel: 'Delete', confirmStyle: 'bg-red-600 hover:bg-red-700' },
    };

    //  Logout 
    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans">

            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 flex items-center space-x-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
                    }`}>
                    {toast.type === 'error' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                    <span>{toast.message}</span>
                    <button onClick={() => setToast(null)}><X className="w-4 h-4 opacity-70 hover:opacity-100" /></button>
                </div>
            )}

            {/* Confirm Modal */}
            {modal && modalConfig[modal.type] && (
                <ConfirmModal
                    isOpen={true}
                    {...modalConfig[modal.type]}
                    onConfirm={() => handleAction(modal.type, modal.userId)}
                    onCancel={() => setModal(null)}
                />
            )}

            {/* Navbar */}
            <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
                <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2 text-blue-600">
                        <Activity className="w-6 h-6" />
                        <span className="text-lg font-bold text-slate-900 tracking-tight">HealthConnect</span>
                    </div>
                    <span className="hidden sm:block text-slate-300">|</span>
                    <span className="hidden sm:block text-sm font-medium text-slate-500">Admin Dashboard</span>
                </div>
                <div className="flex items-center space-x-4">
                    <span className="hidden sm:block text-sm text-slate-600 items-center space-x-2">
                        {user?.role === 'superadmin'
                            ? <Crown className="w-5 h-5 text-amber-500 inline mr-1 -mt-1" />
                            : <ShieldUser className="w-5 h-5 text-blue-500 inline mr-1 -mt-1" />
                        }
                        <span className="font-semibold text-slate-900">{user?.firstName} {user?.lastName}</span>
                    </span>
                    <button
                        onClick={handleLogout}
                        className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                        <LogOut className="w-4 h-4" />
                        <span className="hidden sm:block">Logout</span>
                    </button>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

                {/* Page Title */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage users, approve doctors, and oversee platform activity.</p>
                </div>

                {/* ── Superadmin Section ── only visible to superadmin */}
                {user?.role === 'superadmin' && (
                    <div className="mb-8">

                        {/* Section header */}
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900 flex items-center space-x-2">
                                    <Crown className="w-5 h-5 text-amber-500" />
                                    <span>Super Admin Controls</span>
                                </h2>
                                <p className="text-sm text-slate-500 mt-0.5">
                                    These controls are only available to superadmin.
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowCreateAdmin(v => !v);
                                    setCreateAdminError('');
                                }}
                                className="flex items-center space-x-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-xl transition-all shadow-sm"
                            >
                                <ShieldCheck className="w-4 h-4" />
                                <span>{showCreateAdmin ? 'Cancel' : 'Create Admin'}</span>
                            </button>
                        </div>

                        {/* Create admin form — shown on toggle */}
                        {showCreateAdmin && (
                            <div className="bg-white rounded-2xl border border-amber-200 p-6">
                                <h3 className="text-sm font-semibold text-slate-700 mb-4">New Admin Account</h3>

                                {createAdminError && (
                                    <div className="flex items-start space-x-3 bg-red-50 text-red-700 p-3 rounded-xl mb-4 border border-red-100">
                                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                        <p className="text-sm">{createAdminError}</p>
                                    </div>
                                )}

                                <form onSubmit={handleCreateAdmin} className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1.5">
                                                First Name
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="John"
                                                value={createAdminForm.firstName}
                                                onChange={e => setCreateAdminForm(f => ({ ...f, firstName: e.target.value }))}
                                                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1.5">
                                                Last Name
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="Doe"
                                                value={createAdminForm.lastName}
                                                onChange={e => setCreateAdminForm(f => ({ ...f, lastName: e.target.value }))}
                                                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1.5">
                                            Email Address
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            placeholder="admin@healthconnect.com"
                                            value={createAdminForm.email}
                                            onChange={e => setCreateAdminForm(f => ({ ...f, email: e.target.value }))}
                                            className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1.5">
                                            Password
                                        </label>
                                        <input
                                            type="password"
                                            required
                                            placeholder="Min 8 characters"
                                            value={createAdminForm.password}
                                            onChange={e => setCreateAdminForm(f => ({ ...f, password: e.target.value }))}
                                            className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 transition-all"
                                        />
                                    </div>

                                    <div className="flex justify-end pt-2">
                                        <button
                                            type="submit"
                                            disabled={createAdminLoading}
                                            className="flex items-center space-x-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all"
                                        >
                                            {createAdminLoading
                                                ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>Creating...</span></>
                                                : <><ShieldCheck className="w-4 h-4" /><span>Create Admin</span></>
                                            }
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                )}

                {/* Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Total Users', value: total, icon: Users, color: 'bg-blue-50 text-blue-600' },
                        { label: 'Doctors', value: stats.doctors, icon: Stethoscope, color: 'bg-purple-50 text-purple-600' },
                        { label: 'Patients', value: stats.patients, icon: UserCheck, color: 'bg-green-50 text-green-600' },
                        { label: 'Pending Approval', value: stats.pending, icon: UserX, color: 'bg-amber-50 text-amber-600' },
                    ].map(({ label, value, icon: Icon, color }) => (
                        <div key={label} className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center space-x-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                                <Icon className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{value}</p>
                                <p className="text-xs text-slate-500">{label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 flex flex-col sm:flex-row gap-3">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                        />
                    </div>

                    {/* Role filter */}
                    <select
                        value={roleFilter}
                        onChange={e => setRoleFilter(e.target.value)}
                        className="py-2.5 px-4 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all bg-white text-slate-700"
                    >
                        <option value="">All Roles</option>
                        <option value="patient">Patients</option>
                        <option value="doctor">Doctors</option>
                        <option value="admin">Admins</option>
                    </select>

                    {/* Refresh */}
                    <button
                        onClick={fetchUsers}
                        className="flex items-center space-x-2 px-4 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                    </button>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Users className="w-10 h-10 mb-3 opacity-40" />
                            <p className="font-medium">No users found</p>
                            <p className="text-sm mt-1">Try adjusting your search or filter</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50">
                                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">User</th>
                                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Role</th>
                                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Status</th>
                                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Joined</th>
                                        <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {users.map(u => (
                                        <tr key={u.id} className="hover:bg-slate-50 transition-colors">

                                            {/* User info */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm shrink-0">
                                                        {u.firstName?.[0]}{u.lastName?.[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-900">
                                                            {u.role === 'doctor' ? `Dr. ${u.firstName} ${u.lastName}` : `${u.firstName} ${u.lastName}`}
                                                        </p>
                                                        <p className="text-xs text-slate-400">{u.email}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Role */}
                                            <td className="px-6 py-4">
                                                <RoleBadge role={u.role} />
                                            </td>

                                            {/* Status */}
                                            <td className="px-6 py-4">
                                                <StatusBadge isActive={u.isActive} isApproved={u.isApproved} role={u.role} />
                                            </td>

                                            {/* Joined date */}
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-slate-500">
                                                    {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end space-x-2">
                                                    {actionLoading === u.id ? (
                                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                                                    ) : (
                                                        <>
                                                            {/* Approve — only for pending doctors */}
                                                            {u.role === 'doctor' && !u.isApproved && u.isActive && (
                                                                <button
                                                                    onClick={() => handleAction('approve', u.id)}
                                                                    title="Approve Doctor"
                                                                    className="p-2 rounded-lg text-green-600 hover:bg-green-50 transition-all"
                                                                >
                                                                    <CheckCircle className="w-4 h-4" />
                                                                </button>
                                                            )}

                                                            {/* Reject — only for pending doctors */}
                                                            {u.role === 'doctor' && !u.isApproved && u.isActive && (
                                                                <button
                                                                    onClick={() => openModal('reject', u.id, `Dr. ${u.firstName} ${u.lastName}`)}
                                                                    title="Reject Doctor"
                                                                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-all"
                                                                >
                                                                    <XCircle className="w-4 h-4" />
                                                                </button>
                                                            )}

                                                            {/* Activate / Deactivate */}
                                                            {u.role !== 'superadmin' && u.id !== user?.id &&
                                                                !(u.role === 'admin' && user?.role !== 'superadmin') && (
                                                                    u.isActive ? (
                                                                        <button
                                                                            onClick={() => openModal('deactivate', u.id, `${u.firstName} ${u.lastName}`)}
                                                                            title="Deactivate User"
                                                                            className="p-2 rounded-lg text-orange-500 hover:bg-orange-50 transition-all"
                                                                        >
                                                                            <ShieldOff className="w-4 h-4" />
                                                                        </button>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => handleAction('activate', u.id)}
                                                                            title="Activate User"
                                                                            className="p-2 rounded-lg text-green-600 hover:bg-green-50 transition-all"
                                                                        >
                                                                            <ShieldCheck className="w-4 h-4" />
                                                                        </button>
                                                                    )
                                                                )}

                                                            {/* Delete — not for superadmin, not for self */}
                                                            {u.role !== 'superadmin' && u.id !== user?.id &&
                                                                !(u.role === 'admin' && user?.role !== 'superadmin') && (
                                                                    <button
                                                                        onClick={() => openModal('delete', u.id, `${u.firstName} ${u.lastName}`)}
                                                                        title="Delete User"
                                                                        className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-all"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                )
                                                            }
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {!loading && pages > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                            <p className="text-sm text-slate-500">
                                Page {page} of {pages} · {total} total users
                            </p>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(pages, p + 1))}
                                    disabled={page === pages}
                                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}