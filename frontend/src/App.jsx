import './App.css'
import { Route, Routes } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import Dashboard from './pages/Dashboard'
import { ProtectedRoute } from './components/ProtectedRoute'
import AdminDashboard from './pages/AdminDashboard'
import PaymentPage from './pages/PaymentPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
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
      {/* <Route
        path="/admin/superadmin"
        element={
          <ProtectedRoute requiredRole="superadmin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      /> */}
    </Routes>
  )
}

export default App
