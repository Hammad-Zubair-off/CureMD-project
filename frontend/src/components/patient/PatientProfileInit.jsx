import React, { useState } from 'react';
import {
    Save,
    Loader2,
    User,
    Calendar,
    Phone,
    Droplets,
    Ruler,
    Weight,
    Heart,
    HeartPulse,
    Info
} from 'lucide-react';
import {
    InputWrapper,
    BloodTypePicker,
    commonInputClass,
    commonSelectClass
} from './ProfileFormShared';

const PHONE_REGEX = /^\+?[0-9]{7,15}$/;
const VALID_BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const validateBookingForm = (formData) => {
    const errors = [];

    if (!formData.dateOfBirth) {
        errors.push('Date of birth is required.');
    } else {
        const dob = new Date(formData.dateOfBirth);
        if (Number.isNaN(dob.getTime())) errors.push('Date of birth must be a valid date.');
        else if (dob >= new Date()) errors.push('Date of birth must be in the past.');
    }

    if (!formData.gender) errors.push('Gender is required.');

    if (!formData.contactNumber?.trim()) {
        errors.push('Contact number is required.');
    } else if (!PHONE_REGEX.test(formData.contactNumber.trim())) {
        errors.push('Contact number must be 7–15 digits and may start with +.');
    }

    if (!formData.bloodType) {
        errors.push('Blood type is required.');
    } else if (!VALID_BLOOD_TYPES.includes(formData.bloodType)) {
        errors.push('Please select a valid blood type.');
    }

    const ec = formData.emergencyContact || {};
    if (!ec.name?.trim()) errors.push('Emergency contact name is required.');
    if (!ec.relationship?.trim()) errors.push('Emergency contact relationship is required.');
    if (!ec.phone?.trim()) {
        errors.push('Emergency contact phone is required.');
    } else if (!PHONE_REGEX.test(ec.phone.trim())) {
        errors.push('Emergency contact phone must be 7–15 digits and may start with +.');
    }

    return errors;
};

export default function PatientProfileInit({ onSave, saving = false }) {
    const [formData, setFormData] = useState({
        dateOfBirth: '',
        gender: '',
        contactNumber: '',
        bloodType: '',
        emergencyContact: {
            name: '',
            relationship: '',
            phone: ''
        }
    });

    const [formError, setFormError] = useState('');

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
        if (formError) setFormError('');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const errors = validateBookingForm(formData);
        if (errors.length > 0) {
            setFormError(errors.join(' '));
            return;
        }
        onSave(formData);
    };

    const maxDob = new Date().toISOString().split('T')[0];

    return (
        <form onSubmit={handleSubmit} className="space-y-8">

            {formError && (
                <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-2xl">
                    {formError}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputWrapper label="Date of Birth" icon={Calendar} required>
                    <input
                        type="date"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleChange}
                        max={maxDob}
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
                        placeholder="0771234567 or +94771234567"
                        inputMode="tel"
                        className={commonInputClass}
                    />
                </InputWrapper>

                <div className="bg-slate-50/50 rounded-2xl p-4 flex items-center justify-between border border-slate-100">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                            <Droplets className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Blood Type</span>
                    </div>
                    <div className="w-24">
                        <BloodTypePicker
                            value={formData.bloodType}
                            onChange={(val) => setFormData(prev => ({ ...prev, bloodType: val }))}
                        />
                    </div>
                </div>
            </div>

            <div className="bg-slate-50/30 rounded-3xl p-6 border border-slate-100 space-y-6">
                <div className="flex items-center space-x-3 px-2">
                    <Heart className="w-4 h-4 text-orange-500" />
                    <h3 className="text-sm font-bold text-slate-800">Emergency Contact</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                        name="emergency.name"
                        value={formData.emergencyContact.name}
                        onChange={handleChange}
                        required
                        placeholder="Contact Name"
                        className={commonInputClass}
                    />
                    <input
                        name="emergency.relationship"
                        value={formData.emergencyContact.relationship}
                        onChange={handleChange}
                        required
                        placeholder="Relationship"
                        className={commonInputClass}
                    />
                    <input
                        name="emergency.phone"
                        value={formData.emergencyContact.phone}
                        onChange={handleChange}
                        required
                        placeholder="Phone Number"
                        className={commonInputClass}
                    />
                </div>
            </div>

            {/* Quick Setup Message */}
            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex items-start space-x-3 mb-2">
                <div className="bg-blue-600 p-1.5 rounded-lg text-white mt-0.5">
                    <Info className="w-4 h-4" />
                </div>
                <p className="text-xs text-blue-700 font-medium leading-relaxed">
                    Setting up these core details will unlock the booking vault. You can add more clinical information like <strong>allergies</strong> and <strong>medications</strong> later in your Profile Page.
                </p>
            </div>

            <button
                type="submit"
                disabled={saving}
                className="w-full py-4 bg-blue-600 text-white text-sm font-bold rounded-2xl hover:bg-blue-700 active:scale-95 disabled:opacity-70 transition-all shadow-xl shadow-blue-600/20 flex justify-center items-center space-x-2.5"
            >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                <span>{saving ? 'Verifying Info...' : 'Complete Profile & Book'}</span>
            </button>

        </form>
    );
}
