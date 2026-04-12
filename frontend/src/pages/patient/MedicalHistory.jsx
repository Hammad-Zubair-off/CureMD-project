import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import patientService from '../../services/patientService';
import { Loader2, Activity, AlertCircle, ShieldAlert, Pill, FileText, HeartPulse } from 'lucide-react';

const BadgeList = ({ title, icon: Icon, items, colorClass }) => (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className={`px-6 py-4 border-b border-slate-100 flex items-center space-x-2 ${colorClass.bg}`}>
            <Icon className={`w-4 h-4 ${colorClass.icon}`} />
            <h2 className={`text-sm font-bold tracking-wide uppercase ${colorClass.text}`}>{title}</h2>
        </div>
        <div className="p-6">
            {items && items.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {items.map((item, idx) => (
                        <span key={idx} className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${colorClass.badge}`}>
                            {item}
                        </span>
                    ))}
                </div>
            ) : (
                <p className="text-slate-400 text-sm">None recorded.</p>
            )}
        </div>
    </div>
);

export default function MedicalHistory() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [medicalData, setMedicalData] = useState(null);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await patientService.getMyProfile();
                const data = res.profile || res;
                setMedicalData(data);
            } catch (err) {
                setError('Failed to load medical history.');
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                <p>Loading medical history...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400">
                <AlertCircle className="w-10 h-10 mb-3 text-red-400" />
                <p className="font-medium text-slate-500">{error}</p>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Medical History</h1>
                <p className="text-sm text-slate-500 mt-1">Review your recorded medical conditions, allergies, and medications.</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-2xl border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">Blood Type</p>
                    <p className="font-bold text-xl text-red-600">{medicalData?.bloodType || 'Unknown'}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">Height</p>
                    <p className="font-bold text-xl text-slate-800">{medicalData?.height ? `${medicalData.height} cm` : 'Unknown'}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">Weight</p>
                    <p className="font-bold text-xl text-slate-800">{medicalData?.weight ? `${medicalData.weight} kg` : 'Unknown'}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">Age</p>
                    <p className="font-bold text-xl text-slate-800">{medicalData?.age ? `${medicalData.age} yrs` : 'Unknown'}</p>
                </div>
            </div>

            {/* Details */}
            <div className="space-y-6">
                <BadgeList 
                    title="Allergies" 
                    icon={ShieldAlert} 
                    items={medicalData?.allergies} 
                    colorClass={{
                        bg: 'bg-orange-50',
                        icon: 'text-orange-500',
                        text: 'text-orange-800',
                        badge: 'bg-orange-50 text-orange-700 border-orange-200'
                    }}
                />

                <BadgeList 
                    title="Current Medications" 
                    icon={Pill} 
                    items={medicalData?.currentMedications} 
                    colorClass={{
                        bg: 'bg-blue-50',
                        icon: 'text-blue-500',
                        text: 'text-blue-800',
                        badge: 'bg-blue-50 text-blue-700 border-blue-200'
                    }}
                />

                <BadgeList 
                    title="Chronic Conditions" 
                    icon={HeartPulse} 
                    items={medicalData?.chronicConditions} 
                    colorClass={{
                        bg: 'bg-rose-50',
                        icon: 'text-rose-500',
                        text: 'text-rose-800',
                        badge: 'bg-rose-50 text-rose-700 border-rose-200'
                    }}
                />
                
                {/* Reports Placehoder */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-purple-500" />
                        <h2 className="text-sm font-bold text-slate-800 tracking-wide uppercase text-purple-800">Medical Reports</h2>
                    </div>
                    <div className="p-6">
                        {medicalData?.medicalReports && medicalData.medicalReports.length > 0 ? (
                            <ul className="space-y-2">
                                {medicalData.medicalReports.map((report, idx) => (
                                    <li key={idx} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        <span className="text-sm font-medium text-slate-700">{report.title}</span>
                                        <a href={report.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">View</a>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-slate-400 text-sm">No medical reports uploaded.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}