# RapidCareV3 — Master AI Coding Prompt
# Version: 3.1 (Mass Update from V2)

---

## HOW TO USE THIS PROMPT

Paste this entire document into OpenCode or Claude Code and say:

> "I want to build RapidCareV3 from scratch using this spec. This is a mass update from an older version (RapidCareV2). Start with Phase 1. Explain every file you create, every important line, and what I should understand before moving to the next phase. Do not write the next phase until I confirm the current one is working and tested."

After each phase:
> "Phase X is done and tested. Move to Phase X+1."

When stuck:
> "Before writing code — explain how [concept] works with a small self-contained example. Then I will write it myself."

---

## SECTION 0 — WHAT THIS IS

RapidCareV3 is a hospital ecosystem management backend.

**Primary public goal:** Show real-time availability — beds, doctors, medicines, clinic services — to any user without login, for any registered facility in the city.

**Internal goal:** Give each facility type (hospital, pharmacy, clinic) their own management portal to keep their data live and accurate.

**This is a mass update from RapidCareV2.** The old codebase had:
- Emergency management → removed entirely
- QR attendance + geofence → removed entirely  
- Duplicate blood bank endpoints → collapsed to one
- Client-side socket mutations → security bug, removed
- EMT as sub-role → merged into single ambulance role
- SuperAdmin with write access → now read-only
- No email OTP on password change → now required
- No pharmacy role → now added
- No clinic role → now added
- No outpatient/specialized clinic portal → now added

Build V3 clean from scratch. Do not port V2 code. Reference this spec only.

---

## SECTION 1 — TECH STACK

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT (jsonwebtoken) |
| Password | bcrypt |
| File Upload | Multer |
| Real-time | Socket.io |
| Email / OTP | Nodemailer + crypto (6-digit OTP, 10 min expiry, bcrypt-hashed in DB) |
| Frontend | EJS templates (later AI-styled) |
| Config | dotenv |

---

## SECTION 2 — ROLES (7 Roles, Final)

| Role | Login Field | JWT Payload | Portal |
|---|---|---|---|
| `superadmin` | `username` | `{ role, id, ref: username }` | Read-only on all data. Register facilities. OTP-gated deletes only. Cannot change other users' passwords. |
| `hospital` | `hospitalId` | `{ role, id, ref: hospitalId, hospitalId }` | Full hospital management. Doctors, nurses, ambulances, beds, blood bank, announcements. |
| `doctor` | `doctorId` | `{ role, id, ref: doctorId, hospitalId }` | Own profile only. No attendance system. |
| `nurse` | `nurseId` | `{ role, id, ref: nurseId, hospitalId }` | Bed status updates for own hospital only. |
| `ambulance` | `ambulanceId` | `{ role, id, ref: ambulanceId, hospitalId }` | Own info + GPS only. No emergency linkage. |
| `pharmacy` | `pharmacyId` | `{ role, id, ref: pharmacyId }` | Own medicine inventory only. Marks in-stock / out-of-stock. Hospital cannot touch pharmacy data. |
| `clinic` | `clinicId` | `{ role, id, ref: clinicId }` | Own profile, doctors, services. Completely separate from hospital. |

---

## SECTION 3 — FEATURES KEPT / REMOVED / ADDED

### ✅ KEPT FROM V2
- Hospital public profile with real-time bed + doctor availability
- Doctor CRUD (hospital-only creation)
- Nurse CRUD
- Ambulance CRUD + standalone GPS tracking
- Bed management (bulk create, status update, public summary)
- Blood bank — single upsert endpoint + donor registration
- Announcements (hospital creates, public views)
- Socket.io server-emits for bed updates, ambulance GPS, announcements
- Gallery upload/delete for hospital
- Hospital dashboard stats
- SuperAdmin master read + OTP-gated delete

### ❌ REMOVED FROM V2
| Feature | Reason |
|---|---|
| Emergency form submission + all emergency routes | Out of scope |
| Emergency status update, patient admit, hospital transfer | Removed with emergency |
| Assign ambulance to emergency | Removed with emergency |
| QR attendance scan (HTML endpoint in REST API) | Non-REST, wrong pattern |
| Geofence GPS check-in/out for doctors | Complex, removed |
| Doctor attendance override | Nothing left to override — attendance fully removed |
| Doctor attendance records/history | Attendance system fully removed |
| `POST /api/admin/login` (separate superadmin login) | Redundant |
| `POST /api/bloodbank` old duplicate create | Duplicate of upsert |
| `PUT /api/bloodbank/:id` by mongo id | Redundant |
| `GET /api/nurses/beds` separate route | Nurse uses `GET /api/beds?hospitalId=X` |
| `GET /api/beds/public/:bedId` QR bed lookup | No QR system exists |
| `socket.on('bed:update')` from client | Security bug |
| `ambulanceNumber` dead field | Unused |
| EMT sub-role, `emtId` login | Merged into ambulance |
| SuperAdmin write access on any route | Now read-only everywhere |
| SuperAdmin changing other users' passwords | Blocked |
| Doctor listing other doctors | Too permissive |
| Doctor listing nurses | Too permissive |

