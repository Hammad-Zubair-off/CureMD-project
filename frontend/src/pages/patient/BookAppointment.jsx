import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, SlidersHorizontal, Star, MapPin, Briefcase, ChevronDown, X, AlertCircle, Loader2 } from 'lucide-react';
import { SPECIALTIES } from '../../data/mockDoctors';
import BookingDrawer from '../../components/patient/BookingDrawer';
import DoctorDetailModal from '../../components/patient/DoctorDetailModal';
import PatientProfileInit from '../../components/patient/PatientProfileInit';
import patientService from '../../services/patientService';
import api from '../../services/api';
import Dropdown from '../../components/common/Dropdown';

const DoctorCard = ({ doctor, onBookNow, onViewDetails, bookLoading }) => {
    const initials = `${doctor.firstName[0]}${doctor.lastName[0]}`;

    return (
        <div
            onClick={() => onViewDetails(doctor)}
            className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group"
        >
            {/* Top Row */}
            <div className="flex items-start space-x-4 mb-4">
                <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg shrink-0">
                    {initials}
                </div>
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
                    disabled={bookLoading === doctor.id}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:scale-95 disabled:opacity-70 transition-all shadow-sm shadow-blue-600/20 flex items-center space-x-1.5"
                >
                    {bookLoading === doctor.id
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Loading...</span></>
                        : <span>Book Now</span>
                    }
                </button>
            </div>
        </div>
    );
}

