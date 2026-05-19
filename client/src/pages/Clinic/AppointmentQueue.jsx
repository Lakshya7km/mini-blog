import { useEffect, useState } from 'react';
import api from '../../lib/api';

const STATUSES = ['Pending', 'Contacted', 'Booked', 'Cancelled'];
const unwrapList = (res) => (Array.isArray(res.data?.data) ? res.data.data : res.data) || [];

export default function AppointmentQueue({ clinicId }) {
  const [appointments, setAppointments] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const q = filter ? `?status=${filter}` : '';
    api.get(`/clinic/${clinicId}/appointments${q}`)
      .then((r) => setAppointments(unwrapList(r)))
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [clinicId, filter]);

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/clinic/${clinicId}/appointments/${id}`, { status });
      setAppointments((prev) => prev.map((a) => (a._id === id ? { ...a, status } : a)));
    } catch {
      alert('Failed to update appointment');
    }
  };

  const pendingCount = appointments.filter((a) => a.status === 'Pending').length;

  if (loading) {
    return (
      <div className="loader-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="badge badge-red">{pendingCount} pending</span>
        <select className="form-select" style={{ width: 160 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button type="button" className="btn btn-ghost btn-sm" onClick={load}>Refresh</button>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {STATUSES.map((status) => {
          const column = appointments.filter((a) => a.status === status);
          return (
            <div key={status} className="card">
              <div className="card-header">
                <span className="card-title">{status}</span>
                <span className="badge">{column.length}</span>
              </div>
              {column.length === 0 ? (
                <p className="text-muted" style={{ fontSize: 13 }}>None</p>
              ) : (
                column.map((a) => (
                  <div key={a._id} style={{ padding: '10px 0', borderTop: '1px solid var(--border)' }}>
                    <strong>{a.name}</strong>
                    <div style={{ fontSize: 12, color: 'var(--text2)' }}>{a.phone}</div>
                    {a.preferredTime && (
                      <div style={{ fontSize: 12 }}>Preferred: {a.preferredTime}</div>
                    )}
                    <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {STATUSES.filter((s) => s !== status).map((s) => (
                        <button key={s} type="button" className="btn btn-sm btn-outline" onClick={() => updateStatus(a._id, s)}>
                          → {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>

      {appointments.length === 0 && (
        <div className="empty"><p>No appointment requests yet.</p></div>
      )}
    </div>
  );
}
