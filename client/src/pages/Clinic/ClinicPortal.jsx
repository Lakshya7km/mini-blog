import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { Activity, LogOut, Stethoscope, PlusCircle, Trash2, MapPin } from 'lucide-react';

export default function ClinicPortal() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('services');
  const [clinic, setClinic] = useState(null);
  const [services, setServices] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [newService, setNewService] = useState({ name: '', description: '' });
  const [msg, setMsg] = useState('');

  const clinicId = user?.clinicId || user?.ref;

  useEffect(() => {
    Promise.all([
      api.get(`/clinic/${clinicId}`),
      api.get(`/clinic/${clinicId}/services`),
      api.get(`/doctors?clinicId=${clinicId}`)
    ])
    .then(([clinicRes, servRes, docRes]) => {
      setClinic(clinicRes.data);
      setServices(servRes.data);
      setDoctors(docRes.data);
    })
    .finally(() => setLoading(false));

    socket.connect();
    socket.emit('join:clinic', clinicId);

    return () => {
      socket.disconnect();
    };
  }, [clinicId]);

  const handleAddService = async () => {
    try {
      const res = await api.post(`/clinic/${clinicId}/services`, newService);
      setServices([...services, res.data]);
      setNewService({ name: '', description: '' });
      setMsg('Service added successfully.');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg('Failed to add service.');
    }
  };

  const toggleService = async (serviceId, currentStatus) => {
    try {
      await api.put(`/clinic/${clinicId}/services/${serviceId}`, { available: !currentStatus });
      setServices(services.map(s => s._id === serviceId ? { ...s, available: !currentStatus } : s));
    } catch (e) {
      alert('Failed to update service status');
    }
  };

  const deleteService = async (serviceId) => {
    if (!window.confirm('Delete this service?')) return;
    try {
      await api.delete(`/clinic/${clinicId}/services/${serviceId}`);
      setServices(services.filter(s => s._id !== serviceId));
    } catch (e) {
      alert('Failed to delete service');
    }
  };

  if (loading) return <div className="loader-center"><div className="spinner" /></div>;

  return (
    <div className="portal-shell">
      <div className="topbar">
        <div className="topbar-logo">
          <span className="topbar-mark"><Activity size={18} /></span>
          <span>Clinic Portal</span>
        </div>
        <button className="btn btn-ghost btn-icon" onClick={() => { logout(); navigate('/'); }}>
          <LogOut size={18} />
        </button>
      </div>

      <main className="portal-content">
        <div className="container" style={{ maxWidth: 900 }}>
          <section className="portal-header-card">
            <div className="portal-header-copy">
              <h1>{clinic?.name}</h1>
              <p>Manage your clinic's publicly available services and view assigned doctors.</p>
              <div className="portal-meta">
                <span className="portal-meta-chip"><MapPin size={14} /> {clinic?.address?.city || 'Local'}</span>
                <span className="portal-meta-chip"><Activity size={14} /> {clinic?.clinicType} Clinic</span>
              </div>
            </div>
          </section>

          {msg && <div className={`alert ${msg.includes('Failed') ? 'alert-error' : 'alert-success'}`}>{msg}</div>}

          <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
            <button className={`btn ${tab === 'services' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('services')}>
              <Activity size={16} /> Services
            </button>
            <button className={`btn ${tab === 'doctors' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('doctors')}>
              <Stethoscope size={16} /> Assigned Doctors
            </button>
          </div>

          {tab === 'services' && (
            <div className="grid-2">
              <div className="card">
                <h3 style={{ marginBottom: 16 }}>Available Services</h3>
                {services.length === 0 ? (
                  <div className="empty" style={{ padding: 20 }}>No services listed.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {services.map(srv => (
                      <div key={srv._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, border: '1px solid var(--border)', borderRadius: 8 }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{srv.name}</div>
                          <div className="text-muted" style={{ fontSize: 13 }}>{srv.description || 'No description'}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button 
                            className={`badge ${srv.available ? 'badge-green' : 'badge-red'}`}
                            style={{ border: 'none', cursor: 'pointer' }}
                            onClick={() => toggleService(srv._id, srv.available)}
                          >
                            {srv.available ? 'Available' : 'Unavailable'}
                          </button>
                          <button className="btn btn-ghost btn-sm text-danger" onClick={() => deleteService(srv._id)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="card">
                <h3 style={{ marginBottom: 16 }}>Add New Service</h3>
                <div className="form-group">
                  <label className="form-label">Service Name</label>
                  <input className="form-input" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} placeholder="e.g. Dental X-Ray" />
                </div>
                <div className="form-group">
                  <label className="form-label">Description (optional)</label>
                  <textarea className="form-textarea" value={newService.description} onChange={e => setNewService({...newService, description: e.target.value})} />
                </div>
                <button className="btn btn-primary" onClick={handleAddService} disabled={!newService.name}>
                  <PlusCircle size={15} /> Add Service
                </button>
              </div>
            </div>
          )}

          {tab === 'doctors' && (
            <div className="card">
              <h3 style={{ marginBottom: 16 }}>Doctors Associated with Clinic</h3>
              {doctors.length === 0 ? (
                <div className="empty">
                  <Stethoscope size={32} />
                  <p>No doctors currently assigned to this clinic.</p>
                </div>
              ) : (
                <div className="grid-2">
                  {doctors.map(doc => (
                    <div key={doc._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}>
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 20 }}>
                        {doc.name[0]}
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
