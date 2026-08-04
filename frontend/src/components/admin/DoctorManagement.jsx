import { useState, useEffect, useCallback } from 'react';
import authService from '../../services/authService';
import api from '../../services/api';
import {
    Stethoscope, CheckCircle, XCircle, Search,
    ChevronLeft, ChevronRight, RefreshCw, AlertTriangle,
    ShieldOff, ShieldCheck, Clock, Star
} from 'lucide-react';
import Dropdown from '../common/Dropdown';
import adminService from '../../services/adminService';

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
                    <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all">
                        Cancel
                    </button>
                    <button onClick={onConfirm} className={`flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-all ${confirmStyle}`}>
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ApprovalBadge = ({ isApproved, isActive }) => {
    if (!isActive) return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
            Deactivated
        </span>
    );
    if (!isApproved) return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
            <span>Pending</span>
        </span>
    );
    return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
            Approved
        </span>
    );
};

export default function DoctorManagement({ showToast, statusFilter: initialStatusFilter = '' }) {
    // Auth-service users with role=doctor (for approve/reject/deactivate)
    const [doctorUsers, setDoctorUsers] = useState([]);
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(1);
    const [loading, setLoading] = useState(true);

    // Doctor-service profiles (for rating, specialization, etc.)
    const [doctorProfiles, setDoctorProfiles] = useState({});

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
    const [page, setPage] = useState(1);
    const [actionLoading, setActionLoading] = useState(null);
    const [modal, setModal] = useState(null);
    const LIMIT = 10;

    const pendingCount = doctorUsers.filter(d => !d.isApproved && d.isActive).length;
    const approvedCount = doctorUsers.filter(d => d.isApproved).length;

    // Fetch doctor users from auth-service
    const fetchDoctorUsers = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page, limit: LIMIT, role: 'doctor' };
            if (search) params.search = search;
            if (statusFilter === 'pending') params.isApproved = false;
            if (statusFilter === 'approved') params.isApproved = true;
            if (statusFilter === 'inactive') params.isActive = false;

            const data = await authService.getAllUsers(params);
            setDoctorUsers(data.users || []);
            setTotal(data.total || 0);
            setPages(data.pages || 1);
        } catch (err) {
            showToast('Failed to load doctors', 'error');
        } finally {
            setLoading(false);
        }
    }, [page, search, statusFilter]);

    // Fetch doctor profiles from doctor-service to get specialization/rating
    const fetchDoctorProfiles = useCallback(async () => {
        try {
            const res = await adminService.getAllDoctors();
            const profileMap = {};
            (res.data || []).forEach(d => {
                // doctor-service userId links to auth-service user id
                profileMap[d.userId] = d;
            });
            setDoctorProfiles(profileMap);
        } catch (err) {
            // Non-critical — cards still work without profile data
            console.error('Failed to fetch doctor profiles:', err);
        }
    }, []);

    useEffect(() => {
        setStatusFilter(initialStatusFilter);
        setPage(1);
    }, [initialStatusFilter]);

    useEffect(() => {
        fetchDoctorUsers();
        fetchDoctorProfiles();
    }, [fetchDoctorUsers, fetchDoctorProfiles]);

    useEffect(() => { setPage(1); }, [search, statusFilter]);

    const handleAction = async (type, userId, userName) => {
        setActionLoading(userId);
        try {
            switch (type) {
                case 'approve':
                    await authService.approveDoctor(userId);
                    showToast(`Dr. ${userName} approved successfully`);
                    break;
                case 'reject':
                    await authService.rejectDoctor(userId);
                    showToast(`Dr. ${userName} registration rejected`);
                    break;
                case 'activate':
                    await authService.activateUser(userId);
                    showToast('Doctor account activated');
                    break;
                case 'deactivate':
                    await authService.deactivateUser(userId);
                    showToast('Doctor account deactivated');
                    break;
            }
            fetchDoctorUsers();
        } catch (err) {
            showToast(err.error || 'Action failed', 'error');
        } finally {
            setActionLoading(null);
            setModal(null);
        }
    };

    const openModal = (type, userId, userName) => setModal({ type, userId, userName });

    const modalConfig = {
        reject: {
            title: 'Reject Doctor',
            message: `Reject Dr. ${modal?.userName}'s registration? Their account will be deactivated.`,
            confirmLabel: 'Reject',
            confirmStyle: 'bg-red-600 hover:bg-red-700'
        },
        deactivate: {
            title: 'Deactivate Doctor',
            message: `Deactivate Dr. ${modal?.userName}'s account? They will lose access to the platform.`,
            confirmLabel: 'Deactivate',
            confirmStyle: 'bg-red-600 hover:bg-red-700'
        },
    };

    return (
        <div className="space-y-6">

            {modal && modalConfig[modal.type] && (
                <ConfirmModal
                    isOpen={true}
                    {...modalConfig[modal.type]}
                    onConfirm={() => handleAction(modal.type, modal.userId, modal.userName)}
                    onCancel={() => setModal(null)}
                />
            )}

            {initialStatusFilter === 'pending' && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-sm text-amber-900">
                    New doctor sign-ups appear here until you approve or reject them. This is not for appointment cancellations.
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Doctors', value: total, icon: Stethoscope, color: 'bg-purple-50 text-purple-600' },
                    { label: 'Approved', value: approvedCount, icon: CheckCircle, color: 'bg-green-50 text-green-600' },
                    { label: 'Pending Approval', value: pendingCount, icon: Clock, color: 'bg-amber-50 text-amber-600' },
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
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={[
                        { value: '', label: 'All Doctors' },
                        { value: 'pending', label: 'Pending' },
                        { value: 'approved', label: 'Approved' },
                        { value: 'inactive', label: 'Inactive' }
                    ]}
                />
                <button
                    onClick={() => { fetchDoctorUsers(); fetchDoctorProfiles(); }}
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
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
                    </div>
                ) : doctorUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <Stethoscope className="w-10 h-10 mb-3 opacity-40" />
                        <p className="font-medium">No doctors found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50">
                                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Doctor</th>
                                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Specialization</th>
                                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Rating</th>
                                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Status</th>
                                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Joined</th>
                                    <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {doctorUsers.map(u => {
                                    // Cross-reference with doctor-service profile
                                    const profile = doctorProfiles[u.id];
                                    return (
                                        <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-semibold text-sm shrink-0">
                                                        {u.firstName?.[0]}{u.lastName?.[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-900">Dr. {u.firstName} {u.lastName}</p>
                                                        <p className="text-xs text-slate-400">{u.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-slate-600">
                                                    {profile?.specialization || '—'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {profile ? (
                                                    <div className="flex items-center space-x-1">
                                                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                                        <span className="text-sm font-medium text-slate-700">{profile.rating?.toFixed(1) || '0.0'}</span>
                                                        <span className="text-xs text-slate-400">({profile.totalReviews || 0})</span>
                                                    </div>
                                                ) : <span className="text-sm text-slate-400">—</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <ApprovalBadge isApproved={u.isApproved} isActive={u.isActive} />
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-slate-500">
                                                    {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end space-x-2">
                                                    {actionLoading === u.id ? (
                                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500" />
                                                    ) : (
                                                        <>
                                                            {/* Approve — pending doctors only */}
                                                            {!u.isApproved && u.isActive && (
                                                                <button
                                                                    onClick={() => handleAction('approve', u.id, `${u.firstName} ${u.lastName}`)}
                                                                    title="Approve"
                                                                    className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 transition-all"
                                                                >
                                                                    <CheckCircle className="w-3.5 h-3.5" />
                                                                    <span>Approve</span>
                                                                </button>
                                                            )}

                                                            {/* Reject — pending doctors only */}
                                                            {!u.isApproved && u.isActive && (
                                                                <button
                                                                    onClick={() => openModal('reject', u.id, `${u.firstName} ${u.lastName}`)}
                                                                    title="Reject"
                                                                    className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 transition-all"
                                                                >
                                                                    <XCircle className="w-3.5 h-3.5" />
                                                                    <span>Reject</span>
                                                                </button>
                                                            )}

                                                            {/* Activate / Deactivate — approved doctors */}
                                                            {u.isApproved && (
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
                                                                        onClick={() => handleAction('activate', u.id, `${u.firstName} ${u.lastName}`)}
                                                                        title="Activate"
                                                                        className="p-2 rounded-lg text-green-600 hover:bg-green-50 transition-all"
                                                                    >
                                                                        <ShieldCheck className="w-4 h-4" />
                                                                    </button>
                                                                )
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
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