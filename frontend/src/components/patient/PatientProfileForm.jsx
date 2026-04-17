import { useState, useEffect, useRef } from 'react';
import {
    Save,
    Loader2,
    User,
    Calendar,
    Phone,
    Mail,
    MapPin,
    Droplets,
    Ruler,
    Weight,
    Heart,
    Plus,
    X,
    HeartPulse,
    Siren,
    AlertCircle,
    CheckCircle,
    ShieldAlert,
    ChevronDown
} from 'lucide-react';
import Toast from '../common/Toast';

const InputWrapper = ({ label, icon: Icon, children, required }) => (
    <div className="space-y-1.5">
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative group">
            {Icon && (
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <Icon className="w-4 h-4" />
                </div>
            )}
            {children}
        </div>
    </div>
);

const BloodTypePicker = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const types = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-center space-x-2 w-full transition-all duration-300 ${isOpen ? 'scale-105' : ''}`}
            >
                <span className="text-3xl font-black text-slate-900">{value || '--'}</span>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 p-4 bg-white rounded-[2rem] shadow-2xl border border-slate-100 grid grid-cols-4 gap-2 z-50 min-w-[240px] animate-in zoom-in-95 fade-in duration-200">
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-t border-l border-slate-100 rotate-45"></div>
                    {types.map((type) => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => {
                                onChange(type);
                                setIsOpen(false);
                            }}
                            className={`
                                py-3 rounded-2xl text-sm font-black transition-all
                                ${value === type
                                    ? 'bg-red-500 text-white shadow-lg shadow-red-200 scale-110'
                                    : 'hover:bg-slate-50 text-slate-600'}
                            `}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const TagInput = ({ label, icon: Icon, tags, onAdd, onRemove, placeholder, colorClass = "blue" }) => {
    const [input, setInput] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(null);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (input.trim()) {
                onAdd(input.trim());
                setInput('');
            }
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center space-x-2 px-1">
                {Icon && <Icon className={`w-4 h-4 text-${colorClass}-500`} />}
                <h3 className="text-sm font-bold text-slate-800">{label}</h3>
            </div>
            <div className="bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-4">
                <div className="flex flex-wrap gap-2 mb-3">
                    {tags.map((tag, i) => (
                        <span
                            key={i}
                            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-${colorClass}-100 text-${colorClass}-700 shadow-sm transition-all hover:border-${colorClass}-200`}
                        >
                            <span>{tag}</span>
                            <button
                                type="button"
                                onClick={() => setConfirmDelete(tag)}
                                className="hover:text-red-500 transition-colors"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                    {tags.length === 0 && (
                        <span className="text-xs text-slate-400 font-medium italic">No {label.toLowerCase()} added yet.</span>
                    )}
                </div>
                <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        className="w-full pl-4 pr-10 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                    <button
                        type="button"
                        onClick={() => { if (input.trim()) { onAdd(input.trim()); setInput(''); } }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <Toast
                isOpen={!!confirmDelete}
                type="confirm"
                message={`Remove ${confirmDelete} from ${label.toLowerCase()}?`}
                onConfirm={() => {
                    onRemove(confirmDelete);
                    setConfirmDelete(null);
                }}
                onCancel={() => setConfirmDelete(null)}
            />
        </div>
    );
};

