import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { Search, MapPin, Building2, Navigation, Heart, Phone, Info, Megaphone, Bed, Droplet, Image as ImageIcon, Stethoscope, Clock, ShieldCheck, Activity, Store, Pill, X } from 'lucide-react';

import '../Home/Home.css';

export default function PublicPortal() {
    const navigate = useNavigate();
    const [viewType, setViewType] = useState('hospital'); // 'hospital' | 'clinic' | 'pharmacy'
    
    // Core Data
    const [hospitals, setHospitals] = useState([]);
    const [clinics, setClinics] = useState([]);
    const [pharmacies, setPharmacies] = useState([]);
    
    const [filtered, setFiltered] = useState([]);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(null);
    
    // State maps
    const [bedSummary, setBedSummary] = useState({});
    const [docSummary, setDocSummary] = useState({});
    const [bloodStock, setBloodStock] = useState({});
    const [clinicServices, setClinicServices] = useState({});
    const [pharmacyMeds, setPharmacyMeds] = useState({});
    const [, setFetchedAt] = useState({});
    const [, setAnnouncements] = useState({});
    
    const [userPos, setUserPos] = useState(null);
    const [loading, setLoading] = useState(true);

    const [showDonateForm, setShowDonateForm] = useState(false);
    const [donateForm, setDonateForm] = useState({ name: '', bloodType: 'A+', contact: '', city: '', hospitalId: '' });
    const [donateMsg, setDonateMsg] = useState('');

    useEffect(() => {
        Promise.all([
            api.get('/hospitals'),
            api.get('/clinic'),
            api.get('/pharmacy')
        ]).then(([hRes, cRes, pRes]) => {
            setHospitals(hRes.data);
            setClinics(cRes.data);
            setPharmacies(pRes.data);
            setFiltered(hRes.data); // Default view
        }).finally(() => setLoading(false));
    }, []);

    const requestLocation = () => {
        navigator.geolocation.getCurrentPosition(
            pos => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => {}
        );
    };

    useEffect(() => {
        let baseList = [];
        if (viewType === 'hospital') baseList = hospitals;
        else if (viewType === 'clinic') baseList = clinics;
        else if (viewType === 'pharmacy') baseList = pharmacies;

        let f = baseList;
        if (search) {
            f = f.filter(item => 
                item.name?.toLowerCase().includes(search.toLowerCase()) || 
                item.address?.city?.toLowerCase().includes(search.toLowerCase())
            );
        }

        if (userPos) {
            const toRad = (v) => v * Math.PI / 180;
            const R = 6371;
            f = [...f].map(item => {
                if (!item.location?.lat) return { ...item, distance: 9999 };
                const dLat = toRad(item.location.lat - userPos.lat);
                const dLon = toRad(item.location.lng - userPos.lng);
                const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(userPos.lat)) * Math.cos(toRad(item.location.lat)) * Math.sin(dLon / 2) ** 2;
                const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                return { ...item, distance: dist };
            }).sort((a, b) => (a.distance || 9999) - (b.distance || 9999));
        }

        setFiltered(f);
    }, [search, viewType, hospitals, clinics, pharmacies, userPos]);

    // Data fetching effect
    useEffect(() => {
        const now = new Date();
        if (viewType === 'hospital') {
            hospitals.forEach(h => {
                if (!bedSummary[h.hospitalId]) {
                    api.get(`/beds/summary/${h.hospitalId}`).then(r => setBedSummary(prev => ({ ...prev, [h.hospitalId]: r.data }))).catch(() => {});
                    api.get(`/doctors?hospitalId=${h.hospitalId}`).then(r => setDocSummary(prev => ({ ...prev, [h.hospitalId]: r.data }))).catch(() => {});
                    api.get(`/bloodbank?hospitalId=${h.hospitalId}`).then(r => {
                        setBloodStock(prev => ({ ...prev, [h.hospitalId]: r.data }));
                        setFetchedAt(prev => ({ ...prev, [h.hospitalId]: now }));
                    }).catch(() => {});
                    api.get(`/announcements?hospitalId=${h.hospitalId}`).then(r => setAnnouncements(prev => ({ ...prev, [h.hospitalId]: r.data }))).catch(() => {});
                }
            });
        } else if (viewType === 'clinic') {
            clinics.forEach(c => {
                if (!clinicServices[c.clinicId]) {
                    api.get(`/clinic/${c.clinicId}/services`).then(r => setClinicServices(prev => ({ ...prev, [c.clinicId]: r.data }))).catch(() => {});
                    api.get(`/doctors?clinicId=${c.clinicId}`).then(r => setDocSummary(prev => ({ ...prev, [c.clinicId]: r.data }))).catch(() => {});
                }
            });
        } else if (viewType === 'pharmacy') {
            pharmacies.forEach(p => {
                if (!pharmacyMeds[p.pharmacyId]) {
                    api.get(`/pharmacy/${p.pharmacyId}/medicines?inStock=true`).then(r => setPharmacyMeds(prev => ({ ...prev, [p.pharmacyId]: r.data }))).catch(() => {});
                }
            });
        }
    }, [viewType, hospitals, clinics, pharmacies]);

    const submitDonation = async (e) => {
        e.preventDefault();
        try {
            await api.post('/bloodbank/donors', donateForm);
            setDonateMsg('Donation request submitted successfully.');
            setTimeout(() => { setShowDonateForm(false); setDonateMsg(''); }, 3000);
            setDonateForm({ name: '', bloodType: 'A+', contact: '', city: '', hospitalId: '' });
        } catch {
            setDonateMsg('Failed to submit request.');
        }
    };

    const openDetail = (item) => {
        setSelected({ ...item, type: viewType });
        if (viewType === 'hospital') {
            setDonateForm({ ...donateForm, hospitalId: item.hospitalId, city: item.address?.city || '' });
        }
    };

    const navigateToLocation = (loc, name) => {
        const dest = loc?.lat ? `${loc.lat},${loc.lng}` : encodeURIComponent(name);
        const win = window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank');
        if (!win) return;
    };

    const nearest = (userPos && filtered.length > 0 && filtered[0].distance < 9999) ? filtered[0] : null;

    return (
        <div className="home-page-classic">
            <nav className="navbar classic-navbar" style={{ position: 'fixed', width: '100%' }}>
                <div className="container classic-nav-container">
                    <div className="classic-logo-wrapper" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => navigate('/')}>
                        <img src="/logo.png" alt="RapidCare" style={{ height: 36, width: 'auto', objectFit: 'contain' }} />
                        <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>RapidCare</span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text2)', cursor: 'pointer' }} onClick={() => navigate('/')}>HOME</span>
                        <button className="btn btn-primary btn-sm rounded-pill px-4" onClick={() => document.getElementById('directory')?.scrollIntoView({ behavior: 'smooth' })}>
                            Find Care
                        </button>
                    </div>
                </div>
            </nav>

            <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', padding: '7rem 1rem 8rem 1rem', color: 'white', textAlign: 'center', marginBottom: '-4rem' }}>
                <div className="container">
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem' }}>Instant Medical Precision</h1>
                    <p style={{ fontSize: '1.15rem', opacity: 0.9, marginBottom: '3rem', maxWidth: '600px', margin: '0 auto 3rem' }}>Find hospitals, clinics, and pharmacies with real-time availability tracking.</p>

                    <div style={{ maxWidth: 700, margin: '0 auto', position: 'relative', zIndex: 10 }}>
                        <div style={{ background: 'white', padding: 8, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                            <Search size={20} color="var(--text3)" style={{ marginLeft: 12 }} />
                            <input
                                style={{ border: 'none', padding: '12px 8px', flex: 1, borderRadius: 8, fontSize: '1rem', outline: 'none', color: 'var(--text)' }}
                                placeholder={`Search for ${viewType}s...`}
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                            <button className="btn btn-primary" style={{ padding: '10px 24px', borderRadius: 8, fontWeight: 600, border: 'none' }}>Search</button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container" style={{ position: 'relative', zIndex: 20 }}>
                {nearest && userPos && (
                    <div style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(12px)', border: '1px solid var(--primary-light)', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem', boxShadow: 'var(--shadow-md)' }}>
                        <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', width: 56, height: 56, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {viewType === 'hospital' ? <Building2 size={28} /> : viewType === 'clinic' ? <Activity size={28} /> : <Store size={28} />}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: 4 }}>Closest {viewType}</div>
                            <h3 style={{ margin: 0, fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>{nearest.name}</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span className="badge badge-blue">{nearest.distance?.toFixed(1)} km</span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text2)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {nearest.address?.city}</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            <button className="btn btn-outline btn-sm" onClick={() => openDetail(nearest)}>View Details</button>
                            <button className="btn btn-primary btn-sm" onClick={() => navigateToLocation(nearest.location, nearest.name)}><Navigation size={14} /> Navigate</button>
                        </div>
                    </div>
                )}

                {!userPos && (
                    <div style={{ background: 'var(--warning-light)', border: '1px solid #FDE68A', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--shadow)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ color: 'var(--warning)' }}><MapPin size={24} /></div>
                            <div>
                                <h4 style={{ margin: 0, fontWeight: 700, color: '#92400E' }}>Precision Geolocation</h4>
                                <p style={{ margin: 0, fontSize: '0.9rem', color: '#B45309' }}>Enable location to automatically sort by proximity.</p>
                            </div>
                        </div>
                        <button className="btn btn-warning font-semibold" onClick={requestLocation}>Enable GPS</button>
                    </div>
                )}

                <div id="directory" style={{ marginBottom: '4rem' }}>
                    <div style={{ display: 'flex', gap: 12, marginBottom: '2rem' }}>
                        <button className={`btn ${viewType === 'hospital' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setViewType('hospital')}>
                            <Building2 size={16} /> Hospitals
                        </button>
                        <button className={`btn ${viewType === 'clinic' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setViewType('clinic')}>
                            <Activity size={16} /> Clinics
                        </button>
                        <button className={`btn ${viewType === 'pharmacy' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setViewType('pharmacy')}>
                            <Store size={16} /> Pharmacies
                        </button>
                        <button type="button" className="btn btn-outline" onClick={() => navigate('/diagnostic')}>
                            <Activity size={16} /> Diagnostics
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                        {loading ? <div className="loader-center w-full"><div className="spinner"></div></div> : filtered.map(item => {
                            const id = item.hospitalId || item.clinicId || item.pharmacyId;
                            
                            return (
                                <div key={id} className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                    <div style={{ padding: '1.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                            <div style={{ flex: 1 }}>
                                                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--text)' }}>{item.name}</h3>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text2)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <MapPin size={12} /> {item.address?.city || 'Local'} {item.distance && item.distance < 9999 && <span className="badge badge-blue" style={{ marginLeft: 6 }}>{item.distance.toFixed(1)} km</span>}
                                                </div>
                                            </div>
                                            <div style={{ width: 40, height: 40, background: 'var(--primary-light)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
                                                {viewType === 'hospital' ? <Building2 size={20} /> : viewType === 'clinic' ? <Activity size={20} /> : <Store size={20} />}
                                            </div>
                                        </div>

                                        {viewType === 'hospital' && (() => {
                                            const b = bedSummary[id];
                                            const counts = b?.counts;
                                            const hasCounts = counts && Object.keys(counts).length > 0;
                                            const vacantBeds = hasCounts ? Object.values(counts).reduce((a, c) => a + (c.available || 0), 0) : 0;
                                            const docData = docSummary[id];
                                            const availDocs = Array.isArray(docData) ? docData.filter(d => d.availability === 'Available').length : 0;
                                            const totalDocs = Array.isArray(docData) ? docData.length : 0;
                                            return (
                                                <div>
                                                    <div className={`alert ${vacantBeds > 0 ? 'alert-success' : (b ? 'alert-error' : 'alert-warning')}`} style={{ padding: '8px 12px', fontSize: '0.75rem', fontWeight: 700, marginBottom: 8 }}>
                                                        {vacantBeds > 0 ? `${vacantBeds} Bed${vacantBeds > 1 ? 's' : ''} Available` : (b ? 'All Beds Occupied' : 'Syncing Beds...')}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 8, fontSize: '0.75rem', color: 'var(--text2)' }}>
                                                        {totalDocs > 0 && (
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                <Stethoscope size={12} /> {availDocs}/{totalDocs} Doctors Available
                                                            </span>
                                                        )}
                                                        {bloodStock[id]?.some(b => b.units > 0) && (
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                <Droplet size={12} color="var(--danger)" /> Blood Bank
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {viewType === 'clinic' && (
                                            <div style={{ marginTop: 12 }}>
                                                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text3)', marginBottom: 6 }}>Available Services</div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                    {(clinicServices[id] || []).filter(s => s.available).slice(0, 4).map(s => (
                                                        <span key={s._id} className="badge badge-blue">{s.name}</span>
                                                    ))}
                                                    {(!clinicServices[id] || clinicServices[id].filter(s=>s.available).length === 0) && <span className="text-muted" style={{fontSize: 12}}>No services listed</span>}
                                                </div>
                                            </div>
                                        )}

                                        {viewType === 'pharmacy' && (
                                            <div style={{ marginTop: 12 }}>
                                                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text3)', marginBottom: 6 }}><Pill size={12} style={{display:'inline', marginRight:4}} /> Medicine Stock Highlights</div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                    {(pharmacyMeds[id] || []).slice(0, 5).map(m => (
                                                        <span key={m._id} className="badge badge-green">{m.name}</span>
                                                    ))}
                                                    {(!pharmacyMeds[id] || pharmacyMeds[id].length === 0) && <span className="text-muted" style={{fontSize: 12}}>Inventory syncing...</span>}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ padding: '0 1.5rem 1.5rem 1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: 'auto' }}>
                                        <button className="btn btn-primary" onClick={() => navigateToLocation(item.location, item.name)}><Navigation size={14} /> Route</button>
                                        <button className="btn btn-outline" onClick={() => openDetail(item)}><Info size={14} /> Details</button>
                                        <button className="btn btn-dark" style={{ gridColumn: 'span 2' }} onClick={() => window.location.href = `tel:${item.contact}`}><Phone size={14} /> Call Facility</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {selected && (
                <div className="modal-overlay" onClick={() => setSelected(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
                        <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                            <div>
                                <h3 className="modal-title" style={{ fontSize: '1.25rem' }}>{selected.name}</h3>
                                {selected.address?.city && <span style={{ fontSize: '0.85rem', color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {selected.address.street ? `${selected.address.street}, ` : ''}{selected.address.city}{selected.address.district ? `, ${selected.address.district}` : ''}{selected.address.state ? `, ${selected.address.state}` : ''}</span>}
                            </div>
                            <button className="btn btn-icon btn-ghost" onClick={() => setSelected(null)}><X size={20} /></button>
                        </div>

                        <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
                            <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => navigateToLocation(selected.location, selected.name)}><Navigation size={14} /> Directions</button>
                            <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => window.location.href = `tel:${selected.contact}`}><Phone size={14} /> Call</button>
                            {selected.type === 'hospital' && <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={() => setShowDonateForm(true)}><Heart size={14} /> Donate</button>}
                        </div>

                        {selected.type === 'hospital' && bedSummary[selected.hospitalId]?.counts && Object.keys(bedSummary[selected.hospitalId].counts).length > 0 && (
                            <div style={{ background: 'var(--surface2)', padding: '1.25rem', borderRadius: '10px', marginBottom: '1rem' }}>
                                <strong style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)', marginBottom: 12 }}><Bed size={16} /> Bed Availability</strong>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 12 }}>
                                    {Object.entries(bedSummary[selected.hospitalId].counts).map(([type, stats]) => (
                                        <div key={type} style={{ background: 'white', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--border)' }}>
                                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 4 }}>{type}</div>
                                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: stats.available > 0 ? 'var(--success)' : 'var(--danger)' }}>
                                                {stats.available} <span style={{ fontSize: '0.85rem', color: 'var(--text3)', fontWeight: 400 }}>/ {stats.total}</span>
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: stats.available > 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                                                {stats.available > 0 ? 'Available' : 'Full'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selected.type === 'hospital' && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: '1rem' }}>
                                {selected.services?.length > 0 && (
                                    <div style={{ background: 'var(--surface2)', padding: '1rem', borderRadius: 10 }}>
                                        <strong style={{ fontSize: '0.75rem', color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Services</strong>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                            {selected.services.map((s, i) => <span key={i} className="badge badge-blue" style={{ fontSize: '0.7rem' }}>{s}</span>)}
                                        </div>
                                    </div>
                                )}
                                {selected.facilities?.length > 0 && (
                                    <div style={{ background: 'var(--surface2)', padding: '1rem', borderRadius: 10 }}>
                                        <strong style={{ fontSize: '0.75rem', color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Facilities</strong>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                            {selected.facilities.map((f, i) => <span key={i} className="badge badge-green" style={{ fontSize: '0.7rem' }}>{f}</span>)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {selected.type === 'hospital' && bloodStock[selected.hospitalId] && bloodStock[selected.hospitalId].some(b=>b.units>0) && (
                            <div style={{ background: 'var(--surface2)', padding: '1rem', borderRadius: '10px', marginBottom: '1rem' }}>
                                <strong style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)', marginBottom: 8 }}><Droplet size={14} color="var(--danger)" /> Blood Bank</strong>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {bloodStock[selected.hospitalId].filter(b => b.units > 0).map(b => (
                                        <div key={b._id} className="badge badge-red" style={{ padding: '6px 10px', fontSize: '0.8rem' }}>
                                            {b.bloodType}: {b.units}u
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selected.type === 'clinic' && clinicServices[selected.clinicId] && clinicServices[selected.clinicId].filter(s => s.available).length > 0 && (
                            <div style={{ background: 'var(--surface2)', padding: '1rem', borderRadius: '10px', marginBottom: '1rem' }}>
                                <strong style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text)', marginBottom: 8 }}><Activity size={14} /> Services</strong>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {clinicServices[selected.clinicId].filter(s => s.available).map(s => <span key={s._id} className="badge badge-blue">{s.name}</span>)}
                                </div>
                            </div>
                        )}

                        {selected.type === 'pharmacy' && pharmacyMeds[selected.pharmacyId] && pharmacyMeds[selected.pharmacyId].length > 0 && (
                            <div style={{ background: 'var(--surface2)', padding: '1rem', borderRadius: '10px', marginBottom: '1rem' }}>
                                <strong style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text)', marginBottom: 8 }}><Pill size={14} /> Medicines In Stock</strong>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {pharmacyMeds[selected.pharmacyId].slice(0, 10).map(m => (
                                        <span key={m._id} className="badge badge-green">{m.name}{m.requiresPrescription ? ' (Rx)' : ''}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {(selected.type === 'hospital' || selected.type === 'clinic') && docSummary[selected.hospitalId || selected.clinicId]?.length > 0 && (
                            <div>
                                <strong style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)', marginBottom: 8 }}><Stethoscope size={14} /> Doctors ({docSummary[selected.hospitalId || selected.clinicId].length})</strong>
                                <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                                    {docSummary[selected.hospitalId || selected.clinicId].map((d, i) => (
                                        <div key={d._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: i < docSummary[selected.hospitalId || selected.clinicId].length - 1 ? '1px solid var(--border)' : 'none' }}>
                                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14, fontWeight: 700 }}>{d.name?.[0]}</div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    {d.name}
                                                    <span className={`badge ${d.availability === 'Available' ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '0.65rem' }}>{d.availability || 'Unavailable'}</span>
                                                </div>
                                                <span style={{ color: 'var(--text2)', fontSize: '0.8rem' }}>{d.specialization || d.speciality || 'General'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showDonateForm && (
                <div className="modal-overlay" onClick={() => setShowDonateForm(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title" style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 8 }}><Heart size={20} fill="currentColor" /> Donor Registration</h3>
                            <button className="btn btn-icon btn-ghost" onClick={() => setShowDonateForm(false)}><X size={20} /></button>
                        </div>
                        {donateMsg && <div className={`alert ${donateMsg.includes('success') ? 'alert-success' : 'alert-error'}`}>{donateMsg}</div>}
                        <form onSubmit={submitDonation}>
                            <div className="form-group">
                                <label className="form-label">Full Name *</label>
                                <input className="form-input" required value={donateForm.name} onChange={e => setDonateForm({ ...donateForm, name: e.target.value })} />
                            </div>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label className="form-label">Blood Group *</label>
                                    <select className="form-select" value={donateForm.bloodType} onChange={e => setDonateForm({ ...donateForm, bloodType: e.target.value })}>
                                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(type => <option key={type} value={type}>{type}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Contact Number *</label>
                                    <input className="form-input" required type="tel" value={donateForm.contact} onChange={e => setDonateForm({ ...donateForm, contact: e.target.value })} />
                                </div>
                            </div>
                            <button type="submit" className="btn btn-danger btn-full mt-4">Submit Registration</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
