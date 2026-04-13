import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import doctorService from '../../services/doctorService';
import {
    UserCircle, CalendarDays, Clock, CheckCircle2,
    AlertCircle, ChevronRight, Star, Stethoscope,
    Activity, RefreshCw, MapPin, Phone, Video, MessageSquare,
    TrendingUp, Award,
} from 'lucide-react';

const DAY_SHORT = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun' };
const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function StatusBanner({ isApproved }) {
    if (isApproved) return (
        <div className="flex items-center space-x-3 px-5 py-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
                <p className="text-sm font-semibold text-emerald-800">Account Approved & Active</p>
                <p className="text-xs text-emerald-600">Your profile is live and visible to patients across HealthConnect.</p>
            </div>
            <span className="ml-auto px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">LIVE</span>
        </div>
    );
    return (
        <div className="flex items-center space-x-3 px-5 py-3.5 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
                <p className="text-sm font-semibold text-amber-800">Pending Admin Approval</p>
                <p className="text-xs text-amber-600">Your profile is under review. You'll be notified once approved.</p>
            </div>
            <span className="ml-auto px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">PENDING</span>
        </div>
    );
}

export default function DoctorDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await doctorService.getMyProfile();
                setProfile(res.data);
            } catch (err) {
                if (err.response?.status === 404) setProfile(null);
                else setError('Failed to load profile.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center h-full py-32">
            <div className="flex flex-col items-center space-y-3">
                <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
                <p className="text-sm text-slate-500">Loading dashboard...</p>
            </div>
        </div>
    );

    if (!profile) return (
        <div className="px-6 py-10 max-w-2xl mx-auto">
            <div className="text-center py-16 bg-white rounded-2xl border border-blue-100 shadow-sm">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-5">
                    <Stethoscope className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Complete Your Doctor Profile</h2>
                <p className="text-slate-500 text-sm mb-8 max-w-xs mx-auto">
                    Set up your profile so patients can find and book consultations with you.
                </p>
                <button
                    onClick={() => navigate('/doctor/profile')}
                    className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
                >
                    <UserCircle className="w-4 h-4" />
                    <span>Create Profile</span>
                </button>
            </div>
        </div>
    );

    const scheduledDays = profile.availability?.map(a => a.day) || [];
    const totalSlots = profile.availability?.reduce((acc, d) => acc + (d.slots?.length || 0), 0) || 0;

    return (
        <div className="px-4 sm:px-8 py-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        Good morning, Dr. {user?.firstName} 👋
                    </h1>
                    <p className="text-slate-500 text-sm mt-0.5">Here's an overview of your account and schedule.</p>
                </div>
                <div className="hidden sm:flex items-center space-x-2 px-4 py-2 bg-white border border-blue-100 rounded-xl shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-medium text-slate-600">{user?.isApproved ? 'Profile Active' : 'Awaiting Approval'}</span>
                </div>
            </div>

            <div className="mb-5">
                <StatusBanner isApproved={user?.isApproved} />
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {[
                    { label: 'Experience', value: `${profile.yearsOfExperience}y`, icon: TrendingUp, color: 'blue' },
                    { label: 'Rating', value: profile.rating > 0 ? profile.rating.toFixed(1) : '—', icon: Star, color: 'amber' },
                    { label: 'Active Days', value: `${scheduledDays.length}/7`, icon: CalendarDays, color: 'indigo' },
                    { label: 'Total Slots', value: totalSlots, icon: Clock, color: 'emerald' },
                ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="bg-white rounded-xl border border-blue-100 shadow-sm px-4 py-3.5 flex items-center space-x-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            color === 'blue' ? 'bg-blue-50' :
                            color === 'amber' ? 'bg-amber-50' :
                            color === 'indigo' ? 'bg-indigo-50' : 'bg-emerald-50'
                        }`}>
                            <Icon className={`w-4 h-4 ${
                                color === 'blue' ? 'text-blue-600' :
                                color === 'amber' ? 'text-amber-500' :
                                color === 'indigo' ? 'text-indigo-600' : 'text-emerald-600'
                            }`} />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-slate-900 leading-tight">{value}</p>
                            <p className="text-[11px] text-slate-500">{label}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                {/* Profile summary */}
                <div className="lg:col-span-3 bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-center space-x-2">
                            <UserCircle className="w-4 h-4 text-blue-600" />
                            <h2 className="text-sm font-semibold text-slate-700">Profile Summary</h2>
                        </div>
                        <button
                            onClick={() => navigate('/doctor/profile')}
                            className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-all"
                        >
                            <span>Edit Profile</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div className="p-5">
                        <div className="flex items-start space-x-4 mb-5 pb-5 border-b border-slate-100">
                            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0" style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>
                                {profile.firstName?.[0]}{profile.lastName?.[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-base font-bold text-slate-900">
                                    {profile.title} {profile.firstName} {profile.lastName}
                                </h3>
                                <p className="text-sm text-blue-600 font-semibold">{profile.specialization}</p>
                                {profile.currentHospital && (
                                    <div className="flex items-center space-x-1 mt-1">
                                        <MapPin className="w-3 h-3 text-slate-400" />
                                        <p className="text-xs text-slate-500">{profile.currentHospital}</p>
                                    </div>
                                )}
                            </div>
                            {profile.consultationFee && (
                                <div className="text-right shrink-0">
                                    <p className="text-lg font-bold text-slate-900">${profile.consultationFee}</p>
                                    <p className="text-xs text-slate-400">per visit</p>
                                </div>
                            )}
                        </div>

                        <div className="mb-4">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2.5">Consultation Types</p>
                            <div className="flex flex-wrap gap-2">
                                {profile.consultationTypes?.videoCall && (
                                    <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg border border-blue-100">
                                        <Video className="w-3 h-3" /><span>Video Call</span>
                                    </span>
                                )}
                                {profile.consultationTypes?.audioCall && (
                                    <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-semibold rounded-lg border border-green-100">
                                        <Phone className="w-3 h-3" /><span>Audio Call</span>
                                    </span>
                                )}
                                {profile.consultationTypes?.chat && (
                                    <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-semibold rounded-lg border border-purple-100">
                                        <MessageSquare className="w-3 h-3" /><span>Chat</span>
                                    </span>
                                )}
                                {!profile.consultationTypes?.videoCall && !profile.consultationTypes?.audioCall && !profile.consultationTypes?.chat && (
                                    <span className="text-xs text-slate-400">None configured</span>
                                )}
                            </div>
                        </div>

                        {profile.areasOfExpertise?.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2.5">Areas of Expertise</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {profile.areasOfExpertise.slice(0, 6).map((area, i) => (
                                        <span key={i} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg border border-blue-100 font-medium">{area}</span>
                                    ))}
                                    {profile.areasOfExpertise.length > 6 && (
                                        <span className="px-2.5 py-1 bg-slate-100 text-slate-400 text-xs rounded-lg">+{profile.areasOfExpertise.length - 6} more</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Availability summary */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-center space-x-2">
                            <CalendarDays className="w-4 h-4 text-blue-600" />
                            <h2 className="text-sm font-semibold text-slate-700">Weekly Schedule</h2>
                        </div>
                        <button
                            onClick={() => navigate('/doctor/availability')}
                            className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-all"
                        >
                            <span>Edit</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div className="p-5">
                        <div className="grid grid-cols-7 gap-1 mb-5">
                            {ALL_DAYS.map(day => {
                                const active = scheduledDays.includes(day);
                                return (
                                    <div key={day} className="flex flex-col items-center space-y-1">
                                        <span className="text-[10px] text-slate-400 font-semibold">{DAY_SHORT[day].slice(0, 1)}</span>
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all ${active ? 'text-white shadow-sm' : 'bg-slate-100 text-slate-300'}`}
                                            style={active ? { background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' } : {}}>
                                            {active ? '✓' : '·'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-4">
                            <div className="flex flex-col items-center justify-center py-3 bg-blue-50 rounded-xl border border-blue-100">
                                <span className="text-xl font-bold text-blue-700">{scheduledDays.length}</span>
                                <span className="text-[11px] text-blue-500 font-medium">Active Days</span>
                            </div>
                            <div className="flex flex-col items-center justify-center py-3 bg-indigo-50 rounded-xl border border-indigo-100">
                                <span className="text-xl font-bold text-indigo-700">{totalSlots}</span>
                                <span className="text-[11px] text-indigo-500 font-medium">Total Slots</span>
                            </div>
                        </div>

                        {profile.availability?.length > 0 ? (
                            <div className="space-y-2">
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Daily Slots</p>
                                {profile.availability.map(({ day, slots }) => (
                                    <div key={day} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
                                        <span className="text-xs font-semibold text-slate-600 w-8">{DAY_SHORT[day]}</span>
                                        <div className="flex items-center space-x-1 flex-1 justify-end">
                                            {slots.slice(0, 3).map((s, i) => (
                                                <span key={i} className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-mono font-semibold">
                                                    {s.startTime}
                                                </span>
                                            ))}
                                            {slots.length > 3 && (
                                                <span className="text-[10px] text-slate-400 font-medium">+{slots.length - 3}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <CalendarDays className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                                <p className="text-xs text-slate-400 mb-2">No schedule configured yet</p>
                                <button onClick={() => navigate('/doctor/availability')} className="text-xs text-blue-600 hover:underline font-semibold">
                                    Set your availability →
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {error && (
                <div className="mt-4 flex items-center space-x-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
}