### 🆕 ADDED IN V3
| Feature | Details |
|---|---|
| `pharmacy` role | Standalone login. Own medicine inventory. Marks in-stock/out-of-stock per medicine. Searchable by medicine name or number. Public can view. |
| `clinic` role | Standalone login. Separate portal. Own doctors + service listing. Not connected to hospital. |
| Outpatient clinic portal | Clinics have their own profile, doctor list, services offered — all publicly viewable |
| Specialized clinic support | Clinic type field: `General | Specialized | Dental | Eye | Physiotherapy | ...` |
| Email OTP password change | All roles change password via OTP sent to registered email — no current password required |
| SuperAdmin registers all facility types | Hospital, pharmacy, clinic — all registered by superadmin |

---

## SECTION 4 — FOLDER STRUCTURE

```
rapidcarev3/
├── server.js
├── .env                          # PORT, MONGO_URI, JWT_SECRET, EMAIL_USER, EMAIL_PASS
├── config/
│   └── db.js
├── middleware/
│   └── auth.js                   # JWT verify + role guard + superadmin-write-block
├── utils/
│   ├── mailer.js                 # Nodemailer SMTP setup
│   └── otp.js                    # generate, hash (bcrypt), verify OTP
├── models/
│   ├── Hospital.js
│   ├── Doctor.js                 # hospitalId OR clinicId — works for both
│   ├── Nurse.js
│   ├── Ambulance.js
│   ├── Bed.js
│   ├── BloodBank.js
│   ├── Donor.js
│   ├── Announcement.js
│   ├── Pharmacy.js               # NEW
│   ├── Medicine.js               # NEW — per pharmacy, name + stock status
│   ├── Clinic.js                 # NEW
│   ├── ClinicService.js          # NEW — services offered by a clinic
│   └── OtpToken.js
├── routes/
│   ├── auth.js                   # login all roles + OTP password change
│   ├── admin.js                  # superadmin only
│   ├── hospital.js
│   ├── doctors.js
│   ├── nurses.js
│   ├── ambulances.js
│   ├── beds.js
│   ├── bloodbank.js
│   ├── announcements.js
│   ├── pharmacy.js               # NEW
│   └── clinic.js                 # NEW
├── uploads/
│   ├── gallery/
│   ├── doctors/
│   └── clinic/
└── views/                        # EJS templates
    ├── hospital.ejs
    ├── pharmacy.ejs
    └── clinic.ejs
```

---

## SECTION 5 — OTP SYSTEM (ALL ROLES)

### Password Change Flow
```
Step 1:  POST /api/auth/request-otp
         Body: { role, username }
         → Find user by role + username
         → Get their registered email from DB
         → Generate 6-digit OTP via crypto.randomInt(100000, 999999)
         → bcrypt.hash(otp) → save to OtpToken { email, otpHash, expiresAt: now+10min, purpose: 'password-change' }
         → Send OTP to email via Nodemailer
         → Return: { message: "OTP sent to registered email" }

Step 2:  POST /api/auth/change-password
         Body: { role, username, otp, newPassword }
         → Find OtpToken by email + purpose='password-change'
         → bcrypt.compare(otp, otpHash) → must match
         → Check expiresAt > Date.now()
         → bcrypt.hash(newPassword) → update user password
         → Set forcePasswordChange = false
         → Delete OtpToken
         → Return: { message: "Password updated successfully" }
```

### SuperAdmin Master Delete Flow (2-factor)
```
Step 1:  POST /api/admin/request-delete-otp
         Auth: superadmin JWT
         Body: { col, id }
         → Send OTP to superadmin's registered email
         → Save OtpToken { purpose: 'master-delete' }

Step 2:  DELETE /api/admin/master/:col/:id
         Auth: superadmin JWT
         Body: { otp, confirmation }   ← confirmation must exactly equal "DELETE"
         → Verify OTP valid + not expired
         → Verify confirmation === "DELETE"
         → Delete document
         → Return: { message: "Deleted" }
```

### OtpToken Model
```js
{
  email:     String,   // recipient
  otpHash:   String,   // bcrypt hash of the 6-digit OTP
  purpose:   String,   // 'password-change' | 'master-delete'
  expiresAt: Date,     // Date.now() + 10 minutes
  createdAt: Date
}
```

---

## SECTION 6 — COMPLETE API REFERENCE

---

### `/api/auth` — Authentication
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Login for ALL 7 roles. Body: `{ role, username, password }`. Ambulance login sets status = 'On Duty'. Returns JWT + user object (no password). |
| POST | `/api/auth/request-otp` | Public | Send OTP to registered email. Body: `{ role, username }`. Finds user, generates OTP, stores hashed, emails it. |
| POST | `/api/auth/change-password` | Public | Change password via OTP. Body: `{ role, username, otp, newPassword }`. Verifies OTP, updates bcrypt hash. |

