import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import socket from '../../lib/socket';
import { Package, PlusCircle, Search, Pill, Store, LogOut } from 'lucide-react';

export default function PharmacyPortal() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('inventory');
  const [pharmacy, setPharmacy] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [newMed, setNewMed] = useState({ name: '', medicineNumber: '', category: '', requiresPrescription: false });
  const [msg, setMsg] = useState('');

  const pharmacyId = user?.pharmacyId || user?.ref;

  useEffect(() => {
    Promise.all([
      api.get(`/pharmacy/${pharmacyId}`),
      api.get(`/pharmacy/${pharmacyId}/medicines`)
    ])
    .then(([pharmRes, medsRes]) => {
      setPharmacy(pharmRes.data);
      setMedicines(medsRes.data);
    })
    .finally(() => setLoading(false));

    socket.connect();
    socket.emit('join:pharmacy', pharmacyId);

    socket.on('pharmacy:stock', (update) => {
      setMedicines(prev => prev.map(m => m._id === update.medicineId ? { ...m, inStock: update.inStock } : m));
    });

    return () => {
      socket.off('pharmacy:stock');
      socket.disconnect();
    };
  }, [pharmacyId]);

  const handleAddMedicine = async () => {
    try {
      const res = await api.post(`/pharmacy/${pharmacyId}/medicines`, newMed);
      setMedicines([...medicines, res.data]);
      setNewMed({ name: '', medicineNumber: '', category: '', requiresPrescription: false });
      setMsg('Medicine added to inventory.');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg('Failed to add medicine.');
    }
  };

  const toggleStock = async (medicineId, currentStatus) => {
    try {
      await api.patch(`/pharmacy/${pharmacyId}/medicines/${medicineId}`, { inStock: !currentStatus });
    } catch (e) {
      alert('Failed to update stock status');
    }
  };

  const deleteMedicine = async (medicineId) => {
    if (!window.confirm('Delete this medicine from inventory?')) return;
    try {
      await api.delete(`/pharmacy/${pharmacyId}/medicines/${medicineId}`);
      setMedicines(medicines.filter(m => m._id !== medicineId));
    } catch (e) {
      alert('Failed to delete medicine');
    }
  };

  if (loading) return <div className="loader-center"><div className="spinner" /></div>;

  const filteredMeds = medicines.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    (m.medicineNumber || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="portal-shell">
      <div className="topbar">
        <div className="topbar-logo">
          <span className="topbar-mark"><Store size={18} /></span>
          <span>Pharmacy Portal</span>
        </div>
        <button className="btn btn-ghost btn-icon" onClick={() => { logout(); navigate('/'); }}>
          <LogOut size={18} />
        </button>
      </div>

      <main className="portal-content">
        <div className="container" style={{ maxWidth: 900 }}>
          <section className="portal-header-card">
            <div className="portal-header-copy">
              <h1>{pharmacy?.name}</h1>
              <p>Manage your real-time medicine inventory so hospitals and clinics can verify stock availability instantly.</p>
            </div>
          </section>

          {msg && <div className={`alert ${msg.includes('Failed') ? 'alert-error' : 'alert-success'}`}>{msg}</div>}

          <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
            <button className={`btn ${tab === 'inventory' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('inventory')}>
              <Package size={16} /> Inventory
            </button>
            <button className={`btn ${tab === 'add' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('add')}>
              <PlusCircle size={16} /> Add Medicine
            </button>
          </div>

          {tab === 'inventory' && (
            <div className="card">
              <div style={{ position: 'relative', marginBottom: 16 }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#9ca3af' }} />
                <input 
                  className="form-input" 
                  style={{ paddingLeft: 36 }}
                  placeholder="Search inventory by name or batch number..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {filteredMeds.length === 0 ? (
                <div className="empty">
                  <Pill size={32} />
                  <p>No medicines found.</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Medicine</th>
                        <th>Category</th>
                        <th>Batch / No.</th>
                        <th>Rx Required</th>
                        <th>Stock Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMeds.map(med => (
                        <tr key={med._id}>
                          <td style={{ fontWeight: 600 }}>{med.name}</td>
                          <td>{med.category || '-'}</td>
                          <td>{med.medicineNumber || '-'}</td>
                          <td>{med.requiresPrescription ? 'Yes' : 'No'}</td>
                          <td>
                            <button 
                              className={`badge ${med.inStock ? 'badge-green' : 'badge-red'}`}
                              style={{ border: 'none', cursor: 'pointer' }}
                              onClick={() => toggleStock(med._id, med.inStock)}
                            >
                              {med.inStock ? 'In Stock' : 'Out of Stock'}
                            </button>
                          </td>
                          <td>
                            <button className="btn btn-sm btn-ghost text-danger" onClick={() => deleteMedicine(med._id)}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'add' && (
            <div className="card">
              <h3 style={{ marginBottom: 16 }}>Add New Medicine</h3>
              <div className="form-group">
                <label className="form-label">Medicine Name</label>
                <input className="form-input" value={newMed.name} onChange={e => setNewMed({...newMed, name: e.target.value})} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Batch / Identification Number</label>
                  <input className="form-input" value={newMed.medicineNumber} onChange={e => setNewMed({...newMed, medicineNumber: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Category (e.g. Painkiller, Antibiotic)</label>
                  <input className="form-input" value={newMed.category} onChange={e => setNewMed({...newMed, category: e.target.value})} />
                </div>
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input 
                  type="checkbox" 
                  id="rx" 
                  checked={newMed.requiresPrescription} 
                  onChange={e => setNewMed({...newMed, requiresPrescription: e.target.checked})} 
                />
                <label htmlFor="rx" style={{ fontWeight: 600 }}>Requires Prescription</label>
              </div>
              <button className="btn btn-primary btn-full" onClick={handleAddMedicine} disabled={!newMed.name}>
                Save to Inventory
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
