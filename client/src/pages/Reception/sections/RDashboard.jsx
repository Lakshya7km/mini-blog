import { useState, useEffect } from 'react'
import api from '../../../lib/api'
import { BedDouble, Stethoscope, Truck, AlertCircle } from 'lucide-react'

export default function RDashboard({ hospitalId }) {
    const [stats, setStats] = useState(null)
    const [emergencies, setEmergencies] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        Promise.all([
            api.get(`/hospitals/${hospitalId}/stats`),
            api.get(`/emergency?hospitalId=${hospitalId}&status=Pending`)
        ]).then(([s, e]) => { setStats(s.data); setEmergencies(e.data) })
            .finally(() => setLoading(false))
    }, [hospitalId])

    if (loading) return <div className="loader-center"><div className="spinner" /></div>

    const statCards = [
        { label: 'Available Beds', val: stats?.availableBeds ?? '-', icon: BedDouble, color: '#22c55e' },
        { label: 'Total Beds', val: stats?.totalBeds ?? '-', icon: BedDouble, color: '#0ea5e9' },
        { label: 'Doctors on Duty', val: stats?.activeDocs ?? '-', icon: Stethoscope, color: '#8b5cf6' },
        { label: 'Active Ambulances', val: stats?.activeAmbs ?? '-', icon: Truck, color: '#f59e0b' },
    ]

    return (
        <div>
            <div className="stat-grid">
                {statCards.map(s => (
                    <div key={s.label} className="stat-card" style={{ '--accent': s.color }}>
                        <div className="stat-val">{s.val}</div>
                        <div className="stat-label">{s.label}</div>
                    </div>
                ))}
            </div>

            <div className="card" style={{ marginTop: 8 }}>
                <div className="card-header">
                    <AlertCircle size={18} color="#ef4444" />
                    <span className="card-title">Pending Emergencies</span>
                    {emergencies.length > 0 && <span className="badge badge-red">{emergencies.length}</span>}
                </div>
                {emergencies.length === 0
                    ? <div className="empty"><p>No pending emergencies</p></div>
                    : emergencies.slice(0, 5).map(e => (
                        <div key={e._id} style={{ padding: '10px 0', borderTop: '1px solid var(--border)' }}>
                            <div style={{ fontWeight: 600 }}>{e.patientName} <span style={{ fontWeight: 400, color: 'var(--text2)' }}>· {e.emergencyType}</span></div>
                            <div style={{ fontSize: 12, color: 'var(--text2)' }}>{e.ambulanceId} · {new Date(e.createdAt).toLocaleTimeString()}</div>
                        </div>
                    ))
                }
            </div>
        </div>
    )
}
