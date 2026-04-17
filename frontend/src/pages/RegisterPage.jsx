import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Activity, AlertCircle, Stethoscope, UserCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const { register, error: authError } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'patient',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [registeredData, setRegisteredData] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const setRole = (role) => {
    setFormData({ ...formData, role });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const data = await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      });

      if (formData.role === 'doctor') {
        setRegisteredData(data);
        setRegistered(true);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.error || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // Doctor pending approval screen
  if (registered && registeredData?.user?.role === 'doctor') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Stethoscope className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Application Submitted</h2>
          <p className="text-slate-500 mb-6 leading-relaxed">
            Thank you, <span className="font-semibold text-slate-700">Dr. {registeredData.user.lastName}</span>.
            Your doctor account has been created and is currently pending admin review.
          </p>
          <div className="flex items-center justify-center space-x-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-8">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
            <span className="text-sm font-medium text-amber-700">Pending Admin Approval</span>
          </div>
          <div className="text-left bg-slate-50 rounded-xl p-4 mb-8 space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">What happens next</p>
            {[
              'An admin will review your registration',
              'You will be notified once approved',
              'After approval you can log in and access the platform',
            ].map((step, i) => (
              <div key={i} className="flex items-start space-x-3">
                <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-slate-600">{i + 1}</span>
                </div>
                <p className="text-sm text-slate-600">{step}</p>
              </div>
            ))}
          </div>
          <Link
            to="/login"
            className="block w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all text-sm"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // Main register form
  return (
    <div className="min-h-screen flex bg-white font-sans text-slate-900">

      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-slate-50 border-r border-slate-200 p-12 flex-col relative overflow-hidden">
        {/* Top Logo */}
        <div className="relative z-10">
          <Link to="/" className="flex items-center space-x-2 text-blue-600">
            <Stethoscope className="w-8 h-8" />
            <span className="text-2xl font-bold text-slate-900 tracking-tight">MediCare</span>
          </Link>
        </div>

        {/* Center Content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-6 tracking-tight">
            Join the future of <br/>digital healthcare.
          </h1>
          <div className="space-y-6 mt-6">
            {[
              'Manage appointments and availability seamlessly.',
              'Conduct secure telemedicine consultations.',
              'Access centralized health records securely.',
            ].map((text, i) => (
              <div key={i} className="flex items-center space-x-3 text-slate-600">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                </div>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="relative z-10 text-slate-400 text-sm mt-auto">
          © 2026 MediCare AI Platform.
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-[55%] flex items-center justify-center p-8 sm:p-12 overflow-y-auto bg-white">
        <Link
          to="/"
          className="absolute top-8 right-8 flex items-center text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>
        <div className="w-full max-w-xl">
          <Link to="/" className="flex lg:hidden items-center space-x-2 text-blue-600 mb-8">
            <Stethoscope className="w-8 h-8" />
            <span className="text-2xl font-bold text-slate-900 tracking-tight">MediCare</span>
          </Link>

          <h2 className="text-3xl font-bold tracking-tight mb-2">Create an account</h2>
          <p className="text-slate-500 mb-8">Choose your role and enter your details to get started.</p>

          {(error || authError) && (
            <div className="flex items-start space-x-3 bg-red-50 text-red-700 p-4 rounded-xl mb-6 border border-red-100">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{error || authError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">I am signing up as a...</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRole('patient')}
                  className={`flex items-center p-4 border rounded-xl transition-all ${formData.role === 'patient'
                      ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                >
                  <UserCircle className={`w-6 h-6 mr-3 ${formData.role === 'patient' ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className="font-medium text-sm">Patient</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('doctor')}
                  className={`flex items-center p-4 border rounded-xl transition-all ${formData.role === 'doctor'
                      ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                >
                  <Stethoscope className={`w-6 h-6 mr-3 ${formData.role === 'doctor' ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className="font-medium text-sm">Doctor</span>
                </button>
              </div>

              {/* Doctor approval notice — shown when doctor role is selected */}
              {formData.role === 'doctor' && (
                <div className="mt-3 flex items-start space-x-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1.5"></div>
                  <p className="text-xs text-amber-700">
                    Doctor accounts require admin approval before you can log in.
                    You will be notified once your account is reviewed.
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">First Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text" name="firstName" value={formData.firstName}
                    onChange={handleChange} placeholder="John" required
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Last Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text" name="lastName" value={formData.lastName}
                    onChange={handleChange} placeholder="Doe" required
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email" name="email" value={formData.email}
                  onChange={handleChange} placeholder="name@example.com" required
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"} name="password" value={formData.password}
                    onChange={handleChange} placeholder="••••••••" required
                    className="w-full pl-10 pr-12 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"} name="confirmPassword" value={formData.confirmPassword}
                    onChange={handleChange} placeholder="••••••••" required
                    className="w-full pl-10 pr-12 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 transition-all shadow-sm shadow-blue-600/20 mt-6"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-8">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 font-semibold hover:text-blue-700 hover:underline">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}