---

### `/api/admin` — SuperAdmin Only
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/admin/stats` | superadmin | System-wide counts: hospitals, pharmacies, clinics, doctors, nurses, ambulances |
| POST | `/api/admin/register-hospital` | superadmin | Create new hospital. Default password if omitted. Check hospitalId unique. |
| POST | `/api/admin/register-pharmacy` | superadmin | Create new pharmacy. Assign pharmacyId. |
| POST | `/api/admin/register-clinic` | superadmin | Create new clinic. Assign clinicId. Set clinicType. |
| GET | `/api/admin/master/:col` | superadmin | Read-only list. Collections: hospitals, pharmacies, clinics, doctors, nurses, ambulances. Max 200. No passwords. |
| POST | `/api/admin/request-delete-otp` | superadmin | Step 1 of delete. Body: `{ col, id }`. Sends OTP to superadmin email. |
| DELETE | `/api/admin/master/:col/:id` | superadmin | Step 2. Body: `{ otp, confirmation: "DELETE" }`. Verifies both before deleting. |

> SuperAdmin CANNOT: update any document, create doctors/nurses/ambulances, change any user's password, touch pharmacy inventory or clinic services.

---

### `/api/hospitals` — Hospital Management
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/hospitals` | Public | List all hospitals. Returns name, location, services — no password. |
| GET | `/api/hospitals/:id` | Public | Full profile + live bed summary + available doctor count + blood bank snapshot. |
| PUT | `/api/hospitals/:id` | hospital (own) | Update hospital profile. SuperAdmin blocked. JWT `ref` must match hospitalId param. |
| GET | `/api/hospitals/:id/stats` | hospital | Internal dashboard: bed counts by type, doctor count, ambulance count, nurse count. |
| POST | `/api/hospitals/:id/gallery` | hospital | Upload up to 10 images. Multer multipart. Appends URLs to gallery array. |
| DELETE | `/api/hospitals/:id/gallery` | hospital | Delete one gallery image. Body: `{ imageUrl }`. Removes from array. |

---

### `/api/doctors` — Doctor Management
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/doctors` | Public | List doctors. Query: `?hospitalId=` or `?clinicId=`. Returns name, specialization, availability only. |
| GET | `/api/doctors` | hospital, clinic, superadmin | Same route with auth — supports `?view=count` or `?view=full` mode. |
| GET | `/api/doctors/:doctorId` | Public | Single doctor profile. |
| POST | `/api/doctors` | hospital, clinic | Create doctor. Body must include either `hospitalId` or `clinicId`. SuperAdmin CANNOT create. |
| PUT | `/api/doctors/:doctorId` | doctor (own), hospital, clinic | Update. SuperAdmin blocked. Ownership enforced for doctor role. |
| POST | `/api/doctors/:doctorId/photo` | doctor (own), hospital, clinic | Upload photo via Multer. |

> Doctor model has both `hospitalId` and `clinicId` fields — one will be set, one null, depending on where the doctor works.

**Doctor availability query modes (hospital/clinic/superadmin only):**
```
?hospitalId=HOSP01&view=count  →  { available: 4, unavailable: 2, total: 6, byType: { General: 2, Surgeon: 1 } }
?hospitalId=HOSP01&view=full   →  Full doctor objects with name, specialization, availability, contact
```

> ❌ No attendance routes. No geofence. No override. Doctor attendance fully removed.

---

### `/api/nurses` — Nurse Management
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/nurses` | hospital, superadmin, nurse | List nurses. `?hospitalId=` filter. Nurse JWT scoped to own hospital. |
| POST | `/api/nurses` | hospital | Create nurse. SuperAdmin CANNOT create. |

---

### `/api/ambulances` — Ambulance Management
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/ambulances` | hospital, superadmin | List ambulances. `?hospitalId=` filter. |
| GET | `/api/ambulances/:ambulanceId` | hospital, ambulance (own), superadmin | Single ambulance. JWT `ref` must match param for ambulance role. |
| POST | `/api/ambulances` | hospital | Create ambulance. SuperAdmin CANNOT create. |
| PUT | `/api/ambulances/:ambulanceId` | ambulance (own), hospital | Update. SuperAdmin blocked. Ownership enforced. |
| POST | `/api/ambulances/:ambulanceId/location` | ambulance (own) | Update GPS. Emits socket `ambulance:location`. |

> No emergency linkage. No assign-ambulance. Ambulance is standalone.

---

### `/api/beds` — Bed Management
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/beds` | hospital, nurse, superadmin | List beds. `?hospitalId=&status=&bedType=` filters. |
| GET | `/api/beds/summary/:hospitalId` | Public | Bed counts by type + available count. Powers public real-time display. |
| POST | `/api/beds/bulk` | hospital | Bulk-create beds. Body: `{ hospitalId, bedType, count }`. |
| PATCH | `/api/beds/:bedId/status` | hospital, nurse | Update status (Available / Occupied / Cleaning). Emits socket `bed:update`. |
| DELETE | `/api/beds/:bedId` | hospital | Delete bed. SuperAdmin uses master delete route. |

