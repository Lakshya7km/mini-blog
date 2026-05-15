import { useEffect, useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'

export default function QRScanner({ onScan }) {
  const ref = useRef()
  const onScanRef = useRef(onScan)
  const [error, setError] = useState('')
  const [started, setStarted] = useState(false)

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  useEffect(() => {
    if (!ref.current) return undefined

    const id = `qr-scanner-${Date.now()}`
    ref.current.id = id
    let scanner = null
    let mounted = true

    const timer = setTimeout(() => {
      if (!mounted) return
      scanner = new Html5Qrcode(id)
      scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (data) => {
          if (!mounted) return
          mounted = false
          scanner.stop().catch(() => {})
          onScanRef.current(data)
        },
        () => {},
      )
        .then(() => {
          if (mounted) setStarted(true)
        })
        .catch(() => {
          if (mounted) setError('Camera unavailable. Allow camera access and try again.')
        })
    }, 100)

    return () => {
      mounted = false
      clearTimeout(timer)
      if (scanner) {
        try {
          scanner.stop().catch(() => {})
        } catch {
          // ignore cleanup failures from partially initialized scanners
        }
      }
    }
  }, [])

  if (error) {
    return (
      <div className="alert alert-error" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <Camera size={28} />
        <strong>Camera unavailable</strong>
        <p style={{ margin: 0, color: 'inherit' }}>{error}</p>
      </div>
    )
  }

  return (
    <div>
      {!started ? (
        <div style={{ textAlign: 'center', padding: 16, color: 'var(--text2)', fontSize: 12 }}>
          <div className="spinner" style={{ margin: '0 auto 8px' }} />
          Starting camera...
        </div>
      ) : null}
      <div ref={ref} style={{ width: '100%', borderRadius: 12, overflow: 'hidden' }} />
    </div>
  )
}
