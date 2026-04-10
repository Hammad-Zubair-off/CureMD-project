import { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, SlidersHorizontal, Star, MapPin, Briefcase, ChevronDown, X } from 'lucide-react';
import mockDoctors, { SPECIALTIES } from '../../data/mockDoctors';
import BookingDrawer from '../../components/patient/BookingDrawer';
import DoctorDetailModal from '../../components/patient/DoctorDetailModal';

// Doctor Card
const DoctorCard = ({ doctor, onBookNow, onViewDetails }) => {
    const initials = `${doctor.firstName[0]}${doctor.lastName[0]}`;

    return (
        <div
            onClick={() => onViewDetails(doctor)}
            className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group"
        >
            {/* Top Row */}
            <div className="flex items-start space-x-4 mb-4">
                {/* Avatar */}
                <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg shrink-0">
                    {initials}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-slate-900 truncate">{doctor.fullName}</h3>
                    <p className="text-sm text-blue-600 font-medium">{doctor.specialty}</p>
                    <div className="flex items-center space-x-1 mt-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <p className="text-xs text-slate-400 truncate">{doctor.location}</p>
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            <div className="flex items-center space-x-4 mb-4">
                <div className="flex items-center space-x-1">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span className="text-sm font-semibold text-slate-700">{doctor.rating}</span>
                    <span className="text-xs text-slate-400">({doctor.reviewCount})</span>
                </div>
                <div className="flex items-center space-x-1">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs text-slate-500">{doctor.experience} yrs exp</span>
                </div>
            </div>

            {/* Fee + Book */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div>
                    <p className="text-xs text-slate-400">Consultation Fee</p>
                    <p className="text-base font-bold text-slate-900">
                        LKR {doctor.consultationFee.toLocaleString()}
                    </p>
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onBookNow(doctor);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-600/20"
                >
                    Book Now
                </button>
            </div>
        </div>
    );
};

// Main Page
export default function BookAppointment() {
    const location = useLocation();
    const fromMyAppointments = location.state?.fromMyAppointments || false;

    // Search & filter state
    const [searchName, setSearchName] = useState('');
    const [selectedSpecialty, setSelectedSpecialty] = useState('All Specialties');
    const [showFilters, setShowFilters] = useState(false);
    const [maxFee, setMaxFee] = useState('');

    // Drawer / modal state
    const [bookingDoctor, setBookingDoctor] = useState(null);
    const [detailDoctor, setDetailDoctor] = useState(null);

    // Pre-selected slot coming from DoctorDetailModal (Scenario B)
    const [preSelectedSlot, setPreSelectedSlot] = useState(null);

    // Filtered doctors
    const filteredDoctors = useMemo(() => {
        return mockDoctors.filter((doc) => {
            const matchesName =
                searchName.trim() === '' ||
                doc.fullName.toLowerCase().includes(searchName.toLowerCase()) ||
                doc.specialty.toLowerCase().includes(searchName.toLowerCase());

            const matchesSpecialty =
                selectedSpecialty === 'All Specialties' ||
                doc.specialty === selectedSpecialty;

            const matchesFee =
                maxFee === '' || doc.consultationFee <= parseInt(maxFee);

            return matchesName && matchesSpecialty && matchesFee;
        });
    }, [searchName, selectedSpecialty, maxFee]);

    // Handlers
    const handleBookNow = (doctor) => {
        setPreSelectedSlot(null);
        setBookingDoctor(doctor);
    };

    const handleViewDetails = (doctor) => {
        setDetailDoctor(doctor);
    };

    const handleBookFromDetail = (doctor, slot = null) => {
        setDetailDoctor(null);
        setPreSelectedSlot(slot);
        setBookingDoctor(doctor);
    };

    const handleClearFilters = () => {
        setSearchName('');
        setSelectedSpecialty('All Specialties');
        setMaxFee('');
    };

    const hasActiveFilters =
        searchName !== '' ||
        selectedSpecialty !== 'All Specialties' ||
        maxFee !== '';

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">

            {/* Page Header */}
            <div className="mb-6">
                {fromMyAppointments && (
                    <div className="flex items-center space-x-2 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl mb-4 text-sm font-medium">
                        <span>👋</span>
                        <span>Please select a doctor to make an appointment.</span>
                    </div>
                )}
                <h1 className="text-2xl font-bold text-slate-900">Find your Specialist</h1>
                <p className="text-slate-500 text-sm mt-1">
                    Browse our network of world-class medical professionals and book your consultation in minutes.
                </p>
            </div>

            {/* Search & Filter Bar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6">
                <div className="flex flex-col sm:flex-row gap-3">

                    {/* Name / keyword search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by doctor name or specialty..."
                            value={searchName}
                            onChange={(e) => setSearchName(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                        />
                    </div>

                    {/* Specialty dropdown */}
                    <div className="relative sm:w-52">
                        <select
                            value={selectedSpecialty}
                            onChange={(e) => setSelectedSpecialty(e.target.value)}
                            className="w-full appearance-none pl-4 pr-8 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all bg-white text-slate-700"
                        >
                            {SPECIALTIES.map((s) => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Filter toggle */}
                    <button
                        onClick={() => setShowFilters(v => !v)}
                        className={`flex items-center space-x-2 px-4 py-2.5 text-sm font-medium rounded-xl border transition-all
                            ${showFilters
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                        <span>Filters</span>
                    </button>
                </div>

                {/* Expanded filters */}
                {showFilters && (
                    <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-slate-600 mb-1.5">
                                Max Consultation Fee (LKR)
                            </label>
                            <input
                                type="number"
                                placeholder="e.g. 3000"
                                value={maxFee}
                                onChange={(e) => setMaxFee(e.target.value)}
                                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                            />
                        </div>
                        {hasActiveFilters && (
                            <button
                                onClick={handleClearFilters}
                                className="flex items-center space-x-2 px-4 py-2.5 text-sm font-medium text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-all"
                            >
                                <X className="w-4 h-4" />
                                <span>Clear Filters</span>
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Results Count */}
            <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-slate-500">
                    {filteredDoctors.length === 0
                        ? 'No doctors found'
                        : `${filteredDoctors.length} doctor${filteredDoctors.length > 1 ? 's' : ''} found`
                    }
                </p>
                {hasActiveFilters && (
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                        Filters active
                    </span>
                )}
            </div>

            {/* Doctor Grid */}
            {filteredDoctors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Search className="w-10 h-10 mb-3 opacity-40" />
                    <p className="font-medium text-slate-500">No doctors match your search</p>
                    <p className="text-sm mt-1">Try adjusting your filters or search term</p>
                    <button
                        onClick={handleClearFilters}
                        className="mt-4 text-sm text-blue-600 font-medium hover:underline"
                    >
                        Clear all filters
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredDoctors.map((doctor) => (
                        <DoctorCard
                            key={doctor.id}
                            doctor={doctor}
                            onBookNow={handleBookNow}
                            onViewDetails={handleViewDetails}
                        />
                    ))}
                </div>
            )}

            {/* Doctor Detail Modal (Scenario B) */}
            {detailDoctor && (
                <DoctorDetailModal
                    doctor={detailDoctor}
                    onClose={() => setDetailDoctor(null)}
                    onBook={handleBookFromDetail}
                />
            )}

            {/* Booking Drawer (Scenario A & B) */}
            {bookingDoctor && (
                <BookingDrawer
                    doctor={bookingDoctor}
                    preSelectedSlot={preSelectedSlot}
                    onClose={() => {
                        setBookingDoctor(null);
                        setPreSelectedSlot(null);
                    }}
                />
            )}
        </div>
    );
}