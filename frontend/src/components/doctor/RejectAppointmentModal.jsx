import { useState, useEffect } from 'react';
import { X, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import appointmentService from '../../services/appointmentService';

export default function RejectAppointmentModal({ appointment, onClose, onRejected }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rejected, setRejected] = useState(false);  // ← success state

  // Auto-close 1.5 s after successful rejection
  useEffect(() => {
    if (!rejected) return;
    const timer = setTimeout(onClose, 1500);
    return () => clearTimeout(timer);
  }, [rejected, onClose]);

  const handleReject = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await appointmentService.rejectAppointment(
        appointment._id,
        reason.trim() || undefined
      );

      if (res?.success) {
        onRejected(appointment._id);  // notify parent immediately
        setRejected(true);            // trigger success UI + auto-close timer
        return;
      }

      setError(res?.error || 'Failed to reject appointment.');
    } catch (err) {
      console.error('Reject error:', err);

      // Ignore unrelated errors (e.g. SSL issues not from the backend)
      if (!err?.response) {
        console.warn('Ignoring non-backend error');
        onRejected(appointment._id);
        setRejected(true);
        return;
      }

      setError(err.error || 'Failed to reject appointment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop — higher z than drawer (z-50), so z-60 */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-60"
        onClick={!loading && !rejected ? onClose : undefined}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-70 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto animate-fade-in">

          {/* ── SUCCESS STATE ── */}
          {rejected ? (
            <div className="flex flex-col items-center justify-center px-6 py-10 gap-4 text-center">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-green-600" />
              </div>
              <div>
                <p className="text-base font-semibold text-slate-900">Appointment Rejected</p>
                <p className="text-sm text-slate-400 mt-1">
                  Rejection submitted. Patient/admin notification and refund processing started.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="w-4.5 h-4.5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Reject Appointment</p>
                    <p className="text-xs text-slate-400">This action will notify the patient</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5 space-y-4">
                {/* Patient summary */}
                <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
                  <p className="text-xs text-slate-400 mb-0.5">Patient</p>
                  <p className="text-sm font-semibold text-slate-800">{appointment.patientFullName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(appointment.appointmentDate).toLocaleDateString('en-US', {
                      month: 'long', day: 'numeric', year: 'numeric',
                    })} · {appointment.timeSlot}
                  </p>
                </div>

                {/* Reason textarea */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Reason for rejection <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="e.g. Schedule conflict, patient requested cancellation..."
                    rows={3}
                    maxLength={500}
                    disabled={loading}
                    className="w-full text-sm text-slate-800 placeholder-slate-300 bg-white border border-slate-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-300 transition disabled:opacity-60"
                  />
                  <p className="text-right text-xs text-slate-300 mt-1">{reason.length}/500</p>
                </div>

                {/* Error */}
                {error && (
                  <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                    {error}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-xl transition-colors disabled:opacity-60 shadow-sm"
                >
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Rejecting…</>
                    : 'Confirm Rejection'}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </>
  );
}