const CompleteProfileModal = ({ onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async (payload) => {
        setLoading(true);
        setError('');
        try {
            await patientService.saveBookingProfile(payload);
            onSuccess();
        } catch (err) {
            const backendErrors = err.response?.data?.errors;
            setError(backendErrors || err.response?.data?.message || err.error || 'Failed to complete profile.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={!loading ? onClose : undefined} />
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white/80 backdrop-blur-md px-8 py-6 border-b border-slate-100 flex items-center justify-between z-10">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Complete Your Profile</h3>
                        <p className="text-sm text-slate-500 mt-0.5">Please provide your details before booking an appointment.</p>
                    </div>
                    <button onClick={onClose} disabled={loading} className="p-2 -mr-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-8">
                    {error && (
                        <div className="p-4 mb-8 text-sm text-red-700 bg-red-50 border border-red-100 rounded-2xl">
                            <div className="flex items-start space-x-3">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <div className="flex-1">
                                    {Array.isArray(error) ? (
                                        <ul className="list-disc list-inside space-y-1">
                                            {error.map((errMsg, i) => <li key={i}>{errMsg}</li>)}
                                        </ul>
                                    ) : (
                                        <span>{error}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <PatientProfileInit
                        onSave={handleSave}
                        saving={loading}
                    />
                </div>
            </div>
        </div>
    );
}

// Main Page
export default function BookAppointment() {
    const location = useLocation();
    const fromMyAppointments = location.state?.fromMyAppointments || false;

    const [doctors, setDoctors] = useState([]);
    const [doctorsLoading, setDoctorsLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);
    const [bookLoading, setBookLoading] = useState(null);

    // Search & filter state
    const [searchName, setSearchName] = useState('');
    const [selectedSpecialty, setSelectedSpecialty] = useState('All Specialties');
    const [showFilters, setShowFilters] = useState(false);
    const [maxFee, setMaxFee] = useState('');

    // Pre-booking checks
    const [checkingProfile, setCheckingProfile] = useState(false);
    const [showIncompleteModal, setShowIncompleteModal] = useState(false);
    const [pendingBookingAction, setPendingBookingAction] = useState(null);

    // Drawer / modal state
    const [bookingDoctor, setBookingDoctor] = useState(null);
    const [detailDoctor, setDetailDoctor] = useState(null);
    const [preSelectedSlot, setPreSelectedSlot] = useState(null);

    // Step 1: Fetch doctor cards list
    useEffect(() => {
        const fetchDoctors = async () => {
            try {
                setDoctorsLoading(true);
                const res = await api.get('/doctors');
                const mapped = (res.data.data || []).map((d) => ({
                    id: d._id,
                    firstName: d.firstName,
                    lastName: d.lastName,
                    fullName: d.fullName || `${d.title || 'Dr.'} ${d.firstName} ${d.lastName}`,
                    specialty: d.specialization,
                    consultationFee: d.consultationFee,
                    rating: d.rating ?? 0,
                    reviewCount: d.totalReviews ?? 0,
                    experience: d.yearsOfExperience,
                    location: d.currentHospital || 'HealthConnect',
                    profileImage: d.profilePhoto || null,
                }));

                setDoctors(mapped);
            } catch (err) {
                console.error('Failed to fetch doctors:', err);
                setDoctors([]);
            } finally {
                setDoctorsLoading(false);
            }
        };

        fetchDoctors();
    }, []);

    // Step 2: Fetch full doctor profile on demand
    const fetchFullDoctor = async (doctor) => {
        const res = await api.get(`/doctors/${doctor.id}`);
        const d = res.data.data;

        return {
            id: d._id,
            userId: d.userId,
            firstName: d.firstName,
            lastName: d.lastName,
            fullName: d.fullName || `${d.title || 'Dr.'} ${d.firstName} ${d.lastName}`,
            specialty: d.specialization,
            consultationFee: d.consultationFee,
            rating: d.rating ?? 0,
            reviewCount: d.totalReviews ?? 0,
            experience: d.yearsOfExperience,
            about: d.bio || 'No bio available.',
            qualifications: d.education?.map((e) => `${e.degree} - ${e.institution}`) || [],
            location: d.currentHospital || 'HealthConnect',
            availableDays: d.availability?.map((a) => a.day) || [],
            availability: d.availability || [],
            profileImage: d.profilePhoto || null,
        };
    };

    // Check profile before booking
    const performBookingCheck = async (actionCallback) => {
        setCheckingProfile(true);
        try {
            const res = await patientService.getMyProfile();
            const profile = res.profile || res;

            if (profile.bookingProfileComplete) {
                await actionCallback();
            } else {
                setPendingBookingAction(() => actionCallback);
                setShowIncompleteModal(true);
            }
        } catch (err) {
            console.error('Failed to check profile:', err);
        } finally {
            setCheckingProfile(false);
        }
    };

    const handleViewDetails = async (doctor) => {
        setDetailLoading(true);
        try {
            const fullDoctor = await fetchFullDoctor(doctor);
            setDetailDoctor(fullDoctor);
        } catch (err) {
            console.error('Failed to fetch doctor details:', err);
            setDetailDoctor(doctor);
        } finally {
            setDetailLoading(false);
        }
    };

    const handleBookNow = (doctor) => {
        performBookingCheck(async () => {
            setPreSelectedSlot(null);
            setBookLoading(doctor.id);
            try {
                const fullDoctor = await fetchFullDoctor(doctor);
                setBookingDoctor(fullDoctor);
            } catch (err) {
                console.error('Failed to fetch doctor details:', err);
                setBookingDoctor(doctor);
            } finally {
                setBookLoading(null);
            }
        });
    };

    const handleBookFromDetail = (doctor, slot = null) => {
        setDetailDoctor(null);
        performBookingCheck(() => {
            setPreSelectedSlot(slot);
            setBookingDoctor(doctor);
        });
    };

    const filteredDoctors = useMemo(() => {
        return doctors.filter((doc) => {
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
    }, [searchName, selectedSpecialty, maxFee, doctors]);

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
        <div className="p-6 lg:p-8 max-w-7xl mx-auto relative">
            {/* Global Loader for Profile Check */}
            {checkingProfile && (
                <div className="fixed inset-0 bg-white/70 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="flex flex-col items-center">
                        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
                        <p className="text-slate-800 font-semibold">Verifying patient profile...</p>
                    </div>
                </div>
            )}

            {/* Incomplete Profile Modal */}
            {showIncompleteModal && (
                <CompleteProfileModal
                    onClose={() => {
                        setShowIncompleteModal(false);
                        setPendingBookingAction(null);
                    }}
                    onSuccess={() => {
                        setShowIncompleteModal(false);
                        if (pendingBookingAction) pendingBookingAction();
                        setPendingBookingAction(null);
                    }}
                />
            )}

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

                    <Dropdown
                        value={selectedSpecialty}
                        onChange={setSelectedSpecialty}
                        options={SPECIALTIES.map(s => ({ value: s, label: s }))}
                        className="sm:w-52"
                    />

                    <button
                        onClick={() => setShowFilters((v) => !v)}
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
                    {doctorsLoading
                        ? 'Loading doctors...'
                        : filteredDoctors.length === 0
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
            {doctorsLoading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                </div>
            ) : filteredDoctors.length === 0 ? (
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
                            bookLoading={bookLoading}
                        />
                    ))}
                </div>
            )}

            {/* Loading overlay for detail modal fetch */}
            {detailLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-8 flex flex-col items-center space-y-3 shadow-xl">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <p className="text-sm text-slate-600 font-medium">Loading doctor profile...</p>
                    </div>
                </div>
            )}

            {/* Doctor Detail Modal */}
            {detailDoctor && (
                <DoctorDetailModal
                    doctor={detailDoctor}
                    onClose={() => setDetailDoctor(null)}
                    onBook={handleBookFromDetail}
                />
            )}

            {/* Booking Drawer */}
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