---

### `/api/bloodbank` — Blood Bank
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/bloodbank` | Public | List inventory. `?hospitalId=` filter. |
| POST | `/api/bloodbank/upsert` | hospital | Single write endpoint. Upserts by `hospitalId + bloodType`. SuperAdmin blocked. |
| GET | `/api/bloodbank/donors` | Public | List donors. `?hospitalId=` filter. |
| POST | `/api/bloodbank/donors` | Public | Register as donor. Body: `{ name, contact, bloodType, hospitalId }`. |
| PUT | `/api/bloodbank/donors/:id` | hospital | Update donor status/info. |

---

### `/api/announcements` — Announcements
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/announcements` | Public | List non-expired. `?hospitalId=` or `?clinicId=` filter. |
| POST | `/api/announcements` | hospital, clinic | Create. Emits socket `announcement:new`. |
| DELETE | `/api/announcements/:id` | hospital (own), clinic (own) | Delete own. SuperAdmin uses master delete. |

---

### `/api/pharmacy` — Pharmacy (NEW ROLE)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/pharmacy` | Public | List all registered pharmacies. Returns name, address, contact, coordinates. |
| GET | `/api/pharmacy/:pharmacyId` | Public | Full pharmacy profile + full medicine inventory with stock status. |
| PUT | `/api/pharmacy/:pharmacyId` | pharmacy (own) | Update own profile. SuperAdmin blocked. |
| GET | `/api/pharmacy/:pharmacyId/medicines` | Public | List all medicines for this pharmacy. `?search=` query by name or medicine number. `?inStock=true` filter. |
| POST | `/api/pharmacy/:pharmacyId/medicines` | pharmacy (own) | Add a new medicine. Body: `{ name, medicineNumber, category, requiresPrescription }`. Stock defaults to true. |
| PATCH | `/api/pharmacy/:pharmacyId/medicines/:medicineId` | pharmacy (own) | Update stock status only. Body: `{ inStock: true/false }`. Emits socket `pharmacy:stock`. |
| DELETE | `/api/pharmacy/:pharmacyId/medicines/:medicineId` | pharmacy (own) | Remove a medicine from listing. |

**Medicine search:**
```
GET /api/pharmacy/:pharmacyId/medicines?search=paracetamol   → search by name (case-insensitive)
GET /api/pharmacy/:pharmacyId/medicines?search=PC-4521       → search by medicineNumber
GET /api/pharmacy/:pharmacyId/medicines?inStock=true         → only in-stock items
GET /api/pharmacy/:pharmacyId/medicines?inStock=false        → only out-of-stock items
```

**Cross-pharmacy medicine search (public):**
```
GET /api/pharmacy/search?medicine=paracetamol&city=Pune
→ Returns list of pharmacies that have this medicine in stock, sorted by distance if coordinates available
```

> Hospital reception CANNOT access any pharmacy route. Pharmacy manages its own data exclusively.

---

### `/api/clinic` — Clinic Portal (NEW ROLE)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/clinic` | Public | List all clinics. `?type=Specialized` filter. Returns name, type, address, contact. |
| GET | `/api/clinic/:clinicId` | Public | Full clinic profile + doctor list + services list. |
| PUT | `/api/clinic/:clinicId` | clinic (own) | Update clinic profile. SuperAdmin blocked. |
| GET | `/api/clinic/:clinicId/stats` | clinic | Internal: doctor count, services count, active announcements. |
| POST | `/api/clinic/:clinicId/gallery` | clinic | Upload clinic gallery images. Multer. |
| DELETE | `/api/clinic/:clinicId/gallery` | clinic | Delete gallery image by URL. |
| GET | `/api/clinic/:clinicId/services` | Public | List services offered by this clinic. |
| POST | `/api/clinic/:clinicId/services` | clinic (own) | Add a service. Body: `{ name, description, available }`. |
| PUT | `/api/clinic/:clinicId/services/:serviceId` | clinic (own) | Update service. Toggle available true/false. |
| DELETE | `/api/clinic/:clinicId/services/:serviceId` | clinic (own) | Remove a service. |

**Clinic types (clinicType field):**
```
General | Specialized | Dental | Eye | Physiotherapy | Dermatology | Pediatric | Orthopedic | Other
```

> Doctors assigned to a clinic use `clinicId` field (not `hospitalId`). Clinic creates doctors same way hospital does — via `POST /api/doctors` with `clinicId` in body.

---

## SECTION 7 — MODELS (All Fields)

### Hospital.js
```js
{
  hospitalId:    String (required, unique),
  name:          String (required),
  password:      String (required, bcrypt pre-save),
  email:         String,
  contact:       String,
  address: {
    street, city, district, state: String
  },
  location: { lat: Number, lng: Number },
  googleMapUrl:  String,
  services:      [String],
  facilities:    [String],
  insurance:     [String],
  tests:         [String],
  gallery:       [String],   // URLs
  forcePasswordChange: Boolean (default: false),
  createdAt:     Date
}
```

