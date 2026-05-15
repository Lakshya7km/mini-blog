import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import socket from '../../lib/socket'
import { Activity, Ambulance, LayoutDashboard, LogOut, Phone, PlusCircle, Radio, Truck } from 'lucide-react'

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'request', label: 'New Request', icon: PlusCircle },
  { key: 'status', label: 'Live Status', icon: Radio },
  { key: 'profile', label: 'Profile', icon: Truck },
]

const STATUS_OPTIONS = ['On Duty', 'In Transit', 'Offline']
const STATUS_COLOR = { 'On Duty': '#22c55e', 'In Transit': '#f59e0b', Offline: '#94a3b8' }

export default function AmbulancePortal() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('dashboard')
  const [ambulance, setAmbulance] = useState(null)
  const [emergencies, setEmergencies] = useState([])
  const [hospitals, setHospitals] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const heartbeatRef = useRef(null)
  const ambulanceId = user?.ambulanceId || user?.ref
  const ownHospitalId = user?.hospitalId || ''
  const [reqForm, setReqForm] = useState({
    patientName: '',
    age: '',
    gender: 'Male',
    emergencyType: 'General',
    condition: 'Stable',
    equipment: '',
    symptoms: '',
    ambulanceNotes: '',
    hospitalId: ownHospitalId,
  })

  useEffect(() => {
    Promise.all([api.get(`/ambulances/${ambulanceId}`), api.get(`/emergency?ambulanceId=${ambulanceId}`), api.get('/hospitals')])
      .then(([ambulanceRes, emergencyRes, hospitalRes]) => {
        setAmbulance(ambulanceRes.data)
        setEmergencies(emergencyRes.data)
        setHospitals(hospitalRes.data)
        setReqForm((prev) => ({ ...prev, hospitalId: ambulanceRes.data?.hospitalId || ownHospitalId }))
      })
      .finally(() => setLoading(false))

    socket.connect()
    socket.emit('join:ambulance', ambulanceId)

    heartbeatRef.current = setInterval(() => {
      navigator.geolocation?.getCurrentPosition((position) => {
        socket.emit('ambulance:location', {
          ambulanceId,
          hospitalId: user?.hospitalId,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
      })
    }, 30000)

    socket.on('emergency:update', (entry) => {
      setEmergencies((prev) => prev.map((item) => (item._id === entry._id ? entry : item)))
    })
    socket.on('ambulance:update', (entry) => {
      if (entry.ambulanceId === ambulanceId) setAmbulance(entry)
    })

    const offline = () => api.put(`/ambulances/${ambulanceId}`, { status: 'Offline' }).catch(() => {})
    window.addEventListener('beforeunload', offline)

    return () => {
      clearInterval(heartbeatRef.current)
      socket.disconnect()
      window.removeEventListener('beforeunload', offline)
    }
  }, [ambulanceId, ownHospitalId, user?.hospitalId])

  const setStatus = async (status) => {
    socket.emit('ambulance:status', { ambulanceId, hospitalId: user?.hospitalId, status })
    const response = await api.put(`/ambulances/${ambulanceId}`, { status })
    setAmbulance(response.data)
    setMsg(`Status updated to ${status}.`)
  }

  const submitRequest = async () => {
    try {
      const response = await api.post('/emergency', { ...reqForm, ambulanceId, source: 'Ambulance' })
      socket.emit('join:hospital', reqForm.hospitalId)
      setEmergencies((prev) => [response.data, ...prev])
      setMsg(`Emergency request sent to ${reqForm.hospitalId}.`)
      setTab('status')
      setReqForm({
        patientName: '',
        age: '',
        gender: 'Male',
        emergencyType: 'General',
        condition: 'Stable',
        equipment: '',
        symptoms: '',
        ambulanceNotes: '',
        hospitalId: ambulance?.hospitalId || ownHospitalId,
      })
    } catch (err) {
      setMsg(err.response?.data?.message || 'Unable to submit emergency request.')
    }
  }

  if (loading) return <div className="loader-center"><div className="spinner" /></div>

  const hospital = hospitals.find((item) => item.hospitalId === ambulance?.hospitalId)

  return (
    <div className="portal-shell">
      <div className="topbar">
        <div className="topbar-logo">
          <span className="topbar-mark"><Ambulance size={18} /></span>
          <span>Ambulance dispatch</span>
          <span className="badge" style={{ background: `${STATUS_COLOR[ambulance?.status] || '#94a3b8'}20`, color: STATUS_COLOR[ambulance?.status] || '#94a3b8' }}>{ambulance?.status || 'Offline'}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <nav id="amb-tab-nav" style={{ display: 'none' }}>
            {TABS.map((item) => {
              const Icon = item.icon
              return <button key={item.key} className={`btn ${tab === item.key ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(item.key)}><Icon size={15} />{item.label}</button>
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
              <h1>Ambulance operations</h1>
              <p>Manage field status, transmit emergency requests, and stay synchronized with hospital reception teams.</p>
              <div className="portal-meta">
                <span className="portal-meta-chip"><Truck size={14} /> {ambulance?.vehicleNumber || ambulance?.ambulanceId}</span>
                <span className="portal-meta-chip"><Activity size={14} /> {ambulance?.hospitalId}</span>
              </div>
            </div>
          </section>

          {msg ? <div className={`alert ${msg.startsWith('Unable') ? 'alert-error' : 'alert-success'}`}>{msg}</div> : null}

          {ambulance?.assignedTask ? (
            <div className="alert alert-info" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>Assigned task:</strong> {ambulance.assignedTask}
              </div>
              <button className="btn btn-primary btn-sm" onClick={async () => {
                const response = await api.put(`/ambulances/${ambulanceId}`, { assignedTask: '' })
                setAmbulance(response.data)
                setMsg('Assigned task marked as complete.')
              }}>
                Mark complete
              </button>
            </div>
          ) : null}

          {tab === 'dashboard' ? (
            <div>
              <div className="stat-grid">
                {[
                  { label: 'Base hospital', val: ambulance?.hospitalId || '-', color: '#0ea5e9' },
                  { label: 'Status', val: ambulance?.status || 'Offline', color: STATUS_COLOR[ambulance?.status] || '#94a3b8' },
                  { label: 'Vehicle', val: ambulance?.vehicleNumber || '-', color: '#8b5cf6' },
                  { label: 'Open cases', val: emergencies.length, color: '#f59e0b' },
                ].map((stat) => (
                  <div key={stat.label} className="stat-card" style={{ '--accent': stat.color }}>
                    <div className="stat-val" style={{ fontSize: 18 }}>{stat.val}</div>
                    <div className="stat-label">{stat.label}</div>
                  </div>
                ))}
              </div>

              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-header"><span className="card-title">Status control</span></div>
                <div className="grid-3">
                  {STATUS_OPTIONS.map((status) => (
                    <button
                      key={status}
                      className="btn"
                      onClick={() => setStatus(status)}
                      style={{
                        background: ambulance?.status === status ? STATUS_COLOR[status] : `${STATUS_COLOR[status]}18`,
                        color: ambulance?.status === status ? '#fff' : STATUS_COLOR[status],
                        borderColor: STATUS_COLOR[status],
                      }}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="card-header"><span className="card-title">Crew</span></div>
                <div className="grid-2">
                  <div>
                    <div className="classic-kicker">EMT</div>
                    <div style={{ marginTop: 6, fontWeight: 700 }}>{ambulance?.emt?.name || '-'}</div>
                    <div className="text-muted">{ambulance?.emt?.mobile || '-'}</div>
                  </div>
                  <div>
                    <div className="classic-kicker">Pilot</div>
                    <div style={{ marginTop: 6, fontWeight: 700 }}>{ambulance?.pilot?.name || '-'}</div>
                    <div className="text-muted">{ambulance?.pilot?.mobile || '-'}</div>
                  </div>
                </div>
              </div>

              {hospital ? (
                <div className="card" style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>{hospital.name}</div>
                    <div className="text-muted">{hospital.contact}</div>
                  </div>
                  <a href={`tel:${hospital.contact}`} className="btn btn-success btn-sm"><Phone size={14} /> Call hospital</a>
                </div>
              ) : null}
            </div>
          ) : null}

          {tab === 'request' ? (
            <div className="card">
              <div className="form-group">
                <label className="form-label">Target hospital</label>
                <select className="form-select" value={reqForm.hospitalId} onChange={(event) => setReqForm((prev) => ({ ...prev, hospitalId: event.target.value }))}>
                  <option value="">Select hospital</option>
                  {hospitals.map((hospitalItem) => (
                    <option key={hospitalItem.hospitalId} value={hospitalItem.hospitalId}>
                      {hospitalItem.name} ({hospitalItem.hospitalId}){hospitalItem.hospitalId === ownHospitalId ? ' - Base' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Patient name</label>
                <input className="form-input" value={reqForm.patientName} onChange={(event) => setReqForm((prev) => ({ ...prev, patientName: event.target.value }))} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Age</label>
                  <input className="form-input" type="number" value={reqForm.age} onChange={(event) => setReqForm((prev) => ({ ...prev, age: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select className="form-select" value={reqForm.gender} onChange={(event) => setReqForm((prev) => ({ ...prev, gender: event.target.value }))}>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Condition</label>
                  <select className="form-select" value={reqForm.condition} onChange={(event) => setReqForm((prev) => ({ ...prev, condition: event.target.value }))}>
                    <option>Critical</option>
                    <option>Serious</option>
                    <option>Stable</option>
                    <option>Minor</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Emergency type</label>
                  <select className="form-select" value={reqForm.emergencyType} onChange={(event) => setReqForm((prev) => ({ ...prev, emergencyType: event.target.value }))}>
                    {['General', 'ICU', 'Cardiac', 'Trauma', 'Burns', 'Neuro', 'Maternity', 'Paediatric', 'Ortho'].map((type) => <option key={type}>{type}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Symptoms</label>
                <textarea className="form-textarea" value={reqForm.symptoms} onChange={(event) => setReqForm((prev) => ({ ...prev, symptoms: event.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Ambulance notes</label>
                <textarea className="form-textarea" placeholder="Patient response, interventions used, expected arrival time." value={reqForm.ambulanceNotes} onChange={(event) => setReqForm((prev) => ({ ...prev, ambulanceNotes: event.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Equipment needed</label>
                <input className="form-input" placeholder="Oxygen, ventilator, trauma support." value={reqForm.equipment} onChange={(event) => setReqForm((prev) => ({ ...prev, equipment: event.target.value }))} />
              </div>
              <button className="btn btn-danger btn-full" onClick={submitRequest}>Send emergency alert</button>
            </div>
          ) : null}

          {tab === 'status' ? (
            <div>
              {emergencies.length === 0 ? <div className="empty"><Radio size={40} /><p>No emergency requests recorded yet.</p></div> : emergencies.map((entry) => (
                <div key={entry._id} className="card" style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 800 }}>{entry.patientName || 'Unnamed patient'}</div>
                      <div className="text-muted" style={{ marginTop: 4 }}>{entry.emergencyType} | {entry.hospitalId}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>{new Date(entry.createdAt).toLocaleString()}</div>
                    </div>
                    <span className={`badge ${entry.status === 'Accepted' ? 'badge-green' : entry.status === 'Pending' ? 'badge-yellow' : entry.status === 'Rejected' ? 'badge-red' : 'badge-blue'}`}>{entry.status}</span>
                  </div>
                  {entry.status === 'Accepted' && hospitals.find((item) => item.hospitalId === entry.hospitalId) ? (
                    <a href={`tel:${hospitals.find((item) => item.hospitalId === entry.hospitalId).contact}`} className="btn btn-success btn-sm" style={{ width: '100%', marginTop: 12 }}>
                      <Phone size={13} />
                      Call hospital
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {tab === 'profile' && ambulance ? (
            <div>
              <div className="card" style={{ marginBottom: 16, textAlign: 'center' }}>
                <div style={{ width: 76, height: 76, borderRadius: '50%', margin: '0 auto 12px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Ambulance size={30} />
                </div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{ambulance.ambulanceId}</div>
                <div className="text-muted">{ambulance.vehicleNumber}</div>
                <div style={{ marginTop: 10 }}><span className="badge badge-blue">{ambulance.hospitalId}</span></div>
              </div>
              <div className="card">
                <div className="card-header"><span className="card-title">Crew details</span></div>
                {[{ label: 'EMT', data: ambulance.emt }, { label: 'Pilot', data: ambulance.pilot }].map(({ label, data }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '1px solid var(--border)' }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{data?.name?.[0] || label[0]}</div>
                    <div>
                      <div className="classic-kicker">{label}</div>
                      <div style={{ fontWeight: 700, marginTop: 4 }}>{data?.name || '-'}</div>
                      <div className="text-muted">{data?.mobile || '-'}</div>
                    </div>
                    {data?.mobile ? <a href={`tel:${data.mobile}`} className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}><Phone size={14} /></a> : null}
                  </div>
                ))}
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

      <style>{`@media(min-width:768px){#amb-tab-nav{display:flex!important;gap:6px;}}`}</style>
    </div>
  )
}
