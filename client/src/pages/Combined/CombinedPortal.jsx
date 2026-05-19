import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { Activity, LogOut, MapPin, Save, Stethoscope, PlusCircle, Trash2, Pill } from 'lucide-react';

export default function CombinedPortal() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('clinic');
  const [loading, setLoading] = useState(true);

  // Clinic state
  const [clinic, setClinic] = useState(null);
  const [services, setServices] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [newService, setNewService] = useState({ name: '', description: '' });

  // Diagnostic state
  const [diagnostic, setDiagnostic] = useState(null);
  const [diagForm, setDiagForm] = useState({});

  const [msg, setMsg] = useState('');
  const [newSpecialty, setNewSpecialty] = useState('');

  const clinicId = user?.clinicId || user?.ref;
  const diagnosticId = user?.diagnosticId || user?.ref;

  useEffect(() => {
    Promise.all([
      api.get(`/clinic/${clinicId}`),
      api.get(`/clinic/${clinicId}/services`),
      api.get(`/doctors?clinicId=${clinicId}`),
      api.get(`/diagnostic/${diagnosticId}`),
    ])
    .then(([cRes, sRes, dRes, diagRes]) => {
      setClinic(cRes.data);
      setServices(sRes.data);
      setDoctors(dRes.data);
      setDiagnostic(diagRes.data);
      setDiagForm(diagRes.data);
    })
    .finally(() => setLoading(false));
  }, [clinicId, diagnosticId]);

  const saveClinic = async () => {
    try {
      const { _id, __v, password, doctors: _, services: __, ...update } = clinic;
      await api.put(`/clinic/${clinicId}`, update);
      setMsg('Clinic profile saved.');
      setTimeout(() => setMsg(''), 3000);
    } catch { setMsg('Failed to save clinic.'); }
  };

  const handleAddService = async () => {
    try {
      const res = await api.post(`/clinic/${clinicId}/services`, newService);
      setServices([...services, res.data]);
      setNewService({ name: '', description: '' });
      setMsg('Service added.');
      setTimeout(() => setMsg(''), 3000);
    } catch { setMsg('Failed to add service.'); }
  };

  const toggleService = async (serviceId, current) => {
    try {
      await api.put(`/clinic/${clinicId}/services/${serviceId}`, { available: !current });
      setServices(services.map(s => s._id === serviceId ? { ...s, available: !current } : s));
    } catch { alert('Failed'); }
  };

  const deleteService = async (serviceId) => {
    if (!window.confirm('Delete this service?')) return;
    try {
      await api.delete(`/clinic/${clinicId}/services/${serviceId}`);
      setServices(services.filter(s => s._id !== serviceId));
    } catch { alert('Failed'); }
  };

  const saveDiagnostic = async () => {
    try {
      const { _id, __v, password, imageUrls, ...update } = diagForm;
      await api.put(`/diagnostic/${diagnosticId}`, update);
      setMsg('Diagnostic profile saved.');
      setTimeout(() => setMsg(''), 3000);
    } catch { setMsg('Failed to save diagnostic.'); }
  };

  const addSpecialty = () => {
    const s = newSpecialty.trim();
    if (!s) return;
    setDiagForm(p => ({ ...p, specialties: [...(p.specialties || []), s] }));
    setNewSpecialty('');
  };

  const removeSpecialty = (idx) => {
    setDiagForm(p => ({ ...p, specialties: (p.specialties || []).filter((_, i) => i !== idx) }));
  };

  if (loading) return <div className="loader-center"><div className="spinner" /></div>;

  return (
    <div className="portal-shell">
      <div className="topbar">
        <div className="topbar-logo">
          <span className="topbar-mark"><Activity size={18} /></span>
          <span>Clinic & Diagnostic Portal</span>
        </div>
        <button className="btn btn-ghost btn-icon" onClick={() => { logout(); navigate('/'); }}>
          <LogOut size={18} />
        </button>
      </div>

      <main className="portal-content">
        <div className="container" style={{ maxWidth: 960 }}>
          <section className="portal-header-card">
            <div className="portal-header-copy">
              <h1>{clinic?.name || diagnostic?.name}</h1>
              <p>Manage your clinic services and diagnostic center profile from one place.</p>
              <div className="portal-meta">
                <span className="portal-meta-chip"><MapPin size={14} /> {clinic?.address?.city || '—'}</span>
                <span className="portal-meta-chip"><Stethoscope size={14} /> Clinic & Diagnostic</span>
              </div>
            </div>
          </section>

          {msg && <div className={`alert ${msg.includes('Failed') ? 'alert-error' : 'alert-success'}`}>{msg}</div>}

          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <button className={`btn ${tab === 'clinic' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('clinic')}>
              <Activity size={16} /> Clinic
            </button>
            <button className={`btn ${tab === 'diagnostic' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('diagnostic')}>
              <Pill size={16} /> Diagnostic
            </button>
            <button className={`btn ${tab === 'doctors' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('doctors')}>
              <Stethoscope size={16} /> Doctors
            </button>
          </div>

          {tab === 'clinic' && (
            <div>
              <div className="card" style={{ marginBottom: 16 }}>
                <h3 style={{ marginBottom: 12 }}>Clinic Profile</h3>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Name</label>
                    <input className="form-input" value={clinic?.name || ''} onChange={e => setClinic(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contact</label>
                    <input className="form-input" value={clinic?.contact || ''} onChange={e => setClinic(p => ({ ...p, contact: e.target.value }))} />
                  </div>
                </div>
                <button className="btn btn-primary btn-full" onClick={saveClinic}><Save size={15} /> Save Clinic</button>
              </div>

              <div className="card">
                <h3 style={{ marginBottom: 12 }}>Services</h3>
                {services.length === 0 ? (
                  <div className="empty" style={{ padding: 16 }}>No services listed.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    {services.map(srv => (
                      <div key={srv._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, border: '1px solid var(--border)', borderRadius: 8 }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{srv.name}</div>
                          <div className="text-muted" style={{ fontSize: 13 }}>{srv.description || ''}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className={`badge ${srv.available ? 'badge-green' : 'badge-red'}`} style={{ border: 'none', cursor: 'pointer' }} onClick={() => toggleService(srv._id, srv.available)}>
                            {srv.available ? 'Available' : 'Unavailable'}
                          </button>
                          <button className="btn btn-ghost btn-sm text-danger" onClick={() => deleteService(srv._id)}><Trash2 size={16} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="form-input" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} placeholder="Service name" />
                  <input className="form-input" value={newService.description} onChange={e => setNewService({...newService, description: e.target.value})} placeholder="Description" />
                  <button className="btn btn-primary" onClick={handleAddService}><PlusCircle size={15} /> Add</button>
                </div>
              </div>
            </div>
          )}

          {tab === 'diagnostic' && (
            <div className="card">
              <h3 style={{ marginBottom: 12 }}>Diagnostic Profile</h3>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input className="form-input" value={diagForm.name || ''} onChange={e => setDiagForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact</label>
                  <input className="form-input" value={diagForm.contact || ''} onChange={e => setDiagForm(p => ({ ...p, contact: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input className="form-input" value={diagForm.address?.city || ''} onChange={e => setDiagForm(p => ({ ...p, address: { ...p.address, city: e.target.value } }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Opening Hours</label>
                  <input className="form-input" value={diagForm.openingHours || ''} onChange={e => setDiagForm(p => ({ ...p, openingHours: e.target.value }))} />
                </div>
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="hc" checked={diagForm.homeCollection || false} onChange={e => setDiagForm(p => ({ ...p, homeCollection: e.target.checked }))} />
                <label htmlFor="hc" style={{ fontWeight: 600 }}>Home Collection Available</label>
              </div>
              <div className="form-group">
                <label className="form-label">Specialties</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {(diagForm.specialties || []).map((s, i) => (
                    <span key={i} className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--primary-light)', color: 'var(--primary)' }}>
                      {s} <button className="btn btn-ghost btn-icon" style={{ width: 16, height: 16, padding: 0 }} onClick={() => removeSpecialty(i)}><Trash2 size={12} /></button>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="form-input" value={newSpecialty} onChange={e => setNewSpecialty(e.target.value)} placeholder="Add specialty" onKeyDown={e => e.key === 'Enter' && addSpecialty()} />
                  <button className="btn btn-outline" onClick={addSpecialty}><PlusCircle size={14} /></button>
                </div>
              </div>
              <button className="btn btn-primary btn-full" onClick={saveDiagnostic}><Save size={15} /> Save Diagnostic</button>
            </div>
          )}

          {tab === 'doctors' && (
            <div className="card">
              <h3 style={{ marginBottom: 16 }}>Doctors at this Clinic</h3>
              {doctors.length === 0 ? (
                <div className="empty"><Stethoscope size={32} /><p>No doctors assigned.</p></div>
              ) : (
                <div className="grid-2">
                  {doctors.map(doc => (
                    <div key={doc._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}>
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 20 }}>
                        {doc.name?.[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{doc.name}</div>
                        <div className="text-muted">{doc.specialization || 'General'}</div>
                        <span className={`badge ${doc.availability === 'Available' ? 'badge-green' : 'badge-red'}`} style={{ marginTop: 4, display: 'inline-block' }}>
                          {doc.availability}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
