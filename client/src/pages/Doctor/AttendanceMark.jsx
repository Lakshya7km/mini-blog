import { useEffect, useState } from 'react';
import api from '../../lib/api';

const today = () => new Date().toISOString().slice(0, 10);
const unwrapList = (res) => (Array.isArray(res.data?.data) ? res.data.data : res.data) || [];

export default function AttendanceMark({ doctorId, onMarked }) {
  const [todayRecord, setTodayRecord] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    const from = new Date();
    from.setDate(from.getDate() - 30);
    const fromStr = from.toISOString().slice(0, 10);
    return Promise.all([
      api.get(`/attendance/${doctorId}?from=${today()}&to=${today()}`),
      api.get(`/attendance/${doctorId}?from=${fromStr}&to=${today()}`),
    ]).then(([todayRes, histRes]) => {
      const todayRows = unwrapList(todayRes);
      setTodayRecord(todayRows[0] || null);
      setHistory(unwrapList(histRes));
    });
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [doctorId]);

  const mark = async (status) => {
    setSubmitting(true);
    setMsg('');
    try {
      await api.post('/attendance/self', { status });
      await load();
      setMsg(`Marked ${status} for today.`);
      onMarked?.(status);
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg(err.response?.data?.message || 'Could not mark attendance.');
    } finally {
      setSubmitting(false);
    }
  };

  const locked = todayRecord?.markedBy === 'doctor';

  if (loading) {
    return <div className="loader-center"><div className="spinner" /></div>;
  }

  return (
    <div>
      {msg && (
        <div className={`alert ${msg.includes('Could') ? 'alert-error' : 'alert-success'}`}>{msg}</div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><span className="card-title">Today&apos;s attendance</span></div>
        {todayRecord ? (
          <p style={{ marginTop: 8 }}>
            Status: <strong>{todayRecord.status}</strong> (marked by {todayRecord.markedBy})
          </p>
        ) : (
          <p className="text-muted" style={{ marginTop: 8 }}>Not marked yet today.</p>
        )}
        <div className="grid-2" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="btn btn-success"
            disabled={submitting || locked}
            onClick={() => mark('Present')}
          >
            Mark Present
          </button>
          <button
            type="button"
            className="btn btn-outline"
            disabled={submitting || locked}
            style={{ borderColor: '#ef4444', color: '#ef4444' }}
            onClick={() => mark('Absent')}
          >
            Mark Absent
          </button>
        </div>
        {locked && (
          <p className="text-muted" style={{ fontSize: 12, marginTop: 10 }}>
            You already marked attendance today. Contact reception to change it.
          </p>
        )}
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title">Last 30 days</span></div>
        <div style={{ maxHeight: 240, overflowY: 'auto' }}>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: 6, textAlign: 'left' }}>Date</th>
                <th style={{ padding: 6, textAlign: 'left' }}>Status</th>
                <th style={{ padding: 6, textAlign: 'left' }}>By</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={`${row.date}-${row.status}`} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: 6 }}>{row.date}</td>
                  <td style={{ padding: 6 }}>{row.status}</td>
                  <td style={{ padding: 6 }}>{row.markedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {history.length === 0 && <p className="text-muted" style={{ padding: 12 }}>No history yet.</p>}
        </div>
      </div>
    </div>
  );
}


