import { useEffect, useState, useCallback } from 'react';
import patientService from '../../services/patientService';
import appointmentService from '../../services/appointmentService';
import RejectAppointmentModal from './RejectAppointmentModal';
import {
  X, User, Phone, Mail, Calendar, Droplet, AlertTriangle,
  Pill, Heart, FileText, ExternalLink, ChevronDown, ChevronUp,
  Loader2, Clock, ShieldCheck, XCircle,
} from 'lucide-react';

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

export default function PatientInfoDrawer({ appt, onClose, onAppointmentRejected }) {
  const [tab, setTab] = useState('info');
  const [snapshot, setSnapshot] = useState(null);
  const [history, setHistory] = useState(null);
  const [historyExpiresAt, setHistoryExpiresAt] = useState(null);
  const [loadingSnap, setLoadingSnap] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [snapError, setSnapError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);   // ← NEW

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

  if (!appt) return null;

  // Only show reject button when appointment is confirmed
  const canReject = appt.status === 'confirmed';

  const tabs = [
    { id: 'info',     label: 'Patient Info' },
    { id: 'snapshot', label: 'Snapshot'     },
    ...(sharingMode === 'FULL' ? [{ id: 'history', label: 'Full History' }] : []),
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
                    value={appt.consultationFee ? `LKR ${appt.consultationFee.toLocaleString()}` : '—'}
                  />
                </div>
              </SectionCard>

              {appt.reason && (
                <SectionCard title="Reason for Visit" icon={<FileText className="w-4 h-4 text-slate-500" />}>
                  <p className="text-sm text-slate-700 leading-relaxed mt-2">{appt.reason}</p>
                </SectionCard>
              )}

              {/* Reject button — only for confirmed appointments */}
              {canReject && (
                <div className="pt-2">
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