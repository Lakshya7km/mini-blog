import { useState, useEffect } from 'react'
import api from '../../../lib/api'

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']

const BLOOD_COLORS = {
    'A+': '#ef4444', 'A-': '#f97316', 'B+': '#8b5cf6', 'B-': '#a855f7',
    'O+': '#0ea5e9', 'O-': '#06b6d4', 'AB+': '#22c55e', 'AB-': '#16a34a'
}

const STATUS_BADGE = {
    'Pending': { bg: '#fef3c7', color: '#92400e', label: '⏳ Pending' },
    'Contacted': { bg: '#dbeafe', color: '#1e40af', label: 'Contacted' },
    'Received': { bg: '#dcfce7', color: '#166534', label: 'Received' },
    'Cancelled': { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled' },
}

export default function BloodBankSection({ hospitalId }) {
    const [tab, setTab] = useState('stock') // 'stock' | 'donors'

    // ─── Blood Stock ────────────────────────────
    const [inventory, setInventory] = useState([])
    const [editing, setEditing] = useState({})
    const [saving, setSaving] = useState(false)
    const [loadingStock, setLoadingStock] = useState(true)
    const [stockMsg, setStockMsg] = useState('')

    const loadStock = () => {
        api.get(`/bloodbank?hospitalId=${hospitalId}`)
            .then(r => {
                setInventory(r.data)
                const map = {}
                r.data.forEach(i => { map[i.bloodType] = String(i.units) })
                setEditing(map)
            })
            .finally(() => setLoadingStock(false))
    }

    const saveAll = async () => {
        setSaving(true)
        try {
            await Promise.all(BLOOD_TYPES.map(bg =>
                api.post('/bloodbank/upsert', { hospitalId, bloodType: bg, units: parseInt(editing[bg] || '0', 10) })
            ))
            setStockMsg('Blood bank updated. Stock is now visible on the public portal.')
            loadStock()
        } catch (e) {
            setStockMsg('Error: ' + (e.response?.data?.message || e.message))
        } finally {
            setSaving(false)
            setTimeout(() => setStockMsg(''), 4000)
        }
    }

    // ─── Donors ─────────────────────────────────
    const [donors, setDonors] = useState([])
    const [loadingDonors, setLoadingDonors] = useState(true)
    const [donorMsg, setDonorMsg] = useState('')
    const [remarkModal, setRemarkModal] = useState(null) // donor object being remarked
    const [remarkText, setRemarkText] = useState('')
    const [remarkStatus, setRemarkStatus] = useState('Contacted')

    const loadDonors = () => {
        api.get(`/bloodbank/donors?hospitalId=${hospitalId}`)
            .then(r => setDonors(r.data))
            .finally(() => setLoadingDonors(false))
    }

    const updateDonor = async (id, body) => {
        try {
            await api.put(`/bloodbank/donors/${id}`, body)
            setDonorMsg('Donor updated!')
            loadDonors()
            setTimeout(() => setDonorMsg(''), 3000)
        } catch (e) {
            setDonorMsg('Error: ' + (e.response?.data?.message || e.message))
        }
    }

    const openRemark = (donor) => {
        setRemarkModal(donor)
        setRemarkText(donor.remarks || '')
        setRemarkStatus(donor.status || 'Contacted')
    }

    const submitRemark = async () => {
        await updateDonor(remarkModal._id, { status: remarkStatus, remarks: remarkText })
        setRemarkModal(null)
    }

    useEffect(() => {
        loadStock()
        loadDonors()
    }, [hospitalId])

    // ─── Build stock map ────────────────────────
    const invMap = {}
    inventory.forEach(i => { invMap[i.bloodType] = i.units })
    const totalUnits = Object.values(invMap).reduce((a, b) => a + b, 0)
    const availableTypes = Object.values(invMap).filter(u => u > 0).length

    const pendingCount = donors.filter(d => d.status === 'Pending').length

    return (
        <div>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 18, borderBottom: '2px solid var(--border)', paddingBottom: 0 }}>
                {[
                    { key: 'stock', label: 'Blood Stock' },
                    { key: 'donors', label: `Donors${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
                ].map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)} style={{
                        background: 'none', border: 'none', fontWeight: 700, cursor: 'pointer',
                        padding: '8px 16px', borderBottom: tab === t.key ? '3px solid var(--accent)' : '3px solid transparent',
                        color: tab === t.key ? 'var(--accent)' : 'var(--text2)',
                        fontSize: '0.9rem', marginBottom: -2
                    }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── BLOOD STOCK TAB ─────────────────── */}
            {tab === 'stock' && (
                <div>
                    {stockMsg && <div className={`alert ${stockMsg.startsWith('Error') ? 'alert-error' : 'alert-success'}`} onClick={() => setStockMsg('')}>{stockMsg}</div>}

                    <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: 14 }}>
                        <div className="stat-card" style={{ '--accent': '#ef4444' }}>
                            <div className="stat-val">{totalUnits}</div>
                            <div className="stat-label">Total Units</div>
                        </div>
                        <div className="stat-card" style={{ '--accent': '#22c55e' }}>
                            <div className="stat-val">{availableTypes}</div>
                            <div className="stat-label">Types Available</div>
                        </div>
                    </div>

                    {loadingStock ? <div className="loader-center"><div className="spinner" /></div> : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
                            {BLOOD_TYPES.map(bg => {
                                const color = BLOOD_COLORS[bg]
                                const currentUnits = invMap[bg] || 0
                                const draftVal = editing[bg] ?? String(currentUnits)
                                const isDirty = draftVal !== String(currentUnits)
                                return (
                                    <div key={bg} className="card" style={{ padding: 12, borderLeft: `3px solid ${color}` }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: color + '20', color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>{bg}</div>
                                            <div>
                                                <div style={{ fontWeight: 700 }}>Blood Group {bg}</div>
                                                <div style={{ fontSize: 11, color: currentUnits > 0 ? '#15803d' : '#dc2626', fontWeight: 600 }}>
                                                    {currentUnits > 0 ? `${currentUnits} units available` : 'Out of stock'}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <input type="number" min="0" className="form-input"
                                                style={{ flex: 1, padding: '6px 10px', borderColor: isDirty ? color : undefined }}
                                                value={draftVal}
                                                onChange={e => setEditing(prev => ({ ...prev, [bg]: e.target.value }))}
                                                placeholder="0" />
                                            <span style={{ fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap' }}>units</span>
                                        </div>
                                        {isDirty && <div style={{ fontSize: 10, color, marginTop: 4 }}>• Unsaved change</div>}
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    <button className="btn btn-primary btn-full" onClick={saveAll} disabled={saving} style={{ marginBottom: 8 }}>
                        {saving ? 'Saving...' : 'Save Blood Bank Stock'}
                    </button>
                    <p style={{ fontSize: 12, color: 'var(--text2)', textAlign: 'center' }}>Changes are visible to the public via the Hospital Details page</p>
                </div>
            )}

            {/* ── DONORS TAB ──────────────────────── */}
            {tab === 'donors' && (
                <div>
                    {donorMsg && <div className="alert alert-success" onClick={() => setDonorMsg('')}>{donorMsg}</div>}

                    {loadingDonors ? <div className="loader-center"><div className="spinner" /></div> : donors.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text2)' }}>
                            <div style={{ fontSize: '1rem', marginBottom: '1rem', fontWeight: 700, color: 'var(--danger)' }}>No donor requests</div>
                            <p>No donor requests yet. Requests submitted from the public portal will appear here.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {donors.map(d => {
                                const badge = STATUS_BADGE[d.status] || STATUS_BADGE['Pending']
                                return (
                                    <div key={d._id} className="card" style={{ padding: '14px 16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{d.name}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text2)', marginTop: 2 }}>
                                                    {d.city} &nbsp;|&nbsp; {d.contact}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{
                                                    width: 36, height: 36, borderRadius: '50%',
                                                    background: (BLOOD_COLORS[d.bloodType] || '#ef4444') + '20',
                                                    color: BLOOD_COLORS[d.bloodType] || '#ef4444',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontWeight: 800, fontSize: 13
                                                }}>{d.bloodType}</div>
                                                <span style={{ background: badge.bg, color: badge.color, borderRadius: 20, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 700 }}>
                                                    {badge.label}
                                                </span>
                                            </div>
                                        </div>

                                        {d.remarks && (
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text2)', background: 'var(--bg2)', padding: '6px 10px', borderRadius: 6, marginBottom: 8 }}>
                                                Notes: {d.remarks}
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button className="btn btn-sm btn-outline" style={{ flex: 1, fontSize: '0.75rem' }} onClick={() => openRemark(d)}>
                                                ✏️ Update Status
                                            </button>
                                            {d.status !== 'Received' && (
                                                <button className="btn btn-sm btn-primary" style={{ flex: 1, fontSize: '0.75rem', background: '#22c55e', border: 'none' }}
                                                    onClick={() => updateDonor(d._id, { status: 'Received' })}>
                                                    Mark Received
                                                </button>
                                            )}
                                            {d.status !== 'Cancelled' && (
                                                <button className="btn btn-sm btn-outline" style={{ flex: 1, fontSize: '0.75rem', color: '#dc2626', borderColor: '#dc2626' }}
                                                    onClick={() => updateDonor(d._id, { status: 'Cancelled' })}>
                                                    ✕ Cancel
                                                </button>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text3)', marginTop: 6 }}>
                                            Submitted: {new Date(d.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Remark Modal */}
            {remarkModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setRemarkModal(null)}>
                    <div className="card" style={{ width: 360, padding: '1.5rem' }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginTop: 0, marginBottom: 14 }}>Update Donor — {remarkModal.name}</h3>

                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Status</label>
                        <select className="form-input" style={{ width: '100%', marginBottom: 12 }} value={remarkStatus} onChange={e => setRemarkStatus(e.target.value)}>
                            {Object.keys(STATUS_BADGE).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>

                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Remark / Notes</label>
                        <textarea className="form-input" rows={3} style={{ width: '100%', marginBottom: 14, resize: 'vertical' }}
                            placeholder="e.g. Called donor, will visit on Monday..."
                            value={remarkText} onChange={e => setRemarkText(e.target.value)} />

                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => setRemarkModal(null)}>Cancel</button>
                            <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={submitRemark}>Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