### Doctor.js
```js
{
  doctorId:      String (required, unique),
  name:          String (required),
  password:      String (required, bcrypt pre-save),
  email:         String,
  contact:       String,
  specialization: String,
  availability:  String (enum: ['Available', 'Unavailable'], default: 'Unavailable'),
  photo:         String,   // URL
  hospitalId:    String,   // set if works at hospital, else null
  clinicId:      String,   // set if works at clinic, else null
  forcePasswordChange: Boolean (default: false),
  createdAt:     Date
}
```

### Nurse.js
```js
{
  nurseId:       String (required, unique),
  name:          String (required),
  password:      String (required, bcrypt pre-save),
  email:         String,
  contact:       String,
  hospitalId:    String (required),
  forcePasswordChange: Boolean (default: false),
  createdAt:     Date
}
```

### Ambulance.js
```js
{
  ambulanceId:   String (required, unique),
  vehicleNumber: String (required),
  password:      String (required, bcrypt pre-save),
  driverName:    String,
  contact:       String,
  hospitalId:    String,
  status:        String (enum: ['On Duty', 'Off Duty'], default: 'Off Duty'),
  location: { lat: Number, lng: Number },
  lastLogin:     Date,
  forcePasswordChange: Boolean (default: false),
  createdAt:     Date
}
```

### Bed.js
```js
{
  bedId:         String (required, unique),
  hospitalId:    String (required),
  bedType:       String (enum: ['General', 'ICU', 'Private', 'Emergency', 'Maternity', 'Pediatric']),
  status:        String (enum: ['Available', 'Occupied', 'Cleaning'], default: 'Available'),
  ward:          String,
  updatedAt:     Date
}
```

### BloodBank.js
```js
{
  hospitalId:    String (required),
  bloodType:     String (enum: ['A+','A-','B+','B-','O+','O-','AB+','AB-'], required),
  units:         Number (default: 0),
  updatedAt:     Date
}
```

### Donor.js
```js
{
  name:          String (required),
  contact:       String (required),
  bloodType:     String,
  hospitalId:    String (required),
  status:        String (enum: ['Pending', 'Contacted', 'Donated'], default: 'Pending'),
  createdAt:     Date,
  updatedAt:     Date
}
```

### Pharmacy.js (NEW)
```js
{
  pharmacyId:    String (required, unique),
  name:          String (required),
  password:      String (required, bcrypt pre-save),
  email:         String,
  contact:       String,
  address: {
    street, city, district, state: String
  },
  location: { lat: Number, lng: Number },
  licenseNumber: String,
  openingHours:  String,
  forcePasswordChange: Boolean (default: false),
  createdAt:     Date
}
```

### Medicine.js (NEW)
```js
{
  pharmacyId:    String (required),
  name:          String (required),
  medicineNumber: String,       // unique identifier / batch code for search
  category:      String,        // e.g. 'Antibiotic', 'Painkiller', 'Vitamin'
  requiresPrescription: Boolean (default: false),
  inStock:       Boolean (default: true),
  updatedAt:     Date,
  createdAt:     Date
}
// Index: { pharmacyId, name } for fast search
// Index: { pharmacyId, medicineNumber } for number-based lookup
```

### Clinic.js (NEW)
```js
{
  clinicId:      String (required, unique),
  name:          String (required),
  password:      String (required, bcrypt pre-save),
  email:         String,
  contact:       String,
  clinicType:    String (enum: ['General','Specialized','Dental','Eye','Physiotherapy','Dermatology','Pediatric','Orthopedic','Other']),
  address: {
    street, city, district, state: String
  },
  location: { lat: Number, lng: Number },
  gallery:       [String],
  forcePasswordChange: Boolean (default: false),
  createdAt:     Date
}
```

### ClinicService.js (NEW)
```js
{
  clinicId:      String (required),
  name:          String (required),
  description:   String,
  available:     Boolean (default: true),
  createdAt:     Date
}
```

### Announcement.js
```js
{
  title:         String (required),
  message:       String (required),
  hospitalId:    String,   // set if from hospital
  clinicId:      String,   // set if from clinic
  expiresAt:     Date,
  createdAt:     Date
}
```

### OtpToken.js
```js
{
  email:         String (required),
  otpHash:       String (required),
  purpose:       String (enum: ['password-change', 'master-delete']),
  expiresAt:     Date (required),
  createdAt:     Date
}
```

---

## SECTION 8 — SOCKET.IO EVENTS

**Rule: Server EMITS only. Clients never push data mutations via socket.**

| Event | Triggered By | Payload | Listeners |
|---|---|---|---|
| `bed:update` | `PATCH /api/beds/:bedId/status` | `{ bedId, hospitalId, status, bedType }` | Public hospital page, hospital reception |
| `ambulance:location` | `POST /api/ambulances/:id/location` | `{ ambulanceId, hospitalId, location: { lat, lng } }` | Hospital reception |
| `announcement:new` | `POST /api/announcements` | `{ hospitalId?, clinicId?, title, message, expiresAt }` | Public, staff |
| `pharmacy:stock` | `PATCH /api/pharmacy/:id/medicines/:mid` | `{ pharmacyId, medicineId, name, inStock }` | Public pharmacy page |

