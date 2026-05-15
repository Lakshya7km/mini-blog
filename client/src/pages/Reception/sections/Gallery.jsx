import { useState, useEffect } from 'react'
import api from '../../../lib/api'
import { Upload, Trash2, Image as ImageIcon } from 'lucide-react'

export default function Gallery({ hospitalId }) {
    const [images, setImages] = useState([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [msg, setMsg] = useState('')

    const load = () => api.get(`/hospitals/${hospitalId}`).then(r => setImages(r.data.gallery || [])).finally(() => setLoading(false))
    useEffect(() => { load() }, [hospitalId])

    const upload = async (e) => {
        const files = Array.from(e.target.files).slice(0, 10 - images.length)
        if (!files.length) return
        setUploading(true)
        const fd = new FormData(); files.forEach(f => fd.append('images', f))
        await api.post(`/hospitals/${hospitalId}/gallery`, fd)
        await load(); setMsg('Uploaded!'); setUploading(false)
    }

    const remove = async (url) => {
        await api.delete(`/hospitals/${hospitalId}/gallery`, { data: { url } })
        setImages(imgs => imgs.filter(i => i !== url))
    }

    if (loading) return <div className="loader-center"><div className="spinner" /></div>

    return (
        <div>
            {msg && <div className="alert alert-success">{msg}</div>}
            {images.length < 10 && (
                <label className="btn btn-outline btn-full" style={{ marginBottom: 16, cursor: 'pointer' }}>
                    <Upload size={16} /> {uploading ? 'Uploading…' : 'Upload Photos'} ({images.length}/10)
                    <input type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={upload} />
                </label>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {images.map(url => (
                    <div key={url} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', aspectRatio: '4/3', background: '#f1f5f9' }}>
                        <img src={url} alt="gallery" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button onClick={() => remove(url)} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,.6)', border: 'none', borderRadius: 6, padding: 5, cursor: 'pointer', color: 'white', display: 'flex' }}>
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
                {images.length === 0 && <div className="empty"><ImageIcon size={40} /><p>No photos uploaded</p></div>}
            </div>
        </div>
    )
}
