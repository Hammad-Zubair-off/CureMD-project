import { Route, Routes, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import { ProtectedRoute } from './components/ProtectedRoute'

// Admin
import AdminDashboard from './pages/AdminDashboard'

// Patient Layout
import PatientLayout from './components/patient/PatientLayout'

// Patient Pages
import PatientDashboard from './pages/patient/PatientDashboard'
import BookAppointment from './pages/patient/BookAppointment'
import MyAppointments from './pages/patient/MyAppointments'
import MyProfile from './pages/patient/MyProfile'
import MedicalHistory from './pages/patient/MedicalHistory'
import Telemedicine from './pages/patient/Telemedicine'

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

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
