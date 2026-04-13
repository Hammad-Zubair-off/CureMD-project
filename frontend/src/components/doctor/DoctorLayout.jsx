import { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    Activity, LogOut, LayoutDashboard, UserCircle,
    CalendarDays, Menu, X, ChevronRight,
} from 'lucide-react';

const NAV = [
    { to: '/doctor/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/doctor/profile', icon: UserCircle, label: 'My Profile' },
    { to: '/doctor/availability', icon: CalendarDays, label: 'Availability' },
];

export default function DoctorLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const SidebarContent = () => (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="px-5 py-4 border-b border-blue-800/40 flex items-center space-x-2.5">
                <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center shrink-0 backdrop-blur-sm">
                    <Activity className="w-4 h-4 text-white" />
                </div>
                <div>
                    <span className="text-sm font-bold text-white tracking-tight">HealthConnect</span>
                    <p className="text-[10px] text-blue-300 font-semibold uppercase tracking-widest">Doctor Portal</p>
                </div>
            </div>

            {/* Doctor info */}
            <div className="px-4 py-3 mx-3 mt-4 rounded-xl bg-white/10 border border-white/10 backdrop-blur-sm">
                <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                            Dr. {user?.firstName} {user?.lastName}
                        </p>
                        <p className="text-xs text-blue-300 truncate">{user?.email}</p>
                    </div>
                </div>
            </div>

            {/* Nav links */}
            <nav className="flex-1 px-3 py-4 space-y-1">
                <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-widest px-3 mb-3">Navigation</p>
                {NAV.map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) =>
                            `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${isActive
                                ? 'bg-white text-blue-700 shadow-lg shadow-black/20'
                                : 'text-blue-100 hover:bg-white/10 hover:text-white'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-blue-300 group-hover:text-white'}`} />
                                <span className="flex-1">{label}</span>
                                {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-400" />}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Logout */}
            <div className="px-3 pb-5">
                <div className="border-t border-white/10 pt-3">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium text-blue-200 hover:bg-red-500/20 hover:text-red-200 transition-all group"
                    >
                        <LogOut className="w-4 h-4 shrink-0 group-hover:text-red-300" />
                        <span>Logout</span>
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen overflow-hidden" style={{ background: '#f0f4ff' }}>
            {/* Desktop sidebar */}
            <aside className="hidden lg:flex flex-col w-60 shrink-0" style={{ background: 'linear-gradient(180deg, #1e3a8a 0%, #1d4ed8 60%, #2563eb 100%)' }}>
                <SidebarContent />
            </aside>

            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div className="lg:hidden fixed inset-0 z-50 flex">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setSidebarOpen(false)}
                    />
                    <aside className="relative w-64 h-full shadow-2xl flex flex-col" style={{ background: 'linear-gradient(180deg, #1e3a8a 0%, #1d4ed8 60%, #2563eb 100%)' }}>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/10 hover:bg-white/20"
                        >
                            <X className="w-4 h-4 text-white" />
                        </button>
                        <SidebarContent />
                    </aside>
                </div>
            )}

            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Mobile top bar */}
                <header className="lg:hidden bg-white border-b border-blue-100 px-4 py-3 flex items-center justify-between shrink-0 shadow-sm">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 rounded-lg hover:bg-blue-50"
                    >
                        <Menu className="w-5 h-5 text-blue-700" />
                    </button>
                    <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-blue-700 rounded flex items-center justify-center">
                            <Activity className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="font-bold text-blue-900 text-sm">HealthConnect</span>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-blue-700 flex items-center justify-center text-white font-bold text-xs">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}