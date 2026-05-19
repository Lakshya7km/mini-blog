/**
 * RapidCare V3 — Endpoint Test Script
 * Run: node test_endpoints.js
 */

const BASE = 'http://localhost:5001/api';

let token = null;
let results = [];

async function req(method, path, body, auth = false, label = '') {
    const headers = { 'Content-Type': 'application/json' };
    if (auth && token) headers['Authorization'] = `Bearer ${token}`;
    try {
        const r = await fetch(`${BASE}${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });
        const text = await r.text();
        let data;
        try { data = JSON.parse(text); } catch { data = text; }
        const ok = r.status >= 200 && r.status < 300;
        results.push({ label: label || `${method} ${path}`, status: r.status, ok, data });
        return { ok, status: r.status, data };
    } catch (e) {
        results.push({ label: label || `${method} ${path}`, status: 'ERR', ok: false, data: e.message });
        return { ok: false, status: 'ERR', data: e.message };
    }
}

async function run() {
    console.log('\n========================================');
    console.log('   RapidCare V3 — API Endpoint Tests   ');
    console.log('========================================\n');

    // ─── AUTH ─────────────────────────────────────────────────────────────────
    console.log('── AUTH ──────────────────────────────────────────');

    // Login as superadmin
    const loginRes = await req('POST', '/auth/login',
        { username: 'admin@rapidcare', password: 'rapidcare123', role: 'superadmin' },
        false, 'POST /auth/login (superadmin)'
    );
    if (loginRes.ok && loginRes.data.token) {
        token = loginRes.data.token;
        console.log('  ✅ Logged in as superadmin. Token acquired.');
    } else {
        console.log('  ❌ Login failed:', loginRes.data);
    }

    // Bad login
    await req('POST', '/auth/login',
        { username: 'wrong@user', password: 'wrong', role: 'superadmin' },
        false, 'POST /auth/login (bad creds)'
    );

    // OTP request (no email set — expect graceful error)
    await req('POST', '/auth/request-otp',
        { username: 'admin@rapidcare', role: 'superadmin' },
        false, 'POST /auth/request-otp'
    );

    // ─── ADMIN ────────────────────────────────────────────────────────────────
    console.log('\n── ADMIN ─────────────────────────────────────────');
    await req('GET', '/admin/stats', null, true, 'GET /admin/stats');
    await req('GET', '/admin/master/hospitals', null, true, 'GET /admin/master/hospitals');
    await req('GET', '/admin/master/doctors', null, true, 'GET /admin/master/doctors');
    await req('GET', '/admin/master/pharmacies', null, true, 'GET /admin/master/pharmacies');
    await req('GET', '/admin/master/clinics', null, true, 'GET /admin/master/clinics');
    await req('POST', '/admin/register-hospital',
        { hospitalId: 'TEST_H1', password: 'test123', name: 'Test Hospital', address: 'Test Addr' },
        true, 'POST /admin/register-hospital'
    );
    await req('POST', '/admin/register-pharmacy',
        { pharmacyId: 'TEST_P1', password: 'test123', name: 'Test Pharmacy', address: 'Test Addr' },
        true, 'POST /admin/register-pharmacy'
    );
    await req('POST', '/admin/register-clinic',
        { clinicId: 'TEST_C1', password: 'test123', name: 'Test Clinic', address: 'Test Addr' },
        true, 'POST /admin/register-clinic'
    );

    // ─── HOSPITALS ────────────────────────────────────────────────────────────
    console.log('\n── HOSPITALS ─────────────────────────────────────');
    const hosRes = await req('GET', '/hospitals', null, false, 'GET /hospitals (public)');
    let hospitalId = null;
    if (hosRes.ok && Array.isArray(hosRes.data) && hosRes.data.length > 0) {
        hospitalId = hosRes.data[0].hospitalId;
        console.log(`  Found hospital: ${hosRes.data[0].name} (${hospitalId})`);
    }
    if (hospitalId) {
        await req('GET', `/hospitals/${hospitalId}`, null, false, `GET /hospitals/:id`);
    }
    await req('GET', '/hospitals?stats=1', null, true, 'GET /hospitals?stats=1 (auth)');

    // ─── DOCTORS ──────────────────────────────────────────────────────────────
    console.log('\n── DOCTORS ───────────────────────────────────────');
    await req('GET', '/doctors', null, false, 'GET /doctors (public)');
    if (hospitalId) {
        await req('GET', `/doctors?hospitalId=${hospitalId}`, null, true, 'GET /doctors?hospitalId (auth)');
        await req('GET', `/doctors?hospitalId=${hospitalId}&view=count`, null, true, 'GET /doctors?view=count');
    }

    // ─── NURSES ───────────────────────────────────────────────────────────────
    console.log('\n── NURSES ────────────────────────────────────────');
    await req('GET', '/nurses', null, true, 'GET /nurses (auth)');

    // ─── AMBULANCES ───────────────────────────────────────────────────────────
    console.log('\n── AMBULANCES ────────────────────────────────────');
    await req('GET', '/ambulances', null, true, 'GET /ambulances (auth)');
    if (hospitalId) {
        await req('GET', `/ambulances?hospitalId=${hospitalId}`, null, true, 'GET /ambulances?hospitalId (auth)');
    }

    // ─── BEDS ─────────────────────────────────────────────────────────────────
    console.log('\n── BEDS ──────────────────────────────────────────');
    await req('GET', '/beds', null, true, 'GET /beds (auth)');
    if (hospitalId) {
        await req('GET', `/beds/summary/${hospitalId}`, null, false, 'GET /beds/summary/:hospitalId (public)');
    }

    // ─── BLOOD BANK ───────────────────────────────────────────────────────────
    console.log('\n── BLOOD BANK ────────────────────────────────────');
    await req('GET', '/bloodbank', null, false, 'GET /bloodbank (public)');
    if (hospitalId) {
        await req('GET', `/bloodbank?hospitalId=${hospitalId}`, null, false, 'GET /bloodbank?hospitalId');
    }
    // Donor form
    await req('POST', '/bloodbank/donors',
        { name: 'Test Donor', bloodGroup: 'O+', contact: '9999999999' },
        false, 'POST /bloodbank/donors'
    );

    // ─── ANNOUNCEMENTS ────────────────────────────────────────────────────────
    console.log('\n── ANNOUNCEMENTS ─────────────────────────────────');
    await req('GET', '/announcements', null, false, 'GET /announcements (public)');
    if (hospitalId) {
        await req('GET', `/announcements?hospitalId=${hospitalId}`, null, false, 'GET /announcements?hospitalId');
    }

    // ─── PHARMACY ─────────────────────────────────────────────────────────────
    console.log('\n── PHARMACY ──────────────────────────────────────');
    const pharmRes = await req('GET', '/pharmacy', null, false, 'GET /pharmacy (public list)');
    let pharmacyId = null;
    if (pharmRes.ok && Array.isArray(pharmRes.data) && pharmRes.data.length > 0) {
        pharmacyId = pharmRes.data[0].pharmacyId;
        console.log(`  Found pharmacy: ${pharmRes.data[0].name}`);
    }
    await req('GET', '/pharmacy/search?q=para', null, false, 'GET /pharmacy/search?q=para');
    if (pharmacyId) {
        await req('GET', `/pharmacy/${pharmacyId}/medicines`, null, false, 'GET /pharmacy/:id/medicines (public)');
    }

    // ─── CLINIC ───────────────────────────────────────────────────────────────
    console.log('\n── CLINIC ────────────────────────────────────────');
    const clinicRes = await req('GET', '/clinic', null, false, 'GET /clinic (public list)');
    let clinicId = null;
    if (clinicRes.ok && Array.isArray(clinicRes.data) && clinicRes.data.length > 0) {
        clinicId = clinicRes.data[0].clinicId;
        console.log(`  Found clinic: ${clinicRes.data[0].name}`);
    }
    if (clinicId) {
        await req('GET', `/clinic/${clinicId}/services`, null, false, 'GET /clinic/:id/services');
        await req('GET', `/doctors?clinicId=${clinicId}`, null, false, 'GET /doctors?clinicId');
    }

    // ─── DIAGNOSTIC ───────────────────────────────────────────────────────────
    console.log('\n── DIAGNOSTIC ────────────────────────────────────');
    await req('GET', '/diagnostic', null, false, 'GET /diagnostic (public)');

    // ─── ATTENDANCE ───────────────────────────────────────────────────────────
    // Removed because attendance is unused in V3

    // ─── SECURITY TESTS ───────────────────────────────────────────────────────
    console.log('\n── SECURITY ──────────────────────────────────────');
    // Access admin without token
    await req('GET', '/admin/stats', null, false, 'GET /admin/stats (no token — should 401)');
    // Access admin with wrong role token (use same superadmin token — should still work)
    await req('DELETE', '/admin/master/hospitals/000000000000000000000000', null, true, 'DELETE /admin/master/hospitals/:id (no OTP — should 400)');

    // ─── PRINT REPORT ─────────────────────────────────────────────────────────
    console.log('\n\n========================================');
    console.log('             TEST RESULTS              ');
    console.log('========================================');
    
    let passed = 0, failed = 0, warned = 0;
    
    for (const r of results) {
        const icon = r.ok ? '✅' : r.status === 401 || r.status === 403 || r.status === 400 ? '🔒' : '❌';
        const statusLabel = r.ok ? 'PASS' : (r.status === 401 || r.status === 403) ? 'AUTH' : r.status === 400 ? 'VAL' : 'FAIL';
        
        if (r.ok) passed++;
        else if (r.status === 401 || r.status === 403 || r.status === 400) warned++;
        else failed++;

        // Truncate long data
        let preview = typeof r.data === 'object' ? JSON.stringify(r.data) : String(r.data);
        if (preview.length > 80) preview = preview.slice(0, 80) + '…';
        
        console.log(`${icon} [${String(r.status).padStart(3)}] ${statusLabel.padEnd(4)} — ${r.label}`);
        if (!r.ok) console.log(`          ↳ ${preview}`);
    }

    console.log('\n──────────────────────────────────────');
    console.log(`Total: ${results.length} | ✅ Pass: ${passed} | 🔒 Auth/Val: ${warned} | ❌ Fail: ${failed}`);
    console.log('========================================\n');
    
    process.exit(0);
}

run().catch(console.error);
