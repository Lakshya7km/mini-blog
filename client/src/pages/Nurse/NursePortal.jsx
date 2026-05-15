import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import socket from '../../lib/socket'
import { BedDouble, Filter, LogOut, QrCode, RefreshCw, Search, UserRound, X } from 'lucide-react'
import QRScanner from '../../components/QRScanner'
import ErrorBoundary from '../../components/ErrorBoundary'
import { parseBedIdFromQR } from '../../lib/bedQr'

const STATUS_COLORS = { Vacant: '#22c55e', Occupied: '#ef4444', Reserved: '#f59e0b', Cleaning: '#8b5cf6' }
const STATUSES = ['Vacant', 'Occupied', 'Reserved', 'Cleaning']
const BED_TYPES = ['All Types', 'General', 'ICU', 'Private', 'Emergency', 'HDU', 'Day Care']
const TABS = [
  { key: 'beds', label: 'Bed Board', icon: BedDouble },
  { key: 'profile', label: 'Profile', icon: UserRound },
]

const timeSince = (date) => {
  if (!date) return null
  const mins = Math.floor((Date.now() - new Date(date)) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`
  return `${Math.floor(mins / 1440)}d ago`
}

export default function NursePortal() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('beds')
  const [beds, setBeds] = useState([])
  const [nurse, setNurse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [scanMode, setScanMode] = useState(false)
  const [msg, setMsg] = useState('')
  const [patientName, setPatientName] = useState('')
  const [viewMode, setViewMode] = useState('grid')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterWard, setFilterWard] = useState('')
  const [filterType, setFilterType] = useState('All Types')
  const [showFilters, setShowFilters] = useState(false)
  const [hospitalName, setHospitalName] = useState('')

  const loadBeds = useCallback(() => api.get('/nurses/beds').then((res) => setBeds(res.data)).finally(() => setLoading(false)), [])

  useEffect(() => {
    const nurseId = user?.nurseId || user?.ref
    socket.connect()
    socket.emit('join:hospital', user?.hospitalId)
    loadBeds()
    api.get(`/nurses?hospitalId=${user?.hospitalId}`).then((res) => {
      const record = res.data.find((item) => item.nurseId === nurseId)
      if (record) setNurse(record)
    })
    
    if (user?.hospitalId) {
      api.get(`/hospitals/${user.hospitalId}`)
        .then((res) => setHospitalName(res.data.name))
        .catch(console.error)
    }

    socket.on('bed:update', loadBeds)
    return () => {
      socket.off('bed:update')
      socket.disconnect()
    }
  }, [user, loadBeds])

  const wards = [...new Set(beds.map((bed) => bed.wardNumber))].sort()
  const filtered = beds.filter((bed) => {
    const matchSearch = !search ||
      bed.bedId.toLowerCase().includes(search.toLowerCase()) ||
      (bed.patientName || '').toLowerCase().includes(search.toLowerCase()) ||
      bed.wardNumber.includes(search)
    const matchStatus = !filterStatus || bed.status === filterStatus
    const matchWard = !filterWard || bed.wardNumber === filterWard
    const matchType = filterType === 'All Types' || bed.bedType === filterType
    return matchSearch && matchStatus && matchWard && matchType
  })

  const updateStatus = async (bedId, status) => {
    try {
      await api.patch(`/beds/${bedId}/status`, {
        status,
        patientName: status === 'Occupied' ? patientName : undefined,
      })
      setBeds((prev) => prev.map((item) => (item.bedId === bedId ? { ...item, status, patientName: status === 'Occupied' ? patientName : null } : item)))
      socket.emit('bed:update', { hospitalId: user?.hospitalId, bedId })
      setSelected(null)
      setPatientName('')
      setMsg(`Bed ${bedId} updated to ${status}.`)
      setTimeout(() => setMsg(''), 2400)
    } catch (err) {
      setMsg(err.response?.data?.message || 'Bed update failed.')
    }
  }

  const handleQRScan = async (data) => {
    const bedId = parseBedIdFromQR(data)
    const bed = beds.find((item) => item.bedId === bedId)
    setScanMode(false)
    if (bed) {
      setTimeout(() => setSelected(bed), 180)
      return
    }
    try {
      const response = await api.get(`/beds/public/${bedId}`)
      if (response.data?.hospitalId === user?.hospitalId) {
        setTimeout(() => setSelected(response.data), 180)
      } else {
        setMsg(`Scanned bed belongs to another hospital: ${bedId}`)
      }
    } catch {
      setMsg(`Bed not found: ${bedId}`)
    }
  }

  const stats = { Vacant: 0, Occupied: 0, Reserved: 0, Cleaning: 0 }
  beds.forEach((bed) => { stats[bed.status] += 1 })

  return (
    <div className="portal-shell">
      <div className="topbar">
        <div className="topbar-logo">
          <span className="topbar-mark"><BedDouble size={18} /></span>
          <span>Nurse operations</span>
          {nurse ? <span className="badge badge-blue">{nurse.name}</span> : null}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <nav id="nurse-tab-nav" style={{ display: 'none' }}>
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
        <div className="container" style={{ maxWidth: 1120 }}>
          <section className="portal-header-card">
            <div className="portal-header-copy">
              <h1>Ward and bed management</h1>
              <p>Fast updates for occupancy, cleaning, reservation, and patient assignment with optional QR scanning for bedside workflows.</p>
              <div className="portal-meta">
                <span className="portal-meta-chip"><BedDouble size={14} /> {beds.length} total beds</span>
                <span className="portal-meta-chip"><UserRound size={14} /> {hospitalName || nurse?.hospitalId || user?.hospitalId}</span>
              </div>
            </div>
          </section>

          {msg ? <div className="alert alert-success">{msg}</div> : null}

          {tab === 'beds' ? (
            <div>
              <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
                {STATUSES.map((status) => (
                  <div
                    key={status}
                    className="stat-card"
                    style={{ '--accent': STATUS_COLORS[status], cursor: 'pointer', outline: filterStatus === status ? `2px solid ${STATUS_COLORS[status]}` : 'none' }}
                    onClick={() => setFilterStatus((prev) => (prev === status ? '' : status))}
                  >
                    <div className="stat-val">{stats[status]}</div>
                    <div className="stat-label">{status}</div>
                  </div>
                ))}
              </div>

              <div className="card" style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                    <input className="form-input" style={{ paddingLeft: 32 }} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by bed, patient, or ward" />
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={() => setScanMode(true)}><QrCode size={14} /> Scan</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowFilters((prev) => !prev)}><Filter size={14} /></button>
                  <button className="btn btn-ghost btn-sm" onClick={loadBeds}><RefreshCw size={14} /></button>
                </div>

                {showFilters ? (
                  <div className="grid-3" style={{ marginBottom: 12 }}>
                    <select className="form-select" value={filterWard} onChange={(event) => setFilterWard(event.target.value)}>
                      <option value="">All wards</option>
                      {wards.map((ward) => <option key={ward} value={ward}>Ward {ward}</option>)}
                    </select>
                    <select className="form-select" value={filterType} onChange={(event) => setFilterType(event.target.value)}>
                      {BED_TYPES.map((type) => <option key={type}>{type}</option>)}
                    </select>
                    <button className="btn btn-ghost" onClick={() => { setFilterStatus(''); setFilterWard(''); setFilterType('All Types'); setSearch('') }}>
                      Clear filters
                    </button>
                  </div>
                ) : null}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span className="text-muted">{filtered.length} beds shown</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setViewMode('grid')}>Grid</button>
                    <button className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setViewMode('list')}>List</button>
                  </div>
                </div>

                {loading ? <div className="loader-center"><div className="spinner" /></div> : viewMode === 'grid' ? (
                  <div className="bed-grid">
                    {filtered.map((bed) => (
                      <div key={bed.bedId} className={`bed-card ${bed.status}`} onClick={() => setSelected(bed)}>
                        <div className="bed-num">{bed.bedNumber}</div>
                        <div className="bed-ward">Ward {bed.wardNumber}</div>
                        <div className="bed-type">{bed.bedType}</div>
                        {bed.patientName ? <div style={{ marginTop: 4, fontSize: 11, fontWeight: 700 }}>{bed.patientName}</div> : null}
                        <div style={{ marginTop: 6 }}><span className="badge" style={{ background: `${STATUS_COLORS[bed.status]}20`, color: STATUS_COLORS[bed.status] }}>{bed.status}</span></div>
                        {bed.updatedAt ? <div style={{ marginTop: 6, fontSize: 10, color: 'var(--text3)' }}>Updated {timeSince(bed.updatedAt)}</div> : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>
                    {filtered.map((bed) => (
                      <div key={bed.bedId} className="card" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', borderLeft: `3px solid ${STATUS_COLORS[bed.status]}` }} onClick={() => setSelected(bed)}>
                        <div style={{ width: 42, textAlign: 'center', fontWeight: 800 }}>{bed.bedNumber}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700 }}>{bed.bedId}</div>
                          <div className="text-muted">Ward {bed.wardNumber} | {bed.bedType}</div>
                          {bed.patientName ? <div style={{ marginTop: 3, fontSize: 12, fontWeight: 600 }}>{bed.patientName}</div> : null}
                        </div>
                        <span className="badge" style={{ background: `${STATUS_COLORS[bed.status]}20`, color: STATUS_COLORS[bed.status] }}>{bed.status}</span>
                      </div>
                    ))}
                  </div>
                )}

                {!loading && filtered.length === 0 ? <div className="empty"><p>No beds match the current filters.</p></div> : null}
              </div>
            </div>
          ) : null}

          {tab === 'profile' ? (
            <div className="card">
              <div style={{ textAlign: 'center', padding: '10px 0 16px' }}>
                <div style={{ width: 74, height: 74, borderRadius: '50%', margin: '0 auto 12px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800 }}>{nurse?.name?.[0] || '?'}</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{nurse?.name || '-'}</div>
                <div className="text-muted">{nurse?.nurseId}</div>
                <div className="text-muted" style={{ marginTop: 4 }}>{nurse?.mobile || '-'}</div>
                <div className="text-muted">{nurse?.hospitalId || user?.hospitalId}</div>
                {nurse?.shift ? <div className="text-muted">Shift: {nurse.shift}</div> : null}
              </div>
              <div className="divider" />
              <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
                {STATUSES.map((status) => (
                  <div key={status} className="stat-card" style={{ '--accent': STATUS_COLORS[status] }}>
                    <div className="stat-val">{stats[status]}</div>
                    <div className="stat-label">{status}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </main>

      {scanMode ? (
        <div className="modal-overlay" onClick={() => setScanMode(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Scan bed QR label</span>
              <button className="btn btn-ghost btn-icon" onClick={() => setScanMode(false)}><X size={18} /></button>
            </div>
            <ErrorBoundary>
              <QRScanner onScan={handleQRScan} />
            </ErrorBoundary>
          </div>
        </div>
      ) : null}

      {selected ? (
        <div className="modal-overlay" onClick={() => { setSelected(null); setPatientName('') }}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Bed {selected.bedNumber} | Ward {selected.wardNumber}</span>
              <button className="btn btn-ghost btn-icon" onClick={() => { setSelected(null); setPatientName('') }}><X size={18} /></button>
            </div>
            <p className="text-muted" style={{ marginBottom: 10 }}>
              Type: <strong>{selected.bedType}</strong> | Current status: <strong style={{ color: STATUS_COLORS[selected.status] }}>{selected.status}</strong>
            </p>
            {selected.patientName ? <p style={{ marginBottom: 10, fontWeight: 600 }}>Patient: {selected.patientName}</p> : null}
            <div className="form-group">
              <label className="form-label">Patient name when occupied</label>
              <input className="form-input" value={patientName} onChange={(event) => setPatientName(event.target.value)} placeholder="Enter patient name" />
            </div>
            <div className="grid-2">
              {STATUSES.map((status) => (
                <button
                  key={status}
                  className="btn"
                  onClick={() => updateStatus(selected.bedId, status)}
                  style={{ background: `${STATUS_COLORS[status]}18`, color: STATUS_COLORS[status], borderColor: STATUS_COLORS[status] }}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="bottom-nav">
        {TABS.map((item) => {
          const Icon = item.icon
          return <button key={item.key} className={`bottom-nav-item ${tab === item.key ? 'active' : ''}`} onClick={() => setTab(item.key)}><Icon size={20} />{item.label}</button>
        })}
      </div>

      <style>{`@media(min-width:768px){#nurse-tab-nav{display:flex!important;gap:6px;}}`}</style>
    </div>
  )
}
