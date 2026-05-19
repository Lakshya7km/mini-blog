import { useCallback, useEffect, useState } from 'react';
import api from '../../lib/api';
import { joinHospital } from '../../lib/socketRooms';
import socket from '../../lib/socket';

const today = () => new Date().toISOString().slice(0, 10);

const unwrapList = (res) => (Array.isArray(res.data?.data) ? res.data.data : res.data) || [];

export default function AttendanceTab({ hospitalId }) {
  const [doctors, setDoctors] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [date, setDate] = useState(today());
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const loadAttendance = useCallback(async (docList, forDate) => {
    const map = {};
    await Promise.all(
      docList.map((d) =>
        api
          .get(`/attendance/${d.doctorId}?from=${forDate}&to=${forDate}`)
          .then((r) => {
            const rows = unwrapList(r);
            if (rows[0]) map[d.doctorId] = rows[0];
          })
          .catch(() => {}),
      ),
    );
    setAttendance(map);
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/doctors?hospitalId=${hospitalId}`)
      .then(async (r) => {
        const list = r.data || [];
        setDoctors(list);
        await loadAttendance(list, date);
      })
      .finally(() => setLoading(false));

    socket.connect();
    joinHospital(hospitalId);
    const onAvail = ({ doctorId, availability }) => {
      setDoctors((prev) =>
        prev.map((d) => (d.doctorId === doctorId ? { ...d, availability } : d)),
      );
    };
    socket.on('doctor:availability', onAvail);
    return () => socket.off('doctor:availability', onAvail);
  }, [hospitalId, date, loadAttendance]);

  const override = async (doctorId, status) => {
    try {
      await api.post('/attendance/override', { doctorId, date, status });
      setAttendance((prev) => ({
        ...prev,
        [doctorId]: { doctorId, date, status, markedBy: 'reception' },
      }));
      setDoctors((prev) =>
        prev.map((d) =>
          d.doctorId === doctorId
            ? { ...d, availability: status === 'Present' ? 'Available' : 'Unavailable' }
            : d,
        ),
      );
      setMsg(`Marked ${doctorId} as ${status}`);
      setTimeout(() => setMsg(''), 2500);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update attendance');
    }
  };

  const exportCsv = () => {
    const rows = [['Doctor ID', 'Name', 'Date', 'Status', 'Marked by']];
    doctors.forEach((d) => {
      const a = attendance[d.doctorId];
      rows.push([d.doctorId, d.name, date, a?.status || '—', a?.markedBy || '—']);
    });
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-${hospitalId}-${date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="loader-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      {msg && <div className="alert alert-success">{msg}</div>}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <label className="form-label" style={{ margin: 0 }}>Date</label>
        <input type="date" className="form-input" style={{ width: 160 }} value={date} onChange={(e) => setDate(e.target.value)} />
        <button type="button" className="btn btn-outline btn-sm" onClick={exportCsv}>Export CSV</button>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: 8 }}>Doctor</th>
              <th style={{ padding: 8 }}>Availability</th>
              <th style={{ padding: 8 }}>Attendance</th>
              <th style={{ padding: 8 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {doctors.map((d) => {
              const a = attendance[d.doctorId];
              return (
                <tr key={d.doctorId} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: 8 }}>
                    <strong>{d.name}</strong>
                    <div className="text-muted" style={{ fontSize: 11 }}>{d.doctorId}</div>
                  </td>
                  <td style={{ padding: 8 }}>{d.availability || 'Unavailable'}</td>
                  <td style={{ padding: 8 }}>{a ? `${a.status} (${a.markedBy})` : 'Not marked'}</td>
                  <td style={{ padding: 8 }}>
                    <button type="button" className="btn btn-sm btn-success" style={{ marginRight: 6 }} onClick={() => override(d.doctorId, 'Present')}>Present</button>
                    <button type="button" className="btn btn-sm btn-outline" onClick={() => override(d.doctorId, 'Absent')}>Absent</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {doctors.length === 0 && <p className="text-muted" style={{ padding: 16 }}>No doctors registered.</p>}
      </div>
    </div>
  );
}

