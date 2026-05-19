import { useEffect, useState, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { Activity, LogOut, MapPin } from 'lucide-react';

export default function DiagnosticPortal() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [center, setCenter] = useState(null);
  const [loading, setLoading] = useState(true);
  const diagnosticId = user?.diagnosticId || user?.ref;

  useEffect(() => {
    api.get(`/diagnostic/${diagnosticId}`)
      .then((r) => setCenter(r.data))
      .finally(() => setLoading(false));
  }, [diagnosticId]);

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

            <section className="card">
              <p><strong>ID:</strong> {center?.diagnosticId}</p>
              <p><strong>Contact:</strong> {center?.contact}</p>
              <p><strong>Hours:</strong> {center?.openingHours || '—'}</p>
              <p><strong>Specialties:</strong> {(center?.specialties || []).join(', ') || '—'}</p>
              <p><strong>Home collection:</strong> {center?.homeCollection ? 'Yes' : 'No'}</p>
            </section>
          </section>
        </main>
      </section>
    </Fragment>
  );
}
