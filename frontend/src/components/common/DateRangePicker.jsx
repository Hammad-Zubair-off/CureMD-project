import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

export default function DateRangePicker({ startDate, endDate, onRangeChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [hoverDate, setHoverDate] = useState(null);
    const containerRef = useRef(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleDateClick = (day) => {
        const clickedDate = new Date(year, month, day);

        if (!startDate || (startDate && endDate)) {
            // Start a new range
            onRangeChange(clickedDate, null);
        } else if (startDate && !endDate) {
            // End the range
            if (clickedDate < startDate) {
                // If clicked before start date, make it the new start date
                onRangeChange(clickedDate, null);
            } else {
                onRangeChange(startDate, clickedDate);
                setIsOpen(false);
            }
        }
    };

    const isSelected = (day) => {
        const date = new Date(year, month, day).getTime();
        const start = startDate ? new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime() : null;
        const end = endDate ? new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime() : null;

        if (start && end) {
            return date >= start && date <= end;
        }
        if (start && !end && hoverDate) {
            const hover = hoverDate.getTime();
            return date >= Math.min(start, hover) && date <= Math.max(start, hover);
        }
        return start === date;
    };

    const isStartNode = (day) => {
        const date = new Date(year, month, day).getTime();
        const start = startDate ? new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime() : null;
        return date === start;
    };

    const isEndNode = (day) => {
        const date = new Date(year, month, day).getTime();
        const end = endDate ? new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime() : null;
        const hover = hoverDate ? hoverDate.getTime() : null;
        if (endDate) return date === end;
        if (startDate && !endDate && hover) return date === hover && hover > startDate.getTime();
        return false;
    };

    const formatDateStr = (date) => {
        if (!date) return '';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const displayStr = () => {
        if (!startDate && !endDate) return 'Select Date Range';
        if (startDate && !endDate) return `${formatDateStr(startDate)} - select end date`;
        return `${formatDateStr(startDate)} to ${formatDateStr(endDate)}`;
    };

    return (
        <div className="relative" ref={containerRef}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium text-slate-600 cursor-pointer min-w-[220px]"
            >
                <CalendarDays className="w-4 h-4 text-blue-500" />
                <span>{displayStr()}</span>
            </div>

            {isOpen && (
                <div className="absolute top-full mt-2 left-0 sm:right-auto sm:left-auto right-0 bg-white border border-slate-200 rounded-xl shadow-xl p-4 z-50 w-[280px]">
                    <div className="flex items-center justify-between mb-4">
                        <button 
                            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                            className="p-1 hover:bg-slate-100 rounded-lg text-slate-500"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="font-bold text-slate-800 text-sm">
                            {monthNames[month]} {year}
                        </span>
                        <button 
                            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                            className="p-1 hover:bg-slate-100 rounded-lg text-slate-500"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
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
                            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                            const selected = isSelected(day);
                            const startNode = isStartNode(day);
                            const endNode = isEndNode(day);

                            let bgClass = "bg-white hover:bg-slate-100 text-slate-700";
                            if (selected) {
                                bgClass = "bg-blue-100 text-blue-700";
                            }
                            if (startNode || endNode) {
                                bgClass = "bg-blue-600 text-white hover:bg-blue-700";
                            }

                            return (
                                <button
                                    key={day}
                                    onClick={() => handleDateClick(day)}
                                    onMouseEnter={() => setHoverDate(new Date(year, month, day))}
                                    className={`h-8 w-full text-xs rounded-md transition-colors font-medium flex items-center justify-center relative ${bgClass}`}
                                >
                                    {day}
                                    {isToday && !startNode && !endNode && (
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
