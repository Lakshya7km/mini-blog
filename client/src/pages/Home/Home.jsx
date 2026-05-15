import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import {
  Activity,
  Ambulance,
  ArrowRight,
  Building2,
  Droplet,
  HeartHandshake,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Users,
  X,
} from 'lucide-react'
import './Home.css'

const FEATURES = [
  {
    icon: Building2,
    title: 'Hospital Command',
    desc: 'Monitor capacity, admissions, staff, and facility operations from a single control surface.',
  },
  {
    icon: Stethoscope,
    title: 'Clinical Coordination',
    desc: 'Keep doctors, nurses, and reception aligned with live duty, handoff, and patient intake data.',
  },
  {
    icon: Ambulance,
    title: 'Emergency Routing',
    desc: 'Receive incoming cases with real-time ambulance status, patient condition, and admission readiness.',
  },
]

const ROLES = [
  { key: 'hospital', label: 'Reception Console', sub: 'Admissions and operations', icon: Building2, color: '#1E3A8A', userPlace: 'HOSP-001', route: '/reception' },
  { key: 'doctor', label: 'Doctor Workspace', sub: 'Clinical profile and attendance', icon: Stethoscope, color: '#059669', userPlace: 'DOC-100', route: '/doctor' },
  { key: 'ambulance', label: 'Ambulance Dispatch', sub: 'Field communication and alerts', icon: Ambulance, color: '#DC2626', userPlace: 'AMB-001', route: '/ambulance' },
  { key: 'nurse', label: 'Nurse Operations', sub: 'Bed state and ward readiness', icon: Activity, color: '#0284C7', userPlace: 'NUR-100', route: '/nurse' },
  { key: 'superadmin', label: 'System Administration', sub: 'Network and master database', icon: ShieldAlert, color: '#1E293B', userPlace: 'admin@rapidcare', route: '/admin' },
]

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export default function Home() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [active, setActive] = useState(null)
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hospitals, setHospitals] = useState([])
  const [bloodStock, setBloodStock] = useState({})
  const [showDonateForm, setShowDonateForm] = useState(false)
  const [donateForm, setDonateForm] = useState({ name: '', bloodType: 'A+', contact: '', city: '', hospitalId: '' })
  const [donateMsg, setDonateMsg] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/hospitals')
        setHospitals(data)
        const stocks = await Promise.all(
          data.map((hospital) =>
            api
              .get(`/bloodbank?hospitalId=${hospital.hospitalId}`)
              .then((res) => [hospital.hospitalId, res.data])
              .catch(() => null),
          ),
        )
        const nextStock = {}
        stocks.forEach((entry) => {
          if (entry) nextStock[entry[0]] = entry[1]
        })
        setBloodStock(nextStock)
      } catch {
        setHospitals([])
      }
    }
    load()
  }, [])

  const openRole = (role) => {
    setActive(role)
    setError('')
    setForm({ username: '', password: '' })
    setTimeout(() => document.getElementById('login-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  const handleLogin = async (event) => {
    event.preventDefault()
    if (!active) return
    setLoading(true)
    setError('')
    try {
      const response = await api.post('/auth/login', {
        role: active.key,
        username: form.username.trim(),
        password: form.password,
      })
      login(response.data.token, response.data.user)
      navigate(active.route)
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const submitDonation = async (event) => {
    event.preventDefault()
    try {
      await api.post('/bloodbank/donors', donateForm)
      setDonateMsg('Donor registration submitted. The selected hospital can contact you directly.')
      setDonateForm({ name: '', bloodType: 'A+', contact: '', city: '', hospitalId: '' })
      setTimeout(() => {
        setShowDonateForm(false)
        setDonateMsg('')
      }, 2600)
    } catch {
      setDonateMsg('Unable to submit donor registration. Please try again.')
    }
  }

  const networkUnits = hospitals.length
  const bloodHospitals = hospitals.filter((hospital) => (bloodStock[hospital.hospitalId] || []).some((item) => item.units > 0))
  const totalListedUnits = Object.values(bloodStock)
    .flat()
    .reduce((sum, row) => sum + (row.units || 0), 0)

  return (
    <div className="home-page-classic">
      <nav className="classic-navbar">
        <div className="container classic-nav-container">
          <div className="classic-logo-wrapper">
            <img src="/logo.png" alt="RapidCare" />
            <div>
              <div className="font-bold text-primary" style={{ fontSize: '1.2rem', letterSpacing: '-0.02em' }}>RapidCare</div>
              <div className="text-muted" style={{ fontSize: 12 }}>Emergency management platform</div>
            </div>
          </div>
          <div className="classic-nav-actions">
            <a href="#login-section" className="classic-link">Staff Access</a>
            <button className="btn btn-primary" onClick={() => navigate('/public')}>
              Public Care Directory
            </button>
          </div>
        </div>
      </nav>

      <section className="classic-hero">
        <div className="container classic-hero-grid">
          <div className="classic-hero-copy">
            <div className="classic-eyebrow">
              <ShieldCheck size={14} />
              Production-grade emergency coordination
            </div>
            <h1 className="classic-hero-title">Hospital operations designed for speed, clarity, and trust.</h1>
            <p className="classic-hero-sub">
              RapidCare centralizes bed visibility, emergency intake, ambulance routing, and staff coordination into a calm operational interface for real clinical environments.
            </p>
            <div className="classic-hero-actions">
              <button className="btn btn-success" onClick={() => navigate('/public')}>
                Public hospital directory
              </button>
              <button className="btn btn-outline" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.36)', background: 'rgba(255,255,255,0.08)' }} onClick={() => document.getElementById('login-section')?.scrollIntoView({ behavior: 'smooth' })}>
                Staff sign in
              </button>
            </div>
            <div className="classic-hero-note">
              <span><Users size={14} /> Multi-role workflows</span>
              <span><HeartHandshake size={14} /> Live emergency response</span>
              <span><Droplet size={14} /> Blood inventory visibility</span>
            </div>
          </div>

          <div className="classic-side-panel">
            <div className="classic-panel-card">
              <h3>Operations snapshot</h3>
              <p>Built for reception desks, doctor stations, ward staff, dispatch teams, and administrators working under pressure.</p>
              <div className="classic-metric-grid">
                <div className="classic-metric">
                  <strong>{networkUnits}</strong>
                  <span>Facilities tracked</span>
                </div>
                <div className="classic-metric">
                  <strong>{bloodHospitals.length}</strong>
                  <span>Blood-ready centers</span>
                </div>
                <div className="classic-metric">
                  <strong>{totalListedUnits}</strong>
                  <span>Visible blood units</span>
                </div>
                <div className="classic-metric">
                  <strong>24/7</strong>
                  <span>Response workflows</span>
                </div>
              </div>
            </div>

            <div className="classic-panel-card">
              <div className="classic-kicker">Care network</div>
              <h3 style={{ marginTop: 6 }}>Public search and hospital detail views stay aligned with operational data.</h3>
              <p>Patients and ambulance staff can quickly verify availability, contact facilities, and route to the right destination.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="classic-section">
        <div className="container">
          <div className="classic-section-heading">
            <div>
              <h2>Core operational modules</h2>
              <p>Each module is structured around hospital-grade workflows instead of decorative landing-page patterns.</p>
            </div>
          </div>

          <div className="classic-feature-grid">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="classic-card classic-feature-card">
                <div className="classic-feature-icon" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                  <Icon size={24} />
                </div>
                <div className="classic-kicker" style={{ marginTop: 14 }}>Workflow</div>
                <h3 style={{ marginTop: 8, fontSize: '1.08rem', fontWeight: 800 }}>{title}</h3>
                <p className="text-muted" style={{ marginTop: 10 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="classic-section">
        <div className="container">
          <div className="classic-section-heading">
            <div>
              <h2>Network blood availability</h2>
              <p>Shared inventory improves triage and helps hospitals act faster during cross-facility emergencies.</p>
            </div>
            <button className="btn btn-danger" onClick={() => setShowDonateForm(true)}>
              <Droplet size={15} />
              Register as donor
            </button>
          </div>

          <div className="classic-blood-grid">
            {hospitals
              .filter((hospital) => (bloodStock[hospital.hospitalId] || []).length > 0)
              .map((hospital) => {
                const activeStock = (bloodStock[hospital.hospitalId] || []).filter((row) => row.units > 0)
                return (
                  <div key={hospital.hospitalId} className="classic-card classic-blood-card">
                    <div className="classic-kicker">Facility</div>
                    <h3 style={{ marginTop: 8, fontSize: '1.08rem', fontWeight: 800 }}>{hospital.name}</h3>
                    <p className="text-muted" style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MapPin size={14} />
                      {hospital.address?.city || 'Location unavailable'}
                    </p>
                    <div className="classic-blood-tags">
                      {activeStock.length > 0 ? activeStock.map((row) => (
                        <span key={row._id || row.bloodType} className="badge badge-red">
                          {row.bloodType}: {row.units} units
                        </span>
                      )) : <span className="badge badge-gray">No live stock reported</span>}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </section>

      <section className="classic-section" id="login-section">
        <div className="container">
          <div className="classic-section-heading">
            <div>
              <h2>Secure role-based access</h2>
              <p>Each portal presents focused information for the clinical or operational responsibility of that user.</p>
            </div>
          </div>

          <div className="classic-role-grid">
            {ROLES.map((role) => {
              const Icon = role.icon
              const isActive = active?.key === role.key
              return (
                <div key={role.key} className="classic-card classic-role-card" style={{ borderTop: `4px solid ${role.color}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                    <div className="classic-stat-icon" style={{ background: `${role.color}15`, color: role.color }}>
                      <Icon size={22} />
                    </div>
                    <div>
                      <div className="classic-kicker">{role.sub}</div>
                      <h4 style={{ marginTop: 6, fontWeight: 800 }}>{role.label}</h4>
                    </div>
                  </div>

                  {isActive ? (
                    <form className="classic-login-form" onSubmit={handleLogin}>
                      {error ? <div className="alert alert-error">{error}</div> : null}
                      <div className="form-group">
                        <label className="form-label">Username</label>
                        <input className="form-input" placeholder={role.userPlace} value={form.username} onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Password</label>
                        <input className="form-input" type="password" placeholder="Enter password" value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} required />
                      </div>
                      <div className="classic-form-grid">
                        <button className="btn" type="button" onClick={() => setActive(null)}>
                          Cancel
                        </button>
                        <button className="btn" type="submit" disabled={loading} style={{ background: role.color, color: '#fff' }}>
                          {loading ? 'Signing in...' : 'Access portal'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div style={{ marginTop: 'auto' }}>
                      <p className="text-muted" style={{ marginBottom: 16 }}>
                        Structured access for verified personnel with hospital-specific workflows and status panels.
                      </p>
                      <button className="btn btn-outline btn-full" style={{ color: role.color }} onClick={() => openRole(role)}>
                        Open access form
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <footer className="classic-footer">
        <div className="container text-center">
          <p className="text-muted">© 2026 RapidCare. Built for coordinated emergency and hospital operations.</p>
        </div>
      </footer>

      {showDonateForm && (
        <div className="modal-overlay" onClick={() => setShowDonateForm(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="classic-kicker">Public donor form</div>
                <h3 className="modal-title" style={{ marginTop: 6 }}>Blood donor registration</h3>
              </div>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowDonateForm(false)}>
                <X size={18} />
              </button>
            </div>
            <p className="text-muted" style={{ marginBottom: 16 }}>
              Submit your details to make yourself available to the selected hospital blood bank.
            </p>

            {donateMsg ? <div className={`alert ${donateMsg.startsWith('Unable') ? 'alert-error' : 'alert-success'}`}>{donateMsg}</div> : null}

            <form onSubmit={submitDonation}>
              <div className="form-group">
                <label className="form-label">Hospital</label>
                <select className="form-select" value={donateForm.hospitalId} onChange={(e) => setDonateForm((prev) => ({ ...prev, hospitalId: e.target.value }))} required>
                  <option value="">Select hospital</option>
                  {hospitals.map((hospital) => (
                    <option key={hospital.hospitalId} value={hospital.hospitalId}>
                      {hospital.name} ({hospital.address?.city})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Full name</label>
                <input className="form-input" value={donateForm.name} onChange={(e) => setDonateForm((prev) => ({ ...prev, name: e.target.value }))} required />
              </div>
              <div className="classic-form-grid">
                <div className="form-group">
                  <label className="form-label">Blood group</label>
                  <select className="form-select" value={donateForm.bloodType} onChange={(e) => setDonateForm((prev) => ({ ...prev, bloodType: e.target.value }))}>
                    {BLOOD_TYPES.map((type) => <option key={type}>{type}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Contact number</label>
                  <input className="form-input" value={donateForm.contact} onChange={(e) => setDonateForm((prev) => ({ ...prev, contact: e.target.value }))} placeholder="9876543210" required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">City</label>
                <input className="form-input" value={donateForm.city} onChange={(e) => setDonateForm((prev) => ({ ...prev, city: e.target.value }))} required />
              </div>
              <button className="btn btn-danger btn-full" type="submit">
                Submit registration
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
