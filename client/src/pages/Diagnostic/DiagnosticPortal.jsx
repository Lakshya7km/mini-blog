import { useEffect, useState, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { Activity, LogOut, MapPin, Save, Upload, Plus, X } from 'lucide-react';

export default function DiagnosticPortal() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [center, setCenter] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [newSpecialty, setNewSpecialty] = useState('');
  const diagnosticId = user?.diagnosticId || user?.ref;

  useEffect(() => {
    api.get(`/diagnostic/${diagnosticId}`)
      .then((r) => {
        setCenter(r.data);
        setForm(r.data);
      })
      .finally(() => setLoading(false));
  }, [diagnosticId]);

  const saveProfile = async () => {
    try {
      const { _id, __v, password, imageUrls, ...update } = form;
      const res = await api.put(`/diagnostic/${diagnosticId}`, update);
      setCenter(res.data);
      setForm(res.data);
      setMsg('Profile updated successfully.');
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      setMsg('Failed to update profile.');
    }
  };

  const addSpecialty = () => {
    const s = newSpecialty.trim();
    if (!s) return;
    setForm((p) => ({ ...p, specialties: [...(p.specialties || []), s] }));
    setNewSpecialty('');
  };

  const removeSpecialty = (idx) => {
    setForm((p) => ({ ...p, specialties: (p.specialties || []).filter((_, i) => i !== idx) }));
  };

  if (loading) {
    return (
      <Fragment>
        <section className="loader-center">
          <span className="spinner" />
        </section>
      </Fragment>
    );
  }

  return (
    <Fragment>
      <section className="portal-shell">
        <header className="topbar">
          <p className="topbar-logo">
            <span className="topbar-mark"><Activity size={18} /></span>
            <span>Diagnostic Portal</span>
          </p>
          <button type="button" className="btn btn-ghost btn-icon" onClick={() => { logout(); navigate('/'); }}>
            <LogOut size={18} />
          </button>
        </header>

        <main className="portal-content">
          <section className="container" style={{ maxWidth: 720 }}>
            <section className="portal-header-card">
              <header className="portal-header-copy">
                <h1>{center?.name}</h1>
                <p>Manage your public diagnostic center profile.</p>
                <p className="portal-meta">
                  <span className="portal-meta-chip"><MapPin size={14} /> {center?.address?.city || '—'}</span>
                </p>
              </header>
            </section>

            {msg && <div className={`alert ${msg.startsWith('Failed') ? 'alert-error' : 'alert-success'}`}>{msg}</div>}

            <section className="card">
              <p><strong>ID:</strong> {center?.diagnosticId}</p>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" value={form.name || ''} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Contact</label>
                <input className="form-input" value={form.contact || ''} onChange={(e) => setForm(p => ({ ...p, contact: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" value={form.email || ''} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">City</label>
                <input className="form-input" value={form.address?.city || ''} onChange={(e) => setForm(p => ({ ...p, address: { ...p.address, city: e.target.value } }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Opening Hours</label>
                <input className="form-input" value={form.openingHours || ''} onChange={(e) => setForm(p => ({ ...p, openingHours: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Home Collection Available</label>
                <select className="form-select" value={form.homeCollection ? 'true' : 'false'} onChange={(e) => setForm(p => ({ ...p, homeCollection: e.target.value === 'true' }))}>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Specialties</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {(form.specialties || []).map((s, i) => (
                    <span key={i} className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--primary-light)', color: 'var(--primary)' }}>
                      {s} <button className="btn btn-ghost btn-icon" style={{ width: 16, height: 16, padding: 0 }} onClick={() => removeSpecialty(i)}><X size={12} /></button>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="form-input" value={newSpecialty} onChange={e => setNewSpecialty(e.target.value)} placeholder="Add specialty" onKeyDown={e => e.key === 'Enter' && addSpecialty()} />
                  <button className="btn btn-outline" onClick={addSpecialty}><Plus size={14} /></button>
                </div>
              </div>

              <button className="btn btn-primary btn-full" onClick={saveProfile}>
                <Save size={15} /> Save profile
              </button>
            </section>
          </section>
        </main>
      </section>
    </Fragment>
  );
}
