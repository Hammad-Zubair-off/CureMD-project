import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import doctorService from '../../services/doctorService';
import {
    UserCircle, Plus, Trash2, Save, RefreshCw,
    CheckCircle2, AlertCircle, GraduationCap, Briefcase,
    Video, Phone, MessageSquare, Zap, ChevronDown, ChevronUp,
} from 'lucide-react';

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

const Select = ({ children, className = '', ...props }) => (
    <select
        className={`w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white
        focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-800 ${className}`}
        {...props}
    >
        {children}
    </select>
);

const SectionCard = ({ title, icon: Icon, children, defaultOpen = true }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-6 py-4 border-b border-slate-100 hover:bg-slate-50/80 transition-colors"
            >
                <div className="flex items-center space-x-2.5">
                    <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
                        <Icon className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <span className="text-sm font-semibold text-slate-800">{title}</span>
                </div>
                {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {open && <div className="p-6">{children}</div>}
        </div>
    );
};

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
    phoneNumbers: [],
    education: [],
    experience: [],
    certifications: [],
    areasOfExpertise: [],
    languagesSpoken: [],
};

export default function DoctorProfile() {
    const { user } = useAuth();
    const [form, setForm] = useState(DEFAULT);
    const [isNew, setIsNew] = useState(true);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [certInput, setCertInput] = useState('');
    const [expertInput, setExpertInput] = useState('');
    const [langInput, setLangInput] = useState('');
    const [phoneInput, setPhoneInput] = useState('');

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
                    phoneNumbers: p.phoneNumbers || [],
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

    // ── phone numbers ──────────────────────────────────────────────────────────
    const addPhone = () => {
        const trimmed = phoneInput.trim();
        if (!trimmed) return;
        if (form.phoneNumbers.length >= 5) return;
        // basic client-side format check
        if (!/^\+?[0-9]{7,15}$/.test(trimmed)) {
            setError('Phone number must be 7–15 digits, optionally starting with +');
            return;
        }
        setError('');
        setForm(f => ({ ...f, phoneNumbers: [...f.phoneNumbers, trimmed] }));
        setPhoneInput('');
    };
    const removePhone = (i) =>
        setForm(f => ({ ...f, phoneNumbers: f.phoneNumbers.filter((_, idx) => idx !== i) }));

    // ── education ──────────────────────────────────────────────────────────────
    const addEducation = () => setForm(f => ({ ...f, education: [...f.education, { degree: '', institution: '', year: '' }] }));
    const updateEducation = (i, key, val) => setForm(f => {
        const ed = [...f.education]; ed[i] = { ...ed[i], [key]: val }; return { ...f, education: ed };
    });
    const removeEducation = (i) => setForm(f => ({ ...f, education: f.education.filter((_, idx) => idx !== i) }));

    // ── experience ─────────────────────────────────────────────────────────────
    const addExperience = () => setForm(f => ({
        ...f, experience: [...f.experience, { hospital: '', role: '', from: '', to: '', isCurrent: false }]
    }));
    const updateExperience = (i, key, val) => setForm(f => {
        const ex = [...f.experience]; ex[i] = { ...ex[i], [key]: val }; return { ...f, experience: ex };
    });
    const removeExperience = (i) => setForm(f => ({ ...f, experience: f.experience.filter((_, idx) => idx !== i) }));

    // ── tag fields ─────────────────────────────────────────────────────────────
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
            setTimeout(() => setSuccess(''), 4000);
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
        <div className="px-4 sm:px-8 py-6 max-w-3xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{isNew ? 'Create Your Profile' : 'My Profile'}</h1>
                    <p className="text-slate-500 text-sm mt-0.5">
                        {isNew ? 'Complete your profile to get approved and go live on HealthConnect.' : 'Keep your information accurate and up to date for patients.'}
                    </p>
                </div>
                {!isNew && (
                    <span className={`px-3 py-1.5 text-xs font-bold rounded-lg border ${user?.isApproved ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                        {user?.isApproved ? '✓ Approved' : '⏳ Pending'}
                    </span>
                )}
            </div>

            {success && (
                <div className="flex items-center space-x-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 mb-5">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /><span className="font-medium">{success}</span>
                </div>
            )}
            {error && (
                <div className="flex items-center space-x-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 mb-5">
                    <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

                {/* ── Basic Information ───────────────────────────────────────── */}
                <SectionCard title="Basic Information" icon={UserCircle}>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        <div>
                            <Label required>Title</Label>
                            <Select value={form.title} onChange={e => set('title', e.target.value)}>
                                <option>Dr.</option>
                                <option>Prof.</option>
                                <option>Assoc. Prof.</option>
                            </Select>
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
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div>
                            <Label required>Specialization</Label>
                            <Input value={form.specialization} onChange={e => set('specialization', e.target.value)} placeholder="Cardiology" required />
                        </div>
                        <div>
                            <Label required>Years of Experience</Label>
                            <Input type="number" min="0" value={form.yearsOfExperience} onChange={e => set('yearsOfExperience', e.target.value)} placeholder="10" required />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div>
                            <Label required>License Number</Label>
                            <Input
                                value={form.licenseNumber}
                                onChange={e => set('licenseNumber', e.target.value)}
                                placeholder="MED-12345"
                                required
                                disabled={!isNew}
                                className={!isNew ? 'bg-slate-50 cursor-not-allowed text-slate-400' : ''}
                            />
                            {!isNew && <p className="text-[11px] text-slate-400 mt-1">License number cannot be changed.</p>}
                        </div>
                        <div>
                            <Label>Current Hospital</Label>
                            <Input value={form.currentHospital} onChange={e => set('currentHospital', e.target.value)} placeholder="City General Hospital" />
                        </div>
                    </div>

                    {/* ── Phone Numbers ─────────────────────────────────────── */}
                    <div className="mb-4">
                        <Label>
                            Phone Numbers{' '}
                            <span className="text-slate-400 font-normal">(max 5)</span>
                        </Label>
                        <div className="flex gap-2 mb-2">
                            <Input
                                value={phoneInput}
                                onChange={e => setPhoneInput(e.target.value)}
                                placeholder="+94771234567"
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPhone(); } }}
                                disabled={form.phoneNumbers.length >= 5}
                                className={form.phoneNumbers.length >= 5 ? 'bg-slate-50 cursor-not-allowed text-slate-400' : ''}
                            />
                            <button
                                type="button"
                                onClick={addPhone}
                                disabled={form.phoneNumbers.length >= 5}
                                className="px-3.5 py-2 text-white rounded-xl hover:opacity-90 transition-all shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                        {form.phoneNumbers.length >= 5 && (
                            <p className="text-[11px] text-amber-500 mb-1.5">Maximum of 5 phone numbers reached.</p>
                        )}
                        <div className="flex flex-wrap gap-1.5">
                            {form.phoneNumbers.map((phone, i) => (
                                <span
                                    key={i}
                                    className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg border border-blue-100 font-mono font-medium"
                                >
                                    <Phone className="w-3 h-3 shrink-0" />
                                    <span>{phone}</span>
                                    <button
                                        type="button"
                                        onClick={() => removePhone(i)}
                                        className="text-blue-400 hover:text-red-500 transition-colors font-bold ml-0.5"
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                            {form.phoneNumbers.length === 0 && (
                                <p className="text-xs text-slate-400">No phone numbers added yet.</p>
                            )}
                        </div>
                    </div>

                    <div>
                        <Label>Bio</Label>
                        <textarea
                            rows={3}
                            maxLength={1000}
                            value={form.bio}
                            onChange={e => set('bio', e.target.value)}
                            placeholder="Briefly describe your practice, approach, and expertise..."
                            className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white resize-none focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-300 text-slate-800"
                        />
                        <p className="text-[11px] text-slate-400 mt-1">{form.bio.length}/1000 characters</p>
                    </div>
                </SectionCard>

                {/* ── Consultation Settings ───────────────────────────────────── */}
                <SectionCard title="Consultation Settings" icon={Video}>
                    <div className="grid grid-cols-2 gap-3 mb-5">
                        <div>
                            <Label required>Consultation Fee ($)</Label>
                            <Input type="number" min="0" value={form.consultationFee} onChange={e => set('consultationFee', e.target.value)} placeholder="50" required />
                        </div>
                        <div className="flex items-end pb-0.5">
                            <label className="flex items-center space-x-2.5 cursor-pointer">
                                <div
                                    onClick={() => set('emergencyAvailable', !form.emergencyAvailable)}
                                    className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 cursor-pointer ${form.emergencyAvailable ? 'bg-blue-600' : 'bg-slate-200'}`}
                                >
                                    <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${form.emergencyAvailable ? 'translate-x-4' : ''}`} />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-700">Emergency Available</p>
                                    <p className="text-xs text-slate-400">Accept urgent cases</p>
                                </div>
                            </label>
                        </div>
                    </div>
                    <Label>Consultation Types</Label>
                    <div className="flex flex-wrap gap-3 mt-1.5">
                        {[
                            { key: 'videoCall', label: 'Video Call', icon: Video },
                            { key: 'audioCall', label: 'Audio Call', icon: Phone },
                            { key: 'chat', label: 'Chat', icon: MessageSquare },
                        ].map(({ key, label, icon: Icon }) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setConsultationType(key, !form.consultationTypes[key])}
                                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${form.consultationTypes[key]
                                    ? 'text-white border-blue-600 shadow-sm'
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-blue-200 hover:text-blue-600'}`}
                                style={form.consultationTypes[key] ? { background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' } : {}}
                            >
                                <Icon className="w-3.5 h-3.5" /><span>{label}</span>
                            </button>
                        ))}
                    </div>
                </SectionCard>

                {/* ── Education ───────────────────────────────────────────────── */}
                <SectionCard title="Education" icon={GraduationCap} defaultOpen={false}>
                    <div className="space-y-3">
                        {form.education.map((ed, i) => (
                            <div key={i} className="grid grid-cols-7 gap-2 items-end p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                                <div className="col-span-3">
                                    <Label>Degree</Label>
                                    <Input value={ed.degree} onChange={e => updateEducation(i, 'degree', e.target.value)} placeholder="MBBS" />
                                </div>
                                <div className="col-span-3">
                                    <Label>Institution</Label>
                                    <Input value={ed.institution} onChange={e => updateEducation(i, 'institution', e.target.value)} placeholder="Harvard Medical School" />
                                </div>
                                <div className="col-span-1 flex items-end justify-end">
                                    <button type="button" onClick={() => removeEducation(i)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {form.education.length === 0 && (
                            <p className="text-xs text-slate-400 text-center py-3 bg-slate-50 rounded-lg border border-dashed border-slate-200">No education entries added yet.</p>
                        )}
                        <button type="button" onClick={addEducation} className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800 font-semibold px-2 py-1.5 hover:bg-blue-50 rounded-lg transition-all">
                            <Plus className="w-4 h-4" /><span>Add Education</span>
                        </button>
                    </div>
                </SectionCard>

                {/* ── Work Experience ─────────────────────────────────────────── */}
                <SectionCard title="Work Experience" icon={Briefcase} defaultOpen={false}>
                    <div className="space-y-3">
                        {form.experience.map((ex, i) => (
                            <div key={i} className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <Label>Hospital / Clinic</Label>
                                        <Input value={ex.hospital} onChange={e => updateExperience(i, 'hospital', e.target.value)} placeholder="City General Hospital" />
                                    </div>
                                    <div>
                                        <Label>Role</Label>
                                        <Input value={ex.role} onChange={e => updateExperience(i, 'role', e.target.value)} placeholder="Senior Cardiologist" />
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-24">
                                        <Label>From</Label>
                                        <Input type="number" value={ex.from} onChange={e => updateExperience(i, 'from', e.target.value)} placeholder="2015" />
                                    </div>
                                    {!ex.isCurrent && (
                                        <div className="w-24">
                                            <Label>To</Label>
                                            <Input type="number" value={ex.to} onChange={e => updateExperience(i, 'to', e.target.value)} placeholder="2020" />
                                        </div>
                                    )}
                                    <div className="flex items-center space-x-2 mt-5">
                                        <input type="checkbox" id={`curr-${i}`} checked={ex.isCurrent} onChange={e => updateExperience(i, 'isCurrent', e.target.checked)} className="accent-blue-600 w-3.5 h-3.5" />
                                        <label htmlFor={`curr-${i}`} className="text-xs text-slate-600 font-medium cursor-pointer">Current</label>
                                    </div>
                                    <div className="flex-1 flex justify-end mt-5">
                                        <button type="button" onClick={() => removeExperience(i)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {form.experience.length === 0 && (
                            <p className="text-xs text-slate-400 text-center py-3 bg-slate-50 rounded-lg border border-dashed border-slate-200">No work experience added yet.</p>
                        )}
                        <button type="button" onClick={addExperience} className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800 font-semibold px-2 py-1.5 hover:bg-blue-50 rounded-lg transition-all">
                            <Plus className="w-4 h-4" /><span>Add Experience</span>
                        </button>
                    </div>
                </SectionCard>

                {/* ── Skills & Languages ──────────────────────────────────────── */}
                <SectionCard title="Skills & Languages" icon={Zap} defaultOpen={false}>
                    {[
                        { label: 'Areas of Expertise', field: 'areasOfExpertise', val: expertInput, set: setExpertInput, placeholder: 'e.g. Interventional Cardiology' },
                        { label: 'Languages Spoken', field: 'languagesSpoken', val: langInput, set: setLangInput, placeholder: 'e.g. English' },
                        { label: 'Certifications', field: 'certifications', val: certInput, set: setCertInput, placeholder: 'e.g. FACC' },
                    ].map(({ label, field, val, set: setVal, placeholder }) => (
                        <div key={field} className="mb-5 last:mb-0">
                            <Label>{label}</Label>
                            <div className="flex gap-2 mb-2">
                                <Input
                                    value={val}
                                    onChange={e => setVal(e.target.value)}
                                    placeholder={placeholder}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(field, val, setVal); } }}
                                />
                                <button type="button" onClick={() => addTag(field, val, setVal)} className="px-3.5 py-2 text-white rounded-xl hover:opacity-90 transition-all shrink-0" style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {form[field].map((tag, i) => (
                                    <span key={i} className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg border border-blue-100 font-medium">
                                        <span>{tag}</span>
                                        <button type="button" onClick={() => removeTag(field, i)} className="text-blue-400 hover:text-red-500 transition-colors font-bold">×</button>
                                    </span>
                                ))}
                                {form[field].length === 0 && <p className="text-xs text-slate-400">None added yet.</p>}
                            </div>
                        </div>
                    ))}
                </SectionCard>

                <div className="flex justify-end pt-2 pb-8">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center space-x-2 px-8 py-3 text-white text-sm font-bold rounded-xl transition-all shadow-md disabled:opacity-60"
                        style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}
                    >
                        {saving
                            ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>Saving...</span></>
                            : <><Save className="w-4 h-4" /><span>{isNew ? 'Create Profile' : 'Save Changes'}</span></>
                        }
                    </button>
                </div>
            </form>
        </div>
    );
}