import { useState } from 'react';
import { Info, ChevronDown, ChevronUp, User, Stethoscope, Shield, FileScan, UploadCloud, Eye } from 'lucide-react';

const rows = [
    {
        action: 'Upload lab results, X-rays, prescriptions',
        patient: 'You — Document Vault tab',
        doctor: 'View only (if you shared FULL mode)',
        admin: 'No access',
        icon: UploadCloud,
        color: 'text-blue-600 bg-blue-50',
    },
    {
        action: 'Update allergies, medications, conditions',
        patient: 'You — edit below or My Profile',
        doctor: 'Cannot edit your data',
        admin: 'No access',
        icon: User,
        color: 'text-emerald-600 bg-emerald-50',
    },
    {
        action: 'Clinical snapshots (frozen history)',
        patient: 'Auto-created when you book',
        doctor: 'Read-only per appointment',
        admin: 'No access',
        icon: FileScan,
        color: 'text-violet-600 bg-violet-50',
    },
    {
        action: 'Archive / remove a document',
        patient: 'You — archive button on each file',
        doctor: 'Cannot delete your files',
        admin: 'No access',
        icon: Eye,
        color: 'text-amber-600 bg-amber-50',
    },
];

export default function MedicalHistoryGuide() {
    const [open, setOpen] = useState(true);

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50/80 transition-colors text-left"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                        <Info className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900">Who can do what?</p>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                            Your medical vault is private — only you manage it
                        </p>
                    </div>
                </div>
                {open ? (
                    <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                )}
            </button>

            {open && (
                <div className="px-5 pb-5 border-t border-slate-100 animate-in fade-in duration-200">
                    <div className="hidden md:grid grid-cols-[1.4fr_1fr_1fr_0.8fr] gap-3 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        <span>Action</span>
                        <span className="flex items-center gap-1"><User className="w-3 h-3" /> Patient (you)</span>
                        <span className="flex items-center gap-1"><Stethoscope className="w-3 h-3" /> Doctor</span>
                        <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Admin</span>
                    </div>

                    <div className="space-y-3 mt-2 md:mt-0">
                        {rows.map(({ action, patient, doctor, admin, icon: Icon, color }) => (
                            <div
                                key={action}
                                className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 md:grid md:grid-cols-[1.4fr_1fr_1fr_0.8fr] md:gap-3 md:items-center"
                            >
                                <div className="flex items-start gap-3 md:col-span-1">
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <p className="text-sm font-semibold text-slate-800 leading-snug">{action}</p>
                                </div>
                                <div className="mt-3 md:mt-0 pl-12 md:pl-0 space-y-2 md:space-y-0">
                                    <p className="md:hidden text-[10px] font-bold uppercase tracking-widest text-blue-600">Patient</p>
                                    <p className="text-xs text-slate-600 font-medium">{patient}</p>
                                </div>
                                <div className="pl-12 md:pl-0">
                                    <p className="md:hidden text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-2">Doctor</p>
                                    <p className="text-xs text-slate-500">{doctor}</p>
                                </div>
                                <div className="pl-12 md:pl-0">
                                    <p className="md:hidden text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-2">Admin</p>
                                    <p className="text-xs text-slate-400">{admin}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
