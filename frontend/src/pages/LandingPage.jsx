import React from 'react';
import { 
  CalendarCheck, Video, Bot, CreditCard, 
  FileText, BellRing, Activity, ArrowRight, ShieldCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  const features = [
    {
      title: "Smart Scheduling",
      description: "Real-time calendar syncing for booking, modifying, or tracking appointments instantly.",
      icon: <CalendarCheck className="w-6 h-6 text-blue-600" />
    },
    {
      title: "Secure Telemedicine",
      description: "End-to-end encrypted video sessions integrated directly into your browser or mobile device.",
      icon: <Video className="w-6 h-6 text-blue-600" />
    },
    {
      title: "AI Symptom Analysis",
      description: "Advanced machine learning models provide preliminary insights and direct you to the right specialist.",
      icon: <Bot className="w-6 h-6 text-blue-600" />
    },
    {
      title: "Unified Health Records",
      description: "A centralized, secure vault for medical reports, lab results, and digital prescriptions.",
      icon: <FileText className="w-6 h-6 text-blue-600" />
    },
    {
      title: "Frictionless Payments",
      description: "Integrated local and international gateways for seamless consultation fee processing.",
      icon: <CreditCard className="w-6 h-6 text-blue-600" />
    },
    {
      title: "Automated Alerts",
      description: "Never miss a session with multi-channel SMS and email notifications.",
      icon: <BellRing className="w-6 h-6 text-blue-600" />
    }
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans text-slate-800 selection:bg-blue-100 selection:text-blue-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 lg:px-12 py-4 bg-white/80 backdrop-blur-md border-b border-slate-200/50">
        <div className="flex items-center space-x-2">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight">HealthConnect</span>
        </div>
        <div className="flex items-center space-x-6">
          <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">
            Sign in
          </Link>
          <Link to="/register" className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-full hover:bg-blue-700 shadow-sm shadow-blue-600/20 transition-all active:scale-95">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative overflow-hidden px-6 lg:px-12 py-24 lg:py-32">
        {/* Soft Background Accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl">
          <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-400/20 rounded-full blur-3xl opacity-50 mix-blend-multiply pointer-events-none"></div>
          <div className="absolute top-[20%] right-[-5%] w-[30rem] h-[30rem] bg-indigo-400/10 rounded-full blur-3xl opacity-50 mix-blend-multiply pointer-events-none"></div>
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 px-3 py-1 mb-8 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-sm font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>HIPAA Compliant Architecture</span>
          </div>
          <h1 className="text-5xl lg:text-7xl font-extrabold text-slate-900 tracking-tight mb-8 leading-[1.1]">
            Modern healthcare, <br className="hidden lg:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              simplified by AI.
            </span>
          </h1>
          <p className="text-lg lg:text-xl text-slate-600 mb-10 leading-relaxed max-w-2xl mx-auto">
            A comprehensive telemedicine platform designed for seamless booking, secure video consultations, and intelligent symptom analysis.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 text-white font-semibold rounded-full shadow-lg shadow-blue-600/30 hover:shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center group">
              Find a Specialist
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button className="w-full sm:w-auto px-8 py-3.5 bg-white text-slate-700 font-semibold rounded-full shadow-sm border border-slate-200 hover:bg-slate-50 transition-all">
              Explore Features
            </button>
          </div>
        </div>
      </header>

      {/* Features Grid */}
      <section className="py-24 px-6 lg:px-12 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4 tracking-tight">Everything you need to manage care</h2>
          <p className="text-slate-600 max-w-2xl mx-auto text-lg">Built on a scalable microservices architecture to ensure reliability and speed.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <div key={index} className="group p-8 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                {React.cloneElement(feature.icon, { className: "w-6 h-6 transition-colors group-hover:text-white text-blue-600" })}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3 tracking-tight">{feature.title}</h3>
              <p className="text-slate-600 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}