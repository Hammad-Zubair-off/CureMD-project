import { Route, Routes, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import { ProtectedRoute } from './components/ProtectedRoute'

// Admin
import AdminDashboard from './pages/AdminDashboard'
import PaymentPage from './pages/PaymentPage'

// Patient Layout
import PatientLayout from './components/patient/PatientLayout'

// Patient Pages
import PatientDashboard from './pages/patient/PatientDashboard'
import BookAppointment from './pages/patient/BookAppointment'
import MyAppointments from './pages/patient/MyAppointments'
import MyProfile from './pages/patient/MyProfile'
import MedicalHistory from './pages/patient/MedicalHistory'
import Telemedicine from './pages/patient/Telemedicine'

//doctor
import DoctorLayout from './components/doctor/DoctorLayout'
import DoctorDashboard from './pages/doctor/DoctorDashboard'
import DoctorAvailability from './pages/doctor/DoctorAvailability'
import DoctorProfile from './pages/doctor/DoctorProfile'
import DoctorAppointments from './pages/doctor/DoctorAppointments'

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

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
        path="/admin"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route path="/doctor" element={<ProtectedRoute role="doctor"><DoctorLayout /></ProtectedRoute>}>
        <Route path="dashboard" element={<DoctorDashboard />} />
        <Route path="profile" element={<DoctorProfile />} />
        <Route path="availability" element={<DoctorAvailability />} />
        <Route path="appointments" element={<DoctorAppointments />} />
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
      </Route>

      {/* Old dashboard redirect — in case anything still links to /dashboard */}
      <Route path="/dashboard" element={<Navigate to="/patient/dashboard" replace />} />
    </Routes>
  )
}

export default App
