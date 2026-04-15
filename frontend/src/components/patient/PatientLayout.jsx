import { useState, useEffect } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import patientService from '../../services/patientService';
import {
    Activity,
    LayoutDashboard,
    CalendarPlus,
    CalendarCheck,
    UserCircle,
    FileText,
    Video,
    LogOut,
    Menu,
    X,
    Settings,
    ChevronRight,
    Bot
} from 'lucide-react';

const navItems = [
    { to: '/patient/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/patient/book-appointment', label: 'Book Appointment', icon: CalendarPlus },
    { to: '/patient/my-appointments', label: 'My Appointments', icon: CalendarCheck },
    { to: '/patient/symptom-checker', label: 'AI Symptom Checker', icon: Bot },
    { to: '/patient/profile', label: 'My Profile', icon: UserCircle },
    { to: '/patient/medical-history', label: 'Medical History', icon: FileText },
    { to: '/patient/telemedicine', label: 'Telemedicine', icon: Video },
];

export default function PatientLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const data = await patientService.getMyProfile();
                const p = data.profile || data; // Handle potential nesting
                setProfile(p);
            } catch (err) {
                console.error('Failed to fetch profile in layout:', err);
            }
        };
        if (user) fetchProfile();
    }, [user]);

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const SidebarContent = () => (
        <div className="flex flex-col h-full">

            {/* Logo — desktop only, hidden on mobile (mobile has its own header row above) */}
            <div className="hidden lg:flex items-center space-x-2 px-6 py-5 border-b border-slate-100">
                <div className="bg-blue-600 p-1.5 rounded-lg">
                    <Activity className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-slate-900 tracking-tight">HealthConnect</span>
            </div>

            {/* User Info */}
            <div className="px-6 py-4 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                    {profile?.profileImageUrl ? (
                        <img
                            src={profile.profileImageUrl}
                            alt="Profile"
                            className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200"
                        />
                    ) : (
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm shrink-0">
                            {user?.firstName?.[0]}{user?.lastName?.[0]}
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                            {user?.firstName} {user?.lastName}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                    </div>
                </div>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 px-3 py-4 space-y-2.5 overflow-y-auto">
                {navItems.map(({ to, label, icon: Icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) =>
                            `flex items-center space-x-3 px-3 py-3 rounded-xl text-sm font-medium transition-all group
                            ${isActive
                                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
                                <span className="flex-1">{label}</span>
                                {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-200" />}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Bottom — Settings + Logout */}
            <div className="px-3 py-4 border-t border-slate-100 space-y-2.5">
                <NavLink
                    to="/patient/settings"
                    className={({ isActive }) =>
                        `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group
                        ${isActive
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`
                    }
                >
                    {({ isActive }) => (
                        <>
                            <Settings className={`w-4.5 h-4.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
                            <span>Settings</span>
                        </>
                    )}
                </NavLink>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all group"
                >
                    <LogOut className="w-4.5 h-4.5 shrink-0 text-slate-400 group-hover:text-red-500" />
                    <span>Logout</span>
                </button>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">

            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0">
                <SidebarContent />
            </aside>

            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-40 lg:hidden">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => setSidebarOpen(false)}
                    />
                    {/* Drawer - slide in from left */}
                    <aside className="absolute left-0 top-0 h-full w-72 bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-left duration-300">
                        {/* Mobile close button */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
                            <div className="flex items-center space-x-2">
                                <div className="bg-blue-600 p-1.5 rounded-lg">
                                    <Activity className="w-4 h-4 text-white" />
                                </div>
                                <span className="text-base font-bold text-slate-900 tracking-tight">HealthConnect</span>
                            </div>
                            <button
                                onClick={() => setSidebarOpen(false)}
                                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <SidebarContent />
                        </div>
                    </aside>
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

                {/* Mobile Top Bar */}
                <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shrink-0">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-all"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <div className="flex items-center space-x-2">
                        <div className="bg-blue-600 p-1 rounded-md">
                            <Activity className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-base font-bold text-slate-900 tracking-tight">HealthConnect</span>
                    </div>
                    {profile?.profileImageUrl ? (
                        <img
                            src={profile.profileImageUrl}
                            alt="Profile"
                            className="w-9 h-9 rounded-full object-cover border border-slate-200"
                        />
                    ) : (
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                            {user?.firstName?.[0]}{user?.lastName?.[0]}
                        </div>
                    )}
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}