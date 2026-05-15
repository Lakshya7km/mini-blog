import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import socket from '../../lib/socket'
import { Search, MapPin, Building2, Navigation, Heart, Phone, Info, Megaphone, Bed, Droplet, Image as ImageIcon, Stethoscope, Clock, ShieldCheck, Activity, X } from 'lucide-react'

import '../Home/Home.css' // Reuse the classic styling

export default function PublicPortal() {
    const navigate = useNavigate()
    const [hospitals, setHospitals] = useState([])
    const [filtered, setFiltered] = useState([])
    const [search, setSearch] = useState('')
    const [selected, setSelected] = useState(null)
    const [bedSummary, setBedSummary] = useState({})
    const [docSummary, setDocSummary] = useState({})
    const [bloodStock, setBloodStock] = useState({})
    const [fetchedAt, setFetchedAt] = useState({}) // { hospitalId: Date }
    const [announcements, setAnnouncements] = useState({})
    const [userPos, setUserPos] = useState(null)
    const [loading, setLoading] = useState(true)

    const [showDonateForm, setShowDonateForm] = useState(false)
    const [donateForm, setDonateForm] = useState({ name: '', bloodType: 'A+', contact: '', city: '', hospitalId: '' })
    const [donateMsg, setDonateMsg] = useState('')

    useEffect(() => {
        api.get('/hospitals').then(r => { setHospitals(r.data); setFiltered(r.data) }).finally(() => setLoading(false))
    }, [])

    const requestLocation = () => {
        navigator.geolocation?.getCurrentPosition(pos => {
            setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        })
    }

    useEffect(() => {
        let f = hospitals
        if (search) f = f.filter(h => h.name?.toLowerCase().includes(search.toLowerCase()) || h.address?.city?.toLowerCase().includes(search.toLowerCase()))

        // Sort by nearest if we have user location
        if (userPos) {
            const toRad = (v) => v * Math.PI / 180
            f = [...f].sort((a, b) => {
                if (!a.location || !b.location) return 0
                const R = 6371
                const dLatA = toRad(a.location.lat - userPos.lat), dLonA = toRad(a.location.lng - userPos.lng)
                const distA = R * 2 * Math.atan2(Math.sqrt(Math.sin(dLatA / 2) ** 2 + Math.cos(toRad(userPos.lat)) * Math.cos(toRad(a.location.lat)) * Math.sin(dLonA / 2) ** 2), Math.sqrt(1 - (Math.sin(dLatA / 2) ** 2 + Math.cos(toRad(userPos.lat)) * Math.cos(toRad(a.location.lat)) * Math.sin(dLonA / 2) ** 2)))
                const dLatB = toRad(b.location.lat - userPos.lat), dLonB = toRad(b.location.lng - userPos.lng)
                const distB = R * 2 * Math.atan2(Math.sqrt(Math.sin(dLatB / 2) ** 2 + Math.cos(toRad(userPos.lat)) * Math.cos(toRad(b.location.lat)) * Math.sin(dLonB / 2) ** 2), Math.sqrt(1 - (Math.sin(dLatB / 2) ** 2 + Math.cos(toRad(userPos.lat)) * Math.cos(toRad(b.location.lat)) * Math.sin(dLonB / 2) ** 2)))
                return distA - distB
            }).map(h => {
                if (!h.location) return h
                const R = 6371
                const dLat = toRad(h.location.lat - userPos.lat), dLon = toRad(h.location.lng - userPos.lng)
                const dist = R * 2 * Math.atan2(Math.sqrt(Math.sin(dLat / 2) ** 2 + Math.cos(toRad(userPos.lat)) * Math.cos(toRad(h.location.lat)) * Math.sin(dLon / 2) ** 2), Math.sqrt(1 - (Math.sin(dLat / 2) ** 2 + Math.cos(toRad(userPos.lat)) * Math.cos(toRad(h.location.lat)) * Math.sin(dLon / 2) ** 2)))
                return { ...h, distance: dist }
            })
        }
        setFiltered(f)
    }, [search, hospitals, userPos])

    useEffect(() => {
        if (!socket.connected) socket.connect()
        // Parallel fetch for beds and docs (only trigger once per hospital)
        hospitals.forEach(h => {
            if (!bedSummary[h.hospitalId]) {
                const now = new Date()
                api.get(`/beds/summary/${h.hospitalId}`).then(r => setBedSummary(prev => ({ ...prev, [h.hospitalId]: r.data }))).catch(() => { })
                api.get(`/doctors?hospitalId=${h.hospitalId}`).then(r => setDocSummary(prev => ({ ...prev, [h.hospitalId]: r.data }))).catch(() => { })
                api.get(`/bloodbank?hospitalId=${h.hospitalId}`).then(r => {
                    setBloodStock(prev => ({ ...prev, [h.hospitalId]: r.data }))
                    setFetchedAt(prev => ({ ...prev, [h.hospitalId]: now }))
                }).catch(() => { })
                api.get(`/announcements?hospitalId=${h.hospitalId}`).then(r => setAnnouncements(prev => ({ ...prev, [h.hospitalId]: r.data }))).catch(() => { })
            }
        })

        const handleDocUpdate = (d) => {
            setDocSummary(prev => {
                const list = prev[d.hospitalId] || []
                const newList = list.map(x => x.doctorId === d.doctorId ? { ...x, ...d } : x)
                return { ...prev, [d.hospitalId]: newList }
            })
        }
        socket.on('doctor:update', handleDocUpdate)

        return () => {
            socket.off('doctor:update', handleDocUpdate)
            socket.disconnect()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hospitals])

    const submitDonation = async (e) => {
        e.preventDefault()
        try {
            await api.post('/bloodbank/donors', donateForm)
            setDonateMsg('Donation request submitted successfully. The hospital will contact you shortly.')
            setTimeout(() => { setShowDonateForm(false); setDonateMsg('') }, 3000)
            setDonateForm({ name: '', bloodType: 'A+', contact: '', city: '', hospitalId: '' })
        } catch (err) {
            setDonateMsg('Failed to submit request. Please try again.')
        }
    }

    const openDetail = async (h) => {
        setSelected(h)
        setDonateForm({ ...donateForm, hospitalId: h.hospitalId, city: h.address?.city || '' })
    }

    const closeDetail = () => {
        setSelected(null)
    }

    const navigateToHospital = (loc, name) => {
        const dest = loc ? `${loc.lat},${loc.lng}` : encodeURIComponent(name)
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank')
    }

    const nearest = (userPos && filtered.length > 0) ? filtered[0] : null

    const mapCenter = userPos ? [userPos.lat, userPos.lng] : [21.2514, 81.6296]

    return (
        <div className="home-page-classic">
            {/* Navbar */}
            <nav className="navbar classic-navbar" style={{ position: 'fixed', width: '100%' }}>
                <div className="container classic-nav-container">
                    <div className="classic-logo-wrapper" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => navigate('/')}>
                        <img src="/logo.png" alt="RapidCare" style={{ height: 36, width: 'auto', objectFit: 'contain' }} />
                        <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>RapidCare</span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text2)', cursor: 'pointer', letterSpacing: '0.5px' }} onClick={() => navigate('/')}>HOME</span>
                        <button className="btn btn-primary btn-sm rounded-pill px-4" onClick={() => document.getElementById('section-hospitals')?.scrollIntoView({ behavior: 'smooth' })}>
                            Find Care
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', padding: '7rem 1rem 8rem 1rem', color: 'white', textAlign: 'center', marginBottom: '-4rem' }}>
                <div className="container">
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem', letterSpacing: '-0.5px' }}>Instant Medical Precision</h1>
                    <p style={{ fontSize: '1.15rem', opacity: 0.9, marginBottom: '3rem', maxWidth: '600px', margin: '0 auto 3rem' }}>Find the nearest life-saving facility with real-time bed verification.</p>

                    <div style={{ maxWidth: 700, margin: '0 auto', position: 'relative', zIndex: 10 }}>
                        <div style={{ background: 'white', padding: 8, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                            <Search size={20} color="var(--text3)" style={{ marginLeft: 12 }} />
                            <input
                                style={{ border: 'none', padding: '12px 8px', flex: 1, borderRadius: 8, fontSize: '1rem', outline: 'none', color: 'var(--text)' }}
                                placeholder="Search by hospital, city or medical service..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                            <button
                                className="btn btn-primary"
                                style={{ padding: '10px 24px', borderRadius: 8, fontWeight: 600, border: 'none' }}
                                onClick={() => document.getElementById('section-hospitals')?.scrollIntoView({ behavior: 'smooth' })}
                            >
                                Find Hospital
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container" style={{ position: 'relative', zIndex: 20 }}>

                {/* Nearest Hospital Banner */}
                {nearest && userPos && (
                    <div style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(12px)', border: '1px solid var(--primary-light)', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem', boxShadow: 'var(--shadow-md)' }}>
                        <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', width: 56, height: 56, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Building2 size={28} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.5px' }}>Closest Emergency Center</div>
                            <h3 style={{ margin: 0, fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>{nearest.name}</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span className="badge badge-blue">{nearest.distance?.toFixed(1)} km</span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text2)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <MapPin size={12} /> {nearest.address?.city}
                                </span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            <button className="btn btn-outline btn-sm" onClick={() => openDetail(nearest)}>View Details</button>
                            <button className="btn btn-primary btn-sm" onClick={() => navigateToHospital(nearest.location, nearest.name)}>
                                <Navigation size={14} /> Navigate
                            </button>
                        </div>
                    </div>
                )}

                {/* Location Request */}
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

                {/* Map Section */}
                <div className="map-wrap map-wrap-lg" style={{ marginBottom: '3rem', zIndex: 10 }}>
                    <MapContainer center={mapCenter} zoom={12} style={{ height: '100%', width: '100%' }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        {filtered.filter(h => h.location?.lat).map(h => (
                            <Marker key={h.hospitalId} position={[h.location.lat, h.location.lng]}>
                                <Popup>
                                    <strong>{h.name}</strong><br />
                                    <small>{h.address?.city}</small><br />
                                    <button onClick={() => openDetail(h)} className="btn btn-primary btn-sm btn-full mt-2">View Details</button>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                </div>

                {/* Hospitals Grid */}
                <div id="section-hospitals" style={{ marginBottom: '4rem' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h2 style={{ margin: 0, fontWeight: 700, color: 'var(--text)' }}>Verified Medical Facilities</h2>
                        <p className="text-muted" style={{ fontSize: '0.95rem' }}>Real-time status of trusted healthcare providers</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                        {loading ? <div className="loader-center w-full"><div className="spinner"></div></div> : filtered.map(h => {

                            const b = bedSummary[h.hospitalId]
                            const totalBeds = b ? Object.values(b).reduce((acc, curr) => acc + curr.total, 0) : 0
                            const vacantBeds = b ? Object.values(b).reduce((acc, curr) => acc + curr.vacant, 0) : 0

                            const d = docSummary[h.hospitalId] || []
                            const docs = d.filter(doc => doc.availability === 'Available').slice(0, 2)
                            const blood = bloodStock[h.hospitalId] || []
                            const availableBlood = blood.filter(bk => bk.units > 0)

                            const ft = fetchedAt[h.hospitalId]
                            const updatedAgo = ft ? (() => {
                                const m = Math.floor((Date.now() - new Date(ft)) / 60000)
                                if (m < 1) return 'just now'
                                if (m < 60) return `${m}m ago`
                                return `${Math.floor(m / 60)}h ago`
                            })() : null

                            return (
                                <div key={h.hospitalId} className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                    <div style={{ padding: '1.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                            <div style={{ flex: 1 }}>
                                                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--text)' }}>{h.name}</h3>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text2)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <MapPin size={12} /> {h.address?.city} {h.distance && <span className="badge badge-blue" style={{ marginLeft: 6 }}>{h.distance.toFixed(1)} km</span>}
                                                </div>
                                            </div>
                                            <div style={{ width: 40, height: 40, background: 'var(--primary-light)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
                                                <Building2 size={20} />
                                            </div>
                                        </div>

                                        <div className={`alert ${vacantBeds > 0 ? 'alert-success' : (b ? 'alert-error' : 'alert-warning')}`} style={{ justifyContent: 'center', padding: '8px 12px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.5px' }}>
                                            {vacantBeds > 0 ? `${vacantBeds} / ${totalBeds} Beds Available` : (b ? `All Beds Occupied (${totalBeds})` : 'Syncing Beds...')}
                                        </div>

                                        <div style={{ marginBottom: '1.25rem' }}>
                                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text3)', marginBottom: '0.5rem', letterSpacing: '0.5px' }}>Core Expertise</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                {((h.treatment?.length ? h.treatment : h.services?.length ? h.services : null) || ['General Care']).slice(0, 3).map(s => (
                                                    <span key={s} className="badge badge-gray">{s}</span>
                                                ))}
                                            </div>
                                        </div>

                                        <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                                            {/* Blood stock mini */}
                                            {availableBlood.length > 0 && (
                                                <div style={{ marginBottom: 12 }}>
                                                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <Droplet size={12} /> Blood Available
                                                    </div>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                        {availableBlood.slice(0, 6).map(bk => (
                                                            <span key={bk.bloodType} className="badge badge-red">
                                                                {bk.bloodType}: {bk.units}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {/* Doctors */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <Stethoscope size={12} /> Medical Staff
                                                </div>
                                                {updatedAgo && <span style={{ fontSize: '0.65rem', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={10} /> {updatedAgo}</span>}
                                            </div>
                                            {d.length > 0 ? docs.length > 0 ? docs.map(doc => (
                                                <div key={doc._id} style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text)' }}>
                                                    <span>{doc.name} <span style={{ fontWeight: 400, color: 'var(--text2)', fontSize: '0.75rem', marginLeft: 4 }}>{doc.specialty || doc.specialization || ''}</span></span>
                                                    <span className={`badge ${doc.availability === 'Available' ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '0.65rem' }}>
                                                        {doc.availability || 'Absent'}
                                                    </span>
                                                </div>
                                            )) : <small style={{ color: 'var(--text3)' }}>No available doctors</small> : <small style={{ color: 'var(--text3)' }}>Syncing staff data...</small>}
                                        </div>
                                    </div>

                                    <div style={{ padding: '0 1.5rem 1.5rem 1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: 'auto' }}>
                                        <button className="btn btn-primary" onClick={() => navigateToHospital(h.location, h.name)}><Navigation size={14} /> Route</button>
                                        <button className="btn btn-outline" onClick={() => openDetail(h)}><Info size={14} /> Details</button>
                                        <button className="btn btn-dark" style={{ gridColumn: 'span 2' }} onClick={() => window.location.href = `tel:${h.contact}`}><Phone size={14} /> Call Facility</button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Hospital Detail Modal */}
            {selected && (
                <div className="modal-overlay" onClick={closeDetail}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                            <h3 className="modal-title" style={{ fontSize: '1.25rem' }}>{selected.name}</h3>
                            <button className="btn btn-icon btn-ghost" onClick={closeDetail}><X size={20} /></button>
                        </div>

                        <div style={{ background: 'var(--surface2)', padding: '1rem', borderRadius: '10px', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                            <div>
                                <strong style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text)', marginBottom: 4 }}><MapPin size={14} /> Full Address</strong>
                                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text2)' }}>{selected.address?.street}, {selected.address?.city}, {selected.address?.state}</p>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn-primary btn-sm" onClick={() => navigateToHospital(selected.location, selected.name)}><Navigation size={14} /> Directions</button>
                                <button className="btn btn-danger btn-sm" onClick={() => setShowDonateForm(true)}><Heart size={14} /> Donate Blood</button>
                            </div>
                        </div>

                        <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
                            <div>
                                <strong style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text)', marginBottom: 4 }}><Phone size={14} /> Contact Information</strong>
                                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text2)' }}>{selected.contact}</p>
                            </div>
                            <div>
                                <strong style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text)', marginBottom: 4 }}><ShieldCheck size={14} /> Insurance Accepted</strong>
                                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text2)' }}>{(selected.insurance || []).join(', ') || 'Not specified'}</p>
                            </div>
                        </div>

                        {selected.services && selected.services.length > 0 && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <strong style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text)', marginBottom: 8 }}><Activity size={14} /> Medical Services</strong>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {selected.services.map(s => <span key={s} className="badge badge-blue">{s}</span>)}
                                </div>
                            </div>
                        )}

                        {selected.facilities && selected.facilities.length > 0 && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <strong style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text)', marginBottom: 8 }}><Building2 size={14} /> Hospital Facilities</strong>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {selected.facilities.map(s => <span key={s} className="badge badge-gray">{s}</span>)}
                                </div>
                            </div>
                        )}

                        {announcements[selected.hospitalId] && announcements[selected.hospitalId].length > 0 && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <strong style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text)', marginBottom: 8 }}><Megaphone size={14} /> Important Announcements</strong>
                                {announcements[selected.hospitalId].map(a => (
                                    <div key={a._id} className={`alert ${a.priority === 'Urgent' ? 'alert-error' : a.priority === 'High' ? 'alert-warning' : 'alert-info'}`} style={{ flexDirection: 'column', padding: '12px', borderLeftWidth: '4px', borderLeftStyle: 'solid' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 4 }}>
                                            <strong style={{ fontSize: '0.9rem' }}>{a.title}</strong>
                                            <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{new Date(a.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>{a.content}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {bedSummary[selected.hospitalId] && (
                            <div style={{ background: 'var(--surface2)', padding: '1.25rem', borderRadius: '10px', marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                    <strong style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)' }}><Bed size={16} /> Bed Statistics</strong>
                                    {fetchedAt[selected.hospitalId] && <span style={{ fontSize: '0.75rem', color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> Updated: {new Date(fetchedAt[selected.hospitalId]).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 16 }}>
                                    {Object.entries(bedSummary[selected.hospitalId]).map(([type, stats]) => (
                                        <div key={type}>
                                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: stats.vacant > 0 ? 'var(--success)' : 'var(--danger)' }}>{stats.vacant} <span style={{ fontSize: '0.9rem', color: 'var(--text3)' }}>/ {stats.total}</span></div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text2)', fontWeight: 500, marginTop: 2 }}>{type}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {bloodStock[selected.hospitalId] && bloodStock[selected.hospitalId].length > 0 && (
                            <div style={{ background: 'var(--surface2)', padding: '1.25rem', borderRadius: '10px', marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                    <strong style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)' }}><Droplet size={16} color="var(--danger)" /> Blood Bank Inventory</strong>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {bloodStock[selected.hospitalId].filter(b => b.units > 0).map(b => (
                                        <div key={b._id} className="badge badge-red" style={{ padding: '6px 12px', fontSize: '0.9rem' }}>
                                            {b.bloodType}: {b.units} <span style={{ opacity: 0.8, marginLeft: 2, fontSize: '0.75rem' }}>u</span>
                                        </div>
                                    ))}
                                    {bloodStock[selected.hospitalId].filter(b => b.units > 0).length === 0 && (
                                        <span style={{ fontSize: '0.9rem', color: 'var(--text3)' }}>No active blood stock available.</span>
                                    )}
                                </div>
                            </div>
                        )}

                        {docSummary[selected.hospitalId] && docSummary[selected.hospitalId].length > 0 && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <strong style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)', marginBottom: 12 }}><Stethoscope size={16} /> Medical Staff Directory</strong>
                                <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                                    {docSummary[selected.hospitalId].map((d, i) => (
                                        <div key={d._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < docSummary[selected.hospitalId].length - 1 ? '1px solid var(--border)' : 'none', background: 'var(--surface)' }}>
                                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Stethoscope size={20} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, fontSize: '0.95rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text)' }}>
                                                    {d.name}
                                                    <span className={`badge ${d.availability === 'Available' ? 'badge-green' : d.availability === 'Unavailable' ? 'badge-red' : 'badge-yellow'}`}>
                                                        {d.availability === 'Available' ? 'Available' : d.availability === 'Unavailable' ? 'Absent' : 'On Leave'}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                                    <span style={{ color: 'var(--text2)', fontSize: '0.85rem' }}>{d.specialization || d.speciality || 'General Medicine'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selected.gallery && selected.gallery.length > 0 && (
                            <div>
                                <strong style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)', marginBottom: 12 }}><ImageIcon size={16} /> Facility Gallery</strong>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                                    {selected.gallery.map((url, i) => (
                                        <img key={i} src={url} alt={`${selected.name} photo`}
                                            style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: '10px', border: '1px solid var(--border)' }}
                                            onError={e => { e.target.style.display = 'none' }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Donate Blood Modal */}
            {showDonateForm && (
                <div className="modal-overlay" onClick={() => setShowDonateForm(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title" style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Heart size={20} fill="currentColor" /> Donor Registration
                            </h3>
                            <button className="btn btn-icon btn-ghost" onClick={() => setShowDonateForm(false)}><X size={20} /></button>
                        </div>
                        <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>Your contribution is vital for our emergency response units.</p>

                        {donateMsg && (
                            <div className={`alert ${donateMsg.includes('success') ? 'alert-success' : 'alert-error'}`}>
                                {donateMsg}
                            </div>
                        )}

                        <form onSubmit={submitDonation}>
                            <div className="form-group">
                                <label className="form-label">Facility *</label>
                                <select className="form-select" required value={donateForm.hospitalId} onChange={e => setDonateForm({ ...donateForm, hospitalId: e.target.value })}>
                                    <option value="" disabled>Select destination hospital</option>
                                    {hospitals.map(h => <option key={h.hospitalId} value={h.hospitalId}>{h.name} ({h.address?.city})</option>)}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Full Name *</label>
                                <input className="form-input" required type="text" value={donateForm.name} onChange={e => setDonateForm({ ...donateForm, name: e.target.value })} />
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
                                    <input className="form-input" required type="tel" pattern="[6-9][0-9]{9}" title="Enter a valid 10-digit Indian mobile number" value={donateForm.contact} onChange={e => setDonateForm({ ...donateForm, contact: e.target.value })} placeholder="e.g. 9876543210" />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">City *</label>
                                <input className="form-input" required type="text" value={donateForm.city} onChange={e => setDonateForm({ ...donateForm, city: e.target.value })} />
                            </div>

                            <button type="submit" className="btn btn-danger btn-full mt-4">
                                Submit Registration
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
