import { useState, useEffect } from 'react'
import api from '../../../lib/api'
import { RefreshCw, Database } from 'lucide-react'

const COLLECTIONS = [
    { key: 'doctors', label: 'Doctors', fields: ['doctorId', 'name', 'speciality', 'availability'] },
    { key: 'nurses', label: 'Nurses', fields: ['nurseId', 'name', 'mobile'] },
    { key: 'ambulances', label: 'Ambulances', fields: ['ambulanceId', 'vehicleNumber', 'status'] },
]

export default function DatabaseView({ hospitalId }) {
    const [selected, setSelected] = useState('doctors')
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(false)

    const load = async () => {
        setLoading(true)
        const col = COLLECTIONS.find(c => c.key === selected)
        const endpoint = `/${selected}?hospitalId=${hospitalId}`
        api.get(endpoint).then(r => setData(r.data)).finally(() => setLoading(false))
    }

    useEffect(() => { load() }, [selected, hospitalId])

    const col = COLLECTIONS.find(c => c.key === selected)

    return (
        <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                {COLLECTIONS.map(c => (
                    <button key={c.key} className={`btn btn-sm ${selected === c.key ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSelected(c.key)}>
                        {c.label}
                    </button>
                ))}
                <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} /></button>
            </div>

            {loading ? <div className="loader-center"><div className="spinner" /></div> : (
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>{col?.fields.map(f => <th key={f}>{f}</th>)}</tr>
                        </thead>
                        <tbody>
                            {data.map((row, i) => (
                                <tr key={i}>{col?.fields.map(f => <td key={f}>{typeof row[f] === 'object' ? JSON.stringify(row[f]) : row[f] ?? '-'}</td>)}</tr>
                            ))}
                        </tbody>
                    </table>
                    {data.length === 0 && <div className="empty"><Database size={32} /><p>No records</p></div>}
                </div>
            )}
        </div>
    )
}
