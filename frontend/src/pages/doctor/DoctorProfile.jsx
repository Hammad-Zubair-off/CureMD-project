import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import doctorService from '../../services/doctorService';
import {
    UserCircle, Plus, Trash2, Save, RefreshCw,
    CheckCircle2, AlertCircle, GraduationCap, Briefcase,
    Video, Phone, MessageSquare, Zap
} from 'lucide-react';
import Dropdown from '../../components/common/Dropdown';
import Toast from '../../components/common/Toast';

const Label = ({ children, required }) => (
    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
        {children} {required && <span className="text-red-400">*</span>}
    </label>
);

const Input = ({ className = '', ...props }) => (
    <input
        className={`w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white
        focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all
        placeholder:text-slate-300 text-slate-800 ${className}`}
        {...props}
    />
);

// Updated statically opened Content Card for the right side
const ContentCard = ({ title, icon: Icon, children }) => (
    <div className="bg-white rounded-xl border border-blue-100 shadow-xs overflow-hidden">
        <div className="flex items-center space-x-3 px-6 py-5 border-b border-slate-100 bg-slate-50/50">
            <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-blue-700" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">{title}</h2>
        </div>
        <div className="p-6">
            {children}
        </div>
    </div>
);

const DEFAULT = {
    title: 'Dr.',
    firstName: '',
    lastName: '',
    specialization: '',
    yearsOfExperience: '',
    licenseNumber: '',
    currentHospital: '',
    bio: '',
    consultationFee: '',
    consultationTypes: { videoCall: true, audioCall: false, chat: false },
    emergencyAvailable: false,
    education: [],
    experience: [],
    certifications: [],
    areasOfExpertise: [],
    languagesSpoken: [],
};

const SECTIONS = [
    { id: 'basic', label: 'Basic Information', icon: UserCircle },
    { id: 'settings', label: 'Consultation Settings', icon: Video },
    { id: 'education', label: 'Education', icon: GraduationCap },
    { id: 'experience', label: 'Work Experience', icon: Briefcase },
    { id: 'skills', label: 'Skills & Languages', icon: Zap },
];