export default function PatientProfileForm({
    initialData = {},
    onSave,
    saving = false,
    mode = 'full', // 'full' or 'minimal'
    showTitle = true
}) {
    const [formData, setFormData] = useState({
        dateOfBirth: '',
        gender: '',
        contactNumber: '',
        email: '',
        address: '',
        bloodType: '',
        height: '',
        weight: '',
        allergies: [],
        currentMedications: [],
        chronicConditions: [],
        emergencyContact: {
            name: '',
            relationship: '',
            phone: ''
        }
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                dateOfBirth: initialData.dateOfBirth ? new Date(initialData.dateOfBirth).toISOString().split('T')[0] : '',
                gender: initialData.gender || '',
                contactNumber: initialData.contactNumber || '',
                email: initialData.email || '',
                address: initialData.address || '',
                bloodType: initialData.bloodType || '',
                height: initialData.height || '',
                weight: initialData.weight || '',
                allergies: initialData.allergies || [],
                currentMedications: initialData.currentMedications || [],
                chronicConditions: initialData.chronicConditions || [],
                emergencyContact: {
                    name: initialData.emergencyContact?.name || '',
                    relationship: initialData.emergencyContact?.relationship || '',
                    phone: initialData.emergencyContact?.phone || ''
                }
            });
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.startsWith('emergency.')) {
            const field = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                emergencyContact: { ...prev.emergencyContact, [field]: value }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleTagAdd = (field, tag) => {
        setFormData(prev => ({
            ...prev,
            [field]: [...new Set([...prev[field], tag])]
        }));
    };

    const handleTagRemove = (field, tag) => {
        setFormData(prev => ({
            ...prev,
            [field]: prev[field].filter(t => t !== tag)
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    const inputClass = "w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400 font-medium";
    const selectClass = "w-full pl-10 pr-10 py-3 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all text-slate-800 appearance-none font-medium";

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {/* Identity & Contact Section */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-8 py-5 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-600/20">
                            <User className="w-4 h-4 text-white" />
                        </div>
                        <h2 className="text-base font-bold text-slate-900">Identity & Contact</h2>
                    </div>
                </div>

                <div className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InputWrapper label="Date of Birth" icon={Calendar} required>
                            <input
                                type="date"
                                name="dateOfBirth"
                                value={formData.dateOfBirth}
                                onChange={handleChange}
                                required
                                className={inputClass}
                            />
                        </InputWrapper>

                        <InputWrapper label="Gender" icon={User} required>
                            <select
                                name="gender"
                                value={formData.gender}
                                onChange={handleChange}
                                required
                                className={selectClass}
                            >
                                <option value="">Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </InputWrapper>

                        <InputWrapper label="Contact Number" icon={Phone} required>
                            <input
                                type="tel"
                                name="contactNumber"
                                value={formData.contactNumber}
                                onChange={handleChange}
                                required
                                placeholder="+1 (555) 000-0000"
                                className={inputClass}
                            />
                        </InputWrapper>

                        <InputWrapper label="Email (Read Only)" icon={Mail}>
                            <input
                                type="email"
                                value={formData.email}
                                disabled
                                className={`${inputClass} bg-slate-100 text-slate-500 cursor-not-allowed`}
                            />
                        </InputWrapper>
                    </div>

                    <InputWrapper label="Residential Address" icon={MapPin}>
                        <textarea
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            rows="3"
                            placeholder="721 Silver Oak Lane, Suite 400, Palo Alto, CA 94304"
                            className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400 resize-none font-medium"
                        />
                    </InputWrapper>
                </div>
            </div>

            {/* Medical Vital Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: "Height", icon: Ruler, name: "height", unit: "cm", color: "blue", placeholder: "182" },
                    { label: "Weight", icon: Weight, name: "weight", unit: "kg", color: "blue", placeholder: "78.5" },
                    { label: "Blood Type", icon: Droplets, name: "bloodType", unit: "", color: "red", placeholder: "A+", isSelect: true }
                ].map((stat, i) => (
                    <div key={i} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow group">
                        <div className="flex flex-col items-center text-center space-y-3">
                            <div className={`p-3 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600 group-hover:scale-110 transition-transform`}>
                                <stat.icon className="w-5 h-5" />
                            </div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</label>

                            {stat.isSelect ? (
                                <BloodTypePicker
                                    value={formData.bloodType}
                                    onChange={(val) => setFormData(prev => ({ ...prev, bloodType: val }))}
                                />
                            ) : (
                                <div className="flex items-end space-x-2">
                                    <input
                                        type="number"
                                        name={stat.name}
                                        value={formData[stat.name]}
                                        onChange={handleChange}
                                        placeholder={stat.placeholder}
                                        className="text-2xl font-black text-slate-900 bg-transparent border-none focus:ring-0 p-0 text-center w-16 placeholder:text-slate-200"
                                    />
                                    <span className="text-xs font-bold text-blue-600 mb-1.5 uppercase">{stat.unit}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Clinical Information */}
            <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
                        <TagInput
                            label="Clinical Conditions"
                            icon={HeartPulse}
                            tags={formData.chronicConditions}
                            onAdd={(tag) => handleTagAdd('chronicConditions', tag)}
                            onRemove={(tag) => handleTagRemove('chronicConditions', tag)}
                            placeholder="Add condition (e.g. Type 2 Diabetes)"
                        />
                    </div>
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
                        <TagInput
                            label="Active Medications"
                            icon={Heart}
                            tags={formData.currentMedications}
                            onAdd={(tag) => handleTagAdd('currentMedications', tag)}
                            onRemove={(tag) => handleTagRemove('currentMedications', tag)}
                            placeholder="Add medication (e.g. Metformin)"
                        />
                    </div>
                </div>

                {mode === 'full' && (
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
                        <TagInput
                            label="Allergies"
                            icon={ShieldAlert}
                            tags={formData.allergies}
                            onAdd={(tag) => handleTagAdd('allergies', tag)}
                            onRemove={(tag) => handleTagRemove('allergies', tag)}
                            placeholder="Add allergy (e.g. Penicillin)"
                            colorClass="amber"
                        />
                    </div>
                )}
            </div>

            {/* Emergency Contact */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-8 py-5 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="bg-orange-500 p-2 rounded-xl shadow-lg shadow-orange-500/20">
                            <Siren className="w-4 h-4 text-white" />
                        </div>
                        <h2 className="text-base font-bold text-slate-900">Emergency Contact</h2>
                    </div>
                </div>
                <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <InputWrapper label="Full Name" icon={User} required>
                        <input
                            name="emergency.name"
                            value={formData.emergencyContact.name}
                            onChange={handleChange}
                            required
                            placeholder="Sarah Jane Doe"
                            className={inputClass}
                        />
                    </InputWrapper>
                    <InputWrapper label="Relationship" icon={Heart} required>
                        <input
                            name="emergency.relationship"
                            value={formData.emergencyContact.relationship}
                            onChange={handleChange}
                            required
                            placeholder="Spouse"
                            className={inputClass}
                        />
                    </InputWrapper>
                    <InputWrapper label="Emergency Phone" icon={Phone} required>
                        <input
                            name="emergency.phone"
                            value={formData.emergencyContact.phone}
                            onChange={handleChange}
                            required
                            placeholder="+1 (555) 999-0012"
                            className={inputClass}
                        />
                    </InputWrapper>
                </div>
            </div>

            {/* Submit Buttons */}
            {mode === 'full' && (
                <div className="flex items-center justify-end space-x-4 pt-4 pb-10">
                    <button
                        type="button"
                        onClick={() => window.location.reload()} // Simple discard
                        className="px-8 py-3.5 text-slate-600 text-sm font-bold rounded-2xl hover:bg-slate-100 transition-all"
                    >
                        Discard Changes
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-10 py-3.5 bg-blue-600 text-white text-sm font-bold rounded-2xl hover:bg-blue-700 active:scale-95 disabled:opacity-70 transition-all shadow-xl shadow-blue-600/30 flex items-center space-x-2.5"
                    >
                        {saving ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Save className="w-4.5 h-4.5" />}
                        <span>Save Securely</span>
                    </button>
                </div>
            )}

            {mode === 'minimal' && (
                <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-4 bg-blue-600 text-white text-sm font-bold rounded-2xl hover:bg-blue-700 active:scale-95 disabled:opacity-70 transition-all shadow-xl shadow-blue-600/20 flex justify-center items-center space-x-2.5"
                >
                    {saving ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Save className="w-4.5 h-4.5" />}
                    <span>{saving ? 'Saving...' : 'Save & Continue'}</span>
                </button>
            )}
        </form>
    );
}
