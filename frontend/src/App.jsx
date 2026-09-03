import { Route, Routes, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsAndConditions from './pages/TermsAndConditions'

// Admin
import AdminDashboard from './pages/AdminDashboard'
import PaymentPage from './pages/PaymentPage'
import PaymentSuccess from './pages/PaymentSuccess'
import NotFound from './pages/NotFound'

// Patient Layout
import PatientLayout from './components/patient/PatientLayout'

// Patient Pages
import PatientDashboard from './pages/patient/PatientDashboard'
import BookAppointment from './pages/patient/BookAppointment'
import MyAppointments from './pages/patient/MyAppointments'
import MyProfile from './pages/patient/MyProfile'
import MedicalHistory from './pages/patient/MedicalHistory'
import Telemedicine from './pages/patient/Telemedicine'
import SymptomChecker from './pages/patient/SymptomChecker';
import PatientSettings from './pages/patient/PatientSettings';
import PatientVideoRoom from './pages/patient/PatientVideoRoom';

//doctor
import DoctorLayout from './components/doctor/DoctorLayout'
import DoctorDashboard from './pages/doctor/DoctorDashboard'
import DoctorAvailability from './pages/doctor/DoctorAvailability'
import DoctorProfile from './pages/doctor/DoctorProfile'
import DoctorAppointments from './pages/doctor/DoctorAppointments'
import DoctorTelemedicine from './pages/doctor/DoctorTelemedicine'
import DoctorVideoRoom from './pages/doctor/DoctorVideoRoom'

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms-conditions" element={<TermsAndConditions />} />

      {/* Admin Routes */}
      <Route
        path='/payment'
        element={
          <ProtectedRoute requiredRole="patient">
            <PaymentPage />
          </ProtectedRoute>
        }
      />
      <Route
        path='/payment-success'
        element={
          <ProtectedRoute requiredRole="patient">
            <PaymentSuccess />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route path="/doctor" element={<ProtectedRoute requiredRole="doctor"><DoctorLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/doctor/dashboard" replace />} />
        <Route path="dashboard" element={<DoctorDashboard />} />
        <Route path="profile" element={<DoctorProfile />} />
        <Route path="availability" element={<DoctorAvailability />} />
        <Route path="appointments" element={<DoctorAppointments />} />
        <Route path="telemedicine" element={<DoctorTelemedicine />} />
        <Route path="video-room" element={<DoctorVideoRoom />} />
      </Route>

      {/* Patient Routes — all wrapped in PatientLayout */}
      <Route
        path="/patient"
        element={
          <ProtectedRoute requiredRole="patient">
            <PatientLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/patient/dashboard" replace />} />
        <Route path="dashboard" element={<PatientDashboard />} />
        <Route path="book-appointment" element={<BookAppointment />} />
        <Route path="my-appointments" element={<MyAppointments />} />
        <Route path="profile" element={<MyProfile />} />
        <Route path="medical-history" element={<MedicalHistory />} />
        <Route path="telemedicine" element={<Telemedicine />} />
        <Route path="symptom-checker" element={<SymptomChecker />} />
        <Route path="settings" element={<PatientSettings />} />
        <Route path="video-room" element={<PatientVideoRoom />} />
      </Route>

      {/* Old dashboard redirect — in case anything still links to /dashboard */}
      <Route path="/dashboard" element={<Navigate to="/patient/dashboard" replace />} />

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
