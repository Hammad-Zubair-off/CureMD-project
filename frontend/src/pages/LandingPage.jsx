import React, { useRef, useState, useEffect } from 'react';
import {
  CalendarCheck, Video, Bot, CreditCard,
  FileText, BellRing, Activity, Stethoscope, ArrowRight,
  MonitorPlay, Clock, ShieldCheck, Fingerprint, Building, CalendarHeart
} from 'lucide-react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

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

export default function LandingPage() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const clipWrapperRef = useRef(null);
  const [isScrolled, setIsScrolled] = useState(false);

  const imagesRef = useRef([]);
  const playhead = useRef({ frame: 0 });

  useGSAP(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const frameCount = 240;

    const currentFrame = (index) => (
      `/hero/ezgif-frame-${(index + 1).toString().padStart(3, '0')}.jpg`
    );

    // 1. Preload Images
    for (let i = 0; i < frameCount; i++) {
      const img = new Image();
      img.src = currentFrame(i);
      imagesRef.current.push(img);
    }

    // 2. Canvas Render Logic
    const render = () => {
      if (!imagesRef.current[playhead.current.frame]) return;
      const img = imagesRef.current[playhead.current.frame];

      if (img.complete) {
        const hRatio = canvas.width / img.width;
        const vRatio = canvas.height / img.height;
        const ratio = Math.max(hRatio, vRatio);
        const centerShift_x = (canvas.width - img.width * ratio) / 2;
        const centerShift_y = (canvas.height - img.height * ratio) / 2;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(
          img, 0, 0, img.width, img.height,
          centerShift_x, centerShift_y, img.width * ratio, img.height * ratio
        );
      }
    };

    // 3. Set Canvas Resolution and Initial Render
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      render();
    };

    imagesRef.current[0].onload = resizeCanvas;
    window.addEventListener('resize', resizeCanvas);

    // 4. Timeline for Frames + Clip Path Expand
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: ".pin-wrapper",
        start: "top top",
        end: "+=200%",
        scrub: 0.5,
        pin: true,
        invalidateOnRefresh: true, // Crucial: recalculates the 16:9 math if user resizes window
        onLeave: () => setIsScrolled(true),
        onEnterBack: () => setIsScrolled(false),
      }
    });

    // Scrub through the image sequence
    tl.to(playhead.current, {
      frame: frameCount - 1,
      snap: "frame",
      ease: "none",
      onUpdate: render
    }, 0);

    // Calculate a perfect 16:9 rectangle in the center, morphing to full screen
    tl.fromTo(clipWrapperRef.current, {
      clipPath: () => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // Let's make the initial rectangle 80% of the screen width
        const rectWidth = vw * 0.7;
        const rectHeight = rectWidth * (9 / 16); // Force perfect 16:9 ratio

        const insetX = (vw - rectWidth) / 2;
        const insetY = Math.max(0, (vh - rectHeight) / 2); // Math.max prevents breaking on ultrawide monitors

        // inset(top right bottom left round border-radius)
        return `inset(${insetY}px ${insetX}px ${insetY}px ${insetX}px round 32px)`;
      }
    }, {
      // Animate out to zero inset (full screen) with 0px border radius
      clipPath: "inset(0px 0px 0px 0px round 0px)",
      ease: "power1.inOut"
    }, 0);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="min-h-screen bg-[#FAFAFA] font-sans text-slate-800 selection:bg-blue-100 selection:text-blue-900">

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 lg:px-12 py-4 transition-all duration-500 ${isScrolled ? 'bg-white/80 backdrop-blur-md border-b border-slate-200/50 shadow-sm' : 'bg-transparent border-transparent'}`}>
        <div className="flex items-center space-x-2">
          <div className={`p-1.5 rounded-lg transition-colors ${isScrolled ? 'bg-blue-600' : 'bg-white/20 backdrop-blur-md'}`}>
            <Stethoscope className="w-6 h-6 text-white" />
          </div>
          <span className={`text-xl font-bold tracking-tight transition-colors ${isScrolled ? 'text-slate-900' : 'text-white drop-shadow-md'}`}>MediCare</span>
        </div>
        <div className="flex items-center space-x-6">
          <Link to="/login" className={`text-sm font-medium transition-colors ${isScrolled ? 'text-slate-600 hover:text-blue-600' : 'text-slate-200 hover:text-white drop-shadow-sm'}`}>
            Sign in
          </Link>
          <Link to="/register" className={`px-5 py-2.5 text-sm font-medium text-white rounded-full shadow-sm transition-all active:scale-95 ${isScrolled ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20' : 'bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30'}`}>
            Get Started
          </Link>
        </div>
      </nav>

      {/* Pinned Hero & Canvas Section */}
      <div className="pin-wrapper relative w-full h-screen bg-gray-900">

        {/* Background Image Sequence Canvas with Clip Path Wrapper */}
        <div
          ref={clipWrapperRef}
          className="absolute inset-0 w-full h-full opacity-80 pointer-events-none overflow-hidden"
        >
          <canvas
            ref={canvasRef}
            className="block w-full h-full object-cover"
          ></canvas>
        </div>

        {/* Text Overlay */}
        <section id="hero" className="relative z-10 w-full h-full flex flex-col items-center justify-center text-white pt-10 pointer-events-none bg-gradient-to-b from-slate-900/70 via-slate-900/20 to-slate-900/70">
          <div className="text-center px-4">
            <h1 className="text-4xl md:text-[4rem] lg:text-[6rem] font-bold drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] text-white">
              MediCare
            </h1>
          </div>

          <div className="mt-6 lg:mt-10 text-center w-full relative z-20 px-6">
            <div className="max-w-4xl mx-auto">
              <div className="space-y-6 lg:space-y-8 hidden md:block">
                <div className="inline-block px-6 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-xl">
                  <p className="tracking-[0.2em] text-sm md:text-base uppercase font-bold text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">
                    Smart. Secure. Seamless.
                  </p>
                </div>
              </div>

              <div className="mt-8 lg:mt-12">
                <p className="text-lg md:text-2xl font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] text-slate-100 max-w-3xl mx-auto">
                  A comprehensive telemedicine platform designed for seamless booking, secure video consultations, and intelligent symptom analysis.
                </p>
              </div>

              <div className="mt-12 flex flex-col sm:flex-row justify-center gap-4 pointer-events-auto relative z-50">
                <Link to="/register" className="px-8 py-4 bg-white/80 text-blue-600 font-bold rounded-full shadow-2xl flex items-center justify-center">
                  Register Now <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
                <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold rounded-full shadow-xl hover:bg-white/20 transition-all flex items-center justify-center focus:outline-none">
                  View Features
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6 lg:px-12 max-w-7xl mx-auto">
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

      {/* Stats Section */}
      <section className="py-16 bg-blue-50/50 border-y border-blue-100/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 text-center grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="text-4xl lg:text-5xl font-extrabold text-[#0D3B8E] mb-2">10k+</div>
            <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Active Users</div>
          </div>
          <div>
            <div className="text-4xl lg:text-5xl font-extrabold text-[#0D3B8E] mb-2">500+</div>
            <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Clinical Professionals</div>
          </div>
          <div>
            <div className="text-4xl lg:text-5xl font-extrabold text-[#0D3B8E] mb-2">99.9%</div>
            <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider">User Satisfaction</div>
          </div>
        </div>
      </section>

      {/* Precision-Engineered Care */}
      <section className="py-32 px-6 lg:px-12 max-w-[85rem] mx-auto">
        <div className="mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6 tracking-tight">Precision-Engineered Care</h2>
          <p className="text-slate-600 max-w-2xl text-xl">Our suite of tools integrates seamlessly into your clinical workflow, prioritizing user experience above all.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10 auto-rows-fr lg:min-h-[600px]">
          {/* Left Column */}
          <div className="flex flex-col gap-6 h-full">
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex-1 flex flex-col hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-6">
                <MonitorPlay className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl lg:text-2xl font-bold text-slate-900 mb-4">Integrated Video Rooms</h3>
              <p className="text-slate-600 mb-6">Seamless video consultations directly from your browser, connecting you with specialists anywhere natively.</p>

              <div className="mt-auto flex-1 rounded-2xl bg-slate-50 border border-slate-100 p-4 flex flex-col justify-end">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Vitals Activity</div>
                  <div className="flex items-center space-x-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                    <span className="text-[10px] font-bold text-slate-500 tracking-wider">LIVE</span>
                  </div>
                </div>
                <div className="flex items-end justify-between gap-1.5 h-16 opacity-80 hover:opacity-100 transition-opacity">
                  {[30, 45, 25, 60, 40, 80, 50, 70, 35, 90, 45, 65, 55, 85].map((val, i) => (
                    <div key={i} className="w-full bg-blue-100 rounded-t-sm h-full relative overflow-hidden group">
                      <div className="absolute bottom-0 w-full bg-blue-500 rounded-t-sm transition-all duration-500 group-hover:bg-blue-600" style={{ height: `${val}%` }}></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="bg-blue-50/80 rounded-3xl p-8 border border-blue-100 flex-none h-48 hover:shadow-md transition-all">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">AI Symptom Checker</h3>
              </div>
              <p className="text-slate-600 text-sm">Preliminary wellness checks using smart models to direct you to the right specialist instantly.</p>
            </div>
          </div>

          {/* Middle Column */}
          <div className="rounded-[2.5rem] overflow-hidden shadow-lg h-[400px] lg:h-auto relative group">
            <img
              src="https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?q=80&w=2076&auto=format&fit=crop"
              alt="Data Analytics Interface"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent pointer-events-none"></div>
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-6 h-full">
            <div className="bg-[#0A44B6] rounded-3xl p-8 shadow-lg flex-none h-48 hover:shadow-xl transition-all">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">Secure Payments</h3>
              </div>
              <p className="text-blue-100 text-sm">Integrated gateways for frictionless consultation fee processing.</p>
            </div>
            <div className="bg-indigo-50/50 rounded-3xl p-8 border border-indigo-100 flex-1 flex flex-col hover:shadow-md transition-all lg:h-[360px]">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <FileText className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Medical History Vault</h3>
              </div>
              <p className="text-slate-600 text-sm mb-6">A centralized, secure digital space for all your extensive medical history and persistent health records.</p>

              <div className="mb-6 flex-1 rounded-2xl bg-white/60 border border-indigo-50 p-4 relative overflow-hidden flex items-end">
                <div className="absolute top-4 left-4 text-[10px] font-bold text-indigo-300 tracking-widest uppercase">Encryption Logs</div>
                <svg className="w-full h-16 drop-shadow-md" viewBox="0 0 100 40" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="rgba(79, 70, 229, 0.2)" />
                      <stop offset="100%" stopColor="rgba(79, 70, 229, 0)" />
                    </linearGradient>
                  </defs>
                  <path d="M0,40 L0,25 Q15,5 25,20 T45,15 T65,25 T80,10 L100,20 L100,40 Z" fill="url(#gradient)" />
                  <path d="M0,25 Q15,5 25,20 T45,15 T65,25 T80,10 L100,20" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 mt-auto flex items-center justify-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-xs font-mono text-slate-400">VAULT ENCRYPTED 256-AES</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hero Interstitial */}
      <section className="w-full h-[400px] lg:h-[500px] relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=2053&auto=format&fit=crop"
          alt="Clinic Interior"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-slate-900/40"></div>
        <div className="absolute inset-0 flex items-center justify-center px-6">
          <h2 className="text-4xl md:text-5xl lg:text-7xl font-extrabold text-white text-center leading-[1.1] drop-shadow-2xl">
            Where Technology<br />Meets Human Touch.
          </h2>
        </div>
      </section>

      {/* CTA Box */}
      <section className="max-w-[70rem] mx-auto px-6 lg:px-12 mt-24 mb-24">
        <div className="bg-[#0A1A2F] rounded-[3rem] p-12 text-center text-white relative overflow-hidden shadow-2xl">
          {/* Subtle background flair */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl opacity-10 translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500 rounded-full blur-3xl opacity-10 -translate-x-1/3 translate-y-1/3" />

          <h2 className="text-3xl lg:text-5xl font-bold mb-4 relative z-10">Ready for a new clinical standard?</h2>
          <p className="text-blue-200 mb-10 max-w-xl mx-auto relative z-10 text-lg">Join thousands of providers and customers already experiencing the future of healthcare sanctuary.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
            <Link to="/register?type=user" className="px-8 py-3.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-full transition-colors active:scale-95 w-full sm:w-auto">
              Become a User
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-12 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="max-w-xs text-center md:text-left">
            <div className="text-lg font-bold text-slate-900 mb-2">MediCare</div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Advancing human health through clinical intelligence and empathetic design.
            </p>
          </div>
          <div className="flex flex-col gap-2 text-end">
            <div className="flex gap-6 text-sm font-medium text-slate-500">
              <Link to="#" className="hover:text-blue-600 transition-colors">Privacy Policy</Link>
              <Link to="#" className="hover:text-blue-600 transition-colors">Terms of Service</Link>
            </div>
            <div className="text-xs text-slate-400">
              © 2026 MediCare, Inc.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}