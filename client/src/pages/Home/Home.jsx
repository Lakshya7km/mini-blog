import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import {
  Activity, Building2, ShieldAlert, Stethoscope, Store, Heart, Bed, Navigation, Droplet, Pill
} from 'lucide-react';
import './Home.css';

const ROLES = [
  { key: 'hospital', label: 'Reception', icon: Building2, color: '#1E3A8A', userPlace: 'HOSP-001', route: '/reception' },
  { key: 'doctor', label: 'Doctor', icon: Stethoscope, color: '#059669', userPlace: 'DOC-100', route: '/doctor' },
  { key: 'nurse', label: 'Nurse', icon: Activity, color: '#0284C7', userPlace: 'NUR-100', route: '/nurse' },
  { key: 'pharmacy', label: 'Pharmacy', icon: Store, color: '#f59e0b', userPlace: 'PHARM-001', route: '/pharmacy' },
  { key: 'clinic', label: 'Clinic', icon: Activity, color: '#8b5cf6', userPlace: 'CLINIC-001', route: '/clinic' },
  { key: 'diagnostic', label: 'Diagnostic', icon: Activity, color: '#0d9488', userPlace: 'DIAG-001', route: '/diagnostic-portal' },
  { key: 'combined', label: 'Clinic+Diagnostic', icon: Activity, color: '#0891b2', userPlace: 'CLINIC-001', route: '/combined' },
  { key: 'superadmin', label: 'Admin', icon: ShieldAlert, color: '#1E293B', userPlace: 'admin@rapidcare', route: '/admin' },
];

const FEATURES = [
  { icon: Bed, label: 'Real-time Bed Availability', desc: 'Live bed counts across all facilities' },
  { icon: Stethoscope, label: 'Doctor Directory', desc: 'Specialist availability at a glance' },
  { icon: Droplet, label: 'Blood Bank Inventory', desc: 'Type-wise blood stock tracking' },
  { icon: Pill, label: 'Medicine Stock', desc: 'Check pharmacy inventory online' },
  { icon: Navigation, label: 'GPS Nearby Search', desc: 'Find nearest hospitals using GPS' },
];

const DEVELOPERS = [
  { name: 'Lakshya Mandavi', role: 'Full Stack Developer' },
  { name: 'Ritu Raj Paikra', role: 'Backend Developer' },
  { name: 'Siddhant Netam Dhruv', role: 'Frontend Developer' },
];

export default function Home() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectAfter = searchParams.get('redirect');

  const [active, setActive] = useState(null);
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (event) => {
    event.preventDefault();
    if (!active) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/auth/login', {
        role: active.key,
        username: form.username.trim(),
        password: form.password,
      });
      login(response.data.token, response.data.user);
      navigate(redirectAfter || active.route, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-page-classic home-simple">
      <nav className="classic-navbar">
        <div className="container classic-nav-container">
          <div className="classic-logo-wrapper">
            <img src="/logo.png" alt="RapidCare" />
            <div>
              <div className="font-bold text-primary" style={{ fontSize: '1.15rem' }}>RapidCare</div>
              <div className="text-muted" style={{ fontSize: 12 }}>Healthcare availability platform</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button type="button" className="btn btn-primary" onClick={() => navigate('/public')}>
              <Building2 size={15} /> Public directory
            </button>
          </div>
        </div>
      </nav>

      <section className="home-simple-hero">
        <div className="container home-simple-inner">
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h1 style={{ fontSize: '2rem', marginBottom: 8 }}>Staff sign in</h1>
            <p className="text-muted" style={{ fontSize: 14, lineHeight: 1.6 }}>
              RapidCare is a real-time healthcare ecosystem connecting hospitals, clinics, pharmacies, and emergency services. Choose your role below to access your dashboard.
            </p>
          </div>

          {redirectAfter && (
            <div className="alert alert-error" style={{ marginBottom: 16 }}>
              Sign in to continue to the bed you scanned.
            </div>
          )}

          {!active && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text2)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Platform Features</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {FEATURES.map(f => {
                  const Icon = f.icon;
                  return (
                    <div key={f.label} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'white', borderRadius: 10, border: '1px solid var(--border)', alignItems: 'center' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={15} color="var(--primary)" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 12 }}>{f.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{f.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="home-role-chips">
            {ROLES.map((role) => {
              const Icon = role.icon;
              const selected = active?.key === role.key;
              return (
                <button
                  key={role.key}
                  type="button"
                  className={`home-role-chip ${selected ? 'active' : ''}`}
                  style={{ '--role-color': role.color }}
                  onClick={() => {
                    setActive(role);
                    setError('');
                    setForm({ username: '', password: '' });
                  }}
                >
                  <Icon size={16} />
                  {role.label}
                </button>
              );
            })}
          </div>

          {active ? (
            <form className="home-login-card" onSubmit={handleLogin}>
              <div className="home-login-card-head" style={{ borderColor: active.color }}>
                <span style={{ color: active.color, fontWeight: 700 }}>{active.label} portal</span>
              </div>
              {error && <div className="alert alert-error">{error}</div>}
              <div className="form-group">
                <label className="form-label">ID / username</label>
                <input
                  className="form-input"
                  placeholder={active.userPlace}
                  value={form.username}
                  onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  required
                />
              </div>
              <button type="submit" className="btn btn-full" disabled={loading} style={{ background: active.color, color: '#fff' }}>
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
              <button type="button" className="btn btn-ghost btn-full" onClick={() => setActive(null)}>
                Change role
              </button>
            </form>
          ) : (
            <p className="text-muted home-pick-role">Select a role above to continue.</p>
          )}
        </div>
      </section>

      <footer className="classic-footer">
        <div className="container text-center">
          <p className="text-muted" style={{ fontSize: 13, marginBottom: 12 }}>© 2026 RapidCare — Healthcare Ecosystem Management</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, fontSize: 13, color: 'var(--text2)' }}>
            {DEVELOPERS.map(d => (
              <span key={d.name}><strong>{d.name}</strong> — {d.role}</span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
