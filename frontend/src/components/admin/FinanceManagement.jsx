import { useState, useEffect, useCallback } from 'react';
import {
    CreditCard, TrendingUp, RefreshCw, Search,
    ChevronLeft, ChevronRight, AlertCircle,
    CheckCircle, XCircle, RotateCcw, DollarSign,
    AlertTriangle
} from 'lucide-react';
import Dropdown from '../common/Dropdown';
import adminService from '../../services/adminService';

const StatusBadge = ({ status }) => {
    const config = {
        succeeded: { label: 'Paid', classes: 'bg-green-50 text-green-700 border-green-200', icon: <CheckCircle className="w-3 h-3" /> },
        pending: { label: 'Pending', classes: 'bg-amber-50 text-amber-700 border-amber-200', icon: <AlertCircle className="w-3 h-3" /> },
        failed: { label: 'Failed', classes: 'bg-red-50 text-red-700 border-red-200', icon: <XCircle className="w-3 h-3" /> },
        refunded: { label: 'Refunded', classes: 'bg-blue-50 text-blue-700 border-blue-200', icon: <RotateCcw className="w-3 h-3" /> },
        cancelled: { label: 'Cancelled', classes: 'bg-slate-50 text-slate-500 border-slate-200', icon: <XCircle className="w-3 h-3" /> },
    };
    const c = config[status] || config.pending;
    return (
        <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${c.classes}`}>
            {c.icon}
            <span>{c.label}</span>
        </span>
    );
};

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, loading }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-xs -mb-6" onClick={onCancel} />
            <div className="relative bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
                <div className="flex items-start space-x-4 mb-6">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900 mb-1">{title}</h3>
                        <p className="text-sm text-slate-500">{message}</p>
                    </div>
                </div>
                <div className="flex space-x-3">
                    <button onClick={onCancel} disabled={loading} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50">
                        Cancel
                    </button>
                    <button onClick={onConfirm} disabled={loading} className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-sm font-medium text-white transition-all disabled:opacity-50 flex items-center justify-center space-x-2">
                        {loading
                            ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Processing...</span></>
                            : <span>Issue Refund</span>
                        }
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function FinanceManagement({ showToast }) {
    const [payments, setPayments] = useState([]);
    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalTransactions: 0,
        successfulPayments: 0,
        refundedAmount: 0,
        pendingAmount: 0,
        failedCount: 0,
    });
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [refundTarget, setRefundTarget] = useState(null);
    const [refundLoading, setRefundLoading] = useState(false);
    const LIMIT = 10;

    const fetchPayments = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: LIMIT });
            if (statusFilter) params.append('status', statusFilter);
            if (search) params.append('search', search);

            const data = await adminService.getAllPayments({
                page,
                limit: LIMIT,
                ...(statusFilter && { status: statusFilter }),
                ...(search && { search })
            });

            setPayments(data.payments || []);
            setTotalPages(data.pages || 1);

            // Compute stats from the full dataset summary the API returns
            // If your payment-service doesn't have a stats endpoint yet,
            // compute from the current page as a best-effort approximation
            if (data.stats) {
                setStats(data.stats);
            } else {
                // Compute from current page — approximation
                const all = data.payments || [];
                setStats({
                    totalRevenue: all.filter(p => p.status === 'succeeded').reduce((s, p) => s + p.amount, 0),
                    totalTransactions: data.total || all.length,
                    successfulPayments: all.filter(p => p.status === 'succeeded').length,
                    refundedAmount: all.filter(p => p.status === 'refunded').reduce((s, p) => s + p.amount, 0),
                    pendingAmount: all.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0),
                    failedCount: all.filter(p => p.status === 'failed').length,
                });
            }
        } catch (err) {
            showToast('Failed to load payments', 'error');
        } finally {
            setLoading(false);
        }
    }, [page, statusFilter, search]);

    useEffect(() => { fetchPayments(); }, [fetchPayments]);
    useEffect(() => { setPage(1); }, [statusFilter, search]);

    const handleRefund = async () => {
        setRefundLoading(true);
        try {
            await adminService.refundPayment(refundTarget._id);
            showToast('Refund issued successfully');
            setRefundTarget(null);
            fetchPayments();
        } catch (err) {
            showToast(err.response?.data?.error || 'Refund failed', 'error');
        } finally {
            setRefundLoading(false);
        }
    };

    const formatCurrency = (amount) =>
        `LKR ${(amount || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;

    return (
        <div className="space-y-6">

            <ConfirmModal
                isOpen={!!refundTarget}
                title="Issue Refund"
                message={`Issue a full refund of ${formatCurrency(refundTarget?.amount)} for appointment ${refundTarget?.appointmentId?.slice(-8)}? This cannot be undone.`}
                onConfirm={handleRefund}
                onCancel={() => setRefundTarget(null)}
                loading={refundLoading}
            />

            {/* Financial Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                    {
                        label: 'Total Revenue',
                        value: formatCurrency(stats.totalRevenue),
                        icon: TrendingUp,
                        color: 'bg-green-50 text-green-600',
                        sub: `${stats.successfulPayments} successful payments`
                    },
                    {
                        label: 'Total Transactions',
                        value: stats.totalTransactions,
                        icon: CreditCard,
                        color: 'bg-blue-50 text-blue-600',
                        sub: `${stats.failedCount} failed`
                    },
                    {
                        label: 'Total Refunded',
                        value: formatCurrency(stats.refundedAmount),
                        icon: RotateCcw,
                        color: 'bg-amber-50 text-amber-600',
                        sub: 'Issued refunds'
                    },
                    {
                        label: 'Pending Amount',
                        value: formatCurrency(stats.pendingAmount),
                        icon: AlertCircle,
                        color: 'bg-orange-50 text-orange-600',
                        sub: 'Awaiting payment'
                    },
                    {
                        label: 'Net Revenue',
                        value: formatCurrency(stats.totalRevenue - stats.refundedAmount),
                        icon: DollarSign,
                        color: 'bg-purple-50 text-purple-600',
                        sub: 'After refunds'
                    },
                ].map(({ label, value, icon: Icon, color, sub }) => (
                    <div key={label} className="bg-white rounded-2xl border border-slate-200 p-5">
                        <div className="flex items-center space-x-3 mb-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                                <Icon className="w-5 h-5" />
                            </div>
                            <p className="text-sm font-medium text-slate-500">{label}</p>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{value}</p>
                        <p className="text-xs text-slate-400 mt-1">{sub}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by appointment ID or patient ID..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                </div>
                <Dropdown
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={[
                        { value: '', label: 'All Payments' },
                        { value: 'succeeded', label: 'Paid' },
                        { value: 'pending', label: 'Pending' },
                        { value: 'failed', label: 'Failed' },
                        { value: 'refunded', label: 'Refunded' }
                    ]}
                />
                <button
                    onClick={fetchPayments}
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
                ) : payments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <CreditCard className="w-10 h-10 mb-3 opacity-40" />
                        <p className="font-medium">No payments found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50">
                                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Appointment</th>
                                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Patient ID</th>
                                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Amount</th>
                                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Status</th>
                                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Date</th>
                                    <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {payments.map(p => (
                                    <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-mono text-slate-700">...{p.appointmentId?.slice(-10)}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">{p.stripePaymentIntentId?.slice(0, 20)}...</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-mono text-slate-600">...{p.patientId?.slice(-8)}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-semibold text-slate-900">{formatCurrency(p.amount)}</p>
                                            <p className="text-xs text-slate-400 uppercase">{p.currency}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={p.status} />
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-slate-500">
                                                {new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </p>
                                            {p.paidAt && (
                                                <p className="text-xs text-slate-400">
                                                    Paid: {new Date(p.paidAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end">
                                                {p.status === 'succeeded' && (
                                                    <button
                                                        onClick={() => setRefundTarget(p)}
                                                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-all"
                                                    >
                                                        <RotateCcw className="w-3.5 h-3.5" />
                                                        <span>Refund</span>
                                                    </button>
                                                )}
                                                {p.status === 'refunded' && (
                                                    <span className="text-xs text-slate-400 italic">Refunded {p.refundedAt ? new Date(p.refundedAt).toLocaleDateString() : ''}</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                        <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
                        <div className="flex items-center space-x-2">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}