import React, { useState, useEffect, useRef } from 'react';
import { 
    Plus, 
    X,
    ChevronDown
} from 'lucide-react';
import Toast from '../common/Toast';

export const InputWrapper = ({ label, icon: Icon, children, required }) => (
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

export const BloodTypePicker = ({ value, onChange }) => {
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
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 p-4 bg-white rounded-xl shadow-2xl border border-slate-100 grid grid-cols-4 gap-2 z-50 min-w-[240px] animate-in zoom-in-95 fade-in duration-200">
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
                                py-3 rounded-xl text-sm font-black transition-all
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

export const TagInput = ({ label, icon: Icon, tags, onAdd, onRemove, placeholder, colorClass = "blue" }) => {
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
            <div className="bg-slate-50/50 rounded-xl border border-dashed border-slate-200 p-4">
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

export const commonInputClass = "w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400 font-medium";
export const commonSelectClass = "w-full pl-10 pr-10 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all text-slate-800 appearance-none font-medium";
