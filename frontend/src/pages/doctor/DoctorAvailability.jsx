import { useState, useEffect } from 'react';
import doctorService from '../../services/doctorService';
import {
    CalendarDays, Plus, Trash2, Save, RefreshCw,
    CheckCircle2, AlertCircle, Clock, Info, ChevronDown, ChevronUp
} from 'lucide-react';
import Dropdown from '../../components/common/Dropdown';
import Toast from '../../components/common/Toast';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const TIME_OPTIONS = (() => {
    const opts = [];
    for (let h = 0; h < 24; h++) {
        for (let m of [0, 30]) {
            const hh = String(h).padStart(2, '0');
            const mm = String(m).padStart(2, '0');
            const label = `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${mm} ${h < 12 ? 'AM' : 'PM'}`;
            opts.push({ value: `${hh}:${mm}`, label });
        }
    }
    return opts;
})();

const DEFAULT_SLOT = { startTime: '09:00', endTime: '09:30' };

const buildScheduleMap = (availability) => {
    const map = {};
    DAYS.forEach(d => { map[d] = { enabled: false, slots: [] }; });
    (availability || []).forEach(({ day, slots }) => {
        map[day] = { enabled: true, slots: slots.map(s => ({ ...s })) };
    });
    return map;
};

function TimeSelect({ value, onChange }) {
    return (
        <Dropdown
            value={value}
            onChange={onChange}
            options={TIME_OPTIONS}
            className="flex-1" 
        />
    );
}

