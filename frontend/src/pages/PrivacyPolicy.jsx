import React from 'react';
import { Shield, Lock, Eye, FileText, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-bold uppercase tracking-widest">Back to Home</span>
          </Link>
          <div className="text-xl font-black text-slate-900 tracking-tighter">MediCare</div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-xs font-black uppercase tracking-widest mb-6">
            <Shield className="w-4 h-4" />
            Privacy & Trust
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">Privacy Policy</h1>
          <p className="text-slate-500 font-medium">Last updated: April 17, 2026</p>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 md:p-12 shadow-sm space-y-12">
          <section>
            <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
              <Eye className="w-6 h-6 text-blue-600" />
              1. Information Collection
            </h2>
            <div className="space-y-4 text-slate-600 leading-relaxed font-medium">
              <p>
                At MediCare, we collect information that you provide directly to us when you create an account, schedule an appointment, or contact support. This includes:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Personal identifiers (name, email, phone number)</li>
                <li>Health-related information share during consultations</li>
                <li>Insurance details and billing information</li>
                <li>Professional credentials for healthcare providers</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
              <Lock className="w-6 h-6 text-blue-600" />
              2. Data Security
            </h2>
            <div className="space-y-4 text-slate-600 leading-relaxed font-medium">
              <p>
                We implement industry-standard security measures to protect your sensitive health data. All communications are encrypted using TLS 1.3, and medical records are stored in an encrypted vault using AES-256 standards.
              </p>
              <p>
                Access to medical data is strictly controlled through multi-factor authentication and role-based access controls for healthcare professionals.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
              <FileText className="w-6 h-6 text-blue-600" />
              3. HIPAA Compliance
            </h2>
            <div className="space-y-4 text-slate-600 leading-relaxed font-medium">
              <p>
                For our users in applicable jurisdictions, MediCare adheres to the Health Insurance Portability and Accountability Act (HIPAA) standards for the handling of Protected Health Information (PHI). We ensure that your digital clinical records remain private and accessible only to authorized individuals.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
              <Shield className="w-6 h-6 text-blue-600" />
              4. Your Rights
            </h2>
            <div className="space-y-4 text-slate-600 leading-relaxed font-medium">
              <p>
                You have the right to access, correct, or delete your personal and medical information at any time. You can manage these settings through your account dashboard or by contacting our data protection officer.
              </p>
            </div>
          </section>
        </div>

        <div className="mt-12 text-center text-slate-400 text-sm font-medium">
          If you have questions about this policy, please reach out to <span className="text-blue-600">privacy@medicare.ai</span>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12 px-6">
        <div className="max-w-4xl mx-auto flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-widest">
          <div>© 2026 MediCare, Inc.</div>
          <div className="flex gap-6">
            <Link to="/terms-conditions" className="hover:text-slate-900 transition-colors">Terms</Link>
            <Link to="/" className="hover:text-slate-900 transition-colors">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
