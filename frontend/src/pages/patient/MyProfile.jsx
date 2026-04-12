import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import patientService from '../../services/patientService';
import PatientProfileUpdate from '../../components/patient/PatientProfileUpdate';
import Toast from '../../components/common/Toast';
import {
    Loader2,
    Activity,
    Lock,
    ExternalLink,
    Settings,
    CheckCircle
} from 'lucide-react';

const SecurityZone = () => (
    <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-100 overflow-hidden relative group hover:shadow-xl transition-all duration-500 max-w-2xl w-full">
        <div className="absolute top-0 right-0 w-48 h-48 bg-red-50 -mr-24 -mt-24 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
        <div className="relative flex items-center space-x-4 mb-10">
            <div className="bg-red-100 p-3 rounded-2xl">
                <Lock className="w-6 h-6 text-red-600" />
            </div>
            <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Security Zone</h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Manage your account protection</p>
            </div>
        </div>

        <div className="space-y-5 relative z-10">
            <button className="w-full flex items-center justify-between p-5 bg-slate-50 hover:bg-white hover:shadow-md border border-transparent hover:border-slate-100 rounded-2xl transition-all group/btn">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                        <Lock className="w-4 h-4 text-slate-400" />
                    </div>
                    <span className="text-sm font-bold text-slate-700">Change Password</span>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover/btn:text-blue-600 group-hover/btn:translate-x-0.5 transition-all" />
            </button>

            <div className="flex items-center justify-between p-5 border border-slate-100 rounded-2xl bg-white shadow-sm">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-700">Two-Factor Auth</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Secure Session</p>
                    </div>
                </div>
                <span className="px-4 py-1.5 rounded-full bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-widest border border-green-100 shadow-sm shadow-green-100/20">Enabled</span>
            </div>

            <div className="mt-10 pt-10 border-t border-slate-50">
                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-5 ml-1">Danger Zone</p>
                <button className="w-full py-4 bg-red-50 text-red-600 text-sm font-black rounded-2xl hover:bg-red-600 hover:text-white transition-all border border-red-100 shadow-sm shadow-red-100 hover:shadow-red-600/20 active:scale-[0.98]">
                    Deactivate Account
                </button>
                <p className="text-[10px] text-slate-400 font-bold text-center mt-5 leading-relaxed max-w-xs mx-auto">
                    This action is permanent and will delete your clinical history vault safely.
                </p>
            </div>
        </div>
    </div>
);

export default function MyProfile() {
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [profileData, setProfileData] = useState(null);
    const [activeTab, setActiveTab] = useState('Personal & Medical');

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const data = await patientService.getMyProfile();
                const p = data.profile || data;

                setProfileData({
                    ...p,
                    email: user?.email || p.email
                });
            } catch (err) {
                setMessage({ type: 'error', text: 'Failed to load profile data.' });
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [user]);

    const handleSave = async (formData) => {
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const payload = {
                ...formData,
                height: formData.height ? Number(formData.height) : undefined,
                weight: formData.weight ? Number(formData.weight) : undefined
            };

            await patientService.updateProfile(payload);
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            setProfileData(prev => ({ ...prev, ...formData }));
        } catch (err) {
            const backendErrors = err.response?.data?.errors;
            const errorText = Array.isArray(backendErrors)
                ? backendErrors.join(' ')
                : (err.response?.data?.message || err.error || 'Failed to update profile.');
            setMessage({ type: 'error', text: errorText });
        } finally {
            setSaving(false);
        }
    };

    const clearMessage = useCallback(() => setMessage({ type: '', text: '' }), []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
                    <Activity className="absolute inset-0 m-auto w-6 h-6 text-blue-600 animate-pulse" />
                </div>
                <p className="mt-6 font-bold text-slate-900 tracking-wide uppercase text-xs">Accessing Clinical Records...</p>
            </div>
        );
    }

    return (
        <div className="p-8 lg:p-12 max-w-7xl mx-auto">
            {/* Page Title & Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Security Vault</h1>
                    <p className="text-slate-400 font-bold mt-1 text-sm tracking-wide uppercase tracking-widest text-[10px]">Your personal and medical health records</p>
                </div>

                <div className="flex items-center space-x-2 bg-slate-100/50 p-1.5 rounded-[18px]">
                    {['Personal & Medical', 'Account Settings'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-3 rounded-[14px] text-sm font-bold transition-all ${activeTab === tab ? 'bg-white text-blue-600 shadow-xl shadow-blue-600/5' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Reusable Toast */}
            <Toast
                isOpen={!!message.text}
                type={message.type}
                message={message.text}
                onClose={clearMessage}
            />

            {activeTab === 'Personal & Medical' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <PatientProfileUpdate
                        initialData={profileData}
                        onSave={handleSave}
                        saving={saving}
                    />
                </div>
            )}

            {activeTab === 'Account Settings' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10 flex flex-col items-center py-10">
                    <SecurityZone />

                    <div className="bg-slate-50/50 rounded-[2.5rem] p-12 border border-dashed border-slate-200 flex flex-col items-center text-center max-w-2xl w-full">
                        <div className="bg-white p-6 rounded-3xl shadow-sm mb-6 border border-slate-100">
                            <Settings className="w-10 h-10 text-slate-300 animate-spin-slow" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">System Preferences</h3>
                        <p className="text-slate-500 font-medium mt-3 leading-relaxed max-w-sm">
                            Customization for notifications and accessibility settings are currently being optimized for your account.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}