function DayCard({ day, data, onToggle, onAddSlot, onUpdateSlot, onRemoveSlot }) {
    const isWeekend = day === 'Saturday' || day === 'Sunday';
    
    const [isExpanded, setIsExpanded] = useState(data.enabled);

    const handleToggle = (e) => {
        e.stopPropagation(); 
        onToggle();
        if (!data.enabled) {
            setIsExpanded(true);
        }
    };
    
    return (
        <div className={`mx-auto rounded-xl border transition-all duration-200 max-w-6xl ${data.enabled ? 'border-blue-300 bg-white' : 'border-slate-200 bg-slate-50 hover:bg-slate-100/50 hover:border-slate-300'}`}>
            
            {/* Header / Clickable Bar */}
            <div 
                onClick={() => data.enabled && setIsExpanded(!isExpanded)}
                className={`flex items-center justify-between px-5 py-4 ${data.enabled ? 'cursor-pointer hover:bg-slate-50/50' : ''} ${data.enabled && isExpanded ? 'border-b border-slate-100' : ''} rounded-t-xl`}
            >
                <div className="flex items-center space-x-4">
                    <button
                        type="button"
                        onClick={handleToggle}
                        className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${data.enabled ? 'bg-blue-500' : 'bg-slate-300'}`}
                    >
                        <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${data.enabled ? 'translate-x-5' : ''}`} />
                    </button>
                    <span className={`text-[15px] font-semibold ${data.enabled ? 'text-slate-900' : 'text-slate-500'}`}>{day}</span>
                    {isWeekend && (
                        <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-600 rounded-md font-bold uppercase tracking-wider border border-amber-200">Weekend</span>
                    )}
                </div>

                {data.enabled && (
                    <div className="flex items-center space-x-3">
                        <span className="text-[11px] text-blue-700 font-bold bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 uppercase tracking-wider">
                            {data.slots.length} slot{data.slots.length !== 1 ? 's' : ''}
                        </span>
                        {/* Collapse/Expand Icon */}
                        <div className="p-1 text-slate-400 rounded-lg transition-colors">
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                    </div>
                )}
            </div>
            
            {/* Expanded Content Area: Needs data.enabled AND isExpanded */}
            {data.enabled && isExpanded && (
                <div className="p-5 space-y-3">
                    {data.slots.length === 0 && (
                        <p className="text-sm text-slate-500 text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                            No slots added yet. Click below to add.
                        </p>
                    )}
                    {data.slots.map((slot, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 bg-slate-50/50 rounded-xl border border-slate-100">
                            <Clock className="w-4 h-4 text-slate-400 ml-2 shrink-0" />
                            <TimeSelect value={slot.startTime} onChange={val => onUpdateSlot(i, 'startTime', val)} />
                            <span className="text-sm text-slate-400 shrink-0 font-medium px-1">to</span>
                            <TimeSelect value={slot.endTime} onChange={val => onUpdateSlot(i, 'endTime', val)} />
                            <button 
                                type="button" 
                                onClick={() => onRemoveSlot(i)} 
                                className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-xl transition-all shrink-0 border border-transparent hover:border-red-200 hover:shadow-sm"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                    <button 
                        type="button" 
                        onClick={onAddSlot} 
                        className="w-full flex items-center justify-center space-x-2 text-sm text-blue-600 hover:text-blue-700 font-semibold px-4 py-3 bg-blue-50/50 hover:bg-blue-50 rounded-xl transition-all mt-2 border border-blue-100 hover:border-blue-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                    >
                        <Plus className="w-4 h-4" /><span>Add another time slot</span>
                    </button>
                </div>
            )}
        </div>
    );
}

export default function DoctorAvailability() {
    const [schedule, setSchedule] = useState(() => buildScheduleMap([]));
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                const res = await doctorService.getMyProfile();
                const availability = res.data?.availability || [];
                setSchedule(buildScheduleMap(availability));
            } catch (err) {
                if (err.response?.status !== 404) setError('Failed to load availability.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const toggleDay = (day) => {
        setSchedule(s => ({
            ...s,
            [day]: { ...s[day], enabled: !s[day].enabled, slots: s[day].enabled ? [] : [{ ...DEFAULT_SLOT }] },
        }));
    };

    const addSlot = (day) => {
        setSchedule(s => ({ ...s, [day]: { ...s[day], slots: [...s[day].slots, { ...DEFAULT_SLOT }] } }));
    };

    const updateSlot = (day, i, key, val) => {
        setSchedule(s => {
            const slots = [...s[day].slots];
            slots[i] = { ...slots[i], [key]: val };
            return { ...s, [day]: { ...s[day], slots } };
        });
    };

    const removeSlot = (day, i) => {
        setSchedule(s => {
            const slots = s[day].slots.filter((_, idx) => idx !== i);
            return { ...s, [day]: { ...s[day], slots, enabled: slots.length > 0 ? s[day].enabled : false } };
        });
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        setSuccess('');
        try {
            const availability = DAYS
                .filter(day => schedule[day].enabled && schedule[day].slots.length > 0)
                .map(day => ({ day, slots: schedule[day].slots }));
            await doctorService.setAvailability({ availability });
            setSuccess('Availability saved successfully!');
        } catch (err) {
            setError(err.response?.data?.message || err.response?.data?.error || 'Failed to save availability.');
        } finally {
            setSaving(false);
        }
    };

    const activeDays = DAYS.filter(d => schedule[d].enabled).length;
    const totalSlots = DAYS.reduce((acc, d) => acc + (schedule[d].enabled ? schedule[d].slots.length : 0), 0);

    if (loading) return (
        <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center space-y-3">
                <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
                <p className="text-sm text-slate-500 font-medium">Loading schedule...</p>
            </div>
        </div>
    );

    return (
        <div className="px-4 sm:px-8 py-8 max-w-7xl mx-auto">
            <div className="mb-8 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Weekly Availability</h1>
                    <p className="text-slate-500 text-sm mt-1">Configure the days and time slots when patients can book consultations.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center justify-center space-x-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-60 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
                >
                    {saving
                        ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>Saving...</span></>
                        : <><Save className="w-4 h-4" /><span>Save Schedule</span></>
                    }
                </button>
            </div>

            <div className="flex flex-wrap items-center gap-4 mb-8">
                <div className="flex items-center space-x-4 px-5 py-4 bg-white border border-slate-200 rounded-xl shadow-xs min-w-40">
                    <div className="p-2.5 bg-blue-50 rounded-xl">
                        <CalendarDays className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <div className="text-xl font-bold text-slate-900 leading-none">{activeDays}</div>
                        <div className="text-[11px] text-slate-500 uppercase font-bold tracking-wider mt-1.5">Active Days</div>
                    </div>
                </div>
                <div className="flex items-center space-x-4 px-5 py-4 bg-white border border-slate-200 rounded-xl shadow-xs min-w-[160px]">
                    <div className="p-2.5 bg-blue-50 rounded-xl">
                        <Clock className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <div className="text-xl font-bold text-slate-900 leading-none">{totalSlots}</div>
                        <div className="text-[11px] text-slate-500 uppercase font-bold tracking-wider mt-1.5">Total Slots</div>
                    </div>
                </div>
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

            <div className="max-w-6xl mx-auto flex items-start space-x-3 px-5 py-4 bg-blue-50/80 border border-blue-200 rounded-xl text-sm text-blue-800 mb-8 shadow-xs">
                <Info className="w-5 h-5 shrink-0 mt-0.5 text-blue-600" />
                <p className="leading-relaxed">Toggle a day on to add bookable time slots. Each slot represents one patient appointment window. Saving will replace your entire schedule.</p>
            </div>

            <div className="space-y-4 pb-12">
                {DAYS.map(day => (
                    <DayCard
                        key={day}
                        day={day}
                        data={schedule[day]}
                        onToggle={() => toggleDay(day)}
                        onAddSlot={() => addSlot(day)}
                        onUpdateSlot={(i, key, val) => updateSlot(day, i, key, val)}
                        onRemoveSlot={(i) => removeSlot(day, i)}
                    />
                ))}
            </div>
        </div>
    );
}