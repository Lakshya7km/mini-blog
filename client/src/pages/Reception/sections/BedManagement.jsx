import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../../../lib/api'
import socket from '../../../lib/socket'
import { Plus, Search, RefreshCw, X, Download, Printer, CheckSquare, Square } from 'lucide-react'
import QRScanner from '../../../components/QRScanner'
import ErrorBoundary from '../../../components/ErrorBoundary'
import QRCode from 'qrcode'
import { parseBedIdFromQR, buildBedQrUrl, getBedQrBaseUrl } from '../../../lib/bedQr'

const STATUS_COLORS = { Vacant: '#22c55e', Occupied: '#ef4444', Reserved: '#f59e0b', Cleaning: '#8b5cf6' }
const STATUSES = ['Vacant', 'Occupied', 'Reserved', 'Cleaning']
const BED_TYPES = ['General', 'ICU', 'Private', 'Emergency', 'HDU', 'Day Care']

export default function BedManagement({ hospitalId }) {
    const [beds, setBeds] = useState([])
    const [filtered, setFiltered] = useState([])
    const [search, setSearch] = useState('')
    const [filterStatus, setFilterStatus] = useState('')
    const [filterType, setFilterType] = useState('')
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)
    const [selected, setSelected] = useState(null)
    const [scanMode, setScanMode] = useState(false)
    const [selectedIds, setSelectedIds] = useState(new Set())
    const [downloading, setDownloading] = useState(false)
    const [createForm, setCreateForm] = useState({ wardNumber: '', bedType: 'General', startNum: 1, endNum: 5 })
    const [msg, setMsg] = useState('')
    const [patientName, setPatientName] = useState('')

    const load = useCallback(() => {
        api.get(`/beds?hospitalId=${hospitalId}`).then(r => { setBeds(r.data); setFiltered(r.data) }).finally(() => setLoading(false))
    }, [hospitalId])

    useEffect(() => { load() }, [load])

    useEffect(() => {
        let f = beds
        if (search) f = f.filter(b => b.bedId.toLowerCase().includes(search.toLowerCase()) || (b.wardNumber || '').includes(search) || (b.patientName || '').toLowerCase().includes(search.toLowerCase()))
        if (filterStatus) f = f.filter(b => b.status === filterStatus)
        if (filterType) f = f.filter(b => b.bedType === filterType)
        setFiltered(f)
    }, [beds, search, filterStatus, filterType])

    useEffect(() => {
        socket.on('bed:update', () => load())
        return () => socket.off('bed:update')
    }, [load])

    const createBulk = async () => {
        await api.post('/beds/bulk', { hospitalId, ...createForm })
        setCreating(false); load(); setMsg('Beds created!')
    }

    const updateStatus = async (bedId, status) => {
        const r = await api.patch(`/beds/${bedId}/status`, { status, patientName: status === 'Occupied' ? patientName : undefined })
        setBeds(b => b.map(x => x.bedId === bedId ? r.data : x))
        setSelected(null); setPatientName('')
    }

    const handleQRScan = async (data) => {
        const bedId = parseBedIdFromQR(data)
        const bed = beds.find(b => b.bedId === bedId)
        setScanMode(false)

        if (bed) {
            setTimeout(() => setSelected(bed), 180)
            return
        }

        try {
            const r = await api.get(`/beds/public/${bedId}`)
            if (r.data?.hospitalId === hospitalId) {
                setTimeout(() => setSelected(r.data), 180)
            } else {
                setMsg(`Bed "${bedId}" belongs to another hospital`)
            }
        } catch {
            setMsg(`Bed "${bedId}" not found`)
        }
    }

    const toggleSelect = (bedId) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(bedId)) next.delete(bedId)
            else next.add(bedId)
            return next
        })
    }

    const toggleAll = () => {
        if (selectedIds.size === filtered.length) setSelectedIds(new Set())
        else setSelectedIds(new Set(filtered.map(b => b.bedId)))
    }

    // Generate and download QR PDF for given beds
    const downloadQRPDF = async (bedsToDownload) => {
        if (bedsToDownload.length === 0) return
        setDownloading(true)
        try {
            const baseUrl = getBedQrBaseUrl()
            // Build an HTML page with all QR label cards
            const cards = await Promise.all(bedsToDownload.map(async (bed) => {
                // Encode a full URL so any camera app can open the scan page directly
                const bedUrl = buildBedQrUrl(bed.bedId)
                const qrDataUrl = await QRCode.toDataURL(bedUrl, { width: 180, margin: 1 })
                return `
                <div class="label">
                    <div class="hospital">${hospitalId}</div>
                    <img src="${qrDataUrl}" alt="QR" />
                    <div class="bed-id">${bed.bedId}</div>
                    <div class="info">Ward ${bed.wardNumber} · ${bed.bedType}</div>
                    <div class="info">${bed.bedNumber}</div>
                </div>`
            }))

            const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Bed QR Labels — ${hospitalId}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 0; background: white; }
  .grid { display: flex; flex-wrap: wrap; gap: 8px; padding: 12px; }
  .label {
    width: 180px; border: 2px solid #333; border-radius: 8px;
    padding: 10px; text-align: center; page-break-inside: avoid;
    background: white;
  }
  .label img { width: 150px; height: 150px; }
  .hospital { font-size: 10px; color: #666; font-weight: bold; text-transform: uppercase; margin-bottom: 4px; }
  .bed-id { font-size: 15px; font-weight: 900; color: #111; margin: 4px 0; }
  .info { font-size: 11px; color: #555; }
  @media print {
    body { margin: 0; }
    .grid { gap: 6px; padding: 6px; }
  }
</style>
</head>
<body>
<div style="padding: 0 12px 8px; font-size: 10px; color: #666;">QR base URL: ${baseUrl}</div>
<div class="grid">
${cards.join('\n')}
</div>
</body>
</html>`

            const win = window.open('', '_blank')
            win.document.write(html)
            win.document.close()
            setTimeout(() => win.print(), 500)
        } catch (e) {
            setMsg(e?.message || 'Failed to generate QR labels')
        } finally {
            setDownloading(false)
        }
    }

    const stats = { Vacant: 0, Occupied: 0, Reserved: 0, Cleaning: 0 }
    beds.forEach(b => stats[b.status]++)

    if (loading) return <div className="loader-center"><div className="spinner" /></div>

    const bedsForDownload = selectedIds.size > 0 ? filtered.filter(b => selectedIds.has(b.bedId)) : filtered

    const regenerateQRCodes = async () => {
        if (bedsForDownload.length === 0) {
            setMsg('No beds available to regenerate QR labels')
            return
        }

        const scope = selectedIds.size > 0 ? `${selectedIds.size} selected beds` : `all ${filtered.length} beds`
        const ok = window.confirm(`Regenerate QR labels for ${scope}?\n\nUse this when old labels were generated from localhost or a wrong domain.`)
        if (!ok) return

        await downloadQRPDF(bedsForDownload)
        setMsg(`Regenerated QR labels for ${scope}. Replace old labels to avoid white-screen scans.`)
    }

    return (
        <div>
            {/* Stats */}
            <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                {STATUSES.map(s => (
                    <div key={s} className="stat-card" style={{ '--accent': STATUS_COLORS[s] }}>
                        <div className="stat-val">{stats[s]}</div>
                        <div className="stat-label" style={{ fontSize: 10 }}>{s}</div>
                    </div>
                ))}
            </div>

            {msg && <div className="alert alert-success" onClick={() => setMsg('')}>{msg}</div>}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <button className="btn btn-primary btn-sm" onClick={() => setCreating(true)}><Plus size={14} /> Add Beds</button>
                <button className="btn btn-outline btn-sm" onClick={() => setScanMode(true)}><Search size={14} /> QR Scan</button>
                <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} /></button>
                <div style={{ flex: 1 }} />
                <button
                    className="btn btn-outline btn-sm"
                    onClick={regenerateQRCodes}
                    disabled={downloading}
                    title={selectedIds.size > 0 ? `Regenerate QR for ${selectedIds.size} selected beds` : `Regenerate QR for all ${filtered.length} beds`}
                >
                    <RefreshCw size={14} />
                    {selectedIds.size > 0 ? `Regenerate ${selectedIds.size} QR` : 'Regenerate All QR'}
                </button>
                <button
                    className="btn btn-sm"
                    style={{ background: '#f97316', color: 'white', opacity: downloading ? 0.6 : 1 }}
                    onClick={() => downloadQRPDF(bedsForDownload)}
                    disabled={downloading}
                    title={selectedIds.size > 0 ? `Download QR for ${selectedIds.size} selected beds` : `Download QR for all ${filtered.length} beds`}
                >
                    <Printer size={14} />
                    {downloading ? 'Generating...' : selectedIds.size > 0 ? `Print ${selectedIds.size} QR Labels` : 'Print All QR Labels'}
                </button>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                    <input className="form-input" style={{ paddingLeft: 30 }} placeholder="Search by bed ID, ward, patient…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="form-select" style={{ width: 110 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="">All Status</option>
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
                <select className="form-select" style={{ width: 110 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                    <option value="">All Types</option>
                    {BED_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
            </div>

            {/* Select all row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '6px 0' }}>
                <button className="btn btn-ghost btn-sm" onClick={toggleAll} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '4px 8px' }}>
                    {selectedIds.size === filtered.length && filtered.length > 0 ? <CheckSquare size={14} /> : <Square size={14} />}
                    {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
                </button>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>{filtered.length} beds shown</span>
            </div>

            {/* Bed Grid */}
            <div className="bed-grid">
                {filtered.map(b => (
                    <div
                        key={b.bedId}
                        className={`bed-card ${b.status}`}
                        style={{ position: 'relative', outline: selectedIds.has(b.bedId) ? '2px solid var(--primary)' : 'none' }}
                    >
                        {/* Checkbox */}
                        <div
                            style={{ position: 'absolute', top: 6, right: 6, zIndex: 2, cursor: 'pointer' }}
                            onClick={e => { e.stopPropagation(); toggleSelect(b.bedId) }}
                        >
                            {selectedIds.has(b.bedId)
                                ? <CheckSquare size={14} color="var(--primary)" />
                                : <Square size={14} color="var(--text3)" />
                            }
                        </div>
                        {/* Main click → status modal */}
                        <div onClick={() => setSelected(b)}>
                            <div className="bed-num">{b.bedNumber}</div>
                            <div className="bed-ward">Ward {b.wardNumber}</div>
                            <div className="bed-type">{b.bedType}</div>
                            {b.patientName && <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2, fontWeight: 600 }}>Patient: {b.patientName}</div>}
                            <div style={{ marginTop: 4 }}>
                                <span className="badge" style={{ background: STATUS_COLORS[b.status] + '20', color: STATUS_COLORS[b.status], fontSize: 10 }}>{b.status}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filtered.length === 0 && <div className="empty"><p>No beds match filters</p></div>}

            {/* Create Modal */}
            {creating && (
                <div className="modal-overlay" onClick={() => setCreating(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">Add Beds in Bulk</span>
                            <button className="btn btn-ghost btn-icon" onClick={() => setCreating(false)}><X size={18} /></button>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Ward Number</label>
                            <input className="form-input" placeholder="e.g. W1" value={createForm.wardNumber} onChange={e => setCreateForm(f => ({ ...f, wardNumber: e.target.value }))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Bed Type</label>
                            <select className="form-select" value={createForm.bedType} onChange={e => setCreateForm(f => ({ ...f, bedType: e.target.value }))}>
                                {BED_TYPES.map(t => <option key={t}>{t}</option>)}
                            </select>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <div className="form-group">
                                <label className="form-label">From #</label>
                                <input className="form-input" type="number" value={createForm.startNum} onChange={e => setCreateForm(f => ({ ...f, startNum: +e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">To #</label>
                                <input className="form-input" type="number" value={createForm.endNum} onChange={e => setCreateForm(f => ({ ...f, endNum: +e.target.value }))} />
                            </div>
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>
                            Will create {Math.max(0, createForm.endNum - createForm.startNum + 1)} beds in Ward {createForm.wardNumber || '?'}
                        </p>
                        <button className="btn btn-primary btn-full" onClick={createBulk}>Create Beds</button>
                    </div>
                </div>
            )}

            {/* QR Scanner */}
            {scanMode && (
                <div className="modal-overlay" onClick={() => setScanMode(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">Scan Bed QR</span>
                            <button className="btn btn-ghost btn-icon" onClick={() => setScanMode(false)}><X size={18} /></button>
                        </div>
                        <ErrorBoundary>
                            <QRScanner onScan={handleQRScan} />
                        </ErrorBoundary>
                        <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 12, textAlign: 'center' }}>
                            Point camera at QR label pasted on the bed
                        </p>
                    </div>
                </div>
            )}

            {/* Status Update Modal */}
            {selected && (
                <div className="modal-overlay" onClick={() => { setSelected(null); setPatientName('') }}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">Bed {selected.bedNumber} · Ward {selected.wardNumber}</span>
                            <button className="btn btn-ghost btn-icon" onClick={() => { setSelected(null); setPatientName('') }}><X size={18} /></button>
                        </div>
                        <p style={{ color: 'var(--text2)', marginBottom: 10 }}>
                            Current: <strong>{selected.status}</strong> · Type: {selected.bedType}
                        </p>
                        {selected.patientName && (
                            <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 10 }}>Patient: <strong>{selected.patientName}</strong></p>
                        )}
                        <div className="form-group">
                            <label className="form-label">Patient Name (for Occupied)</label>
                            <input className="form-input" placeholder="Enter patient name…" value={patientName} onChange={e => setPatientName(e.target.value)} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {STATUSES.map(s => (
                                <button key={s} className="btn" style={{ background: STATUS_COLORS[s] + '20', color: STATUS_COLORS[s], border: `1.5px solid ${STATUS_COLORS[s]}`, fontWeight: 600, borderRadius: 10 }} onClick={() => updateStatus(selected.bedId, s)}>
                                    {s}
                                </button>
                            ))}
                        </div>
                        <div style={{ marginTop: 12 }}>
                            <button
                                className="btn btn-sm"
                                style={{ background: '#f97316', color: 'white', width: '100%' }}
                                onClick={() => downloadQRPDF([selected])}
                            >
                                <Printer size={14} /> Print QR Label for this Bed
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
