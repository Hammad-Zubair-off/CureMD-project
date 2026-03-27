import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, Activity } from 'lucide-react';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-blue-600">
          <Activity className="w-6 h-6" />
          <span className="text-lg font-bold text-slate-900 tracking-tight">HealthConnect</span>
        </div>

        <div className="flex items-center space-x-4">
          <span className="text-sm text-slate-600">
            Welcome, <span className="font-semibold text-slate-900">{user?.firstName}</span>
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </nav>

      {/* Page content */}
      <main className="flex items-center justify-center h-[calc(100vh-65px)]">
        <p className="text-2xl text-slate-400">Dashboard coming soon</p>
      </main>
    </div>
  );
};

export default Dashboard;