export default function DoctorProfile() {
    const { user } = useAuth();
    
    // UI Layout state
    const [activeSection, setActiveSection] = useState('basic');

    // Form logic states
    const [form, setForm] = useState(DEFAULT);
    const [isNew, setIsNew] = useState(true);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [certInput, setCertInput] = useState('');
    const [expertInput, setExpertInput] = useState('');
    const [langInput, setLangInput] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                const res = await doctorService.getMyProfile();
                const p = res.data;
                setForm({
                    title: p.title || 'Dr.',
                    firstName: p.firstName || '',
                    lastName: p.lastName || '',
                    specialization: p.specialization || '',
                    yearsOfExperience: p.yearsOfExperience ?? '',
                    licenseNumber: p.licenseNumber || '',
                    currentHospital: p.currentHospital || '',
                    bio: p.bio || '',
                    consultationFee: p.consultationFee ?? '',
                    consultationTypes: p.consultationTypes || DEFAULT.consultationTypes,
                    emergencyAvailable: p.emergencyAvailable || false,
                    education: p.education || [],
                    experience: p.experience || [],
                    certifications: p.certifications || [],
                    areasOfExpertise: p.areasOfExpertise || [],
                    languagesSpoken: p.languagesSpoken || [],
                });
                setIsNew(false);
            } catch (err) {
                if (err.response?.status === 404) setIsNew(true);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
    const setConsultationType = (type, val) =>
        setForm(f => ({ ...f, consultationTypes: { ...f.consultationTypes, [type]: val } }));

    const addEducation = () => setForm(f => ({ ...f, education: [...f.education, { degree: '', institution: '', year: '' }] }));
    const updateEducation = (i, key, val) => setForm(f => {
        const ed = [...f.education]; ed[i] = { ...ed[i], [key]: val }; return { ...f, education: ed };
    });
    const removeEducation = (i) => setForm(f => ({ ...f, education: f.education.filter((_, idx) => idx !== i) }));

    const addExperience = () => setForm(f => ({
        ...f, experience: [...f.experience, { hospital: '', role: '', from: '', to: '', isCurrent: false }]
    }));
    const updateExperience = (i, key, val) => setForm(f => {
        const ex = [...f.experience]; ex[i] = { ...ex[i], [key]: val }; return { ...f, experience: ex };
    });
    const removeExperience = (i) => setForm(f => ({ ...f, experience: f.experience.filter((_, idx) => idx !== i) }));

    const addTag = (field, val, setter) => {
        if (!val.trim()) return;
        setForm(f => ({ ...f, [field]: [...f[field], val.trim()] }));
        setter('');
    };
    const removeTag = (field, i) => setForm(f => ({ ...f, [field]: f[field].filter((_, idx) => idx !== i) }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');
        try {
            const payload = {
                ...form,
                yearsOfExperience: Number(form.yearsOfExperience),
                consultationFee: Number(form.consultationFee),
                education: form.education.map(ed => ({ ...ed, year: ed.year ? Number(ed.year) : undefined })),
                experience: form.experience.map(ex => ({
                    ...ex,
                    from: Number(ex.from),
                    to: ex.isCurrent ? undefined : Number(ex.to),
                })),
            };
            if (isNew) {
                await doctorService.createProfile(payload);
                setIsNew(false);
                setSuccess('Profile created! Awaiting admin approval.');
            } else {
                await doctorService.updateProfile(payload);
                setSuccess('Profile updated successfully.');
            }
        } catch (err) {
            setError(err.response?.data?.message || err.response?.data?.error || 'Failed to save profile.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center space-y-3">
                <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
                <p className="text-sm text-slate-500">Loading profile...</p>
            </div>
        </div>
    );

    return (
        <div className="px-4 sm:px-8 py-8 max-w-7xl mx-auto">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{isNew ? 'Create Your Profile' : 'My Profile'}</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        {isNew ? 'Complete your profile to get approved and go live on HealthConnect.' : 'Keep your information accurate and up to date for patients.'}
                    </p>
                </div>
                {!isNew && (
                    <span className={`px-4 py-2 text-xs font-bold rounded-xl border ${user?.isApproved ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                        {user?.isApproved ? '✓ Approved' : '⏳ Pending'}
                    </span>
                )}
            </div>

            <Toast 
                isOpen={!!success}
                type="success"
                message={success}
                onClose={() => setSuccess('')}
            />

            <Toast 
                isOpen={!!error}
                type="error"
                message={error}
                onClose={() => setError('')}
            />

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-11 gap-8 lg:gap-0 items-start">
                    
                    {/* Left Column - Navigation Sidebar (col-span-4) */}
                    <div className="lg:col-span-4 lg:pr-8">
                        <div className="flex flex-col space-y-3.5 lg:sticky lg:top-[25vh] border border-slate-200/60 bg-white p-4 rounded-xl shadow-xs">
                            {SECTIONS.map(({ id, label, icon: Icon }) => (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => setActiveSection(id)}
                                    className={`flex items-center w-full space-x-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${
                                        activeSection === id
                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                                    }`}
                                >
                                    <Icon className={`w-5 h-5 shrink-0 ${activeSection === id ? 'text-white' : 'text-slate-400'}`} />
                                    <span>{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right Column - Content Panel (col-span-7 with dividing line) */}
                    <div className="lg:col-span-7 flex flex-col lg:pl-8 lg:border-l lg:border-slate-300/85">
                        
                        {/* BASIC INFORMATION */}
                        {activeSection === 'basic' && (
                            <ContentCard title="Basic Information" icon={UserCircle}>
                                <div className="grid grid-cols-3 gap-4 mb-5">
                                    <div>
                                        <Label required>Title</Label>
                                        <Dropdown
                                            value={form.title}
                                            onChange={(val) => set('title', val)}
                                            options={[
                                                { value: 'Dr.', label: 'Dr.' },
                                                { value: 'Prof.', label: 'Prof.' }
                                            ]}
                                        />
                                    </div>
                                    <div>
                                        <Label required>First Name</Label>
                                        <Input value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="John" required />
                                    </div>
                                    <div>
                                        <Label required>Last Name</Label>
                                        <Input value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Smith" required />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mb-5">
                                    <div>
                                        <Label required>Specialization</Label>
                                        <Input value={form.specialization} onChange={e => set('specialization', e.target.value)} placeholder="Cardiology" required />
                                    </div>
                                    <div>
                                        <Label required>Years of Experience</Label>
                                        <Input type="number" min="0" value={form.yearsOfExperience} onChange={e => set('yearsOfExperience', e.target.value)} placeholder="10" required />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mb-5">
                                    <div>
                                        <Label required>License Number</Label>
                                        <Input value={form.licenseNumber} onChange={e => set('licenseNumber', e.target.value)} placeholder="MED-12345" required disabled={!isNew} className={!isNew ? 'bg-slate-50 cursor-not-allowed text-slate-400' : ''} />
                                        {!isNew && <p className="text-[11px] text-slate-400 mt-1.5">License number cannot be changed.</p>}
                                    </div>
                                    <div>
                                        <Label>Current Hospital</Label>
                                        <Input value={form.currentHospital} onChange={e => set('currentHospital', e.target.value)} placeholder="City General Hospital" />
                                    </div>
                                </div>
                                <div>
                                    <Label>Bio</Label>
                                    <textarea
                                        rows={4}
                                        maxLength={1000}
                                        value={form.bio}
                                        onChange={e => set('bio', e.target.value)}
                                        placeholder="Briefly describe your practice, approach, and expertise..."
                                        className="w-full px-3.5 py-3 text-sm border border-slate-200 rounded-xl bg-white resize-none focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-300 text-slate-800"
                                    />
                                    <p className="text-[11px] text-slate-400 mt-1.5">{form.bio.length}/1000 characters</p>
                                </div>
                            </ContentCard>
                        )}

                        {/* CONSULTATION SETTINGS */}
                        {activeSection === 'settings' && (
                            <ContentCard title="Consultation Settings" icon={Video}>
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div>
                                        <Label required>Consultation Fee ($)</Label>
                                        <Input type="number" min="0" value={form.consultationFee} onChange={e => set('consultationFee', e.target.value)} placeholder="50" required />
                                    </div>
                                    <div className="flex items-center pb-0.5 mt-5">
                                        <label className="flex items-center space-x-3 cursor-pointer p-2 rounded-xl hover:bg-slate-50 transition-colors">
                                            <div
                                                onClick={() => set('emergencyAvailable', !form.emergencyAvailable)}
                                                className={`w-10 h-6 shrink-0 rounded-full transition-colors flex items-center px-0.5 cursor-pointer ${form.emergencyAvailable ? 'bg-blue-600' : 'bg-slate-300'}`}
                                            >
                                                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${form.emergencyAvailable ? 'translate-x-4' : ''}`} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800 leading-tight">Emergency Available</p>
                                                <p className="text-[11px] text-slate-500 mt-0.5">Accept urgent cases</p>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                                <Label>Consultation Types</Label>
                                <div className="flex flex-wrap gap-3 mt-2">
                                    {[
                                        { key: 'videoCall', label: 'Video Call', icon: Video },
                                        { key: 'audioCall', label: 'Audio Call', icon: Phone },
                                        { key: 'chat', label: 'Chat', icon: MessageSquare },
                                    ].map(({ key, label, icon: Icon }) => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => setConsultationType(key, !form.consultationTypes[key])}
                                            className={`flex items-center space-x-2 px-5 py-3 rounded-xl text-sm font-semibold border transition-all ${form.consultationTypes[key]
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                                                : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600'}`}
                                        >
                                            <Icon className="w-4 h-4" /><span>{label}</span>
                                        </button>
                                    ))}
                                </div>
                            </ContentCard>
                        )}

                        {/* EDUCATION */}
                        {activeSection === 'education' && (
                            <ContentCard title="Education" icon={GraduationCap}>
                                <div className="space-y-4">
                                    {form.education.map((ed, i) => (
                                        <div key={i} className="grid grid-cols-7 gap-3 items-end p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                                            <div className="col-span-3">
                                                <Label>Degree</Label>
                                                <Input value={ed.degree} onChange={e => updateEducation(i, 'degree', e.target.value)} placeholder="MBBS" />
                                            </div>
                                            <div className="col-span-3">
                                                <Label>Institution</Label>
                                                <Input value={ed.institution} onChange={e => updateEducation(i, 'institution', e.target.value)} placeholder="Harvard Medical School" />
                                            </div>
                                            <div className="col-span-1 flex justify-end">
                                                <button type="button" onClick={() => removeEducation(i)} className="p-2.5 text-slate-400 hover:text-red-600 border border-transparent hover:border-red-200 hover:bg-white rounded-xl hover:shadow-sm transition-all">
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {form.education.length === 0 && (
                                        <p className="text-sm text-slate-500 text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-300">No education entries added yet.</p>
                                    )}
                                    <div className="pt-2">
                                        <button type="button" onClick={addEducation} className="w-full flex items-center justify-center space-x-2 text-sm text-blue-600 hover:text-blue-700 font-semibold px-4 py-3 hover:bg-blue-50 rounded-xl transition-all border border-blue-100 hover:border-blue-200 border-dashed">
                                            <Plus className="w-4 h-4" /><span>Add Education</span>
                                        </button>
                                    </div>
                                </div>
                            </ContentCard>
                        )}

                        {/* WORK EXPERIENCE */}
                        {activeSection === 'experience' && (
                            <ContentCard title="Work Experience" icon={Briefcase}>
                                <div className="space-y-4">
                                    {form.experience.map((ex, i) => (
                                        <div key={i} className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label>Hospital / Clinic</Label>
                                                    <Input value={ex.hospital} onChange={e => updateExperience(i, 'hospital', e.target.value)} placeholder="City General Hospital" />
                                                </div>
                                                <div>
                                                    <Label>Role</Label>
                                                    <Input value={ex.role} onChange={e => updateExperience(i, 'role', e.target.value)} placeholder="Senior Cardiologist" />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="w-28">
                                                    <Label>From Year</Label>
                                                    <Input type="number" value={ex.from} onChange={e => updateExperience(i, 'from', e.target.value)} placeholder="2015" />
                                                </div>
                                                {!ex.isCurrent && (
                                                    <div className="w-28">
                                                        <Label>To Year</Label>
                                                        <Input type="number" value={ex.to} onChange={e => updateExperience(i, 'to', e.target.value)} placeholder="2020" />
                                                    </div>
                                                )}
                                                <div className="flex items-center space-x-2 mt-5 bg-white px-3 py-2 rounded-xl border border-slate-200">
                                                    <input type="checkbox" id={`curr-${i}`} checked={ex.isCurrent} onChange={e => updateExperience(i, 'isCurrent', e.target.checked)} className="accent-blue-600 w-4 h-4 rounded" />
                                                    <label htmlFor={`curr-${i}`} className="text-sm text-slate-700 font-medium cursor-pointer">Currently Working</label>
                                                </div>
                                                <div className="flex-1 flex justify-end mt-5">
                                                    <button type="button" onClick={() => removeExperience(i)} className="p-2.5 text-slate-400 hover:text-red-600 border border-transparent hover:border-red-200 hover:bg-white rounded-xl hover:shadow-sm transition-all">
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {form.experience.length === 0 && (
                                        <p className="text-sm text-slate-500 text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-300">No work experience added yet.</p>
                                    )}
                                    <div className="pt-2">
                                        <button type="button" onClick={addExperience} className="w-full flex items-center justify-center space-x-2 text-sm text-blue-600 hover:text-blue-700 font-semibold px-4 py-3 hover:bg-blue-50 rounded-xl transition-all border border-blue-100 hover:border-blue-200 border-dashed">
                                            <Plus className="w-4 h-4" /><span>Add Experience</span>
                                        </button>
                                    </div>
                                </div>
                            </ContentCard>
                        )}

                        {/* SKILLS & LANGUAGES */}
                        {activeSection === 'skills' && (
                            <ContentCard title="Skills & Languages" icon={Zap}>
                                <div className="space-y-6">
                                    {[
                                        { label: 'Areas of Expertise', field: 'areasOfExpertise', val: expertInput, set: setExpertInput, placeholder: 'type e.g. Interventional Cardiology and press Add' },
                                        { label: 'Languages Spoken', field: 'languagesSpoken', val: langInput, set: setLangInput, placeholder: 'type e.g. English and press Add' },
                                        { label: 'Certifications', field: 'certifications', val: certInput, set: setCertInput, placeholder: 'type e.g. FACC and press Add' },
                                    ].map(({ label, field, val, set: setVal, placeholder }) => (
                                        <div key={field}>
                                            <Label>{label}</Label>
                                            <div className="flex gap-2 mb-3">
                                                <Input
                                                    value={val}
                                                    onChange={e => setVal(e.target.value)}
                                                    placeholder={placeholder}
                                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(field, val, setVal); } }}
                                                />
                                                <button type="button" onClick={() => addTag(field, val, setVal)} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl hover:shadow-md transition-all shrink-0 flex items-center space-x-1">
                                                    <Plus className="w-4 h-4" /> <span>Add</span>
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 min-h-[50px]">
                                                {form[field].map((tag, i) => (
                                                    <span key={i} className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-100/50 text-blue-700 text-xs rounded-xl border border-blue-200 font-semibold shadow-sm">
                                                        <span>{tag}</span>
                                                        <button type="button" onClick={() => removeTag(field, i)} className="text-blue-400 hover:text-red-500 hover:bg-red-50 rounded p-0.5 transition-colors font-bold">
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </span>
                                                ))}
                                                {form[field].length === 0 && <p className="text-xs text-slate-400 m-auto">Nothing added yet.</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ContentCard>
                        )}
                        
                        {/* Global Save Button at bottom of Content panel */}
                        <div className="flex justify-end mt-6">
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex items-center justify-center space-x-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-60 w-full sm:w-auto focus:outline-none focus:ring-4 focus:ring-blue-500/20"
                            >
                                {saving
                                    ? <><RefreshCw className="w-5 h-5 animate-spin" /><span>Saving Profile...</span></>
                                    : <><Save className="w-5 h-5" /><span>{isNew ? 'Create Profile' : 'Save Changes'}</span></>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}