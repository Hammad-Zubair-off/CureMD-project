import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import aiService from '../../services/aiService';
import patientService from '../../services/patientService';
import {
  Send, Paperclip, AlertTriangle, Loader2, Bot, User,
  X, CheckCircle2, ChevronRight, ChevronLeft, FileText, Image as ImageIcon, MessageSquarePlus, Clock, Trash2,
  Menu, Sparkles, History, Lock
} from 'lucide-react';

export default function SymptomChecker() {
  const navigate = useNavigate();
  const chatEndRef = useRef(null);

  // State
  const [sessionsHistory, setSessionsHistory] = useState([]);
  const [viewingSession, setViewingSession] = useState(null); // The fully loaded session

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('AI is thinking...');

  // File Sharing State
  const [showFileModal, setShowFileModal] = useState(false);
  const [vaultReports, setVaultReports] = useState([]);
  const [selectedReports, setSelectedReports] = useState([]);
  const [patientVitals, setPatientVitals] = useState(null);
  const [isFetchingReports, setIsFetchingReports] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Initial Load
  useEffect(() => {
    loadData();
  }, []);

  const fetchVaultReports = async () => {
    setIsFetchingReports(true);
    setShowFileModal(true);
    try {
      const reportsRes = await patientService.getMyReports();
      const rawReports = Array.isArray(reportsRes) ? reportsRes : (reportsRes.data || reportsRes.reports || []);
      setVaultReports(rawReports.filter(r => !r.isDeleted));
    } catch (error) {
      console.error("Failed to fetch vault reports:", error);
    } finally {
      setIsFetchingReports(false);
    }
  };

  const loadData = async () => {
    try {
      // Fetch History (Summaries)
      const historyRes = await aiService.getAllSessions();
      const allSessions = historyRes.sessions || historyRes.data || [];
      setSessionsHistory(allSessions);

      // Fetch profile vitals to hold in state for new sessions
      const profileRes = await patientService.getMyProfile();
      const p = profileRes.profile || profileRes;
      setPatientVitals({
        age: p.dateOfBirth ? new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear() : 'Unknown',
        gender: p.gender,
        chronicConditions: p.chronicConditions,
        allergies: p.allergies
      });

      // Pre-fetch vault reports
      const reportsRes = await patientService.getMyReports();
      const rawReports = Array.isArray(reportsRes) ? reportsRes : (reportsRes.data || reportsRes.reports || []);
      setVaultReports(rawReports.filter(r => !r.isDeleted));
    } catch (error) {
      console.error("Failed to initialize AI Chat:", error);
    }
  };

  // Load full session history when clicked in sidebar
  const handleSelectSession = async (sessionSummary) => {
    setIsLoading(true);
    try {
      const fullSessionRes = await aiService.getSessionById(sessionSummary._id);
      setViewingSession(fullSessionRes.session || fullSessionRes.data);
    } catch (error) {
      console.error("Failed to load session details:", error);
    } finally {
      setIsLoading(false);
      setIsMobileSidebarOpen(false);
    }
  };

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [viewingSession?.messages, isLoading]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() && selectedReports.length === 0) return;

    const userMessage = input;
    const attachedReports = [...selectedReports];

    const newUserMessage = {
      role: 'user',
      content: input,
      attachments: [...selectedReports] // Store the attachments temporarily for the UI
    };

    // Optimistic update
    const tempMessage = { role: 'user', content: userMessage };
    setViewingSession(prev => ({
      ...prev,
      messages: [...(prev?.messages || []), tempMessage]
    }));

    setInput('');
    setSelectedReports([]);
    setIsLoading(true);

    try {
      let targetSessionId = viewingSession?._id;

      // If no session exists yet (New Chat), create it first
      if (!targetSessionId) {
        const newSessionRes = await aiService.createSession({ vitals: patientVitals });
        targetSessionId = newSessionRes.session._id;
      }

      if (selectedReports.length > 0) {
        setLoadingText(`Parsing and analyzing ${selectedReports.length} file${selectedReports.length > 1 ? 's' : ''}...`);
      } else {
        setLoadingText('AI is thinking...');
      }
      setIsLoading(true);

      // Send the message to the targeted session
      const response = await aiService.sendMessage(targetSessionId, {
        message: userMessage,
        selectedReports: attachedReports
      });

      setViewingSession(response.session || response.data);

      // Refresh sidebar to update the rolling summary list
      const historyRes = await aiService.getAllSessions();
      setSessionsHistory(historyRes.sessions || historyRes.data || []);

    } catch (error) {
      console.error("Chat Error:", error);
      // Rollback optimistic update on error if needed
      setViewingSession(prev => ({
        ...prev,
        messages: prev.messages.filter(msg => msg !== tempMessage)
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartNewChat = () => {
    setViewingSession(null);
    setInput('');
    setSelectedReports([]);
    setIsMobileSidebarOpen(false); // Close drawer on mobile
  };

  const handleBookDoctor = () => {
    if (viewingSession?._id) {
      navigate('/patient/book-appointment', { state: { triageSessionId: viewingSession._id } });
    }
  };

  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation(); // Prevent selecting the session when clicking delete

    if (!window.confirm("Are you sure you want to delete this consultation history?")) {
      return;
    }

    try {
      await aiService.deleteSession(sessionId);

      // Update history list
      setSessionsHistory(prev => prev.filter(s => s._id !== sessionId));

      // If we deleted the active session, reset the view
      if (viewingSession?._id === sessionId) {
        handleStartNewChat();
      }
    } catch (error) {
      console.error("Failed to delete session:", error);
      alert("Failed to delete consultation history. Please try again.");
    }
  };

  const toggleReportSelection = (report) => {
    if (selectedReports.find(r => r._id === report._id)) {
      setSelectedReports(selectedReports.filter(r => r._id !== report._id));
    } else {
      if (selectedReports.length >= 3) return alert("You can only attach up to 3 files.");
      setSelectedReports([...selectedReports, report]);
    }
  };

  const isEmergencyLock = viewingSession?.triageOutcome?.isEmergency;
  const isTriaged = viewingSession?.triageOutcome?.triageLevel && viewingSession.triageOutcome.triageLevel !== 'Pending';

  return (
    <div className="h-[100dvh] bg-slate-50 p-3 md:p-6 lg:p-8 flex flex-col overflow-hidden">
      {/* Page Header - Bento Style */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3 md:mb-6">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Symptom Checker</h1>
            <p className="text-sm font-medium text-slate-500 mt-0.5">AI-powered triage and pre-consultation analysis</p>
          </div>
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="md:hidden p-3 bg-white border border-slate-200 rounded-xl text-slate-600 shadow-sm active:scale-95 transition-all outline-none"
          >
            <History className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-6 min-h-0 relative">
        {/* Mobile Sidebar Overlay */}
        {isMobileSidebarOpen && (
          <div
            className="md:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[90] transition-opacity"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* Left Sidebar: Chat History */}
        <div
          className={`
            fixed inset-y-0 left-0 z-[100] w-72 bg-slate-50 p-4 transition-transform duration-300 md:relative md:inset-auto md:z-auto md:p-0 md:bg-transparent shadow-2xl md:shadow-none
            ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            ${isSidebarCollapsed ? 'md:hidden md:opacity-0 md:-ml-4' : 'md:flex md:w-80'}
            flex flex-col gap-4 shrink-0
          `}
        >
          {/* Mobile Close Button */}
          <div className="flex md:hidden items-center justify-between mb-2">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Navigation</h3>
            <button onClick={() => setIsMobileSidebarOpen(false)} className="p-2 text-slate-400">
              <X className="w-6 h-6" />
            </button>
          </div>
          {/* Bento Card: New Chat */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 shrink-0">
            <button
              onClick={handleStartNewChat}
              className="w-full flex items-center justify-center space-x-3 px-6 py-4 bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
            >
              <MessageSquarePlus className="w-4 h-4" />
              <span>Start New Consultation</span>
            </button>
          </div>

          {/* Bento Card: History */}
          <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col overflow-hidden min-h-0">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-slate-400" />
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">History</h3>
              </div>
              <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-2 py-0.5 rounded-full">
                {sessionsHistory.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
              {sessionsHistory.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-widest italic">No history yet</p>
                </div>
              ) : sessionsHistory.map(session => (
                <div key={session._id} className="relative group">
                  <button
                    onClick={() => handleSelectSession(session)}
                    className={`w-full text-left p-4 rounded-3xl transition-all border ${viewingSession?._id === session._id
                      ? 'bg-blue-50 border-blue-100 shadow-sm'
                      : 'bg-white border-transparent hover:bg-slate-50'
                      } pr-12`}
                  >
                    <p className={`text-sm font-black tracking-tight ${viewingSession?._id === session._id ? 'text-blue-700' : 'text-slate-700'
                      } line-clamp-2 leading-tight`}>
                      {session.rollingSummary || session.title || "New consultation"}
                    </p>
                    <div className="flex items-center space-x-3 mt-3">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${session.triageOutcome?.isEmergency ? 'bg-red-100 text-red-600' :
                        (session.triageOutcome?.triageLevel && session.triageOutcome.triageLevel !== 'Pending') ? 'bg-green-100 text-green-700' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                        {session.triageOutcome?.isEmergency ? 'Emergency' :
                          (session.triageOutcome?.triageLevel && session.triageOutcome.triageLevel !== 'Pending') ? 'Triaged' : 'Ongoing'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(session.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={(e) => handleDeleteSession(e, session._id)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-2.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-xl hover:bg-red-50 ${viewingSession?._id === session._id ? 'bg-blue-100/50' : 'bg-slate-50'
                      }`}
                    title="Delete Session"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className={`absolute left-0 top-1/2 -translate-y-1/2 z-30 w-8 h-20 bg-white border border-slate-200 shadow-xl rounded-3xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-slate-50 transition-all group ${isSidebarCollapsed ? 'translate-x-[0px]' : 'translate-x-[304px]'
            } md:flex hidden`}
          title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isSidebarCollapsed ? <ChevronRight className="w-5 h-5 group-hover:scale-125 transition-transform" /> : <ChevronLeft className="w-5 h-5 group-hover:scale-125 transition-transform" />}
        </button>

        {/* Right Area: Chat Interface */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-[0_12px_40px_rgb(0,0,0,0.06)] min-w-0 overflow-hidden relative">
          {/* Header */}
          <div className="bg-white/80 backdrop-blur-md px-4 md:px-8 py-4 md:py-6 border-b border-slate-100 shrink-0 flex justify-between items-center z-10">
            <div className="flex items-center space-x-3 md:space-x-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/30">
                <Bot className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <h3 className="text-base md:text-lg font-black text-slate-900 tracking-tight leading-none">Consultation Chat</h3>
                <div className="flex items-center space-x-2 mt-1.5">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Live AI Triage Analysis
                  </p>
                </div>
              </div>
            </div>
            {viewingSession && isTriaged && !isEmergencyLock && (
              <button
                onClick={handleBookDoctor}
                className="flex items-center gap-1.5 md:gap-2 px-3 md:px-6 py-2.5 md:py-3 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all shadow-xl active:scale-95"
              >
                <span className="hidden sm:inline">Schedule Appointment</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Emergency Banner */}
          {isEmergencyLock && (
            <div className="bg-red-600 text-white px-8 py-5 shrink-0 flex items-center space-x-4 shadow-xl z-20">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-sm uppercase tracking-wider leading-none">Emergency Detected</h3>
                <p className="text-xs font-bold text-red-50 mt-1 opacity-90">Please call 1990 immediately. Chat restricted for safety.</p>
              </div>
            </div>
          )}

          {/* Chat Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8 scrollbar-hide bg-slate-50/30">
            {!viewingSession?.messages?.length && (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-6">
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">How can we help today?</h3>
                  <p className="text-sm font-medium text-slate-500 leading-relaxed">
                    Describe your symptoms in detail. Our AI will analyze your situation and provide the best triage guidance.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3 w-full">
                  {[
                    "I've had a persistent headache for 2 days",
                    "Feeling dizzy after exercise",
                    "Mild chest pain and shortness of breath"
                  ].map((preset, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(preset)}
                      className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-[11px] font-bold text-slate-600 hover:border-blue-500 hover:text-blue-600 transition-all text-left shadow-sm"
                    >
                      "{preset}"
                    </button>
                  ))}
                </div>
              </div>
            )}

            {viewingSession?.messages?.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'user' ? (
                  <div className="flex flex-col items-end w-full max-w-[85%]">
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap justify-end gap-2 mb-3">
                        {msg.attachments.map((file, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-blue-50/50 border border-blue-100 text-blue-700 text-[10px] font-bold px-4 py-2 rounded-xl shadow-sm">
                            <Paperclip className="w-3 h-3" />
                            <span className="truncate max-w-[150px] uppercase tracking-wider">{file.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="bg-blue-600 text-white p-6 rounded-2xl rounded-tr-[0.5rem] shadow-xl shadow-blue-600/20 group relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 -mr-16 -mt-16 rounded-full opacity-50"></div>
                      <p className="text-[15px] font-bold tracking-tight leading-relaxed relative z-10">{msg.content}</p>
                    </div>
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-2 mr-2">Sent By You</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-start w-full max-w-[85%]">
                    <div className="flex items-start space-x-4">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-white border border-slate-100 shadow-md">
                        <Bot className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex flex-col space-y-2">
                        <div className="px-6 py-5 rounded-2xl rounded-tl-[0.5rem] bg-white border border-slate-100 shadow-md relative group">
                          <p className="text-[15px] font-bold text-slate-700 tracking-tight leading-relaxed">{msg.content}</p>
                        </div>
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-1">AI Response</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex w-full justify-start">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-white border border-slate-100 shadow-md animate-pulse">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  </div>
                  <div className="px-6 py-4 rounded-[2rem] rounded-tl-[0.5rem] bg-white border border-slate-100 shadow-md flex items-center space-x-3">
                    <span className="text-[13px] font-bold text-slate-500 animate-pulse uppercase tracking-wider">
                      {loadingText}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div className="bg-white px-3 py-3 md:px-6 md:py-5 lg:px-8 lg:py-6 border-t border-slate-100 shrink-0 relative z-10 pb-safe">
            {!isEmergencyLock ? (
              <div className="max-w-4xl mx-auto space-y-3">
                {selectedReports.length > 0 && (
                  <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-2">
                    {selectedReports.map(r => (
                      <div key={r._id} className="flex items-center bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl shadow-lg group">
                        <Paperclip className="w-3 h-3 mr-2" />
                        <span className="truncate max-w-[120px] md:max-w-[150px]">{r.title}</span>
                        <button onClick={() => toggleReportSelection(r)} className="ml-2.5 hover:text-red-400 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <form onSubmit={handleSend} className="flex items-center space-x-2 md:space-x-3">
                  <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-3 md:px-6 py-1 focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-500 transition-all">
                    <button
                      type="button"
                      onClick={fetchVaultReports}
                      className="p-2 md:p-3 text-slate-400 hover:text-blue-600 hover:bg-white rounded-2xl transition-all shrink-0 bg-transparent shadow-none"
                      title="Attach from Medical Vault"
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                      }}
                      placeholder="Type your symptoms here..."
                      className="flex-1 max-h-32 min-h-[40px] bg-transparent border-none px-2 md:px-4 py-2 font-bold text-slate-700 focus:outline-none resize-none placeholder-slate-400 text-sm"
                      rows="1"
                      disabled={isLoading}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={(!input.trim() && selectedReports.length === 0) || isLoading}
                    className="h-[48px] md:h-[52px] px-4 md:px-8 bg-blue-600 text-white rounded-2xl flex items-center justify-center space-x-2 hover:bg-blue-700 disabled:opacity-50 transition-all shrink-0 shadow-xl shadow-blue-600/20 active:scale-95"
                  >
                    <span className="hidden sm:block text-[10px] font-black uppercase tracking-widest">Send Message</span>
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-red-50 p-8 rounded-2xl border border-red-100 flex flex-col items-center text-center space-y-3">
                <div className="w-12 h-12 bg-red-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-red-900 font-black uppercase tracking-widest text-xs">Analysis Suspended</h4>
                  <p className="text-sm font-bold text-red-600 mt-1">
                    Emergency protocols active. Please seek professional medical assistance.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Selective File Modal (Unchanged structurally, styled for premium feel) */}
      {showFileModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-white">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center">
                  Medical Vault
                </h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Select up to 3 clinical records</p>
              </div>
              <button onClick={() => setShowFileModal(false)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-10 max-h-[500px] overflow-y-auto space-y-4 scrollbar-hide">
              {isFetchingReports ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
                    <Lock className="absolute inset-0 m-auto w-6 h-6 text-blue-600 animate-pulse" />
                  </div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Decrypting Vault...</p>
                </div>
              ) : vaultReports.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                  <FileText className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No Records Found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {vaultReports.map(report => {
                    const isSelected = !!selectedReports.find(r => r._id === report._id);
                    const isImage = ['jpg', 'jpeg', 'png', 'webp'].includes(report.fileUrl?.split('.').pop().toLowerCase());

                    return (
                      <button
                        key={report._id}
                        onClick={() => toggleReportSelection(report)}
                        className={`w-full flex items-center p-5 rounded-2xl border transition-all ${isSelected
                          ? 'border-blue-600 bg-blue-50/50 shadow-lg shadow-blue-600/5'
                          : 'border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-white active:scale-[0.98]'
                          }`}
                      >
                        <div className={`w-14 h-14 rounded-2xl mr-5 flex items-center justify-center shrink-0 ${isSelected ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-400 shadow-sm'
                          }`}>
                          {isImage ? <ImageIcon className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                        </div>
                        <div className="flex-1 min-w-0 pr-4 text-left">
                          <p className={`text-sm font-black tracking-tight truncate ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                            {report.title}
                          </p>
                          <div className="flex items-center space-x-2 mt-1.5">
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${isSelected ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'
                              }`}>
                              {report.category}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">
                              {new Date(report.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0">
                          {isSelected ? (
                            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-md">
                              <CheckCircle2 className="w-4 h-4 text-white" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full border-2 border-slate-200 bg-white" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-8 border-t border-slate-50 flex items-center justify-between">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-2">
                {selectedReports.length} of 3 selected
              </p>
              <button
                onClick={() => setShowFileModal(false)}
                className="px-10 py-4 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-all shadow-xl active:scale-95"
              >
                Confirm Selection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}