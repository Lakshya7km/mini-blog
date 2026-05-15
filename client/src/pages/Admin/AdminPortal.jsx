import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import { Building2, Database, LayoutDashboard, LogOut, Plus, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react'

const TABS = [
  { key: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { key: 'register', label: 'Register Facility', icon: Building2 },
  { key: 'master', label: 'Master Data', icon: Database },
]

const COLS = ['hospitals', 'doctors', 'nurses', 'ambulances', 'emergencies']

export default function AdminPortal() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('dashboard')
  const [stats, setStats] = useState(null)
  const [dbCol, setDbCol] = useState('hospitals')
  const [dbData, setDbData] = useState([])
  const [dbLoading, setDbLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [regForm, setRegForm] = useState({ hospitalId: '', name: '', contact: '', password: '', address: { street: '', city: '', district: '', state: '' }, googleMapUrl: '' })

  useEffect(() => {
    api.get('/admin/stats').then((res) => setStats(res.data)).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (tab !== 'master') return
    setDbLoading(true)
    api.get(`/admin/master/${dbCol}`).then((res) => setDbData(res.data)).finally(() => setDbLoading(false))
  }, [tab, dbCol])

  const register = async () => {
    try {
      const payload = { ...regForm }
      if (payload.googleMapUrl) {
        const match = payload.googleMapUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
        if (match) payload.location = { lat: Number.parseFloat(match[1]), lng: Number.parseFloat(match[2]) }
      }
      await api.post('/admin/register-hospital', payload)
      setMsg('Hospital registered successfully.')
      setTab('dashboard')
      const refreshed = await api.get('/admin/stats')
      setStats(refreshed.data)
    } catch (err) {
      setMsg(err.response?.data?.message || 'Unable to register hospital.')
    }
  }

  const deleteRecord = async (id) => {
    if (!window.confirm('Delete this record permanently?')) return
    try {
      await api.delete(`/admin/master/${dbCol}/${id}`)
      setDbData((prev) => prev.filter((entry) => entry._id !== id))
    } catch (err) {
      setMsg(err.response?.data?.message || 'Unable to delete record.')
    }
  }

  const refreshDb = () => {
    setDbLoading(true)
    api.get(`/admin/master/${dbCol}`).then((res) => setDbData(res.data)).finally(() => setDbLoading(false))
  }

  if (loading) return <div className="loader-center"><div className="spinner" /></div>

  return (
    <div className="portal-shell">
      <div className="topbar">
        <div className="topbar-logo">
          <span className="topbar-mark"><ShieldCheck size={18} /></span>
          <span>Administration</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <nav id="admin-tab-nav" style={{ display: 'none' }}>
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
        <div className="container" style={{ maxWidth: 1040 }}>
          <section className="portal-header-card">
            <div className="portal-header-copy">
              <h1>System administration</h1>
              <p>Manage the hospital network, review platform-wide totals, and inspect master data in a structured operational console.</p>
            </div>
          </section>

          {msg ? <div className={`alert ${msg.startsWith('Unable') ? 'alert-error' : 'alert-success'}`}>{msg}</div> : null}

          {tab === 'dashboard' && stats ? (
            <div>
              <div className="stat-grid">
                {[
                  { label: 'Hospitals', val: stats.hospitals, color: '#0ea5e9' },
                  { label: 'Doctors', val: stats.doctors, color: '#22c55e' },
                  { label: 'Ambulances', val: stats.ambulances, color: '#f59e0b' },
                  { label: 'Nurses', val: stats.nurses, color: '#8b5cf6' },
                  { label: 'Active emergencies', val: stats.activeEmergencies, color: '#ef4444' },
                ].map((stat) => (
                  <div key={stat.label} className="stat-card" style={{ '--accent': stat.color }}>
                    <div className="stat-val">{stat.val}</div>
                    <div className="stat-label">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {tab === 'register' ? (
            <div className="card">
              <div className="grid-2">
                {[
                  ['hospitalId', 'Hospital ID'],
                  ['name', 'Hospital name'],
                  ['contact', 'Contact'],
                  ['password', 'Password'],
                  ['googleMapUrl', 'Google Maps URL'],
                ].map(([key, label]) => (
                  <div className="form-group" key={key}>
                    <label className="form-label">{label}</label>
                    <input className="form-input" value={regForm[key] || ''} onChange={(event) => setRegForm((prev) => ({ ...prev, [key]: event.target.value }))} />
                  </div>
                ))}
              </div>
              <div className="divider" />
              <div className="classic-kicker" style={{ marginBottom: 12 }}>Address</div>
              <div className="grid-2">
                {['street', 'city', 'district', 'state'].map((field) => (
                  <div className="form-group" key={field}>
                    <label className="form-label">{field}</label>
                    <input className="form-input" value={regForm.address?.[field] || ''} onChange={(event) => setRegForm((prev) => ({ ...prev, address: { ...(prev.address || {}), [field]: event.target.value } }))} />
                  </div>
                ))}
              </div>
              <button className="btn btn-primary btn-full" onClick={register}>
                <Plus size={15} />
                Register hospital
              </button>
            </div>
          ) : null}

          {tab === 'master' ? (
            <div className="card">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {COLS.map((collection) => (
                  <button key={collection} className={`btn btn-sm ${dbCol === collection ? 'btn-primary' : 'btn-outline'}`} onClick={() => setDbCol(collection)}>
                    {collection}
                  </button>
                ))}
                <button className="btn btn-ghost btn-sm" onClick={refreshDb}><RefreshCw size={13} /></button>
              </div>

              {dbLoading ? <div className="loader-center"><div className="spinner" /></div> : (
                <div>
                  <div className="text-muted" style={{ marginBottom: 12 }}>{dbData.length} records</div>
                  {dbData.length === 0 ? <div className="empty"><p>No records available.</p></div> : dbData.map((row) => (
                    <div key={row._id} className="card" style={{ marginBottom: 10, padding: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          {Object.entries(row).filter(([key]) => !['__v', 'password'].includes(key)).slice(0, 6).map(([key, value]) => (
                            <div key={key} style={{ fontSize: 13, marginBottom: 4 }}>
                              <strong>{key}:</strong> {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </div>
                          ))}
                        </div>
                        <button className="btn btn-ghost btn-icon" onClick={() => deleteRecord(row._id)}>
                          <Trash2 size={15} color="var(--danger)" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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

      <style>{`@media(min-width:768px){#admin-tab-nav{display:flex!important;gap:6px;}}`}</style>
    </div>
  )
}
