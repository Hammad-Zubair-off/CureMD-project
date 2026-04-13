import { useState, useEffect, useCallback } from 'react';
import authService from '../../services/authService';
import {
    Users, UserCheck, UserX, Search, ChevronLeft, ChevronRight,
    CheckCircle, XCircle, Trash2, ShieldOff, ShieldCheck,
    RefreshCw, X, AlertTriangle
} from 'lucide-react';
import Dropdown from '../common/Dropdown';

// Confirmation Modal
const ConfirmModal = ({ isOpen, title, message, confirmLabel, confirmStyle, onConfirm, onCancel }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-xs -mb-6" onClick={onCancel} />
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

const StatusBadge = ({ isActive, isApproved, role }) => {
    if (!isActive) return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
            Deactivated
        </span>
    );
    if (role === 'doctor' && !isApproved) return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
            <span>Pending</span>
        </span>
    );
    return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
            Active
        </span>
    );
};

export default function UserManagement({ currentUser, showToast }) {
    const [users, setUsers] = useState([]);
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('patient'); // default to patients only
    const [page, setPage] = useState(1);
    const [actionLoading, setActionLoading] = useState(null);
    const [modal, setModal] = useState(null);
    const LIMIT = 10;

    const stats = {
        total,
        active: users.filter(u => u.isActive).length,
        inactive: users.filter(u => !u.isActive).length,
    };

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page, limit: LIMIT, role: 'patient' };
            if (search) params.search = search;
            if (roleFilter) params.role = roleFilter;
            const data = await authService.getAllUsers(params);
            setUsers(data.users || []);
            setTotal(data.total || 0);
            setPages(data.pages || 1);
        } catch (err) {
            showToast('Failed to load users', 'error');
        } finally {
            setLoading(false);
        }
    }, [page, search, roleFilter]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);
    useEffect(() => { setPage(1); }, [search, roleFilter]);

    const handleAction = async (type, userId) => {
        setActionLoading(userId);
        try {
            switch (type) {
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

    const openModal = (type, userId, userName) => setModal({ type, userId, userName });

    const modalConfig = {
        deactivate: { title: 'Deactivate Account', message: `Deactivate ${modal?.userName}'s account?`, confirmLabel: 'Deactivate', confirmStyle: 'bg-red-600 hover:bg-red-700' },
        delete: { title: 'Delete User', message: `Permanently delete ${modal?.userName}? This cannot be undone.`, confirmLabel: 'Delete', confirmStyle: 'bg-red-600 hover:bg-red-700' },
    };

    return (
        <div className="space-y-6">

            {modal && modalConfig[modal.type] && (
                <ConfirmModal
                    isOpen={true}
                    {...modalConfig[modal.type]}
                    onConfirm={() => handleAction(modal.type, modal.userId)}
                    onCancel={() => setModal(null)}
                />
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Users', value: total, icon: Users, color: 'bg-blue-50 text-blue-600' },
                    { label: 'Active', value: stats.active, icon: UserCheck, color: 'bg-green-50 text-green-600' },
                    { label: 'Inactive', value: stats.inactive, icon: UserX, color: 'bg-red-50 text-red-600' },
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
            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3">
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
                <Dropdown 
                    value={roleFilter}
                    onChange={setRoleFilter}
                    options={[
                        { value: 'patient', label: 'Patients' },
                        { value: 'admin', label: 'Admins' }
                    ]}  
                />
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
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                    </div>
                ) : users.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <Users className="w-10 h-10 mb-3 opacity-40" />
                        <p className="font-medium">No users found</p>
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
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm shrink-0">
                                                    {u.firstName?.[0]}{u.lastName?.[0]}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900">{u.firstName} {u.lastName}</p>
                                                    <p className="text-xs text-slate-400">{u.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4"><RoleBadge role={u.role} /></td>
                                        <td className="px-6 py-4"><StatusBadge isActive={u.isActive} isApproved={u.isApproved} role={u.role} /></td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-slate-500">
                                                {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end space-x-2">
                                                {actionLoading === u.id ? (
                                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
                                                ) : (
                                                    <>
                                                        {u.role !== 'superadmin' && u.id !== currentUser?.id &&
                                                            !(u.role === 'admin' && currentUser?.role !== 'superadmin') && (
                                                                u.isActive ? (
                                                                    <button
                                                                        onClick={() => openModal('deactivate', u.id, `${u.firstName} ${u.lastName}`)}
                                                                        title="Deactivate"
                                                                        className="p-2 rounded-lg text-orange-500 hover:bg-orange-50 transition-all"
                                                                    >
                                                                        <ShieldOff className="w-4 h-4" />
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => handleAction('activate', u.id)}
                                                                        title="Activate"
                                                                        className="p-2 rounded-lg text-green-600 hover:bg-green-50 transition-all"
                                                                    >
                                                                        <ShieldCheck className="w-4 h-4" />
                                                                    </button>
                                                                )
                                                            )}
                                                        {u.role !== 'superadmin' && u.id !== currentUser?.id &&
                                                            !(u.role === 'admin' && currentUser?.role !== 'superadmin') && (
                                                                <button
                                                                    onClick={() => openModal('delete', u.id, `${u.firstName} ${u.lastName}`)}
                                                                    title="Delete"
                                                                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-all"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            )}
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

                {!loading && pages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                        <p className="text-sm text-slate-500">Page {page} of {pages} · {total} total</p>
                        <div className="flex items-center space-x-2">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}