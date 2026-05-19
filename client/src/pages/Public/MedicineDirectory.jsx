import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { ArrowLeft, MapPin, Phone, Search, Pill, Clock, Building2 } from 'lucide-react';
import '../Home/Home.css';

export default function MedicineDirectory() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.get(`/pharmacy/search?medicine=${encodeURIComponent(q)}`);
      setResults(res.data);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-page-classic">
      <nav className="classic-navbar">
        <div className="container classic-nav-container">
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/public')}>
            <ArrowLeft size={16} /> Public directory
          </button>
        </div>
      </nav>

      <section className="classic-section" style={{ paddingTop: 24 }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 8 }}>Medicine Directory</h1>
          <p className="text-muted" style={{ marginBottom: 16 }}>
            Search for medicines and find which pharmacies have them in stock.
          </p>

          <form onSubmit={handleSearch} style={{ position: 'relative', marginBottom: 24 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
            <input
              className="form-input"
              style={{ paddingLeft: 32 }}
              placeholder="Search medicine by name…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </form>

          {loading && <div className="loader-center"><div className="spinner" /></div>}

          {!loading && searched && results && (
            <div>
              <p className="text-muted" style={{ marginBottom: 12 }}>
                Found {results.medsFound || 0} result{results.medsFound !== 1 ? 's' : ''} in {results.results?.length || 0} pharmac{results.results?.length === 1 ? 'y' : 'ies'}
              </p>
              {results.results?.length === 0 && (
                <div className="empty"><Pill size={32} /><p>No pharmacies have this medicine in stock.</p></div>
              )}
              <div style={{ display: 'grid', gap: 12 }}>
                {(results.results || []).map((pharm) => (
                  <div key={pharm.pharmacyId} className="classic-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ fontWeight: 800 }}>{pharm.name}</h3>
                        <p className="text-muted" style={{ fontSize: 12 }}>{pharm.pharmacyId}</p>
                      </div>
                      <span className="badge badge-blue"><Building2 size={12} /> Pharmacy</span>
                    </div>
                    <p className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                      <MapPin size={14} /> {[pharm.address?.street, pharm.address?.city, pharm.address?.state].filter(Boolean).join(', ') || '—'}
                    </p>
                    {pharm.contact && (
                      <p style={{ fontSize: 13, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Phone size={12} /> {pharm.contact}
                      </p>
                    )}
                    {pharm.openingHours && (
                      <p style={{ fontSize: 13, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} /> {pharm.openingHours}
                      </p>
                    )}
                    {pharm.licenseNumber && (
                      <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>License: {pharm.licenseNumber}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && searched && !results && (
            <div className="empty"><p>Search failed. Try again.</p></div>
          )}

          {!searched && (
            <div className="empty"><Pill size={32} /><p>Enter a medicine name to search across all pharmacies.</p></div>
          )}
        </div>
      </section>
    </div>
  );
}
