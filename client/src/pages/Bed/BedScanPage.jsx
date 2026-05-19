import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BedDouble, QrCode, XCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import QRScanner from '../../components/QRScanner'
import ErrorBoundary from '../../components/ErrorBoundary'
import { parseBedIdFromQR } from '../../lib/bedQr'

const STATUS_COLORS = {
  Available: '#22c55e',
  Occupied: '#ef4444',
  Cleaning: '#8b5cf6',
}

const STATUSES = ['Available', 'Occupied', 'Cleaning']

export default function BedScanPage() {
  const { bedId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [bed, setBed] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [patientName, setPatientName] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [scanNext, setScanNext] = useState(false)
  const canUpdate = user && (user.role === 'nurse' || user.role === 'hospital')

  useEffect(() => {
    setLoading(true)
    setError('')
    setBed(null)
    api.get(`/beds/public/${bedId}`)
      .then((res) => {
        setBed(res.data)
        setPatientName(res.data.patientName || '')
      })
      .catch(() => setError('Bed not found. The QR code may be invalid.'))
      .finally(() => setLoading(false))
  }, [bedId])

  const updateStatus = async (status) => {
    if (!canUpdate) {
      navigate(`/?redirect=/bed/${bedId}`)
      return
    }
    setUpdating(true)
    setError('')
    setMsg('')
    try {
      const response = await api.patch(`/beds/${bedId}/status`, {
        status,
        patientName: status === 'Occupied' ? patientName : undefined,
      })
      setBed(response.data)
      setMsg(`Bed updated to ${status}.`)
      setTimeout(() => setMsg(''), 2400)
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  const handleNextScan = (data) => {
    const nextBedId = parseBedIdFromQR(data)
    if (!nextBedId) return
    setScanNext(false)
    navigate(`/bed/${nextBedId}`, { replace: true })
  }

  if (loading) {
    return (
      <div className="portal-shell" style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh' }}>
        <div className="text-center">
          <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 14px' }} />
          <p className="text-muted">Loading bed…</p>
        </div>
      </div>
    )
  }

  if (error && !bed) {
    return (
      <div className="portal-shell" style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh', padding: 16 }}>
        <div className="card" style={{ maxWidth: 440, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', margin: '0 auto 14px', background: 'var(--danger-light)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <XCircle size={32} />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800 }}>Bed not found</h2>
          <p className="text-muted" style={{ marginTop: 10 }}>{error}</p>
          <button type="button" className="btn btn-primary" style={{ marginTop: 18 }} onClick={() => navigate('/')}>Return home</button>
        </div>
      </div>
    )
  }

  return (
    <div className="portal-shell">
      <main className="portal-content">
        <div className="container" style={{ maxWidth: 540 }}>
          <section className="portal-header-card">
            <div className="portal-header-copy">
              <h1>Bed status</h1>
              <p>Scan a bed QR label to view or update availability.</p>
              <div className="portal-meta">
                <span className="portal-meta-chip"><BedDouble size={14} /> {bed?.hospitalId}</span>
                <span className="portal-meta-chip"><QrCode size={14} /> {bed?.bedId}</span>
              </div>
            </div>
          </section>

          <div className="card" style={{ marginBottom: 14, borderTop: `4px solid ${STATUS_COLORS[bed.status] || '#94a3b8'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
              <div>
                <div style={{ fontSize: 26, fontWeight: 800 }}>{bed.bedNumber || bed.bedId}</div>
                <div className="text-muted">Ward {bed.wardNumber || '—'} · {bed.bedType}</div>
              </div>
              <span className="badge" style={{ background: `${STATUS_COLORS[bed.status]}20`, color: STATUS_COLORS[bed.status] }}>{bed.status}</span>
            </div>
            {bed.patientName ? <div className="alert alert-error" style={{ marginTop: 14, marginBottom: 0 }}>Patient: {bed.patientName}</div> : null}
          </div>

          {msg ? <div className="alert alert-success">{msg}</div> : null}
          {error ? <div className="alert alert-error">{error}</div> : null}

          {!canUpdate ? (
            <div className="card" style={{ textAlign: 'center' }}>
              <p className="text-muted">Sign in as nurse or reception to update this bed.</p>
              <button type="button" className="btn btn-primary btn-full" style={{ marginTop: 14 }} onClick={() => navigate(`/?redirect=/bed/${bedId}`)}>Sign in</button>
            </div>
          ) : (
            <div>
              <div className="card" style={{ marginBottom: 14 }}>
                <label className="form-label">Patient name (when occupied)</label>
                <input className="form-input" value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Enter patient name" />
              </div>

              <div className="card" style={{ marginBottom: 14 }}>
                <div className="card-header"><span className="card-title">Update status</span></div>
                <div className="grid-2">
                  {STATUSES.map((status) => (
                    <button
                      key={status}
                      type="button"
                      className="btn"
                      disabled={updating}
                      onClick={() => updateStatus(status)}
                      style={{
                        borderColor: STATUS_COLORS[status],
                        background: bed.status === status ? STATUS_COLORS[status] : `${STATUS_COLORS[status]}18`,
                        color: bed.status === status ? '#fff' : STATUS_COLORS[status],
                      }}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <button type="button" className="btn btn-ghost btn-full" onClick={() => navigate('/')}>
                <ArrowLeft size={15} />
                Back
              </button>
              {!scanNext ? (
                <button type="button" className="btn btn-outline btn-full" style={{ marginTop: 8 }} onClick={() => setScanNext(true)}>
                  <QrCode size={15} />
                  Scan next bed
                </button>
              ) : (
                <div className="card" style={{ marginTop: 14 }}>
                  <div className="card-header" style={{ justifyContent: 'space-between' }}>
                    <span className="card-title">Scan next bed QR</span>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setScanNext(false)}>Cancel</button>
                  </div>
                  <ErrorBoundary>
                    <QRScanner onScan={handleNextScan} />
                  </ErrorBoundary>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
