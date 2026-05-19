import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { LayoutDashboard, LogOut, Save, Stethoscope, Upload, UserRound, MapPin, ClipboardList } from 'lucide-react';
import AttendanceMark from './AttendanceMark';

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'attendance', label: 'Attendance', icon: ClipboardList },
  { key: 'profile', label: 'Profile', icon: UserRound },
];

export default function DoctorPortal() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('dashboard');
  const [doctor, setDoctor] = useState(null);
  const [hospitalName, setHospitalName] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [profForm, setProfForm] = useState({});
  const doctorId = user?.doctorId || user?.ref;

  useEffect(() => {
    api.get(`/doctors/${doctorId}`)
      .then(async (res) => {
        setDoctor(res.data);
        setProfForm(res.data);
        
        if (res.data.hospitalId) {
          try {
            const hRes = await api.get(`/hospitals/${res.data.hospitalId}`);
            setHospitalName(hRes.data.name);
          } catch (e) {}
        } else if (res.data.clinicId) {
          try {
            const cRes = await api.get(`/clinic/${res.data.clinicId}`);
            setClinicName(cRes.data.name);
          } catch (e) {}
        }
      })
      .finally(() => setLoading(false));
  }, [doctorId]);

  const saveProfile = async () => {
    try {
      const { _id, __v, password, ...update } = profForm;
      const response = await api.put(`/doctors/${doctorId}`, update);
      setDoctor(response.data);
      setMsg('Profile updated successfully.');
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      setMsg('Failed to update profile.');
    }
  };

  const uploadPhoto = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('photo', file);
    try {
      const response = await api.post(`/doctors/${doctorId}/photo`, formData);
      setDoctor(response.data.doctor);
      setProfForm(response.data.doctor);
      setMsg('Profile photo updated.');
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      setMsg('Failed to upload photo.');
    }
  };

  const setAvailability = async (status) => {
    try {
      const response = await api.put(`/doctors/${doctorId}`, { availability: status });
      setDoctor(response.data);
      setProfForm(response.data);
      setMsg(`Status changed to ${status}.`);
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      setMsg('Failed to change status.');
    }
  };

  if (loading) return <div className="loader-center"><div className="spinner" /></div>;

  const assignmentName = hospitalName || clinicName || doctor?.hospitalId || doctor?.clinicId || 'Unassigned';

  return (
    <div className="portal-shell">
      <div className="topbar">
        <div className="topbar-logo">
          <span className="topbar-mark"><Stethoscope size={18} /></span>
          <span>Doctor Portal</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <nav id="doc-tab-nav" style={{ display: 'none' }}>
            {TABS.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.key} className={`btn ${tab === item.key ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(item.key)}>
                  <Icon size={15} />{item.label}
                </button>
              );
            })}
          </nav>
          <button className="btn btn-ghost btn-icon" onClick={() => { logout(); navigate('/'); }}>
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <main className="portal-content">
        <div className="container" style={{ maxWidth: 980 }}>
          <section className="portal-header-card">
            <div className="portal-header-copy">
              <h1>Doctor Workspace</h1>
              <p>Manage your availability status and personal profile information.</p>
              <div className="portal-meta">
                <span className="portal-meta-chip"><Stethoscope size={14} /> {doctor?.name} ({doctor?.doctorId})</span>
                <span className="portal-meta-chip"><MapPin size={14} /> {assignmentName}</span>
              </div>
            </div>
          </section>

          {msg && <div className={`alert ${msg.startsWith('Failed') ? 'alert-error' : 'alert-success'}`}>{msg}</div>}

          {tab === 'dashboard' && (
            <div>
              <div className="card" style={{ marginBottom: 16, background: 'linear-gradient(135deg, #0f172a, #1e3a8a)', color: '#fff' }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  {doctor?.photo ? (
                    <img src={doctor.photo} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800 }}>
                      {doctor?.name?.[0] || 'D'}
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: 19, fontWeight: 800 }}>{doctor?.name}</div>
                    <div style={{ color: 'rgba(255,255,255,0.72)' }}>{doctor?.specialization || 'General Medicine'}</div>
                    <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: 13 }}>{assignmentName}</div>
                  </div>
                </div>
              </div>

              <div className="stat-grid">
                <div className="stat-card" style={{ '--accent': '#38bdf8' }}>
                  <div className="stat-val" style={{ fontSize: 20 }}>{assignmentName}</div>
                  <div className="stat-label">{doctor?.clinicId ? 'Clinic' : 'Hospital'}</div>
                </div>
                <div className="stat-card" style={{ '--accent': doctor?.availability === 'Available' ? '#22c55e' : '#f43f5e' }}>
                  <div className="stat-val" style={{ fontSize: 20 }}>{doctor?.availability || 'Unavailable'}</div>
                  <div className="stat-label">Current Status</div>
                </div>
              </div>

              <div className="card" style={{ marginTop: 16 }}>
                <div className="card-header"><span className="card-title">Availability Control</span></div>
                <div className="grid-2">
                  {['Available', 'Unavailable'].map((status) => (
                    <button
                      key={status}
                      className="btn"
                      onClick={() => setAvailability(status)}
                      style={{
                        background: doctor?.availability === status ? (status === 'Available' ? '#22c55e' : '#f43f5e') : (status === 'Available' ? '#22c55e18' : '#f43f5e18'),
                        color: doctor?.availability === status ? '#fff' : (status === 'Available' ? '#22c55e' : '#f43f5e'),
                        borderColor: status === 'Available' ? '#22c55e' : '#f43f5e',
                        height: 60,
                        fontSize: 16,
                        fontWeight: 'bold'
                      }}
                    >
                      Mark {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'attendance' && doctor?.hospitalId && (
            <AttendanceMark
              doctorId={doctorId}
              onMarked={(status) => {
                const availability = status === 'Present' ? 'Available' : 'Unavailable';
                setDoctor((d) => (d ? { ...d, availability } : d));
                setProfForm((p) => ({ ...p, availability }));
              }}
            />
          )}

          {tab === 'attendance' && !doctor?.hospitalId && (
            <div className="card"><p className="text-muted">Attendance is only for hospital-affiliated doctors.</p></div>
          )}

          {tab === 'profile' && (
            <div className="card">
              <div style={{ textAlign: 'center', marginBottom: 18 }}>
                {doctor?.photo ? (
                  <img src={doctor.photo} alt="" style={{ width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary-light)' }} />
                ) : (
                  <div style={{ width: 88, height: 88, borderRadius: '50%', margin: '0 auto', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800 }}>
                    {doctor?.name?.[0] || 'D'}
                  </div>
                )}
                <label className="btn btn-outline btn-sm" style={{ marginTop: 14, cursor: 'pointer' }}>
                  <Upload size={14} /> Change photo
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadPhoto} />
                </label>
              </div>
              
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" value={profForm.name || ''} onChange={(e) => setProfForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Specialization</label>
                <input className="form-input" value={profForm.specialization || ''} onChange={(e) => setProfForm(p => ({ ...p, specialization: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Contact</label>
                <input className="form-input" value={profForm.contact || ''} onChange={(e) => setProfForm(p => ({ ...p, contact: e.target.value }))} />
              </div>

              <button className="btn btn-primary btn-full" onClick={saveProfile}>
                <Save size={15} /> Save profile
              </button>
            </div>
          )}
        </div>
      </main>

      <div className="bottom-nav">
        {TABS.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.key} className={`bottom-nav-item ${tab === item.key ? 'active' : ''}`} onClick={() => setTab(item.key)}>
              <Icon size={20} />{item.label}
            </button>
          );
        })}
      </div>

      <style>{`@media(min-width:768px){#doc-tab-nav{display:flex!important;gap:6px;}}`}</style>
    </div>
  );
}
