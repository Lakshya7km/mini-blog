import { useState, useEffect } from 'react'
import api from '../../../lib/api'
import { Save } from 'lucide-react'

const FIELDS = [
    { key: 'name', label: 'Hospital Name', type: 'text' },
    { key: 'contact', label: 'Contact Number', type: 'text' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'googleMapUrl', label: 'Google Maps URL', type: 'text' },
]
const ARRAY_FIELDS = ['services', 'facilities', 'insurance', 'procedures', 'surgery', 'therapy']

export default function HospitalInfo({ hospitalId }) {
    const [form, setForm] = useState({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [msg, setMsg] = useState('')

    useEffect(() => {
        api.get(`/hospitals/${hospitalId}`).then(r => setForm(r.data)).finally(() => setLoading(false))
    }, [hospitalId])

    const save = async () => {
        setSaving(true); setMsg('')
        // Extract lat/lng from Google Maps URL
        if (form.googleMapUrl) {
            const m = form.googleMapUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
            if (m) form.location = { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }
        }
        await api.put(`/hospitals/${hospitalId}`, form)
        setMsg('Saved successfully!'); setSaving(false)
    }

    if (loading) return <div className="loader-center"><div className="spinner" /></div>

    return (
        <div>
            {msg && <div className="alert alert-success">{msg}</div>}
            {FIELDS.map(f => (
                <div className="form-group" key={f.key}>
                    <label className="form-label">{f.label}</label>
                    <input className="form-input" type={f.type} value={form[f.key] || ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                </div>
            ))}
            <div className="form-group">
                <label className="form-label">Address</label>
                {['street', 'city', 'district', 'state'].map(k => (
                    <input key={k} className="form-input" style={{ marginBottom: 6 }} placeholder={k.charAt(0).toUpperCase() + k.slice(1)}
                        value={form.address?.[k] || ''} onChange={e => setForm(p => ({ ...p, address: { ...p.address, [k]: e.target.value } }))} />
                ))}
            </div>
            {ARRAY_FIELDS.map(field => (
                <div className="form-group" key={field}>
                    <label className="form-label">{field.charAt(0).toUpperCase() + field.slice(1)} (comma-separated)</label>
                    <input className="form-input" value={(form[field] || []).join(', ')}
                        onChange={e => setForm(p => ({ ...p, [field]: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} />
                </div>
            ))}
            <button className="btn btn-primary btn-full" onClick={save} disabled={saving}>
                <Save size={16} /> {saving ? 'Saving…' : 'Save Changes'}
            </button>
        </div>
    )
}
