import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

export default function Dropdown({ 
    value, 
    options = [], 
    onChange, 
    label, 
    placeholder = 'Select',
    className = ''
}) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Handle clicking outside to close the dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value);
    const displayLabel = selectedOption ? selectedOption.label : placeholder;

    return (
        <div className={`relative min-w-[140px] flex flex-col ${className}`} ref={dropdownRef}>
            {label && (
                <label className="mb-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    {label}
                </label>
            )}
            
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between py-2.5 px-4 text-sm border rounded-xl bg-white transition-all focus:outline-none min-h-[42px]
                    ${isOpen 
                        ? 'border-blue-500 ring-4 ring-blue-500/10 text-slate-900' 
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
            >
                <span className="truncate pr-2">{displayLabel}</span>
                <ChevronDown 
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} 
                />
            </button>

            {isOpen && (
                <div className="absolute z-50 max-w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden top-full origin-top animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="max-h-60 overflow-y-auto">
                        {options.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => { 
                                    onChange(opt.value); 
                                    setIsOpen(false); 
                                }}
                                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                                    value === opt.value
                                        ? 'bg-blue-50 text-blue-700 font-semibold'
                                        : 'text-slate-700 hover:bg-blue-50'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}