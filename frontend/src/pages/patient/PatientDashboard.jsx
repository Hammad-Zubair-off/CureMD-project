import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import appointmentService from '../../services/appointmentService';
import patientService from '../../services/patientService';
import {
    Calendar,
    Clock,
    ChevronRight,
    Plus,
    FileText,
    User,
    MessageSquare,
    ShieldCheck,
    Lock,
    Activity,
    History,
    ClipboardList,
    Bell,
    Quote,
    Sparkles
} from 'lucide-react';

export default function PatientDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        upcoming: 0,
        past: 0,
        nextSession: '---'
    });
    const [upcomingAppointments, setUpcomingAppointments] = useState([]);
    const [dailyQuote, setDailyQuote] = useState({ text: "", author: "" });

    const fallbackQuotes = [
        { text: "Every step toward health is a victory. Keep going!", author: "Care Team" },
        { text: "Your wellness is a journey, and we're with you every mile.", author: "Care Team" },
        { text: "Strength lies in consistency. Your progress matters.", author: "Care Team" }
    ];

    const fetchQuote = async () => {
        const CACHE_KEY = 'wellness_quote';
        const CACHE_TIME_KEY = 'wellness_quote_time';
        const TWO_HOURS = 2 * 60 * 60 * 1000;

        try {
            const cachedQuote = localStorage.getItem(CACHE_KEY);
            const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
            const now = new Date().getTime();

            if (cachedQuote && cachedTime && (now - cachedTime < TWO_HOURS)) {
                setDailyQuote(JSON.parse(cachedQuote));
                return;
            }

            // Fetch new quote (using a stable public API fallback chain)
            try {
                const response = await fetch('https://api.quotable.io/random?tags=inspirational,success,wisdom');
                if (!response.ok) throw new Error('API down');
                const data = await response.json();
                const newQuote = { text: data.content, author: data.author };

                localStorage.setItem(CACHE_KEY, JSON.stringify(newQuote));
                localStorage.setItem(CACHE_TIME_KEY, now.toString());
                setDailyQuote(newQuote);
            } catch (err) {
                // Fallback to local high-quality list if API fails
                const randomFallback = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
                setDailyQuote(randomFallback);
            }
        } catch (err) {
            console.error('Quote fetch error:', err);
            setDailyQuote(fallbackQuotes[0]);
        }
    };

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const appointmentsData = await appointmentService.getMyAppointments(1, 10);
                const allAppointments = appointmentsData.appointments || [];

                const upcoming = allAppointments.filter(app =>
                    app.status === 'confirmed' || app.status === 'pending'
                );
                const past = allAppointments.filter(app => app.status === 'completed');

                setUpcomingAppointments(upcoming.slice(0, 2));

                let nextSessionStr = '---';
                if (upcoming.length > 0) {
                    const next = upcoming[0];
                    const date = new Date(next.appointmentDate);
                    const diffTime = Math.abs(date - new Date());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    nextSessionStr = diffDays === 0 ? 'Today' : `In ${diffDays} Day${diffDays > 1 ? 's' : ''}`;
                }

                setStats({
                    upcoming: upcoming.length,
                    past: past.length,
                    nextSession: nextSessionStr
                });

                await fetchQuote();

            } catch (err) {
                console.error('Failed to fetch dashboard data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[600px] text-slate-400">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
                    <Activity className="absolute inset-0 m-auto w-6 h-6 text-blue-600 animate-pulse" />
                </div>
                <p className="mt-6 font-bold text-slate-900 tracking-wide uppercase text-xs">Synchronizing Health Data...</p>
            </div>
        );
    }

    const todayStr = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
    });

    return (
        <div className="p-4 md:p-8 lg:p-12 max-w-[1400px] mx-auto space-y-8 md:space-y-10">
            {/* Header Banner */}
            <div className="bg-blue-600 rounded-2xl p-6 md:p-8 lg:p-10 relative overflow-hidden text-white flex flex-col md:flex-row md:items-center justify-between shadow-2xl shadow-blue-600/20">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 -mr-24 -mt-24 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-700/20 -ml-12 -mb-12 rounded-full blur-2xl"></div>

                <div className="relative z-10 space-y-1">
                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight">
                        Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user?.firstName || user?.fullName?.split(' ')[0] || 'Patient'}
                    </h1>
                    <p className="text-blue-100 font-medium text-sm md:text-base opacity-90">Your health is our priority. Here's what's happening today.</p>
                </div>

                <div className="mt-4 md:mt-0 relative z-10">
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3 px-4 rounded-xl flex items-center space-x-3">
                        <div className="p-1.5 bg-white/20 rounded-xl">
                            <Calendar className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-blue-100">Today's Date</p>
                            <p className="font-bold text-xs tracking-tight">{todayStr}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                    { label: 'Upcoming Appointments', count: stats.upcoming.toString().padStart(2, '0'), icon: Calendar, color: 'blue' },
                    { label: 'Past Appointments', count: stats.past.toString(), icon: History, color: 'blue' },
                    { label: 'Next Session', count: stats.nextSession, icon: Bell, color: 'rose' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                        <div className={`w-12 h-12 rounded-xl bg-${stat.color}-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                            <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
                        <p className="text-3xl font-black text-slate-800 tracking-tight">{stat.count}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Upcoming Appointments Column */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Upcoming Appointments</h2>
                        <button
                            onClick={() => navigate('/patient/my-appointments')}
                            className="text-xs font-black text-blue-600 uppercase tracking-widest hover:translate-x-1 transition-transform"
                        >
                            View All Schedule
                        </button>
                    </div>

                    <div className="space-y-4">
                        {upcomingAppointments.length > 0 ? upcomingAppointments.map((app, i) => (
                            <div key={i} className="bg-white p-5 md:p-6 lg:p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 group">
                                <div className="flex items-center space-x-4 md:space-x-6">
                                    <div className="relative">
                                        <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl overflow-hidden bg-slate-100 flex items-center justify-center shrink-0">
                                            {app.doctorImage ? (
                                                <img
                                                    src={app.doctorImage}
                                                    alt="Doctor"
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-blue-50 flex items-center justify-center text-blue-600 font-black text-lg md:text-xl">
                                                    {app.doctorFullName?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                </div>
                                            )}
                                        </div>
                                        <div className={`absolute -bottom-1 -right-1 p-1.5 rounded-xl border-2 border-white ${app.status === 'confirmed' ? 'bg-green-500' : 'bg-amber-500'}`}>
                                            <ShieldCheck className="w-3 h-3 text-white" />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex items-center space-x-3">
                                            <h3 className="font-black text-slate-900 truncate">{app.doctorFullName}</h3>
                                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${app.status === 'confirmed' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
                                                }`}>
                                                {app.status}
                                            </span>
                                        </div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                            {app.specialty} • {app.clinicName || 'Clinical Sanctuary'}
                                        </p>
                                        <div className="flex items-center space-x-4 mt-2">
                                            <div className="flex items-center space-x-1.5 text-slate-500">
                                                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                                                <span className="text-xs font-bold">{new Date(app.appointmentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                            </div>
                                            <div className="flex items-center space-x-1.5 text-slate-500">
                                                <Clock className="w-3.5 h-3.5 text-blue-500" />
                                                <span className="text-xs font-bold">{app.timeSlot}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => app.status === 'confirmed' ? navigate('/patient/telemedicine') : navigate('/patient/my-appointments')}
                                    className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 ${app.status === 'confirmed'
                                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/20'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 shadow-slate-200'
                                        }`}
                                >
                                    {app.status === 'confirmed' ? 'Join Session' : 'View Details'}
                                </button>
                            </div>
                        )) : (
                            <div className="bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-16 flex flex-col items-center text-center">
                                <div className="bg-white p-5 rounded-2xl shadow-sm mb-6">
                                    <Calendar className="w-10 h-10 text-slate-200" />
                                </div>
                                <h3 className="text-lg font-black text-slate-900 tracking-tight">No Upcoming Sessions</h3>
                                <p className="text-slate-400 font-medium mt-2 max-w-xs">You don't have any appointments scheduled for the professional therapy yet.</p>
                                <button
                                    onClick={() => navigate('/patient/book-appointment')}
                                    className="mt-8 px-8 py-3.5 bg-white border border-slate-200 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm"
                                >
                                    Book Your First Appointment
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Column */}
                <div className="space-y-10">
                    {/* Quick Actions */}
                    <div className="space-y-6">
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight px-1">Quick Actions</h2>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { label: 'Book Appt.', icon: Plus, path: '/patient/book-appointment', color: 'blue' },
                                { label: 'View Reports', icon: FileText, path: '/patient/medical-history', color: 'slate' },
                                { label: 'Update Profile', icon: User, path: '/patient/profile', color: 'orange' },
                                { label: 'Consult AI', icon: Activity, path: '/patient/telemedicine', color: 'rose' }
                            ].map((action, i) => (
                                <button
                                    key={i}
                                    onClick={() => navigate(action.path)}
                                    className="aspect-square bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 p-4 md:p-6 flex flex-col items-center justify-center text-center space-y-3 md:space-y-4 group"
                                >
                                    <div className={`p-4 rounded-xl bg-${action.color}-50 group-hover:scale-110 transition-transform`}>
                                        <action.icon className={`w-6 h-6 text-${action.color}-600`} />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 leading-tight">{action.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Today's Quote Section */}
                    <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm shadow-slate-200/50 group hover:shadow-xl transition-all duration-500 overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 -mr-16 -mt-16 rounded-full group-hover:scale-150 transition-transform duration-700"></div>

                        <div className="relative z-10 flex items-center space-x-3 mb-6">
                            <Sparkles className="w-5 h-5 text-blue-600" />
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Today's Quote</h3>
                        </div>

                        <div className="relative z-10 space-y-6">
                            <div className="relative">
                                <Quote className="absolute -top-4 -left-2 w-8 h-8 text-blue-50/50 z-0" />
                                <blockquote className="relative z-10">
                                    <p className="text-sm font-bold text-slate-800 leading-relaxed italic">
                                        "{dailyQuote.text}"
                                    </p>
                                    <cite className="block mt-4 text-[10px] font-black uppercase tracking-widest text-blue-600 not-italic">
                                        — {dailyQuote.author}
                                    </cite>
                                </blockquote>
                            </div>

                            <div className="pt-6 border-t border-slate-50">
                                <div className="flex items-center space-x-2 opacity-40">
                                    <Clock className="w-3 h-3" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Next update in 2 hours</span>
                                </div>
                            </div>
                        </div>

                        <Lock className="absolute bottom-4 right-4 w-12 h-12 text-slate-50 opacity-10" />
                    </div>
                </div>
            </div>
        </div>
    );
}