**Socket rooms:**
- `hospital:<hospitalId>` — join for bed + ambulance + announcement updates for one hospital
- `pharmacy:<pharmacyId>` — join for medicine stock updates for one pharmacy
- `clinic:<clinicId>` — join for clinic announcement updates

---

## SECTION 9 — ROLE PERMISSION MATRIX

| Feature | Public | SuperAdmin | Hospital | Doctor | Nurse | Ambulance | Pharmacy | Clinic |
|---|---|---|---|---|---|---|---|---|
| **AUTH** | | | | | | | | |
| Login | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Request OTP (own) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Change own password | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Change OTHER's password | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **HOSPITALS** | | | | | | | | |
| List/view hospitals | ✅ | 👁 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Update hospital | — | ❌ | ✅ own | — | — | — | — | — |
| Hospital stats | — | 👁 | ✅ own | — | — | — | — | — |
| Gallery upload/delete | — | ❌ | ✅ own | — | — | — | — | — |
| **DOCTORS** | | | | | | | | |
| List doctors (basic) | ✅ | 👁 | ✅ | — | — | — | — | ✅ |
| List doctors (count/full) | — | 👁 | ✅ | — | — | — | — | ✅ own |
| View single doctor | ✅ | 👁 | ✅ | ✅ own | — | — | — | ✅ |
| Create doctor | — | ❌ | ✅ | — | — | — | — | ✅ own |
| Update doctor | — | ❌ | ✅ | ✅ own | — | — | — | ✅ own |
| Doctor photo upload | — | ❌ | ✅ | ✅ own | — | — | — | ✅ own |
| **NURSES** | | | | | | | | |
| List nurses | — | 👁 | ✅ | — | ✅ own | — | — | — |
| Create nurse | — | ❌ | ✅ | — | — | — | — | — |
| **AMBULANCES** | | | | | | | | |
| List ambulances | — | 👁 | ✅ | — | — | — | — | — |
| View single ambulance | — | 👁 | ✅ | — | — | ✅ own | — | — |
| Create ambulance | — | ❌ | ✅ | — | — | — | — | — |
| Update ambulance | — | ❌ | ✅ | — | — | ✅ own | — | — |
| Update GPS | — | — | — | — | — | ✅ own | — | — |
| **BEDS** | | | | | | | | |
| List beds (filtered) | — | 👁 | ✅ | — | ✅ | — | — | — |
| Bed summary (public) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Bulk create beds | — | ❌ | ✅ | — | — | — | — | — |
| Update bed status | — | ❌ | ✅ | — | ✅ | — | — | — |
| Delete bed | — | OTP+DEL | ✅ | — | — | — | — | — |
| **BLOOD BANK** | | | | | | | | |
| View inventory | ✅ | 👁 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Upsert inventory | — | ❌ | ✅ | — | — | — | — | — |
| View donors | ✅ | 👁 | ✅ | — | — | — | — | — |
| Register as donor | ✅ | — | — | — | — | — | — | — |
| Update donor | — | ❌ | ✅ | — | — | — | — | — |
| **PHARMACY (NEW)** | | | | | | | | |
| List pharmacies | ✅ | 👁 | — | — | — | — | ✅ own | — |
| View pharmacy + medicines | ✅ | 👁 | — | — | — | — | ✅ own | — |
| Update pharmacy profile | — | ❌ | ❌ | — | — | — | ✅ own | — |
| Add medicine | — | ❌ | ❌ | — | — | — | ✅ own | — |
| Update medicine stock | — | ❌ | ❌ | — | — | — | ✅ own | — |
| Delete medicine | — | ❌ | ❌ | — | — | — | ✅ own | — |
| Search medicines cross-pharmacy | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **CLINIC (NEW)** | | | | | | | | |
| List clinics | ✅ | 👁 | — | — | — | — | — | ✅ own |
| View clinic + doctors + services | ✅ | 👁 | — | — | — | — | — | ✅ own |
| Update clinic profile | — | ❌ | ❌ | — | — | — | — | ✅ own |
| Clinic gallery upload/delete | — | ❌ | — | — | — | — | — | ✅ own |
| Clinic stats | — | 👁 | — | — | — | — | — | ✅ own |
| Add/update/delete services | — | ❌ | ❌ | — | — | — | — | ✅ own |
| **ANNOUNCEMENTS** | | | | | | | | |
| View announcements | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create announcement | — | ❌ | ✅ | — | — | — | — | ✅ own |
| Delete announcement | — | OTP+DEL | ✅ own | — | — | — | — | ✅ own |
| **SUPERADMIN** | | | | | | | | |
| System stats | — | ✅ | — | — | — | — | — | — |
| Register hospital/pharmacy/clinic | — | ✅ | — | — | — | — | — | — |
| Master list (read-only) | — | 👁 | — | — | — | — | — | — |
| Master delete (OTP + "DELETE") | — | ✅ | — | — | — | — | — | — |

