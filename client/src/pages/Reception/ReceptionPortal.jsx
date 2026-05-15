import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import socket from '../../lib/socket'
import {
  AlertTriangle,
  BedDouble,
  Building2,
  Database,
  Droplets,
  Image,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  ShieldPlus,
  Stethoscope,
  Truck,
  UserRound,
  X,
} from 'lucide-react'

import AmbulancesSection from './sections/AmbulancesSection'
import AnnouncementsSection from './sections/AnnouncementsSection'
import BedManagement from './sections/BedManagement'
import BloodBankSection from './sections/BloodBankSection'
import DatabaseView from './sections/DatabaseView'
import DoctorsSection from './sections/DoctorsSection'
import EmergenciesSection from './sections/EmergenciesSection'
import Gallery from './sections/Gallery'
import HospitalInfo from './sections/HospitalInfo'
import NursesSection from './sections/NursesSection'
import RDashboard from './sections/RDashboard'

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'emergencies', label: 'Emergency Queue', icon: AlertTriangle, badge: true },
  { key: 'beds', label: 'Beds', icon: BedDouble },
  { key: 'ambulances', label: 'Ambulances', icon: Truck },
  { key: 'doctors', label: 'Doctors', icon: Stethoscope },
  { key: 'nurses', label: 'Nurses', icon: UserRound },
  { key: 'bloodbank', label: 'Blood Bank', icon: Droplets },
  { key: 'announcements', label: 'Announcements', icon: Megaphone },
  { key: 'info', label: 'Hospital Info', icon: Building2 },
  { key: 'gallery', label: 'Gallery', icon: Image },
  { key: 'db', label: 'Data View', icon: Database },
]

export default function ReceptionPortal() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('dashboard')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeEmergencies, setActiveEmergencies] = useState(0)
  const hospitalId = user?.username || user?.hospitalId

  useEffect(() => {
    if (!hospitalId) return
    socket.connect()
    socket.emit('join:hospital', hospitalId)

    const fetchCount = () =>
      api
        .get(`/emergency?hospitalId=${hospitalId}`)
        .then((response) => {
          setActiveEmergencies(
            response.data.filter((entry) => ['Pending', 'Accepted', 'En Route', 'Arrived'].includes(entry.status)).length,
          )
        })
        .catch(() => setActiveEmergencies(0))

    fetchCount()
    socket.on('emergency:new', fetchCount)
    socket.on('emergency:update', fetchCount)

    return () => {
      socket.off('emergency:new', fetchCount)
      socket.off('emergency:update', fetchCount)
      socket.disconnect()
    }
  }, [hospitalId])

  const go = (nextTab) => {
    setTab(nextTab)
    setDrawerOpen(false)
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const renderSection = () => {
    switch (tab) {
      case 'dashboard': return <RDashboard hospitalId={hospitalId} />
      case 'emergencies': return <EmergenciesSection hospitalId={hospitalId} />
      case 'info': return <HospitalInfo hospitalId={hospitalId} />
      case 'gallery': return <Gallery hospitalId={hospitalId} />
      case 'beds': return <BedManagement hospitalId={hospitalId} />
      case 'doctors': return <DoctorsSection hospitalId={hospitalId} />
      case 'ambulances': return <AmbulancesSection hospitalId={hospitalId} />
      case 'nurses': return <NursesSection hospitalId={hospitalId} />
      case 'bloodbank': return <BloodBankSection hospitalId={hospitalId} />
      case 'announcements': return <AnnouncementsSection hospitalId={hospitalId} />
      case 'db': return <DatabaseView hospitalId={hospitalId} />
      default: return null
    }
  }

  const currentTab = TABS.find((item) => item.key === tab)
  const CurrentIcon = currentTab?.icon || ShieldPlus

  const NavItem = ({ item, inSidebar }) => {
    const Icon = item.icon
    const isActive = tab === item.key
    const showBadge = item.badge && activeEmergencies > 0
    return (
      <button onClick={() => go(item.key)} className={inSidebar ? `sidebar-item ${isActive ? 'active' : ''}` : `drawer-item ${isActive ? 'active' : ''}`}>
        <Icon size={inSidebar ? 16 : 18} />
        <span style={{ flex: 1 }}>{item.label}</span>
        {showBadge ? <span className="badge badge-red animate-pulse">{activeEmergencies}</span> : null}
      </button>
    )
  }

  return (
    <div className="portal-shell">
      <div className="topbar">
        <button className="btn btn-ghost btn-icon mobile-only" onClick={() => setDrawerOpen(true)}>
          <Menu size={18} />
        </button>
        <div className="topbar-logo">
          <span className="topbar-mark"><CurrentIcon size={18} /></span>
          <span>{currentTab?.label || 'Reception'}</span>
          {tab !== 'emergencies' && activeEmergencies > 0 ? (
            <button className="btn btn-danger btn-sm" onClick={() => go('emergencies')}>
              {activeEmergencies} active
            </button>
          ) : null}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="desktop-only" style={{ color: 'var(--text2)', fontSize: 12, fontWeight: 600 }}>{hospitalId}</span>
          <button className="btn btn-ghost btn-icon" onClick={handleLogout} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <aside className="desktop-sidebar desktop-only">
        <div style={{ padding: '4px 18px 16px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
          <div className="classic-kicker">RapidCare</div>
          <div style={{ fontSize: 17, fontWeight: 800, marginTop: 6 }}>Reception console</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>{hospitalId}</div>
        </div>
        {TABS.map((item) => <NavItem key={item.key} item={item} inSidebar />)}
        <div style={{ flex: 1 }} />
        <button className="sidebar-item" style={{ color: 'var(--danger)' }} onClick={handleLogout}>
          <LogOut size={16} />
          Logout
        </button>
      </aside>

      {drawerOpen ? (
        <div className="drawer-overlay" onClick={() => setDrawerOpen(false)}>
          <div className="drawer" onClick={(event) => event.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <div className="classic-kicker">RapidCare</div>
                <div style={{ fontSize: 18, fontWeight: 800, marginTop: 6 }}>Reception console</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>{hospitalId}</div>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setDrawerOpen(false)}>
                <X size={18} />
              </button>
            </div>
            {TABS.map((item) => <NavItem key={item.key} item={item} inSidebar={false} />)}
            <div style={{ marginTop: 'auto', padding: '8px 0' }}>
              <button className="drawer-item" style={{ color: 'var(--danger)' }} onClick={handleLogout}>
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <main className="has-sidebar portal-content">
        <div className="container">
          <section className="portal-header-card">
            <div className="portal-header-copy">
              <h1>{currentTab?.label || 'Reception'}</h1>
              <p>Operational dashboard for admissions, staffing, emergency handling, and hospital-level coordination.</p>
              <div className="portal-meta">
                <span className="portal-meta-chip"><Building2 size={14} /> {hospitalId}</span>
                <span className="portal-meta-chip"><AlertTriangle size={14} /> {activeEmergencies} active emergencies</span>
              </div>
            </div>
          </section>
          {renderSection()}
        </div>
      </main>
    </div>
  )
}
