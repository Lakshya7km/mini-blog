import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { Building2, Database, LayoutDashboard, LogOut, Plus, RefreshCw, ShieldCheck, Trash2, KeyRound } from 'lucide-react';

const TABS = [
  { key: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { key: 'register', label: 'Register Facility', icon: Building2 },
  { key: 'master', label: 'Master Data', icon: Database },
];

const COLS = ['hospitals', 'pharmacies', 'clinics', 'diagnostics', 'doctors', 'nurses', 'ambulances'];

export default function AdminPortal() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [dbCol, setDbCol] = useState('hospitals');
  const [dbData, setDbData] = useState([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  
  const [regType, setRegType] = useState('hospital');
  const [regForm, setRegForm] = useState({ id: '', name: '', contact: '', password: '', city: '', state: '' });

  // Delete modal state
  const [deleteId, setDeleteId] = useState(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [confirmInput, setConfirmInput] = useState('');

  useEffect(() => {
    api.get('/admin/stats').then((res) => setStats(res.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab !== 'master') return;
    setDbLoading(true);
    api.get(`/admin/master/${dbCol}`).then((res) => setDbData(res.data)).finally(() => setDbLoading(false));
  }, [tab, dbCol]);

  const register = async () => {
    try {
      const payload = { 
        name: regForm.name, 
        contact: regForm.contact, 
        password: regForm.password,
        address: { city: regForm.city, state: regForm.state }
      };

      let endpoint = '';
      if (regType === 'hospital') {
        payload.hospitalId = regForm.id;
        endpoint = '/admin/register-hospital';
      } else if (regType === 'pharmacy') {
        payload.pharmacyId = regForm.id;
        endpoint = '/admin/register-pharmacy';
      } else if (regType === 'clinic') {
        payload.clinicId = regForm.id;
        endpoint = '/admin/register-clinic';
      } else if (regType === 'diagnostic') {
        payload.diagnosticId = regForm.id;
        endpoint = '/admin/register-diagnostic';
      }

      await api.post(endpoint, payload);
      setMsg(`${regType.charAt(0).toUpperCase() + regType.slice(1)} registered successfully.`);
      setTimeout(() => setMsg(''), 3000);
      setRegForm({ id: '', name: '', contact: '', password: '', city: '', state: '' });
      
      const refreshed = await api.get('/admin/stats');
      setStats(refreshed.data);
    } catch (e) {
      setMsg(e.response?.data?.message || `Unable to register ${regType}.`);
    }
  };

  const requestDeleteOtp = async (id) => {
    try {
      await api.post('/admin/request-delete-otp', { col: dbCol, id });
      setDeleteId(id);
      setOtpSent(true);
      setMsg('OTP sent to your email.');
    } catch (err) {
      setMsg('Failed to send OTP.');
    }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/admin/master/${dbCol}/${deleteId}`, {
        data: { otp: otpInput, confirmation: confirmInput }
      });
      setDbData((prev) => prev.filter((entry) => entry._id !== deleteId));
      setDeleteId(null);
      setOtpSent(false);
      setOtpInput('');
      setConfirmInput('');
      setMsg('Record deleted successfully.');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg(err.response?.data?.message || 'Delete failed.');
    }
  };

  const refreshDb = () => {
    setDbLoading(true);
    api.get(`/admin/master/${dbCol}`).then((res) => setDbData(res.data)).finally(() => setDbLoading(false));
  };

  if (loading) return <div className="loader-center"><div className="spinner" /></div>;

  return (
    <div className="portal-shell">
      <div className="topbar">
        <div className="topbar-logo">
          <span className="topbar-mark"><ShieldCheck size={18} /></span>
          <span>SuperAdmin Portal</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <nav id="admin-tab-nav" style={{ display: 'none' }}>
            {TABS.map((item) => {
              const Icon = item.icon;
              return <button key={item.key} className={`btn ${tab === item.key ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(item.key)}><Icon size={15} />{item.label}</button>;
            })}
          </nav>
          <button className="btn btn-ghost btn-icon" onClick={() => { logout(); navigate('/'); }}>
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <main className="portal-content">
        <div className="container" style={{ maxWidth: 1040 }}>
          <section className="portal-header-card">
            <div className="portal-header-copy">
              <h1>System Administration</h1>
              <p>Manage the hospital, pharmacy, and clinic network. Master deletes are protected by 2FA.</p>
            </div>
          </section>

          {msg && <div className={`alert ${msg.includes('success') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}

          {tab === 'dashboard' && stats && (
            <div className="stat-grid">
              <div className="stat-card" style={{ '--accent': '#0ea5e9' }}>
                <div className="stat-val">{stats.hospitals}</div>
                <div className="stat-label">Hospitals</div>
              </div>
              <div className="stat-card" style={{ '--accent': '#f43f5e' }}>
                <div className="stat-val">{stats.pharmacies}</div>
                <div className="stat-label">Pharmacies</div>
              </div>
              <div className="stat-card" style={{ '--accent': '#8b5cf6' }}>
                <div className="stat-val">{stats.clinics}</div>
                <div className="stat-label">Clinics</div>
              </div>
              <div className="stat-card" style={{ '--accent': '#0d9488' }}>
                <div className="stat-val">{stats.diagnostics ?? 0}</div>
                <div className="stat-label">Diagnostics</div>
              </div>
              <div className="stat-card" style={{ '--accent': '#22c55e' }}>
                <div className="stat-val">{stats.doctors}</div>
                <div className="stat-label">Doctors</div>
              </div>
              <div className="stat-card" style={{ '--accent': '#f59e0b' }}>
                <div className="stat-val">{stats.ambulances}</div>
                <div className="stat-label">Ambulances</div>
              </div>
            </div>
          )}

          {tab === 'register' && (
            <div className="card">
              <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                {['hospital', 'pharmacy', 'clinic', 'diagnostic'].map(type => (
                  <button 
                    key={type} 
                    className={`btn ${regType === type ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setRegType(type)}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">{regType.charAt(0).toUpperCase() + regType.slice(1)} ID</label>
                  <input className="form-input" value={regForm.id} onChange={(e) => setRegForm({ ...regForm, id: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input className="form-input" value={regForm.name} onChange={(e) => setRegForm({ ...regForm, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Number</label>
                  <input className="form-input" value={regForm.contact} onChange={(e) => setRegForm({ ...regForm, contact: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Temporary Password</label>
                  <input className="form-input" value={regForm.password} onChange={(e) => setRegForm({ ...regForm, password: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input className="form-input" value={regForm.city} onChange={(e) => setRegForm({ ...regForm, city: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input className="form-input" value={regForm.state} onChange={(e) => setRegForm({ ...regForm, state: e.target.value })} />
                </div>
              </div>

              <button className="btn btn-primary btn-full" onClick={register}>
                <Plus size={15} /> Register {regType}
              </button>
            </div>
          )}

          {tab === 'master' && (
            <div className="card">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {COLS.map((collection) => (
                  <button key={collection} className={`btn btn-sm ${dbCol === collection ? 'btn-primary' : 'btn-outline'}`} onClick={() => setDbCol(collection)}>
                    {collection.charAt(0).toUpperCase() + collection.slice(1)}
                  </button>
                ))}
                <button className="btn btn-ghost btn-sm" onClick={refreshDb}><RefreshCw size={13} /></button>
              </div>

              {dbLoading ? <div className="loader-center"><div className="spinner" /></div> : (
                <div>
                  <div className="text-muted" style={{ marginBottom: 12 }}>{dbData.length} records</div>
                  {dbData.length === 0 ? <div className="empty"><p>No records available.</p></div> : dbData.map((row) => (
                    <div key={row._id} className="card" style={{ marginBottom: 10, padding: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          {Object.entries(row).filter(([key]) => !['__v', 'password'].includes(key)).slice(0, 6).map(([key, value]) => (
                            <div key={key} style={{ fontSize: 13, marginBottom: 4 }}>
                              <strong>{key}:</strong> {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </div>
                          ))}
                        </div>
                        <button className="btn btn-ghost btn-icon" onClick={() => requestDeleteOtp(row._id)}>
                          <Trash2 size={15} color="var(--danger)" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {otpSent && (
        <div className="modal-overlay" onClick={() => { setOtpSent(false); setDeleteId(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Master Delete Authorization</span>
            </div>
            <p className="text-muted" style={{ marginBottom: 16 }}>An OTP has been sent to your admin email. Please enter it below along with the confirmation word "DELETE".</p>
            
            <div className="form-group">
              <label className="form-label"><KeyRound size={14} style={{ display: 'inline', marginRight: 4 }} /> 6-Digit OTP</label>
              <input className="form-input" value={otpInput} onChange={e => setOtpInput(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Type 'DELETE' to confirm</label>
              <input className="form-input" value={confirmInput} onChange={e => setConfirmInput(e.target.value)} placeholder="DELETE" />
            </div>
            
            <div className="grid-2">
              <button className="btn btn-ghost" onClick={() => { setOtpSent(false); setDeleteId(null); }}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmDelete} disabled={confirmInput !== 'DELETE' || otpInput.length !== 6}>
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bottom-nav">
        {TABS.map((item) => {
          const Icon = item.icon;
          return <button key={item.key} className={`bottom-nav-item ${tab === item.key ? 'active' : ''}`} onClick={() => setTab(item.key)}><Icon size={20} />{item.label}</button>;
        })}
      </div>

      <style>{`@media(min-width:768px){#admin-tab-nav{display:flex!important;gap:6px;}}`}</style>
    </div>
  );
}
