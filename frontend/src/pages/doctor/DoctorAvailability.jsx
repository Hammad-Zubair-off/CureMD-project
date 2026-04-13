import { useState, useEffect } from 'react';
import doctorService from '../../services/doctorService';
import {
    CalendarDays, Plus, Trash2, Save, RefreshCw,
    CheckCircle2, AlertCircle, Clock, Info,
} from 'lucide-react';

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
        <select
            value={value}
            onChange={e => onChange(e.target.value)}
            className="flex-1 px-2.5 py-2 text-xs border border-blue-100 rounded-lg bg-white text-slate-700
            focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
        >
            {TIME_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
    );
}

function DayCard({ day, data, onToggle, onAddSlot, onUpdateSlot, onRemoveSlot }) {
    const isWeekend = day === 'Saturday' || day === 'Sunday';
    return (
        <div className={`rounded-xl border transition-all ${data.enabled ? 'border-blue-200 bg-white shadow-sm' : 'border-slate-200 bg-slate-50/80'}`}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                    <button
                        type="button"
                        onClick={onToggle}
                        className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 cursor-pointer ${data.enabled ? 'bg-blue-600' : 'bg-slate-300'}`}
                    >
                        <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${data.enabled ? 'translate-x-4' : ''}`} />
                    </button>
                    <span className={`text-sm font-semibold ${data.enabled ? 'text-slate-800' : 'text-slate-400'}`}>{day}</span>
                    {isWeekend && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded font-semibold border border-amber-100">Weekend</span>
                    )}
                </div>
                {data.enabled && (
                    <span className="text-[11px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                        {data.slots.length} slot{data.slots.length !== 1 ? 's' : ''}
                    </span>
                )}
            </div>
            {data.enabled && (
                <div className="p-4 space-y-2">
                    {data.slots.length === 0 && (
                        <p className="text-xs text-slate-400 text-center py-3 bg-slate-50 rounded-lg border border-dashed border-slate-200">No slots added yet. Click below to add.</p>
                    )}
                    {data.slots.map((slot, i) => (
                        <div key={i} className="flex items-center gap-2 bg-blue-50/50 px-3 py-2 rounded-lg border border-blue-100">
                            <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <TimeSelect value={slot.startTime} onChange={val => onUpdateSlot(i, 'startTime', val)} />
                            <span className="text-xs text-slate-400 shrink-0 font-medium">→</span>
                            <TimeSelect value={slot.endTime} onChange={val => onUpdateSlot(i, 'endTime', val)} />
                            <button type="button" onClick={() => onRemoveSlot(i)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all shrink-0">
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                    <button type="button" onClick={onAddSlot} className="flex items-center space-x-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1.5 hover:bg-blue-50 rounded-lg transition-all mt-1">
                        <Plus className="w-3.5 h-3.5" /><span>Add time slot</span>
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
            setTimeout(() => setSuccess(''), 4000);
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
                <p className="text-sm text-slate-500">Loading schedule...</p>
            </div>
        </div>
    );

    return (
        <div className="px-4 sm:px-8 py-6 max-w-3xl mx-auto">
            <div className="mb-5 flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Weekly Availability</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Configure the days and time slots when patients can book consultations.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center space-x-2 px-5 py-2.5 text-white text-sm font-semibold rounded-xl transition-all shadow-sm disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}
                >
                    {saving
                        ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>Saving...</span></>
                        : <><Save className="w-4 h-4" /><span>Save Schedule</span></>
                    }
                </button>
            </div>

            <div className="flex items-center gap-3 mb-5">
                <div className="flex items-center space-x-2.5 px-4 py-2.5 bg-white border border-blue-100 rounded-xl shadow-sm">
                    <CalendarDays className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-bold text-slate-900">{activeDays}</span>
                    <span className="text-xs text-slate-500">active days</span>
                </div>
                <div className="flex items-center space-x-2.5 px-4 py-2.5 bg-white border border-blue-100 rounded-xl shadow-sm">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-bold text-slate-900">{totalSlots}</span>
                    <span className="text-xs text-slate-500">total slots</span>
                </div>
            </div>

            {success && (
                <div className="flex items-center space-x-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 mb-4">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /><span className="font-medium">{success}</span>
                </div>
            )}
            {error && (
                <div className="flex items-center space-x-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 mb-4">
                    <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
                </div>
            )}

            <div className="flex items-start space-x-2.5 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 mb-5">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
                <p>Toggle a day on to add bookable time slots. Each slot represents one patient appointment window. Saving will replace your entire schedule.</p>
            </div>

            <div className="space-y-3 pb-10">
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