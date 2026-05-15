import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import { CheckCircle, ClipboardList, LogOut, MapPin, Save, Stethoscope, Upload, UserRound, AlertCircle, LayoutDashboard } from 'lucide-react'

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'profile', label: 'Profile', icon: UserRound },
  { key: 'attendance', label: 'Attendance', icon: ClipboardList },
]

export default function DoctorPortal() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('dashboard')
  const [doctor, setDoctor] = useState(null)
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [profForm, setProfForm] = useState({})
  const [geoLoading, setGeoLoading] = useState(false)
  const [hospitalName, setHospitalName] = useState('')
  const doctorId = user?.doctorId || user?.ref

  useEffect(() => {
    Promise.all([api.get(`/doctors/doctor/${doctorId}`), api.get(`/doctors/attendance/${doctorId}`)])
      .then(async ([doctorRes, attendanceRes]) => {
        setDoctor(doctorRes.data)
        setProfForm(doctorRes.data)
        setAttendance(attendanceRes.data)
        
        try {
          const hospRes = await api.get(`/hospitals/${doctorRes.data.hospitalId}`)
          setHospitalName(hospRes.data.name)
        } catch (e) {
          console.error('Failed to load hospital name')
        }
      })
      .finally(() => setLoading(false))
  }, [doctorId])

  const getRelativeTime = (date) => {
    if (!date) return ''
    const diff = Math.floor((Date.now() - new Date(date)) / 60000)
    if (diff < 1) return 'Just now'
    if (diff < 60) return `${diff} minutes ago`
    const hours = Math.floor(diff / 60)
    if (hours < 24) return `${hours} hours ago`
    return `${Math.floor(hours / 24)} days ago`
  }

  const saveProfile = async () => {
    const { _id, __v, password: ignored, ...update } = profForm
    await api.put(`/doctors/${doctorId}`, update)
    setMsg('Profile updated successfully.')
  }

  const uploadPhoto = async (event) => {
    const file = event.target.files[0]
    if (!file) return
    const formData = new FormData()
    formData.append('photo', file)
    const response = await api.post(`/doctors/${doctorId}/photo`, formData)
    setDoctor(response.data.doctor)
    setMsg('Profile photo updated.')
  }

  const geoCheckin = async (type) => {
    setGeoLoading(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const endpoint = type === 'in' ? '/doctors/geofence-checkin' : '/doctors/geofence-checkout'
          await api.post(endpoint, { doctorId, lat: position.coords.latitude, lng: position.coords.longitude })
          const refreshed = await api.get(`/doctors/attendance/${doctorId}`)
          setAttendance(refreshed.data)
          setMsg(type === 'in' ? 'Check-in recorded.' : 'Check-out recorded.')
        } catch (err) {
          setError(err.response?.data?.message || 'Unable to update attendance.')
        } finally {
          setGeoLoading(false)
        }
      },
      () => {
        setError('Location access denied.')
        setGeoLoading(false)
      },
    )
  }

  if (loading) return <div className="loader-center"><div className="spinner" /></div>

  const today = attendance.find((item) => new Date(item.date).toDateString() === new Date().toDateString())

  return (
    <div className="portal-shell">
      <div className="topbar">
        <div className="topbar-logo">
          <span className="topbar-mark"><Stethoscope size={18} /></span>
          <span>{TABS.find((item) => item.key === tab)?.label || 'Doctor portal'}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <nav id="doc-tab-nav" style={{ display: 'none' }}>
            {TABS.map((item) => {
              const Icon = item.icon
              return (
                <button key={item.key} className={`btn ${tab === item.key ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(item.key)}>
                  <Icon size={15} />
                  {item.label}
                </button>
              )
            })}
          </nav>
          <button className="btn btn-ghost btn-icon" onClick={() => { logout(); navigate('/') }}>
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <main className="portal-content">
        <div className="container" style={{ maxWidth: 980 }}>
          <section className="portal-header-card">
            <div className="portal-header-copy">
              <h1>Doctor workspace</h1>
              <p>Review profile information, update attendance, and keep your current hospital assignment aligned with operations.</p>
              <div className="portal-meta">
                <span className="portal-meta-chip"><Stethoscope size={14} /> {doctor?.name} ({doctor?.doctorId})</span>
                <span className="portal-meta-chip"><MapPin size={14} /> {hospitalName || doctor?.hospitalId}</span>
              </div>
            </div>
          </section>

          {msg ? <div className="alert alert-success">{msg}</div> : null}

          {tab === 'dashboard' ? (
            <div>
              <div className="card" style={{ marginBottom: 16, background: 'linear-gradient(135deg, #0f172a, #1e3a8a)', color: '#fff' }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  {doctor?.photoUrl
                    ? <img src={doctor.photoUrl} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }} />
                    : <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800 }}>{doctor?.name?.[0]}</div>}
                  <div>
                    <div style={{ fontSize: 19, fontWeight: 800 }}>{doctor?.name}</div>
                    <div style={{ color: 'rgba(255,255,255,0.72)' }}>{doctor?.speciality || doctor?.specialization || 'General Medicine'}</div>
                    <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: 13 }}>{hospitalName || doctor?.hospitalId}</div>
                  </div>
                </div>
              </div>

              <div className="stat-grid">
                {[
                  { label: 'Hospital', val: hospitalName || doctor?.hospitalId || '-', color: '#38bdf8' },
                  { label: 'Availability', val: doctor?.availability || 'Available', color: '#22c55e' },
                  { label: 'Shift', val: doctor?.shift || 'Assigned', color: '#a78bfa' },
                  { label: 'Present days', val: attendance.filter((item) => item.availability === 'Present').length, color: '#f59e0b' },
                ].map((stat) => (
                  <div key={stat.label} className="stat-card" style={{ '--accent': stat.color }}>
                    <div className="stat-val" style={{ fontSize: 20 }}>{stat.val}</div>
                    <div className="stat-label">{stat.label}</div>
                  </div>
                ))}
              </div>

              <div className="card">
                <div className="card-header">
                  <ClipboardList size={16} />
                  <span className="card-title">Recent attendance</span>
                </div>
                {attendance.length === 0 ? <div className="empty"><p>No attendance records available.</p></div> : attendance.slice(0, 5).map((item) => (
                  <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderTop: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{new Date(item.date).toLocaleDateString()}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>Updated {getRelativeTime(item.checkOut || item.checkIn || item.createdAt)}</div>
                    </div>
                    <span className={`badge ${item.availability === 'Present' ? 'badge-green' : 'badge-red'}`}>{item.availability}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {tab === 'profile' ? (
            <div className="card">
              <div style={{ textAlign: 'center', marginBottom: 18 }}>
                {doctor?.photoUrl
                  ? <img src={doctor.photoUrl} alt="" style={{ width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary-light)' }} />
                  : <div style={{ width: 88, height: 88, borderRadius: '50%', margin: '0 auto', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800 }}>{doctor?.name?.[0]}</div>}
                <label className="btn btn-outline btn-sm" style={{ marginTop: 14, cursor: 'pointer' }}>
                  <Upload size={14} />
                  Change photo
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadPhoto} />
                </label>
              </div>
              {[
                ['name', 'Full name'],
                ['speciality', 'Speciality'],
                ['qualification', 'Qualification'],
                ['experience', 'Experience'],
              ].map(([key, label]) => (
                <div className="form-group" key={key}>
                  <label className="form-label">{label}</label>
                  <input className="form-input" value={profForm[key] || ''} onChange={(event) => setProfForm((prev) => ({ ...prev, [key]: event.target.value }))} />
                </div>
              ))}
              <button className="btn btn-primary btn-full" onClick={saveProfile}>
                <Save size={15} />
                Save profile
              </button>
            </div>
          ) : null}

          {tab === 'attendance' ? (
            <div>
              {error ? <div className="alert alert-error"><AlertCircle size={14} />{error}</div> : null}
              <div className="alert alert-warning">
                <MapPin size={16} />
                <div>
                  Attendance uses device location to validate hospital proximity before check-in or check-out.
                </div>
              </div>

              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-header">
                  <MapPin size={16} color="var(--primary)" />
                  <span className="card-title">Geofenced attendance</span>
                </div>
                {today ? (
                  <div className="alert alert-info">
                    Today: <strong>{today.availability}</strong>{today.checkIn ? ` | Check-in ${new Date(today.checkIn).toLocaleTimeString()}` : ''}{today.checkOut ? ` | Check-out ${new Date(today.checkOut).toLocaleTimeString()}` : ''}
                  </div>
                ) : null}
                <div className="grid-2">
                  <button className="btn btn-success" onClick={() => geoCheckin('in')} disabled={geoLoading}>
                    <CheckCircle size={15} />
                    {geoLoading ? 'Processing...' : 'Check in'}
                  </button>
                  <button className="btn btn-outline" onClick={() => geoCheckin('out')} disabled={geoLoading}>
                    <CheckCircle size={15} />
                    {geoLoading ? 'Processing...' : 'Check out'}
                  </button>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <span className="card-title">Attendance history</span>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Date</th><th>Status</th><th>Updated</th></tr>
                    </thead>
                    <tbody>
                      {attendance.map((item) => (
                        <tr key={item._id}>
                          <td>{new Date(item.date).toLocaleDateString()}</td>
                          <td><span className={`badge ${item.availability === 'Present' ? 'badge-green' : 'badge-red'}`}>{item.availability}</span></td>
                          <td style={{ color: 'var(--text2)' }}>{getRelativeTime(item.checkOut || item.checkIn || item.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </main>

      <div className="bottom-nav">
        {TABS.map((item) => {
          const Icon = item.icon
          return <button key={item.key} className={`bottom-nav-item ${tab === item.key ? 'active' : ''}`} onClick={() => setTab(item.key)}><Icon size={20} />{item.label}</button>
        })}
      </div>

      <style>{`@media(min-width:768px){#doc-tab-nav{display:flex!important;gap:6px;}}`}</style>
    </div>
  )
}
