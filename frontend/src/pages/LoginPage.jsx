import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Activity, AlertCircle, ArrowLeft, Stethoscope } from 'lucide-react';

export default function LoginPage() {
  const { login, error: authError } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setPendingApproval(false);
    setLoading(true);

    try {
      const data = await login(formData.email, formData.password);
      const role = data?.user?.role;

      // Redirect based on role
      if (role === 'admin' || role === 'superadmin') {
        navigate('/admin');
      } else {
        navigate('/patient/dashboard');
      }
    } catch (err) {
      const message = err.error || err.message || '';
      if (
        message === 'DOCTOR_PENDING' ||
        message === 'DOCTOR_PENDING_APPROVAL' ||
        message.toLowerCase().includes('pending') ||
        message.toLowerCase().includes('approval')
      ) {
        setPendingApproval(true);
      } else {
        setError(message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Doctor pending aprroval screen
  if (pendingApproval) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 max-w-md w-full text-center">

          {/* Icon */}
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Stethoscope className="w-8 h-8 text-amber-600" />
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Account Pending Approval
          </h2>
          <p className="text-slate-500 mb-6 leading-relaxed">
            Your doctor account has been created but is still awaiting admin
            review. You will be able to log in once your account is approved.
          </p>

          {/* Status badge */}
          <div className="flex items-center justify-center space-x-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-8">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
            <span className="text-sm font-medium text-amber-700">
              Pending Admin Approval
            </span>
          </div>

          {/* Info box */}
          <div className="text-left bg-slate-50 rounded-xl p-4 mb-8 space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              What to do
            </p>
            {[
              'Contact your platform administrator if this is taking too long.',
              'Check back later — approval is usually done within 24 hours.',
              'Make sure you registered with a valid professional email.',
            ].map((tip, i) => (
              <div key={i} className="flex items-start space-x-3">
                <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-slate-600">{i + 1}</span>
                </div>
                <p className="text-sm text-slate-600">{tip}</p>
              </div>
            ))}
          </div>

          {/* Try again button */}
          <button
            onClick={() => setPendingApproval(false)}
            className="block w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all text-sm mb-3"
          >
            Try Logging In Again
          </button>
          <Link
            to="/"
            className="block w-full text-center py-3 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-all"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-white font-sans text-slate-900">
      {/* Left Panel - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-blue-600 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-96 h-96 bg-blue-500 rounded-full blur-3xl opacity-50"></div>

        <div className="relative z-10">
          <Link to="/" className="flex items-center space-x-2 text-white mb-16">
            <Activity className="w-8 h-8" />
            <span className="text-2xl font-bold tracking-tight">HealthConnect</span>
          </Link>
          <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
            Welcome back to <br />smarter healthcare.
          </h1>
          <p className="text-blue-100 text-lg max-w-md">
            Sign in to access your upcoming appointments, medical records, and AI-driven health insights.
          </p>
        </div>

        <div className="relative z-10 text-blue-200 text-sm">
          © 2026 HealthConnect AI Platform.
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-[#FAFAFA] lg:bg-white">
        <Link
          to="/"
          className="absolute top-8 right-8 flex items-center text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>

        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center space-x-2 text-blue-600 mb-10">
            <Activity className="w-8 h-8" />
            <span className="text-2xl font-bold text-slate-900 tracking-tight">HealthConnect</span>
          </div>

          <h2 className="text-3xl font-bold tracking-tight mb-2">Sign in</h2>
          <p className="text-slate-500 mb-8">Enter your details to access your account.</p>

          {(error || authError) && (
            <div className="flex items-start space-x-3 bg-red-50 text-red-700 p-4 rounded-xl mb-6 border border-red-100">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{error || authError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 transition-all shadow-sm shadow-blue-600/20 mt-4"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-8">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-600 font-semibold hover:text-blue-700 hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}