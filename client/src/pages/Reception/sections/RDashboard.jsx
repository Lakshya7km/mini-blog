import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { BedDouble, Stethoscope, Truck, Building2 } from 'lucide-react';

export default function RDashboard({ hospitalId }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(`/hospitals/${hospitalId}/stats`)
            .then((s) => setStats(s.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [hospitalId]);

    if (loading) return <div className="loader-center"><div className="spinner" /></div>;

    const statCards = [
        { label: 'Available Beds', val: stats?.availableBeds ?? '-', icon: BedDouble, color: '#22c55e' },
        { label: 'Total Beds', val: stats?.totalBeds ?? '-', icon: BedDouble, color: '#0ea5e9' },
        { label: 'Doctors on Duty', val: stats?.activeDocs ?? '-', icon: Stethoscope, color: '#8b5cf6' },
        { label: 'Active Ambulances', val: stats?.activeAmbs ?? '-', icon: Truck, color: '#f59e0b' },
    ];

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

            <div className="card" style={{ marginTop: 16 }}>
                <div className="card-header">
                    <Building2 size={18} color="var(--primary)" />
                    <span className="card-title">Hospital Overview</span>
                </div>
                <div style={{ padding: '16px 0', color: 'var(--text2)', lineHeight: 1.6 }}>
                    <p>Welcome to the RapidCare V3 Reception Dashboard. From here you can manage your hospital's doctors, nurses, ambulances, beds, and blood bank inventory.</p>
                    <p style={{ marginTop: 8 }}>Use the sidebar navigation to toggle between the different operation modules.</p>
                </div>
            </div>
        </div>
    );
}
