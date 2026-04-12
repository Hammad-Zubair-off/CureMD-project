import React, { useState, useEffect, useRef } from 'react';
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
    Activity,
    ShieldAlert
} from 'lucide-react';
import { 
    InputWrapper, 
    BloodTypePicker, 
    TagInput,
    commonInputClass, 
    commonSelectClass 
} from './ProfileFormShared';

export default function PatientProfileUpdate({ initialData, onSave, saving = false }) {
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

    // Use a ref to track if initial data has been applied to avoid re-renders resetting state
    const dataApplied = useRef(false);

    useEffect(() => {
        if (initialData && !dataApplied.current) {
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
            dataApplied.current = true;
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

    return (
        <form onSubmit={handleSubmit} className="space-y-10">
            {/* Identity & Contact Section */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-600/20">
                            <User className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="text-lg font-black text-slate-900 tracking-tight">Identity & Contact</h2>
                    </div>
                </div>
                
                <div className="p-10 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <InputWrapper label="Date of Birth" icon={Calendar} required>
                            <input 
                                type="date" 
                                name="dateOfBirth"
                                value={formData.dateOfBirth}
                                onChange={handleChange}
                                required
                                className={commonInputClass}
                            />
                        </InputWrapper>

                        <InputWrapper label="Gender" icon={User} required>
                            <select 
                                name="gender"
                                value={formData.gender}
                                onChange={handleChange}
                                required
                                className={commonSelectClass}
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
                                placeholder="+94 77 123 4567"
                                className={commonInputClass}
                            />
                        </InputWrapper>

                        <InputWrapper label="Email Address (Linked)" icon={Mail}>
                            <input 
                                type="email" 
                                value={formData.email}
                                disabled
                                className={`${commonInputClass} bg-slate-100 text-slate-500 cursor-not-allowed`}
                            />
                        </InputWrapper>
                    </div>

                    <InputWrapper label="Residential Address" icon={MapPin}>
                        <textarea 
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            rows="2"
                            placeholder="Your current home address..."
                            className="w-full pl-10 pr-4 py-4 text-sm bg-slate-50 border border-slate-200 rounded-3xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400 resize-none font-medium"
                        />
                    </InputWrapper>
                </div>
            </div>

            {/* Medical Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                    { label: "Height", icon: Ruler, name: "height", unit: "cm", color: "blue", placeholder: "182" },
                    { label: "Weight", icon: Weight, name: "weight", unit: "kg", color: "blue", placeholder: "78.5" },
                    { label: "Blood", icon: Droplets, name: "bloodType", unit: "", color: "red", isSelect: true }
                ].map((stat, i) => (
                    <div key={i} className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm hover:shadow-xl transition-all duration-300 group">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className={`p-4 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600 group-hover:scale-110 transition-transform`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</label>
                            
                            {stat.isSelect ? (
                                <BloodTypePicker 
                                    value={formData.bloodType} 
                                    onChange={(val) => setFormData(prev => ({ ...prev, bloodType: val }))} 
                                />
                            ) : (
                                <div className="flex items-end justify-center space-x-2 w-full">
                                    <input 
                                        type="number" 
                                        name={stat.name}
                                        value={formData[stat.name]}
                                        onChange={handleChange}
                                        placeholder={stat.placeholder}
                                        className="text-3xl font-black text-slate-800 bg-transparent border-none focus:ring-0 p-0 text-center w-16 placeholder:text-slate-200"
                                    />
                                    <span className="text-xs font-black text-blue-600 mb-2 uppercase">{stat.unit}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Clinical Information */}
            <div className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10">
                        <TagInput 
                            label="Chronic Conditions" 
                            icon={Activity}
                            tags={formData.chronicConditions}
                            onAdd={(tag) => handleTagAdd('chronicConditions', tag)}
                            onRemove={(tag) => handleTagRemove('chronicConditions', tag)}
                            placeholder="Add condition..."
                        />
                    </div>
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10">
                        <TagInput 
                            label="Active Medications" 
                            icon={Heart}
                            tags={formData.currentMedications}
                            onAdd={(tag) => handleTagAdd('currentMedications', tag)}
                            onRemove={(tag) => handleTagRemove('currentMedications', tag)}
                            placeholder="Add medication..."
                        />
                    </div>
                </div>
                
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10">
                    <TagInput 
                        label="Known Allergies" 
                        icon={ShieldAlert}
                        tags={formData.allergies}
                        onAdd={(tag) => handleTagAdd('allergies', tag)}
                        onRemove={(tag) => handleTagRemove('allergies', tag)}
                        placeholder="Add allergy..."
                        colorClass="amber"
                    />
                </div>
            </div>

            {/* Emergency Contact */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="bg-orange-500 p-2.5 rounded-xl shadow-lg shadow-orange-500/20">
                            <Activity className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="text-lg font-black text-slate-900 tracking-tight">Emergency Contact</h2>
                    </div>
                </div>
                <div className="p-10 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <InputWrapper label="Contact Name" icon={User} required>
                        <input 
                            name="emergency.name"
                            value={formData.emergencyContact.name}
                            onChange={handleChange}
                            required
                            placeholder="Full Name"
                            className={commonInputClass}
                        />
                    </InputWrapper>
                    <InputWrapper label="Relationship" icon={Heart} required>
                        <input 
                            name="emergency.relationship"
                            value={formData.emergencyContact.relationship}
                            onChange={handleChange}
                            required
                            placeholder="e.g. Spouse"
                            className={commonInputClass}
                        />
                    </InputWrapper>
                    <InputWrapper label="Emergency Phone" icon={Phone} required>
                        <input 
                            name="emergency.phone"
                            value={formData.emergencyContact.phone}
                            onChange={handleChange}
                            required
                            placeholder="Contact Number"
                            className={commonInputClass}
                        />
                    </InputWrapper>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-6 pt-6 pb-12">
                <button 
                    type="button"
                    onClick={() => window.location.reload()}
                    className="px-8 py-4 text-slate-500 text-sm font-black rounded-2xl hover:bg-slate-100 transition-all uppercase tracking-widest"
                >
                    Discard Changes
                </button>
                <button 
                    type="submit" 
                    disabled={saving}
                    className="px-12 py-4 bg-blue-600 text-white text-sm font-black rounded-2xl hover:bg-blue-700 active:scale-95 disabled:opacity-70 transition-all shadow-2xl shadow-blue-600/30 flex items-center space-x-3 uppercase tracking-widest"
                >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    <span>{saving ? 'Updating...' : 'Save Vault'}</span>
                </button>
            </div>
        </form>
    );
}
