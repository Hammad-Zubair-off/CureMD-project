import React from 'react';
import { Scale, FileText, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-bold uppercase tracking-widest">Back to Home</span>
          </Link>
          <div className="text-xl font-black text-slate-900 tracking-tighter">MediCare</div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-xs font-black uppercase tracking-widest mb-6">
            <Scale className="w-4 h-4" />
            Terms of Use
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">Terms & Conditions</h1>
          <p className="text-slate-500 font-medium">Last updated: April 17, 2026</p>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 md:p-12 shadow-sm space-y-12">
          <section>
            <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-indigo-600" />
              1. Acceptance of Terms
            </h2>
            <div className="space-y-4 text-slate-600 leading-relaxed font-medium">
              <p>
                By accessing or using the MediCare platform, you agree to be bound by these Terms and Conditions. If you disagree with any part of these terms, you may not access the service. These terms apply to all visitors, users, and others who access or use the service.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-indigo-600" />
              2. Medical Disclaimer
            </h2>
            <div className="space-y-4 text-slate-600 leading-relaxed font-medium">
              <p className="bg-amber-50 border border-amber-100 p-4 rounded-2xl text-amber-900">
                <strong>IMPORTANT:</strong> MediCare is a telemedicine platform. In case of a life-threatening emergency, please call your local emergency services (e.g., 911) immediately. Do not rely on MediCare for urgent emergency medical care.
              </p>
              <p>
                The information provided through the platform is for informational purposes and to facilitate professional healthcare consultations. Consultations are between the patient and the provider; MediCare provides the clinical gateway.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
              <FileText className="w-6 h-6 text-indigo-600" />
              3. User Obligations
            </h2>
            <div className="space-y-4 text-slate-600 leading-relaxed font-medium">
              <p>
                Users are responsible for providing accurate and complete health information for safe clinical outcomes. You must maintain the confidentiality of your account credentials and are responsible for all activities that occur under your account.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
              <Scale className="w-6 h-6 text-indigo-600" />
              4. Termination
            </h2>
            <div className="space-y-4 text-slate-600 leading-relaxed font-medium">
              <p>
                We reserve the right to terminate or suspend access to our service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
              </p>
            </div>
          </section>
        </div>

        <div className="mt-12 text-center text-slate-400 text-sm font-medium">
          Legal inquiries can be directed to <span className="text-indigo-600">legal@medicare.ai</span>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12 px-6">
        <div className="max-w-4xl mx-auto flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-widest">
          <div>© 2026 MediCare, Inc.</div>
          <div className="flex gap-6">
            <Link to="/privacy-policy" className="hover:text-slate-900 transition-colors">Privacy</Link>
            <Link to="/" className="hover:text-slate-900 transition-colors">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
