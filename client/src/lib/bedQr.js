export function parseBedIdFromQR(rawValue = '') {
    const value = String(rawValue || '').trim()
    if (!value) return ''

    // If scanner returns a direct bed ID, pass it through.
    if (!value.includes('/')) return decodeURIComponent(value)

    // If a full URL is encoded in QR, extract /bed/:bedId safely.
    try {
        const url = new URL(value)
        const parts = url.pathname.split('/').filter(Boolean)
        const bedIndex = parts.findIndex(part => part === 'bed')
        if (bedIndex >= 0 && parts[bedIndex + 1]) {
            return decodeURIComponent(parts[bedIndex + 1])
        }
    } catch {
        // Not a valid URL, continue with regex fallback below.
    }

    // Fallback for partial paths like /bed/AIIMS-1-B2 or noisy suffixes.
    const match = value.match(/\/bed\/([^/?#]+)/)
    if (match?.[1]) return decodeURIComponent(match[1])

    return decodeURIComponent(value)
}

function normalizeBaseUrl(url) {
    return String(url || '').trim().replace(/\/$/, '')
}

function isLocalOrigin(origin) {
    try {
        const host = new URL(origin).hostname
        return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0'
    } catch {
        return false
    }
}

export function getBedQrBaseUrl() {
    const configured = normalizeBaseUrl(import.meta.env.VITE_PUBLIC_APP_URL)
    if (configured) return configured

    const runtimeOrigin = normalizeBaseUrl(window.location.origin)
    if (!isLocalOrigin(runtimeOrigin)) return runtimeOrigin

    // Localhost should not leak into printed QR labels; force explicit config in local/dev.
    throw new Error('Set VITE_PUBLIC_APP_URL before generating QR labels from localhost/dev environments.')
}

export function buildBedQrUrl(bedId) {
    return `${getBedQrBaseUrl()}/bed/${encodeURIComponent(bedId)}`
}
