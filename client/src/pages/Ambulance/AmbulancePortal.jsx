import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import socket from '../../lib/socket';
import { Activity, Ambulance, LayoutDashboard, LogOut, Phone, Truck } from 'lucide-react';
import { requestLocationPermission } from '../../lib/permissions';

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'profile', label: 'Profile', icon: Truck },
];

const STATUS_OPTIONS = ['On Duty', 'Off Duty'];
const STATUS_COLOR = { 'On Duty': '#22c55e', 'Off Duty': '#94a3b8' };

export default function AmbulancePortal() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('dashboard');
  const [ambulance, setAmbulance] = useState(null);
  const [hospital, setHospital] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const heartbeatRef = useRef(null);
  
  const ambulanceId = user?.ambulanceId || user?.ref;

  useEffect(() => {
    requestLocationPermission();

    // Fetch own ambulance data
    api.get(`/ambulances/${ambulanceId}`)
      .then((res) => {
        setAmbulance(res.data);
        if (res.data.hospitalId) {
          socket.emit('join:hospital', res.data.hospitalId);
          return api.get(`/hospitals/${res.data.hospitalId}`);
        }
      })
      .then((hRes) => {
        if (hRes) setHospital(hRes.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));

    // Send GPS location via REST API every 30 seconds
    heartbeatRef.current = setInterval(() => {
      navigator.geolocation?.getCurrentPosition((position) => {
        api.post(`/ambulances/${ambulanceId}/location`, {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }).catch(() => {});
      });
    }, 30000);

    // Join ambulance socket room (if needed for any direct alerts later)
    socket.connect();

    const offline = () => api.put(`/ambulances/${ambulanceId}`, { status: 'Off Duty' }).catch(() => {});
    window.addEventListener('beforeunload', offline);

    return () => {
      clearInterval(heartbeatRef.current);
      socket.disconnect();
      window.removeEventListener('beforeunload', offline);
    };
  }, [ambulanceId]);

  const setStatus = async (status) => {
    try {
      const response = await api.put(`/ambulances/${ambulanceId}`, { status });
      setAmbulance(response.data);
      setMsg(`Status updated to ${status}.`);
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg('Failed to update status.');
    }
  };

  if (loading) return <div className="loader-center"><div className="spinner" /></div>;

  return (
    <div className="portal-shell">
      <div className="topbar">
        <div className="topbar-logo">
          <span className="topbar-mark"><Ambulance size={18} /></span>
          <span>Ambulance Dispatch</span>
          <span className="badge" style={{ background: `${STATUS_COLOR[ambulance?.status] || '#94a3b8'}20`, color: STATUS_COLOR[ambulance?.status] || '#94a3b8' }}>
            {ambulance?.status || 'Off Duty'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <nav id="amb-tab-nav" style={{ display: 'none' }}>
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
              <h1>Ambulance Operations</h1>
              <p>Manage field status and ensure your live location is broadcasting to your base hospital.</p>
              <div className="portal-meta">
                <span className="portal-meta-chip"><Truck size={14} /> {ambulance?.vehicleNumber || ambulance?.ambulanceId}</span>
                <span className="portal-meta-chip"><Activity size={14} /> {ambulance?.hospitalId || 'Unassigned'}</span>
              </div>
            </div>
          </section>

          {msg && <div className={`alert ${msg.startsWith('Failed') ? 'alert-error' : 'alert-success'}`}>{msg}</div>}

          {tab === 'dashboard' && (
            <div>
              <div className="stat-grid">
                {[
                  { label: 'Base Hospital', val: ambulance?.hospitalId || '-', color: '#0ea5e9' },
                  { label: 'Status', val: ambulance?.status || 'Off Duty', color: STATUS_COLOR[ambulance?.status] || '#94a3b8' },
                  { label: 'Vehicle', val: ambulance?.vehicleNumber || '-', color: '#8b5cf6' },
                  { label: 'GPS Tracking', val: 'Active', color: '#10b981' },
                ].map((stat) => (
                  <div key={stat.label} className="stat-card" style={{ '--accent': stat.color }}>
                    <div className="stat-val" style={{ fontSize: 18 }}>{stat.val}</div>
                    <div className="stat-label">{stat.label}</div>
                  </div>
                ))}
              </div>

              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-header"><span className="card-title">Duty Status Control</span></div>
                <div className="grid-2">
                  {STATUS_OPTIONS.map((status) => (
                    <button
                      key={status}
                      className="btn"
                      onClick={() => setStatus(status)}
                      style={{
                        background: ambulance?.status === status ? STATUS_COLOR[status] : `${STATUS_COLOR[status]}18`,
                        color: ambulance?.status === status ? '#fff' : STATUS_COLOR[status],
                        borderColor: STATUS_COLOR[status],
                        height: 60,
                        fontSize: 16,
                        fontWeight: 'bold'
                      }}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {hospital && (
                <div className="card" style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div className="classic-kicker">Base Hospital</div>
                    <div style={{ fontWeight: 800, marginTop: 4 }}>{hospital.name}</div>
                    <div className="text-muted">{hospital.contact}</div>
                  </div>
                  {hospital.contact && (
                    <a href={`tel:${hospital.contact}`} className="btn btn-success"><Phone size={14} /> Call Hospital</a>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === 'profile' && ambulance && (
            <div>
              <div className="card" style={{ marginBottom: 16, textAlign: 'center' }}>
                <div style={{ width: 76, height: 76, borderRadius: '50%', margin: '0 auto 12px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Ambulance size={30} />
                </div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{ambulance.ambulanceId}</div>
                <div className="text-muted">{ambulance.vehicleNumber}</div>
                <div style={{ marginTop: 10 }}><span className="badge badge-blue">{ambulance.hospitalId || 'No Base Hospital'}</span></div>
              </div>
              <div className="card">
                <div className="card-header"><span className="card-title">Driver Information</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '1px solid var(--border)' }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                    {ambulance?.driverName?.[0] || 'D'}
                  </div>
                  <div>
                    <div className="classic-kicker">Driver</div>
                    <div style={{ fontWeight: 700, marginTop: 4 }}>{ambulance?.driverName || 'Not Assigned'}</div>
                    <div className="text-muted">{ambulance?.contact || '-'}</div>
                  </div>
                </div>
              </div>
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

      <style>{`@media(min-width:768px){#amb-tab-nav{display:flex!important;gap:6px;}}`}</style>
    </div>
  );
}
