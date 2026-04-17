import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/authService';
import {
    KeyRound, ShieldAlert, Eye, EyeOff,
    CheckCircle2, XCircle, Loader2, AlertTriangle,
    Lock, User
} from 'lucide-react';

// Password strength checker
const getStrength = (password) => {
    if (!password) return { score: 0, label: '', color: '' };
    const checks = [
        password.length >= 8,
        /[A-Z]/.test(password),
        /[a-z]/.test(password),
        /[0-9]/.test(password),
        /[@#$%!&*()_+\-=\[\]{};':",.<>?]/.test(password),
    ];
    const score = checks.filter(Boolean).length;
    if (score <= 2) return { score, label: 'Weak', color: 'bg-red-500' };
    if (score === 3) return { score, label: 'Fair', color: 'bg-amber-500' };
    if (score === 4) return { score, label: 'Good', color: 'bg-blue-500' };
    return { score, label: 'Strong', color: 'bg-green-500' };
};

const PasswordInput = ({ id, label, value, onChange, placeholder }) => {
    const [show, setShow] = useState(false);
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">
                {label}
            </label>
            <div className="relative">
                <input
                    id={id}
                    type={show ? 'text' : 'password'}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className="w-full pl-4 pr-12 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
                <button
                    type="button"
                    onClick={() => setShow(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
            </div>
        </div>
    );
};

const Toast = ({ toast }) => {
    if (!toast) return null;
    const isError = toast.type === 'error';
    return (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium transition-all
            ${isError ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
            {isError ? <XCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            <span>{toast.message}</span>
        </div>
    );
};

export default function PatientSettings() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('security');
    const [toast, setToast] = useState(null);

    // Password change state
    const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
    const [pwLoading, setPwLoading] = useState(false);
    const [pwErrors, setPwErrors] = useState([]);

    // Deactivation state
    const [deactivatePassword, setDeactivatePassword] = useState('');
    const [deactivateConfirm, setDeactivateConfirm] = useState('');
    const [deactivateLoading, setDeactivateLoading] = useState(false);
    const [deactivateError, setDeactivateError] = useState('');
    const CONFIRM_TEXT = 'DEACTIVATE';

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const strength = getStrength(pwForm.next);

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setPwErrors([]);

        if (pwForm.next !== pwForm.confirm) {
            setPwErrors(['New password and confirmation do not match.']);
            return;
        }

        setPwLoading(true);
        try {
            await authService.changePassword(pwForm.current, pwForm.next);
            showToast('Password updated successfully!');
            setPwForm({ current: '', next: '', confirm: '' });
        } catch (err) {
            const errs = err?.errors || (err?.error ? [err.error] : ['Failed to update password.']);
            setPwErrors(errs);
        } finally {
            setPwLoading(false);
        }
    };

    const handleDeactivate = async () => {
        setDeactivateError('');
        if (deactivateConfirm !== CONFIRM_TEXT) {
            setDeactivateError(`Please type "${CONFIRM_TEXT}" exactly to confirm.`);
            return;
        }
        if (!deactivatePassword) {
            setDeactivateError('Your current password is required.');
            return;
        }

        setDeactivateLoading(true);
        try {
            await authService.deactivateMyAccount(deactivatePassword);
            await logout();
            navigate('/login', { replace: true });
        } catch (err) {
            setDeactivateError(err?.error || 'Failed to deactivate account. Check your password.');
        } finally {
            setDeactivateLoading(false);
        }
    };

    const tabs = [
        { key: 'security', label: 'Security', icon: KeyRound },
        { key: 'account', label: 'Account', icon: User },
    ];

    return (
        <div className="p-4 md:p-8 lg:p-10 max-w-2xl mx-auto">
            <Toast toast={toast} />

            {/* Page Header */}
            <div className="mb-8 space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Settings</h1>
                    <p className="text-slate-500 mt-2">Manage your account security and preferences.</p>
                </div>

                {/* Segmented Control Tab Bar */}
                <div className="inline-flex p-1 bg-slate-100 rounded-xl">
                    {tabs.map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all
                                ${activeTab === key
                                    ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/50'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Security Tab */}
            {activeTab === 'security' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-4">
                        <div className="p-3 bg-blue-50 rounded-xl">
                            <Lock className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-slate-900 text-base">Change Password</h2>
                            <p className="text-sm text-slate-500 mt-0.5">Use a strong password with uppercase, numbers, and symbols.</p>
                        </div>
                    </div>

                    <form onSubmit={handlePasswordChange} className="p-6 space-y-6">
                        <PasswordInput
                            id="current-password"
                            label="Current Password"
                            value={pwForm.current}
                            onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                            placeholder="Enter your current password"
                        />

                        <PasswordInput
                            id="new-password"
                            label="New Password"
                            value={pwForm.next}
                            onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
                            placeholder="Enter new password"
                        />

                        {/* Strength Meter */}
                        {pwForm.next && (
                            <div className="space-y-1.5">
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <div
                                            key={i}
                                            className={`flex-1 h-1.5 rounded-full transition-all ${
                                                i <= strength.score ? strength.color : 'bg-slate-100'
                                            }`}
                                        />
                                    ))}
                                </div>
                                <p className="text-xs text-slate-500">
                                    Strength: <span className="font-semibold">{strength.label}</span>
                                </p>
                            </div>
                        )}

                        <PasswordInput
                            id="confirm-password"
                            label="Confirm New Password"
                            value={pwForm.confirm}
                            onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                            placeholder="Re-enter new password"
                        />

                        {/* Errors */}
                        {pwErrors.length > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 space-y-1">
                                {pwErrors.map((err, i) => (
                                    <p key={i} className="text-xs text-red-700 font-medium flex items-start gap-1.5">
                                        <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                        {err}
                                    </p>
                                ))}
                            </div>
                        )}

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={pwLoading || !pwForm.current || !pwForm.next || !pwForm.confirm}
                                className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm shadow-blue-600/20"
                            >
                                {pwLoading
                                    ? <><Loader2 className="w-5 h-5 animate-spin" /><span>Updating...</span></>
                                    : <><KeyRound className="w-5 h-5" /><span>Update Password</span></>
                                }
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Account Tab */}
            {activeTab === 'account' && (
                <div className="space-y-8">
                    {/* Account Info Card */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <User className="w-5 h-5 text-slate-600" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-slate-900 text-base">Account Information</h2>
                                <p className="text-sm text-slate-500 mt-0.5">Your personal details and role.</p>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center justify-between py-3 border-b border-slate-100">
                                <span className="text-sm text-slate-500 font-medium">Full Name</span>
                                <span className="text-sm font-semibold text-slate-800">{user?.firstName} {user?.lastName}</span>
                            </div>
                            <div className="flex items-center justify-between py-3 border-b border-slate-100">
                                <span className="text-sm text-slate-500 font-medium">Email Address</span>
                                <span className="text-sm font-semibold text-slate-800">{user?.email}</span>
                            </div>
                            <div className="flex items-center justify-between py-3">
                                <span className="text-sm text-slate-500 font-medium">Role</span>
                                <span className="text-sm font-semibold text-slate-800 capitalize bg-slate-100 px-3 py-1 rounded-full">{user?.role}</span>
                            </div>
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-5 border-b border-red-100 flex items-center gap-4 bg-red-50/30">
                            <div className="p-3 bg-red-100 rounded-xl">
                                <ShieldAlert className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-red-700 text-base">Danger Zone</h2>
                                <p className="text-sm text-red-500/80 mt-0.5">These actions are irreversible. Proceed with caution.</p>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
                                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-sm text-amber-800 leading-relaxed">
                                    Deactivating your account will immediately log you out. You will not be able to log back in.
                                    Contact support if you wish to reactivate.
                                </p>
                            </div>

                            <PasswordInput
                                id="deactivate-password"
                                label="Enter your current password to confirm"
                                value={deactivatePassword}
                                onChange={e => setDeactivatePassword(e.target.value)}
                                placeholder="Your current password"
                            />

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Type <span className="font-mono text-red-600 font-bold">{CONFIRM_TEXT}</span> to confirm
                                </label>
                                <input
                                    type="text"
                                    value={deactivateConfirm}
                                    onChange={e => setDeactivateConfirm(e.target.value)}
                                    placeholder={CONFIRM_TEXT}
                                    className="w-full pl-4 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-red-400 focus:ring-4 focus:ring-red-500/10 transition-all font-mono"
                                />
                            </div>

                            {deactivateError && (
                                <p className="text-sm text-red-700 font-medium flex items-center gap-1.5">
                                    <XCircle className="w-4 h-4 shrink-0" />
                                    {deactivateError}
                                </p>
                            )}

                            <button
                                onClick={handleDeactivate}
                                disabled={
                                    deactivateLoading ||
                                    !deactivatePassword ||
                                    deactivateConfirm !== CONFIRM_TEXT
                                }
                                className="w-full py-3 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm shadow-red-600/20"
                            >
                                {deactivateLoading
                                    ? <><Loader2 className="w-5 h-5 animate-spin" /><span>Deactivating...</span></>
                                    : <><ShieldAlert className="w-5 h-5" /><span>Deactivate My Account</span></>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
