import { useState, useEffect } from 'react'
import api from '../../../lib/api'
import { Plus, X } from 'lucide-react'

export default function NursesSection({ hospitalId }) {
    const [nurses, setNurses] = useState([])
    const [adding, setAdding] = useState(false)
    const [loading, setLoading] = useState(true)
    const [form, setForm] = useState({ nurseId: '', name: '', mobile: '', password: '' })
    const [msg, setMsg] = useState('')

    const load = () => api.get(`/nurses?hospitalId=${hospitalId}`).then(r => setNurses(r.data)).finally(() => setLoading(false))
    useEffect(() => { load() }, [hospitalId])

    const create = async () => {
        try {
            await api.post('/nurses', { ...form, hospitalId })
            setAdding(false); load(); setMsg('Nurse registered!')
            setForm({ nurseId: '', name: '', mobile: '', password: '' })
        } catch (e) {
            setMsg(e.response?.data?.message || 'Registration failed.')
        }
    }

    if (loading) return <div className="loader-center"><div className="spinner" /></div>

    return (
        <div>
            {msg && <div className="alert alert-success">{msg}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}><Plus size={14} /> Register Nurse</button>
            </div>

            {nurses.map(n => (
                <div key={n._id} className="card" style={{ marginBottom: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed', fontWeight: 700, fontSize: 16 }}>{n.name[0]}</div>
                    <div>
                        <div style={{ fontWeight: 600 }}>{n.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text2)' }}>{n.nurseId} · {n.mobile}</div>
                    </div>
                </div>
            ))}
            {nurses.length === 0 && <div className="empty"><p>No nurses registered</p></div>}

            {adding && (
                <div className="modal-overlay" onClick={() => setAdding(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">Register Nurse</span>
                            <button className="btn btn-ghost btn-icon" onClick={() => setAdding(false)}><X size={18} /></button>
                        </div>
                        {[{ k: 'nurseId', l: 'Nurse ID' }, { k: 'name', l: 'Full Name' }, { k: 'mobile', l: 'Mobile Number' }, { k: 'password', l: 'Login Password' }].map(f => (
                            <div className="form-group" key={f.k}>
                                <label className="form-label">{f.l}</label>
                                <input className="form-input" value={form[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))} />
                            </div>
                        ))}
                        <button className="btn btn-primary btn-full" onClick={create}>Register</button>
                    </div>
                </div>
            )}
        </div>
    )
}
