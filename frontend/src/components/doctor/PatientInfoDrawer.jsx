import { useEffect, useState, useCallback } from 'react';
import patientService from '../../services/patientService';
import appointmentService from '../../services/appointmentService';
import prescriptionService from '../../services/prescriptionService';
import RejectAppointmentModal from './RejectAppointmentModal';
import {
  X, User, Phone, Mail, Calendar, Droplet, AlertTriangle,
  Pill, Heart, FileText, ExternalLink, ChevronDown, ChevronUp,
  Loader2, Clock, ShieldCheck, XCircle, CheckCircle2, Plus, Trash2, Save,
} from 'lucide-react';

const emptyMed = () => ({ name: '', dosage: '', frequency: '', duration: '', notes: '' });

// Prescription editor for the drawer — used for completed appointments where
// the doctor didn't (or couldn't) write one live during the video call.
const PrescriptionPanel = ({ appt }) => {
  const [loading, setLoading] = useState(true);
  const [medications, setMedications] = useState([emptyMed()]);
  const [diagnosis, setDiagnosis] = useState('');
  const [instructions, setInstructions] = useState('');
  const [prescriptionId, setPrescriptionId] = useState(null);
  const [status, setStatus] = useState('draft');
  const [saving, setSaving] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    prescriptionService.getByAppointment(appt._id).then(data => {
      if (cancelled) return;
      if (data) {
        setMedications(data.medications?.length ? data.medications : [emptyMed()]);
        setDiagnosis(data.diagnosis || '');
        setInstructions(data.instructions || '');
        setPrescriptionId(data._id);
        setStatus(data.status);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
    return () => { cancelled = true; };
  }, [appt._id]);

  const updateMed = (idx, field, value) =>
    setMedications(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  const addMed = () => setMedications(prev => [...prev, emptyMed()]);
  const removeMed = (idx) => setMedications(prev => prev.filter((_, i) => i !== idx));

  const payload = () => ({
    appointmentId: appt._id,
    patientId: appt.patientId,
    medications,
    diagnosis,
    instructions,
  });

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    try {
      const saved = await prescriptionService.save(payload());
      setPrescriptionId(saved._id);
      setStatus(saved.status);
      setMsg('Saved');
    } catch {
      setMsg('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleIssue = async () => {
    setIssuing(true);
    setMsg('');
    try {
      const saved = await prescriptionService.save(payload());
      const issued = await prescriptionService.issue(saved._id);
      setPrescriptionId(saved._id);
      setStatus(issued.status);
      setMsg('Issued to patient');
    } catch {
      setMsg('Issue failed');
    } finally {
      setIssuing(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-blue-500" /></div>;
  }

  const isIssued = status === 'issued';

  return (
    <div className="space-y-4 mt-1">
      {isIssued && (
        <div className="flex items-center gap-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
          <CheckCircle2 className="w-4 h-4" /> Prescription issued to patient
        </div>
      )}

      <SectionCard title="Diagnosis" icon={<FileText className="w-4 h-4 text-blue-500" />}>
        <textarea
          rows={2}
          disabled={isIssued}
          value={diagnosis}
          onChange={e => setDiagnosis(e.target.value)}
          placeholder="Primary diagnosis..."
          className="w-full mt-2 bg-slate-50 text-slate-800 text-sm rounded-xl px-3 py-2 border border-slate-200 focus:outline-none focus:border-blue-400 resize-none disabled:opacity-60"
        />
      </SectionCard>

      <SectionCard title="Medications" icon={<Pill className="w-4 h-4 text-blue-500" />}>
        <div className="space-y-3 mt-2">
          {medications.map((med, idx) => (
            <div key={idx} className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">#{idx + 1}</span>
                {medications.length > 1 && !isIssued && (
                  <button onClick={() => removeMed(idx)} className="text-red-500 hover:text-red-600">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {[
                { field: 'name', placeholder: 'Drug name', label: 'Name' },
                { field: 'dosage', placeholder: 'e.g. 500mg', label: 'Dosage' },
                { field: 'frequency', placeholder: 'e.g. Twice daily', label: 'Frequency' },
                { field: 'duration', placeholder: 'e.g. 7 days', label: 'Duration' },
              ].map(({ field, placeholder, label }) => (
                <div key={field}>
                  <label className="text-xs text-slate-400 mb-0.5 block">{label}</label>
                  <input
                    type="text"
                    disabled={isIssued}
                    value={med[field]}
                    onChange={e => updateMed(idx, field, e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-white text-slate-800 text-xs rounded-lg px-2.5 py-1.5 border border-slate-200 focus:outline-none focus:border-blue-400 disabled:opacity-60"
                  />
                </div>
              ))}
            </div>
          ))}
          {!isIssued && (
            <button onClick={addMed} className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700">
              <Plus className="w-3.5 h-3.5" /> Add medication
            </button>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Instructions" icon={<Heart className="w-4 h-4 text-purple-500" />}>
        <textarea
          rows={2}
          disabled={isIssued}
          value={instructions}
          onChange={e => setInstructions(e.target.value)}
          placeholder="Diet, rest, follow-up advice..."
          className="w-full mt-2 bg-slate-50 text-slate-800 text-sm rounded-xl px-3 py-2 border border-slate-200 focus:outline-none focus:border-blue-400 resize-none disabled:opacity-60"
        />
      </SectionCard>

      {msg && (
        <p className={`text-center text-xs font-medium ${msg.includes('failed') ? 'text-red-600' : 'text-green-600'}`}>{msg}</p>
      )}

      {!isIssued && (
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving || issuing}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Draft
          </button>
          <button
            onClick={handleIssue}
            disabled={saving || issuing || medications.every(m => !m.name)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-2xl transition-colors disabled:opacity-50"
          >
            {issuing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Issue Prescription
          </button>
        </div>
      )}
    </div>
  );
};

const SectionCard = ({ title, icon, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-800">
          {icon}
          {title}
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-slate-400" />
          : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-slate-100">{children}</div>
      )}
    </div>
  );
};

const Tag = ({ label, color = 'slate' }) => {
  const colors = {
    red:    'bg-red-50 text-red-700 border-red-200',
    blue:   'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    slate:  'bg-slate-100 text-slate-600 border-slate-200',
    amber:  'bg-amber-50 text-amber-700 border-amber-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[color]}`}>
      {label}
    </span>
  );
};

const EmptyNote = ({ text }) => (
  <p className="text-xs text-slate-400 italic mt-2">{text}</p>
);

const InfoRow = ({ icon, label, value }) => (
  <div className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
    <div className="text-slate-400 mt-0.5 shrink-0">{icon}</div>
    <div className="flex-1 min-w-0">
      <p className="text-[11px] text-slate-400 uppercase tracking-wide font-medium">{label}</p>
      <p className="text-sm text-slate-800 font-medium mt-0.5">{value || '—'}</p>
    </div>
  </div>
);

const SnapshotPanel = ({ snapshot }) => {
  if (!snapshot) return <EmptyNote text="No medical snapshot available for this appointment." />;

  const formatDate = d =>
    d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

  return (
    <div className="space-y-4 mt-3">
      <SectionCard title="Basic Info" icon={<User className="w-4 h-4 text-blue-500" />}>
        <div className="mt-2 space-y-0">
          <InfoRow icon={<Calendar className="w-4 h-4" />} label="Date of Birth" value={formatDate(snapshot.dateOfBirth)} />
          <InfoRow icon={<User className="w-4 h-4" />} label="Gender" value={snapshot.gender} />
          <InfoRow icon={<Droplet className="w-4 h-4" />} label="Blood Type" value={snapshot.bloodType} />
        </div>
      </SectionCard>

      <SectionCard title="Allergies" icon={<AlertTriangle className="w-4 h-4 text-red-500" />}>
        <div className="flex flex-wrap gap-2 mt-3">
          {snapshot.allergies?.length > 0
            ? snapshot.allergies.map((a, i) => <Tag key={i} label={a} color="red" />)
            : <EmptyNote text="No known allergies." />}
        </div>
      </SectionCard>

      <SectionCard title="Current Medications" icon={<Pill className="w-4 h-4 text-blue-500" />}>
        <div className="flex flex-wrap gap-2 mt-3">
          {snapshot.currentMedications?.length > 0
            ? snapshot.currentMedications.map((m, i) => <Tag key={i} label={m} color="blue" />)
            : <EmptyNote text="No current medications." />}
        </div>
      </SectionCard>

      <SectionCard title="Chronic Conditions" icon={<Heart className="w-4 h-4 text-purple-500" />}>
        <div className="flex flex-wrap gap-2 mt-3">
          {snapshot.chronicConditions?.length > 0
            ? snapshot.chronicConditions.map((c, i) => <Tag key={i} label={c} color="purple" />)
            : <EmptyNote text="No chronic conditions recorded." />}
        </div>
      </SectionCard>

      {snapshot.emergencyContact?.name && (
        <SectionCard
          title="Emergency Contact"
          icon={<Phone className="w-4 h-4 text-amber-500" />}
          defaultOpen={false}
        >
          <div className="mt-2 space-y-0">
            <InfoRow icon={<User className="w-4 h-4" />} label="Name" value={snapshot.emergencyContact.name} />
            <InfoRow icon={<Phone className="w-4 h-4" />} label="Phone" value={snapshot.emergencyContact.phone} />
            <InfoRow icon={<Heart className="w-4 h-4" />} label="Relationship" value={snapshot.emergencyContact.relationship} />
          </div>
        </SectionCard>
      )}

      {snapshot.medicalReports?.length > 0 && (
        <SectionCard
          title={`Medical Reports (${snapshot.medicalReports.length})`}
          icon={<FileText className="w-4 h-4 text-slate-500" />}
          defaultOpen={false}
        >
          <div className="mt-3 space-y-2">
            {snapshot.medicalReports.map(report => (
              <div
                key={report._id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{report.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {report.category} · {new Date(report.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <a
                  href={report.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-3 shrink-0 flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  View <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
};

const HistoryPanel = ({ history, expiresAt }) => {
  if (!history?.length) return <EmptyNote text="No historical snapshots found." />;

  return (
    <div className="space-y-3 mt-3">
      {expiresAt && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          24h access expires {new Date(expiresAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
      {history.map((snap, idx) => (
        <div key={snap._id} className="border border-slate-200 rounded-2xl p-4 bg-white space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Snapshot {idx + 1}
            </p>
            <span className="text-xs text-slate-400">
              {new Date(snap.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {snap.allergies?.map((a, i) => <Tag key={i} label={a} color="red" />)}
            {snap.currentMedications?.map((m, i) => <Tag key={i} label={m} color="blue" />)}
            {snap.chronicConditions?.map((c, i) => <Tag key={i} label={c} color="purple" />)}
            {!snap.allergies?.length && !snap.currentMedications?.length && !snap.chronicConditions?.length && (
              <EmptyNote text="No medical data in this snapshot." />
            )}
          </div>
          {snap.medicalReports?.length > 0 && (
            <p className="text-xs text-slate-500">{snap.medicalReports.length} report(s) attached</p>
          )}
        </div>
      ))}
    </div>
  );
};

export default function PatientInfoDrawer({ appt, onClose, onAppointmentRejected, onAppointmentCompleted }) {
  const [tab, setTab] = useState('info');
  const [snapshot, setSnapshot] = useState(null);
  const [history, setHistory] = useState(null);
  const [historyExpiresAt, setHistoryExpiresAt] = useState(null);
  const [loadingSnap, setLoadingSnap] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [snapError, setSnapError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);   // ← NEW
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState('');

  const sharingMode = appt?.sharingMode;

  const loadSnapshot = useCallback(async () => {
    if (!appt?.patientMedicalHistoryId) return;
    setLoadingSnap(true);
    setSnapError('');
    try {
      const data = await patientService.getSnapshotById(appt.patientMedicalHistoryId);
      setSnapshot(data.snapshot);
    } catch (err) {
      setSnapError(err?.error || 'Failed to load snapshot.');
    } finally {
      setLoadingSnap(false);
    }
  }, [appt?.patientMedicalHistoryId]);

  const loadHistory = useCallback(async () => {
    if (!appt?.patientId || !appt?._id) return;
    setLoadingHistory(true);
    setHistoryError('');
    try {
      const data = await patientService.getDoctorHistory(appt.patientId, appt._id);
      setHistory(data.history);
      setHistoryExpiresAt(data.expiresAt);
    } catch (err) {
      setHistoryError(err?.error || 'Failed to load medical history.');
    } finally {
      setLoadingHistory(false);
    }
  }, [appt?.patientId, appt?._id]);

  useEffect(() => {
    if (tab === 'snapshot' && !snapshot && !loadingSnap) loadSnapshot();
  }, [tab, snapshot, loadingSnap, loadSnapshot]);

  useEffect(() => {
    if (tab === 'history' && !history && !loadingHistory) loadHistory();
  }, [tab, history, loadingHistory, loadHistory]);

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleMarkCompleted = async () => {
    setCompleting(true);
    setCompleteError('');
    try {
      await appointmentService.markCompleted(appt._id);
      onAppointmentCompleted?.(appt._id);
      onClose();
    } catch (err) {
      setCompleteError(err?.error || 'Failed to mark appointment as completed.');
    } finally {
      setCompleting(false);
    }
  };

  if (!appt) return null;

  // Only show reject/complete buttons when appointment is confirmed
  const canReject = appt.status === 'confirmed';
  const canComplete = appt.status === 'confirmed';

  const tabs = [
    { id: 'info',     label: 'Patient Info' },
    { id: 'snapshot', label: 'Snapshot'     },
    ...(sharingMode === 'FULL' ? [{ id: 'history', label: 'Full History' }] : []),
    ...(appt.status === 'completed' ? [{ id: 'prescription', label: 'Prescription' }] : []),
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-slate-50 shadow-2xl z-50 flex flex-col animate-slide-in-right">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
              {appt.patientFirstName?.[0]}{appt.patientLastName?.[0]}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{appt.patientFullName}</p>
              <p className="text-xs text-slate-400">{appt.specialty}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sharing mode badge */}
        {sharingMode && (
          <div className="px-5 pt-3 shrink-0">
            <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border
              ${sharingMode === 'FULL'
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-blue-50 text-blue-700 border-blue-200'}`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {sharingMode === 'FULL' ? 'Full history access granted' : 'Snapshot-only access'}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex px-5 pt-3 gap-1 shrink-0">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                tab === t.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200 bg-slate-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Tab: Patient Info */}
          {tab === 'info' && (
            <>
              <SectionCard title="Contact Details" icon={<Mail className="w-4 h-4 text-blue-500" />}>
                <div className="mt-2">
                  <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={appt.patientEmail} />
                  <InfoRow icon={<Phone className="w-4 h-4" />} label="Phone" value={appt.patientPhone} />
                </div>
              </SectionCard>

              <SectionCard title="Appointment Details" icon={<Calendar className="w-4 h-4 text-blue-500" />}>
                <div className="mt-2">
                  <InfoRow
                    icon={<Calendar className="w-4 h-4" />}
                    label="Date"
                    value={new Date(appt.appointmentDate).toLocaleDateString('en-US', {
                      month: 'long', day: 'numeric', year: 'numeric',
                    })}
                  />
                  <InfoRow icon={<Clock className="w-4 h-4" />} label="Time Slot" value={appt.timeSlot} />
                  <InfoRow icon={<User className="w-4 h-4" />} label="Specialty" value={appt.specialty} />
                  <InfoRow
                    icon={<FileText className="w-4 h-4" />}
                    label="Consultation Fee"
                    value={appt.consultationFee ? `$${appt.consultationFee.toLocaleString()}` : '—'}
                  />
                </div>
              </SectionCard>

              {appt.reason && (
                <SectionCard title="Reason for Visit" icon={<FileText className="w-4 h-4 text-slate-500" />}>
                  <p className="text-sm text-slate-700 leading-relaxed mt-2">{appt.reason}</p>
                </SectionCard>
              )}

              {completeError && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-sm text-red-700">
                  {completeError}
                </div>
              )}

              {/* Mark Completed — only for confirmed appointments */}
              {canComplete && (
                <div className="pt-2">
                  <button
                    onClick={handleMarkCompleted}
                    disabled={completing}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-green-700 bg-green-50 hover:bg-green-100 active:bg-green-200 border border-green-200 rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {completing
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <CheckCircle2 className="w-4 h-4" />}
                    Mark as Completed
                  </button>
                </div>
              )}

              {/* Reject button — only for confirmed appointments */}
              {canReject && (
                <div>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 active:bg-red-200 border border-red-200 rounded-2xl transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject Appointment
                  </button>
                </div>
              )}
            </>
          )}

          {/* Tab: Snapshot */}
          {tab === 'snapshot' && (
            <>
              {!appt.patientMedicalHistoryId ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <ShieldCheck className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm font-medium">No snapshot shared</p>
                  <p className="text-xs mt-1">The patient did not share medical data for this appointment.</p>
                </div>
              ) : loadingSnap ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
                </div>
              ) : snapError ? (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
                  {snapError}
                </div>
              ) : (
                <SnapshotPanel snapshot={snapshot} />
              )}
            </>
          )}

          {/* Tab: Full History */}
          {tab === 'history' && (
            <>
              {loadingHistory ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
                </div>
              ) : historyError ? (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
                  {historyError}
                </div>
              ) : (
                <HistoryPanel history={history} expiresAt={historyExpiresAt} />
              )}
            </>
          )}

          {/* Tab: Prescription (completed appointments only) */}
          {tab === 'prescription' && <PrescriptionPanel appt={appt} />}
        </div>
      </div>

      {/* Reject modal — rendered outside drawer so it layers on top */}
      {showRejectModal && (
        <RejectAppointmentModal
          appointment={appt}
          onClose={() => setShowRejectModal(false)}
          onRejected={(id) => {
            onAppointmentRejected?.(id);
            onClose();
          }}
        />
      )}
    </>
  );
}