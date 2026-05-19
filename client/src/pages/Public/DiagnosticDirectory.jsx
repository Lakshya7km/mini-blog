import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { requestLocationPermission } from '../../lib/permissions';
import { Activity, ArrowLeft, MapPin, Phone, Search } from 'lucide-react';
import '../Home/Home.css';

export default function DiagnosticDirectory() {
  const navigate = useNavigate();
  const [centers, setCenters] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [userPos, setUserPos] = useState(null);

  const load = (lat, lng) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (lat && lng) {
      params.set('lat', lat);
      params.set('lng', lng);
    }
    api.get(`/diagnostic?${params}`)
      .then((res) => {
        setCenters(res.data);
        setFiltered(res.data);
      })
      .catch(() => {
        setCenters([]);
        setFiltered([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      setFiltered(centers);
      return;
    }
    setFiltered(
      centers.filter(
        (c) =>
          c.name?.toLowerCase().includes(q)
          || c.address?.city?.toLowerCase().includes(q)
          || (c.specialties || []).some((s) => s.toLowerCase().includes(q)),
      ),
    );
  }, [search, centers]);

  const useMyLocation = async () => {
    await requestLocationPermission();
    navigator.geolocation?.getCurrentPosition((pos) => {
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUserPos(coords);
      load(coords.lat, coords.lng);
    });
  };

  return (
    <div className="home-page-classic">
      <nav className="classic-navbar">
        <div className="container classic-nav-container">
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/public')}>
            <ArrowLeft size={16} /> Public directory
          </button>
          <button type="button" className="btn btn-outline btn-sm" onClick={useMyLocation}>
            <MapPin size={14} /> Sort by distance
          </button>
        </div>
      </nav>

      <section className="classic-section" style={{ paddingTop: 24 }}>
        <div className="container">
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 8 }}>Diagnostic centers</h1>
          <p className="text-muted" style={{ marginBottom: 16 }}>
            {userPos ? 'Sorted nearest to you.' : 'Find labs and imaging centers in your city.'}
          </p>

          <div style={{ position: 'relative', marginBottom: 20 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
            <input
              className="form-input"
              style={{ paddingLeft: 32 }}
              placeholder="Search by name, city, or specialty…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="loader-center"><div className="spinner" /></div>
          ) : (
            <div className="classic-blood-grid">
              {filtered.map((c) => (
                <div key={c.diagnosticId} className="classic-card">
                  <div className="classic-kicker">Diagnostic</div>
                  <h3 style={{ marginTop: 8, fontWeight: 800 }}>{c.name}</h3>
                  <p className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                    <MapPin size={14} />
                    {c.address?.city || 'City not listed'}
                    {c.distance !== undefined && c.distance !== Infinity && (
                      <span style={{ fontSize: 11 }}> · nearby</span>
                    )}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                    {(c.specialties || []).slice(0, 5).map((s) => (
                      <span key={s} className="badge badge-gray">{s}</span>
                    ))}
                  </div>
                  {c.homeCollection && (
                    <span className="badge" style={{ marginTop: 8, background: '#dcfce7', color: '#166534' }}>
                      Home collection
                    </span>
                  )}
                  {c.openingHours && (
                    <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 8 }}>Hours: {c.openingHours}</p>
                  )}
                  {c.contact && (
                    <p style={{ fontSize: 12, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Phone size={12} /> {c.contact}
                    </p>
                  )}
                  {(c.equipment || []).length > 0 && (
                    <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
                      Equipment: {(c.equipment || []).join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="empty"><p>No diagnostic centers found.</p></div>
          )}
        </div>
      </section>
    </div>
  );
}

