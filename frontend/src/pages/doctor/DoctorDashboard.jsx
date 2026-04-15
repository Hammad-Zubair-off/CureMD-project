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
        <div className="flex items-center space-x-3 px-5 py-4 bg-emerald-50 border border-emerald-200 rounded-xl shadow-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
                <p className="text-sm font-bold text-emerald-900">Account Approved & Active</p>
                <p className="text-xs text-emerald-700 mt-0.5">Your profile is live and visible to patients across HealthConnect.</p>
            </div>
            <span className="ml-auto px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full border border-emerald-200">LIVE</span>
        </div>
    );
    return (
        <div className="flex items-center space-x-3 px-5 py-4 bg-amber-50 border border-amber-200 rounded-xl shadow-xs">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
                <p className="text-sm font-bold text-amber-900">Pending Admin Approval</p>
                <p className="text-xs text-amber-700 mt-0.5">Your profile is under review. You'll be notified once approved.</p>
            </div>
            <span className="ml-auto px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full border border-amber-200">PENDING</span>
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
            <div className="flex flex-col items-center space-y-4">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
                </div>
                <p className="text-sm font-medium text-slate-500">Loading dashboard...</p>
            </div>
        </div>
    );

    if (!profile) return (
        <div className="px-6 py-10 max-w-2xl mx-auto">
            <div className="text-center py-16 bg-white rounded-2xl border border-blue-100 shadow-xs">
                <div className="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-5">
                    <Stethoscope className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Complete Your Doctor Profile</h2>
                <p className="text-slate-500 text-sm mb-8 max-w-xs mx-auto">
                    Set up your profile so patients can find and book consultations with you.
                </p>
                <button
                    onClick={() => navigate('/doctor/profile')}
                    className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all shadow-xs"
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
        <div className="px-4 sm:px-8 py-8 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        Good morning, Dr. {user?.firstName} 👋
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Here's an overview of your account and schedule.</p>
                </div>
                <div className="hidden sm:flex items-center space-x-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-xs">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-semibold text-slate-700">{user?.isApproved ? 'Profile Active' : 'Awaiting Approval'}</span>
                </div>
            </div>

            <div>
                <StatusBanner isApproved={user?.isApproved} />
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Experience', value: `${profile.yearsOfExperience}y`, icon: TrendingUp, color: 'blue' },
                    { label: 'Rating', value: profile.rating > 0 ? profile.rating.toFixed(1) : '—', icon: Star, color: 'amber' },
                    { label: 'Active Days', value: `${scheduledDays.length}/7`, icon: CalendarDays, color: 'indigo' },
                    { label: 'Total Slots', value: totalSlots, icon: Clock, color: 'emerald' },
                ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="bg-white rounded-xl border border-blue-100 shadow-sm px-4 py-3.5 flex items-center space-x-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color === 'blue' ? 'bg-blue-50' :
                                color === 'amber' ? 'bg-amber-50' :
                                    color === 'indigo' ? 'bg-indigo-50' : 'bg-emerald-50'
                            }`}>
                            <Icon className={`w-4 h-4 ${color === 'blue' ? 'text-blue-600' :
                                    color === 'amber' ? 'text-amber-500' :
                                        color === 'indigo' ? 'text-indigo-600' : 'text-emerald-600'
                                }`} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 leading-tight">{value}</p>
                            <p className="text-xs font-medium text-slate-500 mt-0.5">{label}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Profile summary */}
                <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-center space-x-2.5">
                            <UserCircle className="w-5 h-5 text-blue-600" />
                            <h2 className="text-sm font-bold text-slate-800">Profile Summary</h2>
                        </div>
                        <button
                            onClick={() => navigate('/doctor/profile')}
                            className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 font-bold px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                            <span>Edit Profile</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div className="p-6 flex-1">
                        <div className="flex items-start space-x-5 mb-6 pb-6 border-b border-slate-100">
                            {/* Updated Avatar: Plain Blue instead of Gradient */}
                            <div className="w-16 h-16 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-xs">
                                {profile.firstName?.[0]}{profile.lastName?.[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-bold text-slate-900">
                                    {profile.title} {profile.firstName} {profile.lastName}
                                </h3>
                                <p className="text-sm text-blue-600 font-semibold mt-0.5">{profile.specialization}</p>
                                {profile.currentHospital && (
                                    <div className="flex items-center space-x-1.5 mt-2">
                                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                        <p className="text-sm text-slate-600">{profile.currentHospital}</p>
                                    </div>
                                )}
                                {/* inside the profile summary card, after the currentHospital line */}
                                {profile.phoneNumbers?.length > 0 && (
                                    <div className="flex items-center space-x-1 mt-1 flex-wrap gap-y-0.5">
                                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                        <p className="text-xs text-slate-500 font-mono">
                                            {profile.phoneNumbers.join('  ·  ')}
                                        </p>
                                    </div>
                                )}
                            </div>
                            {profile.consultationFee && (
                                <div className="text-right shrink-0 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                                    <p className="text-lg font-black text-slate-900">Rs.{profile.consultationFee}</p>
                                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">per visit</p>
                                </div>
                            )}
                        </div>

                        <div className="mb-6">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Consultation Types</p>
                            <div className="flex flex-wrap gap-2.5">
                                {profile.consultationTypes?.videoCall && (
                                    <span className="inline-flex items-center space-x-1.5 px-3 py-2 bg-blue-50 text-blue-700 text-xs font-bold rounded-xl border border-blue-100">
                                        <Video className="w-3.5 h-3.5" /><span>Video Call</span>
                                    </span>
                                )}
                                {profile.consultationTypes?.audioCall && (
                                    <span className="inline-flex items-center space-x-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-100">
                                        <Phone className="w-3.5 h-3.5" /><span>Audio Call</span>
                                    </span>
                                )}
                                {profile.consultationTypes?.chat && (
                                    <span className="inline-flex items-center space-x-1.5 px-3 py-2 bg-purple-50 text-purple-700 text-xs font-bold rounded-xl border border-purple-100">
                                        <MessageSquare className="w-3.5 h-3.5" /><span>Chat</span>
                                    </span>
                                )}
                                {!profile.consultationTypes?.videoCall && !profile.consultationTypes?.audioCall && !profile.consultationTypes?.chat && (
                                    <span className="text-sm text-slate-500 italic">None configured</span>
                                )}
                            </div>
                        </div>

                        {profile.areasOfExpertise?.length > 0 && (
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Areas of Expertise</p>
                                <div className="flex flex-wrap gap-2">
                                    {profile.areasOfExpertise.slice(0, 6).map((area, i) => (
                                        <span key={i} className="px-3 py-1.5 bg-slate-50 text-slate-700 text-xs rounded-xl border border-slate-200 font-semibold">{area}</span>
                                    ))}
                                    {profile.areasOfExpertise.length > 6 && (
                                        <span className="px-3 py-1.5 bg-slate-100 text-slate-500 text-xs rounded-xl font-bold">+{profile.areasOfExpertise.length - 6} more</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Availability summary */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-center space-x-2.5">
                            <CalendarDays className="w-5 h-5 text-blue-600" />
                            <h2 className="text-sm font-bold text-slate-800">Weekly Schedule</h2>
                        </div>
                        <button
                            onClick={() => navigate('/doctor/availability')}
                            className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 font-bold px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                            <span>Manage</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div className="p-6 flex-1 bg-slate-50/30">
                        {/* Days Pill Row */}
                        <div className="flex justify-between items-center gap-1 mb-6 bg-white p-2 rounded-xl border border-slate-100 shadow-xs">
                            {ALL_DAYS.map(day => {
                                const active = scheduledDays.includes(day);
                                return (
                                    <div key={day} className="flex flex-col items-center">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                                            active 
                                            ? 'bg-blue-600 text-white shadow-xs shadow-blue-200' 
                                            : 'bg-transparent text-slate-400'
                                        }`}>
                                            {DAY_SHORT[day].slice(0, 1)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {profile.availability?.length > 0 ? (
                            <div className="space-y-3">
                                {profile.availability.map(({ day, slots }) => (
                                    <div key={day} className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs transition-all hover:border-blue-100 hover:shadow-sm">
                                        <div className="flex justify-between items-center mb-2.5">
                                            <span className="text-sm font-bold text-slate-800">{day}</span>
                                            <span className="text-[10px] font-bold px-2 py-1 bg-blue-50 text-blue-600 rounded-md">
                                                {slots.length} {slots.length === 1 ? 'Slot' : 'Slots'}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {slots.slice(0, 4).map((s, i) => (
                                                <span key={i} className="text-xs px-2 py-1 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg font-medium">
                                                    {s.startTime}
                                                </span>
                                            ))}
                                            {slots.length > 4 && (
                                                <span className="text-xs px-2 py-1 bg-slate-100 text-slate-500 rounded-lg font-bold">
                                                    +{slots.length - 4}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-300">
                                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                                    <CalendarDays className="w-6 h-6 text-slate-400" />
                                </div>
                                <p className="text-sm font-semibold text-slate-600 mb-1">No schedule yet</p>
                                <p className="text-xs text-slate-400 mb-4 px-6">Configure your availability to start accepting appointments.</p>
                                <button onClick={() => navigate('/doctor/availability')} className="text-sm text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold transition-colors">
                                    Set Availability
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {error && (
                <div className="mt-6 flex items-center space-x-3 px-5 py-4 bg-red-50 border border-red-200 rounded-xl shadow-xs">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                    <span className="text-sm font-semibold text-red-800">{error}</span>
                </div>
            )}
        </div>
    );
}