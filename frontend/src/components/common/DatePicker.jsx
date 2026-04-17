import { useState, useRef, useEffect } from 'react';
import { CalendarDays } from 'lucide-react';

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

export default function DatePicker({ value, onChange, placeholder = "Select Date", minDate, maxDate }) {
    const [isOpen, setIsOpen] = useState(false);
    
    // Internal viewing state
    const [currentYear, setCurrentYear] = useState(value ? new Date(value).getFullYear() : new Date().getFullYear());
    const [currentMonth, setCurrentMonth] = useState(value ? new Date(value).getMonth() : new Date().getMonth());
    
    const containerRef = useRef(null);

    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

    // Generate years dynamically based on min/max
    const currentY = new Date().getFullYear();
    const maxY = maxDate ? new Date(maxDate).getFullYear() : currentY;
    const minY = minDate ? new Date(minDate).getFullYear() : currentY - 120;
    
    const years = [];
    for (let y = maxY; y >= minY; y--) {
        years.push(y);
    }

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    // Sync external value with internal view if it changes from outside
    useEffect(() => {
        if (value) {
            const d = new Date(value);
            if (d.getFullYear() !== currentYear || d.getMonth() !== currentMonth) {
                setCurrentYear(d.getFullYear());
                setCurrentMonth(d.getMonth());
            }
        }
    }, [value]);

    const handleDateClick = (day) => {
        const mStr = String(currentMonth + 1).padStart(2, '0');
        const dStr = String(day).padStart(2, '0');
        const selectedDateStr = `${currentYear}-${mStr}-${dStr}`;
        
        // Final shield against clicks that bypass disabled UI
        const d = new Date(`${selectedDateStr}T00:00:00`);
        if (minDate && d < new Date(minDate)) return;
        if (maxDate && d > new Date(maxDate)) return;

        onChange(selectedDateStr);
        setIsOpen(false);
    };

    const isSelected = (day) => {
        if (!value) return false;
        const [y, m, d] = value.split('-');
        return (
            parseInt(y, 10) === currentYear &&
            parseInt(m, 10) - 1 === currentMonth &&
            parseInt(d, 10) === day
        );
    };

    const isDateDisabled = (day) => {
        const mStr = String(currentMonth + 1).padStart(2, '0');
        const dStr = String(day).padStart(2, '0');
        const d = new Date(`${currentYear}-${mStr}-${dStr}T00:00:00`);
        
        if (minDate && d < new Date(minDate)) return true;
        if (maxDate && d > new Date(maxDate)) return true;
        return false;
    };

    const formatDateStr = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(`${dateStr}T12:00:00Z`);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center space-x-2 pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-500 transition-all font-medium text-slate-800"
            >
                <span>{value ? formatDateStr(value) : placeholder}</span>
            </div>

            {isOpen && (
                <div className="absolute top-full mt-2 left-0 bg-white border border-slate-200 rounded-xl shadow-xl p-4 z-50 w-[280px]">
                    <div className="flex items-center justify-between mb-4 space-x-2">
                        {/* Month Select */}
                        <select 
                            value={currentMonth}
                            onChange={(e) => setCurrentMonth(parseInt(e.target.value, 10))}
                            className="bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 font-bold"
                        >
                            {monthNames.map((name, i) => (
                                <option key={name} value={i}>{name}</option>
                            ))}
                        </select>
                        
                        {/* Year Select */}
                        <select 
                            value={currentYear}
                            onChange={(e) => setCurrentYear(parseInt(e.target.value, 10))}
                            className="bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 font-bold"
                        >
                            {years.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {dayNames.map(d => (
                            <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase">
                                {d}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: firstDay }).map((_, i) => (
                            <div key={`empty-${i}`} className="h-8"></div>
                        ))}
                        
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1;
                            const today = new Date();
                            const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
                            const selected = isSelected(day);
                            const disabled = isDateDisabled(day);

                            let bgClass = "bg-white hover:bg-slate-100 text-slate-700";
                            if (selected) {
                                bgClass = "bg-blue-600 text-white hover:bg-blue-700 shadow-md";
                            }
                            if (disabled) {
                                bgClass = "bg-slate-50 text-slate-300 cursor-not-allowed pointer-events-none";
                            }

                            return (
                                <button
                                    key={day}
                                    disabled={disabled}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleDateClick(day);
                                    }}
                                    className={`h-8 w-full text-xs rounded-md transition-colors font-bold flex items-center justify-center relative ${bgClass}`}
                                >
                                    {day}
                                    {isToday && !selected && !disabled && (
                                        <div className="absolute bottom-1 w-1 h-1 bg-blue-500 rounded-full"></div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
