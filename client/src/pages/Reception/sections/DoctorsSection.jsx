import { useState, useEffect } from 'react'
import api from '../../../lib/api'
import socket from '../../../lib/socket'
import { joinHospital } from '../../../lib/socketRooms'
import { Plus, X } from 'lucide-react'

export default function DoctorsSection({ hospitalId }) {
    const [docs, setDocs] = useState([])
    const [loading, setLoading] = useState(true)
    const [adding, setAdding] = useState(false)
    const [form, setForm] = useState({ doctorId: '', name: '', specialization: '', password: '', contact: '', email: '' })
    const [msg, setMsg] = useState('')

    const AVAIL_COLOR = { Available: '#22c55e', Unavailable: '#ef4444', 'On Leave': '#f59e0b' }

    const load = () => api.get(`/doctors?hospitalId=${hospitalId}`).then(r => setDocs(r.data)).finally(() => setLoading(false))
    useEffect(() => {
        load()
        socket.connect()
        joinHospital(hospitalId)
        const onAvail = ({ doctorId, availability }) => {
            setDocs(prev => prev.map(d => d.doctorId === doctorId ? { ...d, availability } : d))
        }
        socket.on('doctor:availability', onAvail)
        return () => socket.off('doctor:availability', onAvail)
    }, [hospitalId])

    const create = async () => {
        try {
            await api.post('/doctors', { ...form, hospitalId })
            setAdding(false); load(); setMsg('Doctor registered!')
            setForm({ doctorId: '', name: '', specialization: '', password: '', contact: '', email: '' })
        } catch (err) { alert(err.response?.data?.message || 'Failed to register doctor') }
    }

    const toggleAvailability = async (doc, forceStatus) => {
        try {
            const status = forceStatus === 'Available' ? 'Present' : 'Absent'
            const today = new Date().toISOString().slice(0, 10)
            await api.post('/attendance/override', { doctorId: doc.doctorId, date: today, status })
            load()
        } catch (err) { alert(err.response?.data?.message || 'Failed to update availability') }
    }

    const getRelativeTime = (d) => {
        if (!d) return ''
        const diff = Math.floor((new Date() - new Date(d)) / 60000)
        if (diff < 1) return 'Just now'
        if (diff < 60) return `${diff} mins ago`
        const hours = Math.floor(diff / 60)
        if (hours < 24) return `${hours} hrs ago`
        return `${Math.floor(hours / 24)} days ago`
    }

    if (loading) return <div className="loader-center"><div className="spinner" /></div>

    return (
        <div>
            {msg && <div className="alert alert-success" onClick={() => setMsg('')}>{msg}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}><Plus size={14} /> Register Doctor</button>
            </div>

            {docs.map(d => (
                <div key={d._id} className="card" style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        {d.photo
                            ? <img src={d.photo.startsWith('http') ? d.photo : `${import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || ''}${d.photo}`} alt={d.name} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />
                            : <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 700, fontSize: 18 }}>{d.name[0]}</div>
                        }
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600 }}>{d.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--text2)' }}>{d.doctorId} · {d.specialization || 'General'}</div>
                            {d.contact && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{d.contact} · {d.email}</div>}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                            <div style={{ display: 'flex', gap: 6 }}>
                                <button className="btn btn-sm btn-success" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => toggleAvailability(d, 'Available')}>Present</button>
                                <button className="btn btn-sm btn-outline" style={{ padding: '4px 8px', fontSize: 11, borderColor: '#ef4444', color: '#ef4444' }} onClick={() => toggleAvailability(d, 'Unavailable')}>Absent</button>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                                {d.lastUpdated ? `Updated: ${getRelativeTime(d.lastUpdated)}` : 'No activity today'}
                            </div>
                            <span className="badge" style={{ background: (AVAIL_COLOR[d.availability || 'Unavailable']) + '20', color: AVAIL_COLOR[d.availability || 'Unavailable'], fontSize: 10 }}>
                                {d.availability || 'Unavailable'}
                            </span>
                        </div>
                    </div>
                </div>
            ))}

            {docs.length === 0 && <div className="empty"><p>No doctors registered</p></div>}

            {/* Add modal */}
            {adding && (
                <div className="modal-overlay" onClick={() => setAdding(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">Register Doctor</span>
                            <button className="btn btn-ghost btn-icon" onClick={() => setAdding(false)}><X size={18} /></button>
                        </div>
                        {[{ k: 'doctorId', l: 'Doctor ID' }, { k: 'name', l: 'Full Name' }, { k: 'specialization', l: 'Specialization' }, { k: 'contact', l: 'Contact' }, { k: 'email', l: 'Email' }, { k: 'password', l: 'Login Password' }].map(f => (
                            <div className="form-group" key={f.k}>
                                <label className="form-label">{f.l}</label>
                                <input className="form-input" value={form[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))} />
                            </div>
                        ))}
                        <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>
                            Doctors can change their login password in their personal portal.
                        </p>
                        <button className="btn btn-primary btn-full" onClick={create}>Register</button>
                    </div>
                </div>
            )}
        </div>
    )
}
