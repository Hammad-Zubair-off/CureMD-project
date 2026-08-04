import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import patientService from '../../services/patientService';
import { getApiErrorMessage } from '../../utils/apiError';
import authService from '../../services/authService';
import PatientProfileUpdate from '../../components/patient/PatientProfileUpdate';
import Toast from '../../components/common/Toast';
import {
    Loader2,
    Lock,
    ExternalLink,
    Settings,
    CheckCircle,
    Camera,
    User,
    Edit3,
    Droplets,
    Ruler,
    Weight,
    ShieldAlert,
    Pill,
    HeartPulse,
    MapPin,
    Phone,
    Calendar,
    X
} from 'lucide-react';

// --- Small Reusable Badge Component for View Mode ---
const DetailBadge = ({ label, value, icon: Icon, colorClass }) => (
    <div className={`p-4 rounded-xl border flex items-center space-x-4 ${colorClass.bg} ${colorClass.border}`}>
        <div className={`p-3 rounded-lg ${colorClass.iconBg}`}>
            <Icon className={`w-5 h-5 ${colorClass.icon}`} />
        </div>
        <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</p>
            <p className="font-bold text-slate-800">{value || 'Not set'}</p>
        </div>
    </div>
);

export default function MyProfile() {
    const { user, updateUser } = useAuth();
    const fileInputRef = useRef(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingPic, setUploadingPic] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [profileData, setProfileData] = useState(null);

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                // Fetch both clinical profile and user account details
                const [profileRes, userRes] = await Promise.all([
                    patientService.getMyProfile(),
                    authService.getMe()
                ]);

                const p = profileRes.profile || profileRes;
                const u = userRes.user || userRes;

                setProfileData({ 
                    ...p, 
                    email: u.email || p.email,
                    fullName: u.fullName || u.displayName || u.name || p.fullName
                });
                
                // Sync auth context if needed
                const freshName = u.fullName || u.displayName || u.name;
                if (freshName && freshName !== user?.name) {
                    updateUser({ name: freshName });
                }
            } catch (err) {
                setMessage({ type: 'error', text: 'Failed to load profile data.' });
            } finally {
                setLoading(false);
            }
        };
        fetchAllData();
    }, [user?.id]);

    const handleSave = async (formData) => {
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const payload = {
                ...formData,
                height: formData.height ? Number(formData.height) : undefined,
                weight: formData.weight ? Number(formData.weight) : undefined
            };

            await patientService.updateProfile(payload);
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            setProfileData(prev => ({ ...prev, ...formData }));
            setIsEditing(false); // Switch back to view mode on success
        } catch (err) {
            setMessage({
                type: 'error',
                text: getApiErrorMessage(err, 'Failed to update profile.'),
            });
        } finally {
            setSaving(false);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        setUploadingPic(true);
        try {
            const res = await patientService.uploadProfilePicture(formData);
            // UPDATE: Matching the new backend response fields
            setProfileData(prev => ({
                ...prev,
                profileImageUrl: res.profileImageUrl,
                profileImagePublicId: res.profileImagePublicId
            }));
            updateUser({
                profileImageUrl: res.profileImageUrl,
                profileImagePublicId: res.profileImagePublicId
            });
            setMessage({ type: 'success', text: 'Profile picture updated!' });
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to upload image.' });
        } finally {
            setUploadingPic(false);
        }
    };

    const clearMessage = useCallback(() => setMessage({ type: '', text: '' }), []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                <p className="font-bold text-slate-900 tracking-wide uppercase text-xs">Accessing Clinical Records...</p>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">Your personal and medical health records</p>
                </div>
                <div className="flex items-center">
                    {!isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="inline-flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-slate-900/20 active:scale-95"
                        >
                            <Edit3 className="w-4 h-4" />
                            <span>Edit Profile</span>
                        </button>
                    )}
                </div>
            </div>

            <Toast isOpen={!!message.text} type={message.type} message={message.text} onClose={clearMessage} />

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                {/* Hero Profile Card */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 flex flex-col md:flex-row items-center md:items-start gap-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50 pointer-events-none"></div>

                    {/* Avatar Upload Section */}
                    <div className="relative group z-10">
                        <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-slate-100 flex items-center justify-center">
                            {uploadingPic ? (
                                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                            ) : profileData?.profileImageUrl ? (
                                <img src={profileData.profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-12 h-12 text-slate-300" />
                            )}
                        </div>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute bottom-0 right-0 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 hover:scale-105 transition-all"
                        >
                            <Camera className="w-4 h-4" />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                            accept="image/*"
                            className="hidden"
                        />
                    </div>

                    {/* Basic Details */}
                    <div className="flex-1 text-center md:text-left z-10">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
                            <h2 className="text-2xl font-bold text-slate-900">{profileData?.fullName || user?.name || 'Patient Profile'}</h2>
                        </div>

                        <p className="text-slate-500 font-medium mb-6">{profileData?.email}</p>

                        <div className="flex flex-wrap justify-center md:justify-start gap-3">
                            <span className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm font-medium text-slate-600 flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-slate-400" />
                                {profileData?.gender || 'Gender Not Set'}
                            </span>
                            <span className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm font-medium text-slate-600 flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                {profileData?.contactNumber || 'No Phone'}
                            </span>
                            {profileData?.address && (
                                <span className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm font-medium text-slate-600 flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                    {profileData.address}
                                </span>
                            )}
                            {profileData?.dateOfBirth && (
                                <span className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm font-medium text-slate-600 flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                    Born: {new Date(profileData.dateOfBirth).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                            )}
                            {profileData?.age && (
                                <span className="px-4 py-2 bg-blue-50 border border-blue-100 rounded-lg text-sm font-bold text-blue-700">
                                    {profileData.age} Years Old
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* View Mode OR Edit Mode */}
                {isEditing ? (
                    <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-slate-800">Update Medical Records</h3>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="inline-flex items-center space-x-2 px-4 py-2 border border-slate-200 text-slate-500 rounded-xl text-xs font-bold hover:bg-slate-100 hover:text-slate-800 transition-all uppercase tracking-widest"
                            >
                                <X className="w-3.5 h-3.5" />
                                <span>Cancel Editing</span>
                            </button>
                        </div>
                        {/* FIX: Adding a key forces the component to remount and grab the freshest profileData */}
                        <PatientProfileUpdate key="edit-form" initialData={profileData} onSave={handleSave} saving={saving} />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <DetailBadge
                            label="Blood Type" value={profileData?.bloodType} icon={Droplets}
                            colorClass={{ bg: 'bg-white', border: 'border-red-100', iconBg: 'bg-red-50', icon: 'text-red-500' }}
                        />
                        <DetailBadge
                            label="Height" value={profileData?.height ? `${profileData.height} cm` : null} icon={Ruler}
                            colorClass={{ bg: 'bg-white', border: 'border-blue-100', iconBg: 'bg-blue-50', icon: 'text-blue-500' }}
                        />
                        <DetailBadge
                            label="Weight" value={profileData?.weight ? `${profileData.weight} kg` : null} icon={Weight}
                            colorClass={{ bg: 'bg-white', border: 'border-emerald-100', iconBg: 'bg-emerald-50', icon: 'text-emerald-500' }}
                        />

                        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
                            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                                <div className="flex items-center space-x-2 mb-4">
                                    <ShieldAlert className="w-4 h-4 text-orange-500" />
                                    <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Allergies</h4>
                                </div>
                                <p className="text-sm text-slate-600 font-medium leading-relaxed">
                                    {profileData?.allergies?.length ? profileData.allergies.join(', ') : 'None reported.'}
                                </p>
                            </div>
                            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                                <div className="flex items-center space-x-2 mb-4">
                                    <Pill className="w-4 h-4 text-blue-500" />
                                    <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Medications</h4>
                                </div>
                                <p className="text-sm text-slate-600 font-medium leading-relaxed">
                                    {profileData?.currentMedications?.length ? profileData.currentMedications.join(', ') : 'None reported.'}
                                </p>
                            </div>
                            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                                <div className="flex items-center space-x-2 mb-4">
                                    <HeartPulse className="w-4 h-4 text-rose-500" />
                                    <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Conditions</h4>
                                </div>
                                <p className="text-sm text-slate-600 font-medium leading-relaxed">
                                    {profileData?.chronicConditions?.length ? profileData.chronicConditions.join(', ') : 'None reported.'}
                                </p>
                            </div>
                        </div>

                        {/* Section: Emergency Contact */}
                        {profileData?.emergencyContact && (
                            <div className="md:col-span-3 bg-white p-6 rounded-xl border border-orange-100 shadow-sm mt-2">
                                <div className="flex items-center space-x-3 mb-6">
                                    <div className="bg-orange-500 p-2 rounded-lg shadow-md shadow-orange-500/20">
                                        <User className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-sm">Emergency Contact</h4>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/50">
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Contact Name</p>
                                        <p className="font-bold text-slate-800">{profileData.emergencyContact.name || 'Not provided'}</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/50">
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Relationship</p>
                                        <p className="font-bold text-slate-800">{profileData.emergencyContact.relationship || 'Not provided'}</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/50">
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Emergency Phone</p>
                                        <p className="font-bold text-blue-600">{profileData.emergencyContact.phone || 'Not provided'}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}