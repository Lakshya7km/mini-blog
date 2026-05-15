import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import './index.css'
import 'leaflet/dist/leaflet.css'

import Home from './pages/Home/Home'
import ReceptionPortal from './pages/Reception/ReceptionPortal'
import DoctorPortal from './pages/Doctor/DoctorPortal'
import NursePortal from './pages/Nurse/NursePortal'
import AmbulancePortal from './pages/Ambulance/AmbulancePortal'
import AdminPortal from './pages/Admin/AdminPortal'
import PublicPortal from './pages/Public/PublicPortal'
import BedScanPage from './pages/Bed/BedScanPage'

function Protected({ children, role }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loader-center"><div className="spinner"></div></div>
  if (!user) return <Navigate to="/" replace />
  if (role && user.role !== role) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/public" element={<PublicPortal />} />
          <Route path="/bed/:bedId" element={<BedScanPage />} />
          <Route path="/reception/*" element={<Protected role="hospital"><ReceptionPortal /></Protected>} />
          <Route path="/doctor/*" element={<Protected role="doctor"><DoctorPortal /></Protected>} />
          <Route path="/nurse/*" element={<Protected role="nurse"><NursePortal /></Protected>} />
          <Route path="/ambulance/*" element={<Protected role="ambulance"><AmbulancePortal /></Protected>} />
          <Route path="/admin/*" element={<Protected role="superadmin"><AdminPortal /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

