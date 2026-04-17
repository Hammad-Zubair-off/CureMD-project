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
    HeartPulse,
    Siren,
    ShieldAlert,
    Pill
} from 'lucide-react';
import {
    InputWrapper,
    BloodTypePicker,
    TagInput,
    commonInputClass,
    commonSelectClass
} from './ProfileFormShared';
import DatePicker from '../common/DatePicker';

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

    const [errors, setErrors] = useState({});

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
        let { name, value } = e.target;

        if (name === 'contactNumber' || name === 'emergency.phone') {
            value = value.replace(/[^0-9]/g, '').slice(0, 10);
        }

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

    const validateForm = () => {
        const newErrors = {};

        if (formData.dateOfBirth) {
            const today = new Date();
            const dob = new Date(formData.dateOfBirth);
            const hundredYearsAgo = new Date();
            hundredYearsAgo.setFullYear(today.getFullYear() - 100);

            if (dob > today) {
                newErrors.dateOfBirth = "Date of birth cannot be in the future";
            } else if (dob < hundredYearsAgo) {
                newErrors.dateOfBirth = "Date of birth cannot be more than 100 years ago";
            }
        }

        const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\./0-9]*$/;

        if (formData.contactNumber) {
            const numericPhone = formData.contactNumber.replace(/[^0-9]/g, '');
            if (numericPhone.length < 7 || numericPhone.length > 15 || !phoneRegex.test(formData.contactNumber)) {
                newErrors.contactNumber = "Please enter a valid phone number";
            }
        }

        if (formData.emergencyContact?.phone) {
            const numericPhone = formData.emergencyContact.phone.replace(/[^0-9]/g, '');
            if (numericPhone.length < 7 || numericPhone.length > 15 || !phoneRegex.test(formData.emergencyContact.phone)) {
                newErrors.emergencyPhone = "Please enter a valid phone number";
            }
        }

        if (formData.height && (Number(formData.height) <= 0 || Number(formData.height) > 300)) {
            newErrors.height = "Valid height is between 1-300 cm";
        }

        if (formData.weight && (Number(formData.weight) <= 0 || Number(formData.weight) > 500)) {
            newErrors.weight = "Valid weight is between 1-500 kg";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validateForm()) {
            onSave(formData);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-10">
            {/* Identity & Contact Section */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
                <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/30 rounded-t-xl flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-600/20">
                            <User className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="text-lg font-black text-slate-900 tracking-tight">Identity & Contact</h2>
                    </div>
                </div>

                <div className="p-10 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <InputWrapper label="Date of Birth" icon={Calendar} required error={errors.dateOfBirth}>
                            <DatePicker
                                value={formData.dateOfBirth}
                                onChange={(val) => setFormData(prev => ({ ...prev, dateOfBirth: val }))}
                                minDate={new Date(new Date().setFullYear(new Date().getFullYear() - 100)).toISOString().split("T")[0]}
                                maxDate={new Date().toISOString().split("T")[0]}
                                placeholder="Select your birth date"
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

                        <InputWrapper label="Contact Number" icon={Phone} required error={errors.contactNumber}>
                            <input
                                type="tel"
                                name="contactNumber"
                                value={formData.contactNumber}
                                onChange={handleChange}
                                maxLength="10"
                                required
                                placeholder="077 123 4567"
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
                            className="w-full pl-10 pr-4 py-4 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400 resize-none font-medium"
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
                    <div key={i} className={`bg-white rounded-xl border ${errors[stat.name] ? 'border-red-300' : 'border-slate-100'} p-8 shadow-sm hover:shadow-xl transition-all duration-300 group`}>
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className={`p-4 rounded-xl bg-${stat.color}-50 text-${stat.color}-600 group-hover:scale-110 transition-transform`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <label className={`text-[10px] font-black uppercase tracking-widest ${errors[stat.name] ? 'text-red-500' : 'text-slate-400'}`}>{stat.label}</label>

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
                                        className={`text-3xl font-black text-slate-800 bg-transparent border-none focus:ring-0 p-0 text-center w-16 placeholder:text-slate-200 ${errors[stat.name] ? 'text-red-500' : ''}`}
                                    />
                                    <span className="text-xs font-black text-blue-600 mb-2 uppercase">{stat.unit}</span>
                                </div>
                            )}
                            {errors[stat.name] && <p className="text-xs text-red-500 font-medium mt-1">{errors[stat.name]}</p>}
                        </div>
                    </div>
                ))}
            </div>

            {/* Clinical Information */}
            <div className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-10">
                        <TagInput
                            label="Chronic Conditions"
                            icon={HeartPulse}
                            tags={formData.chronicConditions}
                            onAdd={(tag) => handleTagAdd('chronicConditions', tag)}
                            onRemove={(tag) => handleTagRemove('chronicConditions', tag)}
                            placeholder="Add condition..."
                        />
                    </div>
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-10">
                        <TagInput
                            label="Active Medications"
                            icon={Pill}
                            tags={formData.currentMedications}
                            onAdd={(tag) => handleTagAdd('currentMedications', tag)}
                            onRemove={(tag) => handleTagRemove('currentMedications', tag)}
                            placeholder="Add medication..."
                        />
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-10">
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
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
                <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/30 rounded-t-xl flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="bg-orange-500 p-2.5 rounded-xl shadow-lg shadow-orange-500/20">
                            <Siren className="w-5 h-5 text-white" />
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
                    <InputWrapper label="Emergency Phone" icon={Phone} required error={errors.emergencyPhone}>
                        <input
                            type="tel"
                            name="emergency.phone"
                            value={formData.emergencyContact.phone}
                            onChange={handleChange}
                            maxLength="10"
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
                    className="px-8 py-4 text-slate-500 text-sm font-black rounded-xl hover:bg-slate-100 transition-all uppercase tracking-widest"
                >
                    Discard Changes
                </button>
                <button
                    type="submit"
                    disabled={saving}
                    className="px-12 py-4 bg-blue-600 text-white text-sm font-black rounded-xl hover:bg-blue-700 active:scale-95 disabled:opacity-70 transition-all shadow-2xl shadow-blue-600/30 flex items-center space-x-3 uppercase tracking-widest"
                >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    <span>{saving ? 'Updating...' : 'Save Profile'}</span>
                </button>
            </div>
        </form>
    );
}