> 👁 = read-only &nbsp;|&nbsp; ❌ = explicitly blocked even with valid JWT &nbsp;|&nbsp; OTP+DEL = requires OTP flow + typed "DELETE"

---

## SECTION 10 — BUILD ORDER (Phase by Phase)

Follow strictly. Do not jump ahead. Each phase has a checkpoint — do not move on until it passes.

### Phase 1 — Foundation
**Files:** `server.js`, `config/db.js`, `.env`
- Express app with dotenv
- Mongoose connection
- All routes mounted as empty stubs (just return 200)
- Socket.io attached to server, rooms ready
**Checkpoint:** Server starts on PORT, connects to MongoDB Atlas, all stub routes respond.

---

### Phase 2 — OTP Utilities
**Files:** `models/OtpToken.js`, `utils/otp.js`, `utils/mailer.js`
- `generateOtp()` → `crypto.randomInt(100000, 999999).toString()`
- `hashOtp(otp)` → `bcrypt.hash(otp, 10)`
- `verifyOtp(otp, hash)` → `bcrypt.compare(otp, hash)`
- Nodemailer Gmail SMTP transport
- `sendOtpEmail(to, otp)` → sends formatted email
**Checkpoint:** Run a test script that sends a real OTP to your own email.

---

### Phase 3 — Hospital Model + Auth
**Files:** `models/Hospital.js`, `models/Doctor.js`, `models/Nurse.js`, `models/Ambulance.js`, `models/Pharmacy.js`, `models/Clinic.js`, `routes/auth.js`
- All models with bcrypt pre-save hooks
- Login route handles all 7 roles by switching on `role` field
- `request-otp` and `change-password` routes
**Checkpoint:** Hospital login returns JWT. Request OTP sends email. Change password works. Test all in Postman.

---

### Phase 4 — Auth Middleware
**File:** `middleware/auth.js`
- Extract Bearer token from Authorization header
- `jwt.verify()` → attach decoded payload to `req.user`
- Role guard: check `req.user.role` against allowed roles array → 403 if not allowed
- SuperAdmin write block: helper that returns 403 if `req.user.role === 'superadmin'` on write routes
- Ownership check helpers: `isSelf(req, id)` for doctor/ambulance self-update
**Checkpoint:** Protected route returns 401 with no token, 403 with wrong role, 200 with correct role.

---

### Phase 5 — SuperAdmin
**File:** `routes/admin.js`
- System stats (counts from all collections)
- Register hospital, pharmacy, clinic
- Master read (list any collection, no passwords)
- Request delete OTP + OTP-gated delete with "DELETE" confirmation
**Checkpoint:** Superadmin can log in, view stats, register a hospital, list collections, delete one document with OTP.

---

### Phase 6 — Hospital Routes
**File:** `routes/hospital.js`
- GET all, GET by id (with bed summary + doctor count)
- PUT own profile (ownership check)
- Internal stats endpoint
- Gallery upload (Multer, max 10 images)
- Gallery delete
**Checkpoint:** Hospital logs in, updates profile, uploads photo, views stats.

---

### Phase 7 — Doctors
**Files:** `models/Doctor.js` (finalize), `routes/doctors.js`
- Create by hospital or clinic (SuperAdmin blocked)
- Update with ownership check
- Photo upload
- Public list with basic fields only
- `?view=count` and `?view=full` modes for authenticated requests
- Both `?hospitalId=` and `?clinicId=` filter support
**Checkpoint:** Hospital creates doctor. Doctor logs in, updates own profile. Public sees list. Count view returns byType breakdown.

---

### Phase 8 — Nurses
**Files:** `models/Nurse.js` (finalize), `routes/nurses.js`
**Checkpoint:** Hospital creates nurse. Nurse logs in, lists nurses in own hospital only.

---

### Phase 9 — Beds + Socket
**Files:** `models/Bed.js`, `routes/beds.js`
- Bulk create
- PATCH status → emit `bed:update` to room `hospital:<hospitalId>`
- Public summary by hospitalId
**Checkpoint:** Hospital creates beds in bulk. Nurse patches status. Socket event fires in Postman WebSocket or browser console.

---

### Phase 10 — Ambulances + Socket
**Files:** `models/Ambulance.js` (finalize), `routes/ambulances.js`
- Ambulance login sets status = 'On Duty'
- GPS update → emit `ambulance:location` to room `hospital:<hospitalId>`
- Ownership enforced: ambulance can only update own record
**Checkpoint:** Ambulance logs in. GPS update fires. Socket event received in browser.

---

### Phase 11 — Blood Bank
**Files:** `models/BloodBank.js`, `models/Donor.js`, `routes/bloodbank.js`
- Single upsert endpoint
- Public inventory view
- Public donor registration
- Hospital manages donor status
**Checkpoint:** Hospital upserts blood units. Public registers as donor. Inventory visible publicly.

