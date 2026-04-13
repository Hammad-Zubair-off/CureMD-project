import { useState, useEffect, useCallback, useRef } from 'react';
import patientService from '../../services/patientService';
import appointmentService from '../../services/appointmentService';
import Toast from '../../components/common/Toast';
import {
    Loader2,
    Activity,
    FileText,
    ChevronDown,
    ChevronUp,
    Trash2,
    Archive,
    Filter,
    Clock,
    UploadCloud,
    ExternalLink,
    Search,
    Image as ImageIcon,
    CalendarDays
} from 'lucide-react';

export default function MedicalHistory() {
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ type: '', text: '' });

    const [profileData, setProfileData] = useState(null);
    const [snapshots, setSnapshots] = useState([]);
    const [reports, setReports] = useState([]);

    // Snapshot Linkages
    const [snapshotAppointments, setSnapshotAppointments] = useState({});
    const [loadingAppointments, setLoadingAppointments] = useState({});

    // UI State
    const [activeTab, setActiveTab] = useState('Clinical Timeline');
    const [expandedSnapshot, setExpandedSnapshot] = useState(null);

    // Filters for Documents
    const [filterCategory, setFilterCategory] = useState('All');
    const [filterType, setFilterType] = useState('All'); // All, Image, Document

    // NEW: Filters for Snapshots (Date Range)
    const [snapshotStartDate, setSnapshotStartDate] = useState('');
    const [snapshotEndDate, setSnapshotEndDate] = useState('');

    // Upload State
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadCategory, setUploadCategory] = useState('Lab Result');
    const [uploadTitle, setUploadTitle] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);

    // Data Fetching
    useEffect(() => {
        const loadHistoryData = async () => {
            try {
                setLoading(true);
                const [profRes, snapRes, repRes] = await Promise.all([
                    patientService.getMyProfile(),
                    patientService.getMySnapshots(),
                    patientService.getMyReports()
                ]);

                setProfileData(profRes.profile || profRes);
                setSnapshots(snapRes.data || snapRes.snapshots || []);
                // Ensure reports is an array
                setReports(Array.isArray(repRes) ? repRes : (repRes.data || repRes.reports || []));
            } catch (err) {
                console.error(err);
                setMessage({ type: 'error', text: 'Failed to load medical history vault.' });
            } finally {
                setLoading(false);
            }
        };
        loadHistoryData();
    }, []);

    const fetchAppointmentDetails = async (snapId, appointmentId) => {
        if (snapshotAppointments[snapId] || loadingAppointments[snapId]) return;

        try {
            setLoadingAppointments(prev => ({ ...prev, [snapId]: true }));
            const response = await appointmentService.getAppointmentById(appointmentId);
            setSnapshotAppointments(prev => ({ ...prev, [snapId]: response.appointment || response }));
        } catch (err) {
            console.error('Failed to fetch appointment details:', err);
        } finally {
            setLoadingAppointments(prev => ({ ...prev, [snapId]: false }));
        }
    };

    const handleExpandSnapshot = (snap) => {
        const isExpanded = expandedSnapshot === snap._id;
        if (!isExpanded) {
            setExpandedSnapshot(snap._id);
            if (snap.appointmentId) {
                fetchAppointmentDetails(snap._id, snap.appointmentId);
            }
        } else {
            setExpandedSnapshot(null);
        }
    };

    const clearMessage = useCallback(() => setMessage({ type: '', text: '' }), []);

    const getReportIcon = (fileUrl, iconClass = "w-4 h-4 text-slate-600") => {
        if (!fileUrl) return <FileText className={iconClass} />;
        const ext = fileUrl.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
            return <ImageIcon className={iconClass} />;
        }
        return <FileText className={iconClass} />;
    };

    // Document Upload & Archiving
    const handleUpload = async (e) => {
        e.preventDefault();
        if (!uploadFile) return setMessage({ type: 'error', text: 'Please select a file.' });
        if (!uploadTitle.trim()) return setMessage({ type: 'error', text: 'Please enter a title.' });

        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('category', uploadCategory);
        formData.append('title', uploadTitle);

        try {
            setIsUploading(true);
            const result = await patientService.uploadReport(formData);
            const newReport = result.report || result.data || result;

            setReports((prev) => [newReport, ...prev]);
            setMessage({ type: 'success', text: 'Document securely uploaded.' });

            // Reset form
            setUploadFile(null);
            setUploadTitle('');
            setUploadCategory('Lab Result');
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err) {
            setMessage({ type: 'error', text: err.message || 'Upload failed.' });
        } finally {
            setIsUploading(false);
        }
    };

    const handleArchive = async (reportId) => {
        if (!window.confirm("Are you sure you want to archive this document?")) return;

        try {
            await patientService.archiveReport(reportId);
            setReports((prev) =>
                prev.map(r => r._id === reportId ? { ...r, isDeleted: "true" } : r)
            );
            setMessage({ type: 'success', text: 'Document archived.' });
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to archive document.' });
        }
    };

    // Document Filtering Logic
    const filteredReports = reports.filter(r => {
        if (filterCategory !== 'All' && r.category !== filterCategory) return false;

        if (filterType !== 'All' && r.fileUrl) {
            const ext = r.fileUrl.split('.').pop().toLowerCase();
            const isImage = ['jpg', 'jpeg', 'png', 'webp'].includes(ext);
            const isPdf = ext === 'pdf';

            if (filterType === 'Image' && !isImage) return false;
            if (filterType === 'Document' && !isPdf) return false;
        }
        return true;
    });

    const activeReports = filteredReports.filter(r => String(r.isDeleted) !== "true");
    const archivedReports = filteredReports.filter(r => String(r.isDeleted) === "true");

    // NEW: Snapshot Filtering Logic
    const filteredSnapshots = snapshots.filter(snap => {
        if (!snapshotStartDate && !snapshotEndDate) return true;

        const snapDate = new Date(snap.createdAt);
        snapDate.setHours(0, 0, 0, 0); // Normalize time for accurate day comparison

        let isAfterStart = true;
        let isBeforeEnd = true;

        if (snapshotStartDate) {
            const start = new Date(snapshotStartDate);
            start.setHours(0, 0, 0, 0);
            isAfterStart = snapDate >= start;
        }

        if (snapshotEndDate) {
            const end = new Date(snapshotEndDate);
            end.setHours(23, 59, 59, 999); // Include the entire end day
            isBeforeEnd = snapDate <= end;
        }

        return isAfterStart && isBeforeEnd;
    });

    // Render Helpers
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                <p className="font-bold text-slate-900 tracking-wide uppercase text-xs">Decrypting Medical Vault...</p>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Header & Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Medical History</h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">Your clinical timeline and documents</p>
                </div>
                <div className="flex items-center space-x-2 bg-slate-100/50 p-1.5 rounded-xl">
                    {['Clinical Timeline', 'Medical Records'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === tab ? 'bg-white text-blue-600 shadow-xl shadow-blue-600/5' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <Toast isOpen={!!message.text} type={message.type} message={message.text} onClose={clearMessage} />

            {/* TAB 1: CLINICAL TIMELINE & SNAPSHOTS */}
            {activeTab === 'Clinical Timeline' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">

                    {/* Compact Medical Data Overview */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                            <Activity className="w-32 h-32 text-blue-500" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                            <Activity className="w-5 h-5 text-blue-500 mr-2" />
                            Current Vitals & Conditions
                        </h3>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 relative z-10">
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Blood Type</span>
                                <span className="font-semibold text-slate-800">{profileData?.bloodType || 'N/A'}</span>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Height</span>
                                <span className="font-semibold text-slate-800">{profileData?.height ? `${profileData.height} cm` : 'N/A'}</span>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Weight</span>
                                <span className="font-semibold text-slate-800">{profileData?.weight ? `${profileData.weight} kg` : 'N/A'}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
                            <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100">
                                <span className="text-xs font-semibold text-orange-600 uppercase tracking-wide block mb-2">Allergies</span>
                                <p className="text-sm text-slate-700 font-medium">
                                    {profileData?.allergies?.length ? profileData.allergies.join(', ') : 'None'}
                                </p>
                            </div>
                            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide block mb-2">Medications</span>
                                <p className="text-sm text-slate-700 font-medium">
                                    {profileData?.currentMedications?.length ? profileData.currentMedications.join(', ') : 'None'}
                                </p>
                            </div>
                            <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100">
                                <span className="text-xs font-semibold text-rose-600 uppercase tracking-wide block mb-2">Conditions</span>
                                <p className="text-sm text-slate-700 font-medium">
                                    {profileData?.chronicConditions?.length ? profileData.chronicConditions.join(', ') : 'None'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Snapshot History Section */}
                    <div>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center">
                                <Clock className="w-5 h-5 text-slate-400 mr-2" />
                                Clinical Snapshots
                            </h3>

                            {/* NEW: Date Range Filter UI */}
                            <div className="flex flex-wrap items-center gap-3 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex items-center space-x-2">
                                    <CalendarDays className="w-4 h-4 text-slate-400" />
                                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Filter Range:</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="date"
                                        value={snapshotStartDate}
                                        onChange={(e) => setSnapshotStartDate(e.target.value)}
                                        className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium focus:outline-none focus:border-blue-500 text-slate-600"
                                        title="Start Date"
                                    />
                                    <span className="text-slate-400 text-xs">-</span>
                                    <input
                                        type="date"
                                        value={snapshotEndDate}
                                        onChange={(e) => setSnapshotEndDate(e.target.value)}
                                        className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium focus:outline-none focus:border-blue-500 text-slate-600"
                                        title="End Date"
                                    />
                                </div>
                                {(snapshotStartDate || snapshotEndDate) && (
                                    <button
                                        onClick={() => { setSnapshotStartDate(''); setSnapshotEndDate(''); }}
                                        className="text-[10px] font-bold text-red-500 hover:text-red-700 uppercase tracking-wider bg-red-50 px-2 py-1 rounded"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        {filteredSnapshots.length === 0 ? (
                            <div className="text-center p-8 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                                <p className="text-slate-500 font-medium">
                                    {snapshots.length === 0
                                        ? "No medical snapshots captured yet."
                                        : "No snapshots found for the selected date range."}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredSnapshots.map((snap) => {
                                    const isExpanded = expandedSnapshot === snap._id;
                                    const dateStr = new Date(snap.createdAt).toLocaleDateString('en-US', {
                                        year: 'numeric', month: 'long', day: 'numeric'
                                    });

                                    return (
                                        <div key={snap._id} className={`bg-white border rounded-xl transition-all duration-300 ${isExpanded ? 'border-blue-300 shadow-md' : 'border-slate-200 hover:border-slate-300'}`}>
                                            <button
                                                onClick={() => handleExpandSnapshot(snap)}
                                                className="w-full px-6 py-4 flex items-center justify-between focus:outline-none"
                                            >
                                                <div className="flex items-center space-x-4">
                                                    <div className="bg-slate-100 p-2.5 rounded-lg">
                                                        <Activity className="w-5 h-5 text-slate-600" />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="font-bold text-slate-800">Snapshot captured</p>
                                                        <p className="text-xs text-slate-500 font-medium">{dateStr}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-4">
                                                    <span className="px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider rounded-full">
                                                        {snap.sharingMode?.replace(/_/g, ' ')}
                                                    </span>
                                                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                                                </div>
                                            </button>

                                            {/* Expanded Content */}
                                            {isExpanded && (
                                                <div className="px-6 pb-6 pt-2 border-t border-slate-100 animate-in fade-in duration-300">

                                                    {/* Section: Linked Appointment */}
                                                    <div className="mt-4 bg-slate-50/50 rounded-xl p-4 border border-slate-100">
                                                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center">
                                                            Linked Appointment Context
                                                        </h4>
                                                        {loadingAppointments[snap._id] ? (
                                                            <div className="flex items-center space-x-2 text-slate-400 text-xs font-medium">
                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                                <span>Loading clinical context...</span>
                                                            </div>
                                                        ) : snapshotAppointments[snap._id] ? (
                                                            <div className="space-y-4">
                                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                                    <div>
                                                                        <span className="text-[10px] text-slate-400 block mb-0.5 uppercase tracking-wide">Doctor</span>
                                                                        <span className="text-sm font-bold text-slate-800">
                                                                            {snapshotAppointments[snap._id].doctorFullName || 'Unknown'}
                                                                        </span>
                                                                        <p className="text-[9px] text-slate-500 font-medium">{snapshotAppointments[snap._id].specialty}</p>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-[10px] text-slate-400 block mb-0.5 uppercase tracking-wide">Appt. Date</span>
                                                                        <span className="text-sm font-bold text-slate-800">
                                                                            {new Date(snapshotAppointments[snap._id].appointmentDate).toLocaleDateString()}
                                                                        </span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-[10px] text-slate-400 block mb-0.5 uppercase tracking-wide">Time Slot</span>
                                                                        <span className="text-sm font-bold text-slate-800">
                                                                            {snapshotAppointments[snap._id].timeSlot}
                                                                        </span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Status</span>
                                                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${snapshotAppointments[snap._id].status?.toUpperCase() === 'COMPLETED' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
                                                                            }`}>
                                                                            {snapshotAppointments[snap._id].status}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-slate-100">
                                                                    <div>
                                                                        <span className="text-[10px] text-slate-400 block mb-0.5 uppercase tracking-wide">Reason for Appointment</span>
                                                                        <p className="text-xs font-bold text-slate-700">{snapshotAppointments[snap._id].reason || 'N/A'}</p>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-[10px] text-slate-400 block mb-0.5 uppercase tracking-wide">Consultation Fee</span>
                                                                        <p className="text-xs font-bold text-slate-700">LKR {snapshotAppointments[snap._id].consultationFee?.toLocaleString()}</p>
                                                                        <span className={`text-[9px] font-bold uppercase ${snapshotAppointments[snap._id].paymentStatus === 'paid' ? 'text-green-500' : 'text-orange-500'}`}>
                                                                            {snapshotAppointments[snap._id].paymentStatus}
                                                                        </span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-[10px] text-slate-400 block mb-0.5 uppercase tracking-wide">Sharing Mode</span>
                                                                        <p className="text-xs font-bold text-slate-700">{snapshotAppointments[snap._id].sharingMode}</p>
                                                                    </div>
                                                                    {snapshotAppointments[snap._id].notes && (
                                                                        <div className="col-span-1 md:col-span-1">
                                                                            <span className="text-[10px] text-slate-400 block mb-0.5 uppercase tracking-wide">Clinical Notes</span>
                                                                            <p className="text-[10px] text-slate-600 italic line-clamp-2">{snapshotAppointments[snap._id].notes}</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-slate-400 italic">No context available for this appointment.</span>
                                                        )}
                                                    </div>

                                                    <div className="mt-6 space-y-6">
                                                        {/* Section: Personal Reference (Identity at time of snapshot) */}
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                            <div>
                                                                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Birth Date</h4>
                                                                <p className="text-sm text-slate-800 font-semibold">{snap.dateOfBirth ? new Date(snap.dateOfBirth).toLocaleDateString() : 'N/A'}</p>
                                                            </div>
                                                            <div>
                                                                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Gender</h4>
                                                                <p className="text-sm text-slate-800 font-semibold">{snap.gender || 'N/A'}</p>
                                                            </div>
                                                            <div>
                                                                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Blood Type</h4>
                                                                <p className="text-sm text-slate-800 font-semibold">{snap.bloodType || 'N/A'}</p>
                                                            </div>
                                                        </div>

                                                        {/* Section: Clinical Data */}
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-blue-50/30 p-4 rounded-xl border border-blue-50">
                                                            <div>
                                                                <h4 className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-2">Captured Allergies</h4>
                                                                <p className="text-sm text-slate-800 font-medium">
                                                                    {snap.allergies?.length ? snap.allergies.join(', ') : 'None recorded'}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <h4 className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-2">Captured Medications</h4>
                                                                <p className="text-sm text-slate-800 font-medium">
                                                                    {snap.currentMedications?.length ? snap.currentMedications.join(', ') : 'None recorded'}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <h4 className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-2">Captured Conditions</h4>
                                                                <p className="text-sm text-slate-800 font-medium">
                                                                    {snap.chronicConditions?.length ? snap.chronicConditions.join(', ') : 'None recorded'}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Section: Emergency Contact */}
                                                        {snap.emergencyContact && (
                                                            <div className="bg-rose-50/30 p-4 rounded-xl border border-rose-50">
                                                                <h4 className="text-xs font-semibold text-rose-500 uppercase tracking-wide mb-3">Emergency Contact (Historical)</h4>
                                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                                                    <div>
                                                                        <span className="text-xs font-medium text-slate-500 mr-2">Name:</span>
                                                                        <span className="font-semibold text-slate-800">{snap.emergencyContact.name}</span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-xs font-medium text-slate-500 mr-2">Phone:</span>
                                                                        <span className="font-semibold text-slate-800">{snap.emergencyContact.phone}</span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-xs font-medium text-slate-500 mr-2">Relation:</span>
                                                                        <span className="font-semibold text-slate-800">{snap.emergencyContact.relationship}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Section: Historical Documents */}
                                                        {snap.medicalReports?.length > 0 && (
                                                            <div className="pt-4 border-t border-slate-100">
                                                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center">
                                                                    <Archive className="w-3 h-3 mr-1" />
                                                                    Historical Documents (Captured with Snapshot)
                                                                </h4>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                    {snap.medicalReports.map((report) => (
                                                                        <div key={report._id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between hover:border-blue-200 transition-colors shadow-sm">
                                                                            <div className="flex items-center space-x-3 overflow-hidden">
                                                                                <div className="bg-slate-100 p-2 rounded-lg flex-shrink-0">
                                                                                    {getReportIcon(report.fileUrl)}
                                                                                </div>
                                                                                <div className="truncate">
                                                                                    <h5 className="text-sm font-bold text-slate-800 truncate">{report.title}</h5>
                                                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                                                                        {report.category}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                            <a
                                                                                href={report.fileUrl}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                                                                                title="View Snapshot Document"
                                                                            >
                                                                                <ExternalLink className="w-4 h-4" />
                                                                            </a>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 2: MEDICAL RECORDS */}
            {activeTab === 'Medical Records' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">

                    {/* Upload Section */}
                    <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex flex-col md:flex-row gap-6 items-center shadow-sm">
                        <div className="bg-white p-4 rounded-full shadow-sm">
                            <UploadCloud className="w-8 h-8 text-blue-500" />
                        </div>
                        <form onSubmit={handleUpload} className="flex-1 flex flex-col md:flex-row gap-4 w-full">
                            <input
                                type="text"
                                placeholder="Document Title (e.g., Blood Test Jan 2024)"
                                value={uploadTitle}
                                onChange={(e) => setUploadTitle(e.target.value)}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-medium"
                            />
                            <select
                                value={uploadCategory}
                                onChange={(e) => setUploadCategory(e.target.value)}
                                className="px-4 py-2.5 rounded-xl border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-medium bg-white"
                            >
                                <option value="Lab Result">Lab Result</option>
                                <option value="Prescription">Prescription</option>
                                <option value="X-Ray">X-Ray</option>
                                <option value="Other">Other</option>
                            </select>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={(e) => setUploadFile(e.target.files[0])}
                                className="hidden"
                                id="file-upload"
                            />
                            <label
                                htmlFor="file-upload"
                                className="px-4 py-2.5 border border-blue-200 bg-white rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer text-center transition-colors"
                            >
                                {uploadFile ? uploadFile.name : 'Choose File'}
                            </label>
                            <button
                                type="submit"
                                disabled={isUploading}
                                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-md shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-70 transition-all"
                            >
                                {isUploading ? 'Uploading...' : 'Upload'}
                            </button>
                        </form>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center space-x-2 text-slate-500">
                            <Filter className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-widest">Filter Vault</span>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <select
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-blue-500"
                            >
                                <option value="All">All Categories</option>
                                <option value="Lab Result">Lab Results</option>
                                <option value="Prescription">Prescriptions</option>
                                <option value="X-Ray">X-Ray</option>
                                <option value="Other">Other</option>
                            </select>
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-blue-500"
                            >
                                <option value="All">All File Types</option>
                                <option value="Document">Documents (PDF)</option>
                                <option value="Image">Images (JPG/PNG)</option>
                            </select>
                        </div>
                    </div>

                    {/* Active Records List */}
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Current Records</h3>
                        {activeReports.length === 0 ? (
                            <div className="text-center p-8 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                                <Search className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500 font-medium">No active records match your filters.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {activeReports.map((report) => (
                                    <div key={report._id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:shadow-md transition-shadow group">
                                        <div className="flex items-center space-x-4 overflow-hidden">
                                            <div className="bg-blue-50 p-3 rounded-lg flex-shrink-0">
                                                {getReportIcon(report.fileUrl, "w-6 h-6 text-blue-600")}
                                            </div>
                                            <div className="truncate pr-4">
                                                <h4 className="font-bold text-slate-800 truncate">{report.title}</h4>
                                                <div className="flex items-center space-x-2 mt-1">
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded">
                                                        {report.category}
                                                    </span>
                                                    <span className="text-xs text-slate-400">
                                                        {new Date(report.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2 flex-shrink-0">
                                            <a
                                                href={report.fileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="View Document"
                                            >
                                                <ExternalLink className="w-5 h-5" />
                                            </a>
                                            <button
                                                onClick={() => handleArchive(report._id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Archive Document"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Archived Records List */}
                    {archivedReports.length > 0 && (
                        <div className="pt-8 border-t border-slate-200 mt-8">
                            <h3 className="text-lg font-bold text-slate-500 mb-4 flex items-center">
                                <Archive className="w-4 h-4 mr-2" />
                                Archived Records
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-75 grayscale hover:grayscale-0 transition-all duration-300">
                                {archivedReports.map((report) => (
                                    <div key={report._id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                                        <div className="flex items-center space-x-4 overflow-hidden">
                                            <div className="bg-slate-200 p-3 rounded-lg flex-shrink-0">
                                                {getReportIcon(report.fileUrl, "w-5 h-5 text-slate-500")}
                                            </div>
                                            <div className="truncate pr-4">
                                                <h4 className="font-semibold text-slate-600 truncate line-through">{report.title}</h4>
                                                <div className="flex items-center space-x-2 mt-1">
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-200 px-2 py-0.5 rounded">
                                                        {report.category}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <a
                                            href={report.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            )}
        </div>
    );
}