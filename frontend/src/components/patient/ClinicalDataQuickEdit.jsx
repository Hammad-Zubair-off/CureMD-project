import { useState, useEffect } from 'react';
import { Save, Loader2, ShieldAlert, Pill, HeartPulse, Ruler, Weight } from 'lucide-react';
import { TagInput, InputWrapper, commonInputClass } from './ProfileFormShared';

export default function ClinicalDataQuickEdit({ profile, onSave, saving = false }) {
    const [form, setForm] = useState({
        height: profile?.height ?? '',
        weight: profile?.weight ?? '',
        allergies: profile?.allergies ?? [],
        currentMedications: profile?.currentMedications ?? [],
        chronicConditions: profile?.chronicConditions ?? [],
    });

    useEffect(() => {
        if (!profile) return;
        setForm({
            height: profile.height ?? '',
            weight: profile.weight ?? '',
            allergies: profile.allergies ?? [],
            currentMedications: profile.currentMedications ?? [],
            chronicConditions: profile.chronicConditions ?? [],
        });
    }, [profile]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            height: form.height ? Number(form.height) : undefined,
            weight: form.weight ? Number(form.weight) : undefined,
            allergies: form.allergies,
            currentMedications: form.currentMedications,
            chronicConditions: form.chronicConditions,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h3 className="text-base font-bold text-slate-900">Update current health info</h3>
                    <p className="text-xs text-slate-500 mt-1">
                        Changes apply to your live profile. Future appointment snapshots will use this data.
                    </p>
                </div>
                <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 shadow-sm shadow-blue-600/20 transition-all shrink-0"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save changes
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputWrapper label="Height (cm)" icon={Ruler}>
                    <input
                        type="number"
                        min="50"
                        max="300"
                        value={form.height}
                        onChange={(e) => setForm((f) => ({ ...f, height: e.target.value }))}
                        className={commonInputClass}
                        placeholder="e.g. 170"
                    />
                </InputWrapper>
                <InputWrapper label="Weight (kg)" icon={Weight}>
                    <input
                        type="number"
                        min="1"
                        max="500"
                        value={form.weight}
                        onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
                        className={commonInputClass}
                        placeholder="e.g. 65"
                    />
                </InputWrapper>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <TagInput
                    label="Allergies"
                    icon={ShieldAlert}
                    tags={form.allergies}
                    onAdd={(tag) => setForm((f) => ({ ...f, allergies: [...f.allergies, tag] }))}
                    onRemove={(tag) => setForm((f) => ({ ...f, allergies: f.allergies.filter((t) => t !== tag) }))}
                    placeholder="Add allergy, press Enter"
                    colorClass="orange"
                />
                <TagInput
                    label="Current medications"
                    icon={Pill}
                    tags={form.currentMedications}
                    onAdd={(tag) => setForm((f) => ({ ...f, currentMedications: [...f.currentMedications, tag] }))}
                    onRemove={(tag) => setForm((f) => ({ ...f, currentMedications: f.currentMedications.filter((t) => t !== tag) }))}
                    placeholder="Add medication"
                    colorClass="blue"
                />
                <TagInput
                    label="Chronic conditions"
                    icon={HeartPulse}
                    tags={form.chronicConditions}
                    onAdd={(tag) => setForm((f) => ({ ...f, chronicConditions: [...f.chronicConditions, tag] }))}
                    onRemove={(tag) => setForm((f) => ({ ...f, chronicConditions: f.chronicConditions.filter((t) => t !== tag) }))}
                    placeholder="Add condition"
                    colorClass="rose"
                />
            </div>
        </form>
    );
}