---

### Phase 12 — Announcements
**Files:** `models/Announcement.js`, `routes/announcements.js`
- Hospital and clinic can both create
- `hospitalId` or `clinicId` in payload
- Emit `announcement:new` to correct room
**Checkpoint:** Hospital creates announcement. Socket fires. Public list works with filter.

---

### Phase 13 — Pharmacy (NEW)
**Files:** `models/Pharmacy.js` (finalize), `models/Medicine.js`, `routes/pharmacy.js`
- Pharmacy logs in with own JWT
- Add/update/delete medicines
- PATCH stock status → emit `pharmacy:stock`
- Public search by name or medicineNumber
- Cross-pharmacy search endpoint
**Checkpoint:** Pharmacy logs in. Adds 5 medicines. Marks 2 out of stock. Public searches by name and gets filtered results. Socket fires on stock update.

---

### Phase 14 — Clinic (NEW)
**Files:** `models/Clinic.js` (finalize), `models/ClinicService.js`, `routes/clinic.js`
- Clinic logs in with own JWT
- Profile CRUD
- Gallery upload (separate from hospital uploads)
- Services CRUD
- Doctors created with `clinicId` field
**Checkpoint:** Clinic logs in. Adds 3 services. Creates a doctor with clinicId. Public sees clinic profile with doctors and services.

---

### Phase 15 — Public EJS Pages
**Files:** `views/hospital.ejs`, `views/pharmacy.ejs`, `views/clinic.ejs`
- Hospital page: bed summary + doctor availability + blood bank + announcements. Socket.io client joins room, listens for `bed:update`.
- Pharmacy page: medicine list with in/out stock badges. Search bar. Socket.io listens for `pharmacy:stock`.
- Clinic page: services list + doctor list.
**Checkpoint:** Open hospital page in browser. Patch a bed status via Postman. Page updates live without refresh.

---

## SECTION 11 — BUGS FROM V2 THAT ARE FIXED IN V3

| # | Bug | Fix |
|---|---|---|
| 1 | Client emits `bed:update` via socket — bypasses auth | Server-only emits. Removed entirely. |
| 2 | Three overlapping attendance systems | Attendance removed entirely |
| 3 | Two duplicate blood bank write endpoints | Single `POST /bloodbank/upsert` |
| 4 | Doctors can list all nurses | Doctor role removed from nurses route |
| 5 | `ambulanceNumber` dead model field | Field removed |
| 6 | Two admin login routes | `POST /api/admin/login` removed |
| 7 | `GET /nurses/beds` redundant route | Removed — nurse uses `GET /api/beds?hospitalId=X` |
| 8 | No ownership check on ambulance self-update | JWT `ref` must match `ambulanceId` param |
| 9 | No ownership check on doctor self-update | JWT `ref` must match `doctorId` param |
| 10 | SuperAdmin writes freely to any document | SuperAdmin read-only; all write routes block superadmin at middleware |
| 11 | EMT/ambulance dual login via `$or` | Single `ambulanceId` login only |
| 12 | No OTP on destructive superadmin deletes | Requires OTP + "DELETE" confirmation |
| 13 | Password change had no email verification | OTP to registered email required for all roles |
| 14 | Doctor creation open to superadmin | Restricted to `hospital` and `clinic` only |
| 15 | QR HTML endpoint inside REST API | Removed entirely |
| 16 | Bed QR public lookup (`/beds/public/:bedId`) | Removed — no QR system exists |
| 17 | Emergency routes (`emergency.js`) | Entire file and route mount removed |
| 18 | SuperAdmin changing other users' passwords | Explicitly blocked — no route supports this |
| 19 | `socket.on('bed:update')` from client | Removed — security hole |

---

## SECTION 12 — PUBLIC REAL-TIME PAGE GOAL

This is what the public sees at `GET /hospitals/:id`:

```
City General Hospital — Pune
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BEDS                          Live ●
  General     20 / 32 available
  ICU          2 / 8  available
  Private      5 / 10 available

DOCTORS ON DUTY              6 now
  General Physician    2
  Cardiologist         2
  Surgeon              1
  Orthopedic           1

BLOOD BANK
  A+  12u    B+  8u
  O+   5u    AB- 2u

ANNOUNCEMENTS
  • OPD closed Sunday

Last updated: just now   ← Socket.io
```

And at `GET /pharmacy/:pharmacyId`:
```
MedPlus Pharmacy — Aundh, Pune
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 Search medicine...

Paracetamol 500mg      ✅ In Stock
Amoxicillin 250mg      ❌ Out of Stock
Metformin 500mg        ✅ In Stock

Last updated: just now   ← Socket.io
```

---

*RapidCareV3 Master Prompt — Version 3.1*
*7 roles. 15 build phases. 19 bugs fixed. Pharmacy + Clinic added. Full OTP auth. SuperAdmin read-only.*
