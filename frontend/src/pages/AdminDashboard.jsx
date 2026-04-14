import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import {
    Activity, LogOut, Users, Stethoscope, CreditCard,
    CheckCircle, XCircle, X, ShieldCheck, Crown, Plus,
    ChevronDown, Menu, X as CloseIcon, Clock
} from 'lucide-react';

import UserManagement from '../components/admin/UserManagement';
import DoctorManagement from '../components/admin/DoctorManagement';
import FinanceManagement from '../components/admin/FinanceManagement';
import Toast from '../components/common/Toast';

// Simplified Navigation Structure
const navItems = [
    {
        key: 'users',
        label: 'User Management',
        icon: Users
    },
    {
        key: 'doctors',
        label: 'Doctor Management',
        icon: Stethoscope,
        subItems: [
            { key: 'doctor-requests', label: 'Pending Requests', icon: Clock }
        ]
    },
    {
        key: 'payments',
        label: 'Finance Management',
        icon: CreditCard
    }
];

export default function AdminDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('users');
    const [toast, setToast] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    
    // Track expand states only for tabs that have subItems
    const [expandedTabs, setExpandedTabs] = useState({ doctors: false });

    const [showCreateAdmin, setShowCreateAdmin] = useState(false);
    const [createAdminForm, setCreateAdminForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
    const [createAdminError, setCreateAdminError] = useState('');
    const [createAdminLoading, setCreateAdminLoading] = useState(false);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const handleCreateAdmin = async (e) => {
        e.preventDefault();
        setCreateAdminError('');
        setCreateAdminLoading(true);
        try {
            await authService.createAdmin(createAdminForm);
            showToast('Admin account created successfully');
            setShowCreateAdmin(false);
            setCreateAdminForm({ firstName: '', lastName: '', email: '', password: '' });
        } catch (err) {
            setCreateAdminError(err.error || err.message || 'Failed to create admin');
        } finally {
            setCreateAdminLoading(false);
        }
    };

    const handleTabClick = (tab) => {
        setActiveTab(tab.key);
        // Auto-expand if clicking a main tab that has children
        if (tab.subItems) {
            setExpandedTabs(prev => ({ ...prev, [tab.key]: true }));
        }
    };

    const toggleExpand = (e, tabKey) => {
        e.stopPropagation(); // Prevent triggering the parent button's onClick
        setExpandedTabs(prev => ({ ...prev, [tabKey]: !prev[tabKey] }));
    };

    return (
        <div className="h-screen overflow-hidden bg-slate-50 font-sans flex">

            <Toast
                isOpen={!!toast}
                type={toast?.type}
                message={toast?.message}
                onClose={() => setToast(null)}
            />

            {/* Sidebar */}
            <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-slate-200 flex flex-col transition-all duration-300 fixed left-0 top-0 h-full z-30 lg:relative lg:z-0`}>
                
                {/* Sidebar Header */}
                <div className="px-4 py-6 flex items-center justify-between border-b border-slate-200">
                    {sidebarOpen && (
                        <div className="flex items-center space-x-2 text-blue-600 overflow-hidden">
                            <Activity className="w-6 h-6 shrink-0" />
                            <span className="text-lg font-bold text-slate-900 whitespace-nowrap">HealthConnect</span>
                        </div>
                    )}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 shrink-0"
                    >
                        {sidebarOpen ? <CloseIcon className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>

                {/* Navigation Menu */}
                <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-2.5">
                    {navItems.map(tab => {
                        const Icon = tab.icon;
                        const isMainActive = activeTab === tab.key;
                        const isChildActive = tab.subItems?.some(sub => sub.key === activeTab);
                        const isActive = isMainActive || isChildActive;
                        const isExpanded = expandedTabs[tab.key] || isChildActive;

                        return (
                            <div key={tab.key} className="space-y-1">
                                <button
                                    onClick={() => handleTabClick(tab)}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                        isMainActive
                                            ? 'bg-blue-50 text-blue-600'
                                            : 'text-slate-700 hover:bg-slate-100'
                                    }`}
                                >
                                    <div className="flex items-center space-x-3 flex-1 overflow-hidden">
                                        <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                                        {sidebarOpen && <span className="truncate">{tab.label}</span>}
                                    </div>
                                    {sidebarOpen && tab.subItems && (
                                        <div 
                                            onClick={(e) => toggleExpand(e, tab.key)}
                                            className="p-1 rounded hover:bg-slate-200/50 transition-colors"
                                        >
                                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                        </div>
                                    )}
                                </button>

                                {/* Nested Items Container */}
                                {sidebarOpen && tab.subItems && isExpanded && (
                                    <div className="ml-5 pl-4 mt-1 space-y-1 relative before:absolute before:left-0 before:top-1 before:bottom-1 before:w-px before:bg-slate-200">
                                        {tab.subItems.map(sub => (
                                            <button
                                                key={sub.key}
                                                onClick={() => setActiveTab(sub.key)}
                                                className={`w-full flex items-center space-x-2 text-left px-3 py-2 text-sm rounded-lg transition-all relative group ${
                                                    activeTab === sub.key
                                                        ? 'text-blue-600 font-medium bg-blue-50/50'
                                                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                                }`}
                                            >
                                                {/* Connector Line */}
                                                <div className={`absolute left-[-16px] top-1/2 -mt-px w-4 h-px ${activeTab === sub.key ? 'bg-blue-400' : 'bg-slate-200 group-hover:bg-slate-300'}`}></div>
                                                <span className="truncate">{sub.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>

                {/* User Info & Logout */}
                <div className="px-4 py-4 border-t border-slate-200 space-y-3">
                    {sidebarOpen && (
                        <div className="flex items-center space-x-3 py-2">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-semibold shrink-0">
                                {user?.firstName?.[0]}{user?.lastName?.[0]}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">{user?.firstName} {user?.lastName}</p>
                                <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center space-x-2 px-3 py-2.5 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                        <LogOut className="w-4 h-4 shrink-0" />
                        {sidebarOpen && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={`${sidebarOpen ? 'lg:flex-1' : ''} w-full lg:w-auto flex-1 overflow-y-auto relative`}>
                {/* Mobile Menu Toggle */}
                <div className="lg:hidden sticky top-0 bg-white border-b border-slate-200 px-4 py-3 z-20 flex items-center">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 hover:bg-slate-100 rounded-lg"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <span className="ml-3 font-semibold text-slate-800">HealthConnect Admin</span>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                    {/* Page Title */}
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
                        <p className="text-slate-500 text-sm mt-1">Manage users, doctors, and platform finances.</p>
                    </div>

                    {/* Superadmin Controls (Hidden if not superadmin) */}
                    {user?.role === 'superadmin' && (
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-base font-semibold text-slate-900 flex items-center space-x-2">
                                    <Crown className="w-5 h-5 text-amber-500" />
                                    <span>Super Admin Controls</span>
                                </h2>
                                <button
                                    onClick={() => { setShowCreateAdmin(v => !v); setCreateAdminError(''); }}
                                    className="flex items-center space-x-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-xl transition-all shadow-sm"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>{showCreateAdmin ? 'Cancel' : 'Create Admin'}</span>
                                </button>
                            </div>

                            {/* Create Admin Form rendering omitted for brevity, kept exactly the same */}
                            {showCreateAdmin && (
                                <div className="bg-white rounded-2xl border border-amber-200 p-6">
                                    <h3 className="text-sm font-semibold text-slate-700 mb-4">New Admin Account</h3>

                                    {createAdminError && (
                                        <div className="flex items-start space-x-3 bg-red-50 text-red-700 p-3 rounded-xl mb-4 border border-red-100">
                                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                            <p className="text-sm">{createAdminError}</p>
                                        </div>
                                    )}

                                    <form onSubmit={handleCreateAdmin} className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                                                    First Name
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="John"
                                                    value={createAdminForm.firstName}
                                                    onChange={e => setCreateAdminForm(f => ({ ...f, firstName: e.target.value }))}
                                                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                                                    Last Name
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="Doe"
                                                    value={createAdminForm.lastName}
                                                    onChange={e => setCreateAdminForm(f => ({ ...f, lastName: e.target.value }))}
                                                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1.5">
                                                Email Address
                                            </label>
                                            <input
                                                type="email"
                                                required
                                                placeholder="admin@healthconnect.com"
                                                value={createAdminForm.email}
                                                onChange={e => setCreateAdminForm(f => ({ ...f, email: e.target.value }))}
                                                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 transition-all"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1.5">
                                                Password
                                            </label>
                                            <input
                                                type="password"
                                                required
                                                placeholder="Min 8 characters"
                                                value={createAdminForm.password}
                                                onChange={e => setCreateAdminForm(f => ({ ...f, password: e.target.value }))}
                                                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 transition-all"
                                            />
                                        </div>

                                        <div className="flex justify-end pt-2">
                                            <button
                                                type="submit"
                                                disabled={createAdminLoading}
                                                className="flex items-center space-x-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all"
                                            >
                                                {createAdminLoading
                                                    ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>Creating...</span></>
                                                    : <><ShieldCheck className="w-4 h-4" /><span>Create Admin</span></>
                                                }
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab Content Rendering */}
                    <div className="transition-opacity duration-300">
                        {activeTab === 'users' && <UserManagement currentUser={user} showToast={showToast} />}
                        
                        {activeTab === 'doctors' && <DoctorManagement showToast={showToast} />}
                        
                        {/* Placeholder component for Requests to be built later */}
                        {activeTab === 'doctor-requests' && (
                            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center flex flex-col items-center">
                                <Clock className="w-12 h-12 text-slate-300 mb-4" />
                                <h3 className="text-lg font-semibold text-slate-800">Pending Doctor Requests</h3>
                                <p className="text-sm text-slate-500 mt-2 max-w-md">
                                    This dedicated component will handle all incoming requests and validation for new doctors joining the platform.
                                </p>
                            </div>
                        )}

                        {activeTab === 'payments' && <FinanceManagement showToast={showToast} />}
                    </div>
                </div>
            </main>

            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm lg:hidden z-20"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </div>
    );
}