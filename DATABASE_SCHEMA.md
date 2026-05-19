# RapidCare V3 MongoDB Schema Map

This file documents the MongoDB collections used by the RapidCare V3 system, showing which UI pages depend on them, and the schema definitions.

## Fresh Setup Behavior

There are 2 distinct stages:

1. **Fresh backend startup on an empty database:**
   - The `superadmins` collection gets 1 bootstrap document automatically from server startup:
     - `username`: `admin@rapidcare`
     - `password`: `rapidcare123` (hashed)
   - No other collection gets a document automatically.

2. **Facility registration from Admin Portal:**
   - Hospitals, Pharmacies, and Clinics get created via Admin endpoints (`POST /api/admin/register-hospital`, `/api/admin/register-pharmacy`, `/api/admin/register-clinic`).
   - Other sub-collections (doctors, nurses, beds, medicines, clinic services) remain empty until registered/created via their respective portals.

*Note: MongoDB creates collections lazily. If a collection has no documents, it will not appear in Mongoose database visualizers until the first insert.*

---

## App Pages to Collection Map

| Page / Portal | Collections Read | Collections Written |
| :--- | :--- | :--- |
| **Home `/`** | `superadmins` (auth), `hospitals`, `pharmacies`, `clinics` | `donors` |
| **Public Portal `/public`** | `hospitals`, `beds`, `doctors`, `pharmacies`, `medicines`, `clinics`, `clinicservices` | `donors`, `appointmentrequests` |
| **Bed Scan `/bed/scan`** | `beds` | `beds` |
| **Reception Portal `/reception/*`** | `hospitals`, `beds`, `doctors`, `nurses`, `ambulances`, `bloodbanks`, `donors`, `announcements` | Same (except `hospitals` which is update-only) |
| **Doctor Portal `/doctor/*`** | `doctors`, `hospitals`, `clinics` | `doctors` |
| **Nurse Portal `/nurse/*`** | `nurses`, `beds` | `beds` |
| **Ambulance Portal `/ambulance/*`** | `ambulances`, `hospitals` | `ambulances` (GPS heartbeat updates) |
| **Pharmacy Portal `/pharmacy/*`** | `pharmacies`, `medicines` | `medicines` (Inventory CRUD) |
| **Clinic Portal `/clinic/*`** | `clinics`, `clinicservices`, `doctors`, `appointmentrequests` | `clinicservices`, `appointmentrequests` |
| **Admin Portal `/admin/*`** | `superadmins`, `hospitals`, `pharmacies`, `clinics`, `doctors`, `nurses`, `ambulances` | Facility registrations & Master Delete with OTP |

---

## Active Collections & Mongoose Schemas

### 1. `superadmins`
- **Model:** `SuperAdmin`
- **Key fields:**
  - `username`: String (required, unique)
  - `password`: String (required, hashed)
  - `email`: String (optional, used for 2FA deletion OTPs)
  - `createdAt`: Date

### 2. `hospitals`
- **Model:** `Hospital`
- **Key fields:**
  - `hospitalId`: String (required, unique)
  - `name`: String (required)
  - `password`: String (required, hashed)
  - `email`: String
  - `contact`: String
  - `address`: String
  - `location`: `{ lat: Number, lng: Number }`
  - `services`: Array of Strings
  - `gallery`: Array of Strings (image URLs)
  - `forcePasswordChange`: Boolean (default: `false`)

### 3. `doctors`
- **Model:** `Doctor`
- **Key fields:**
  - `doctorId`: String (required, unique)
  - `name`: String (required)
  - `password`: String (required, hashed)
  - `email`: String
  - `contact`: String
  - `specialization`: String
  - `availability`: String (enum: `['Available', 'Unavailable']`, default: `'Unavailable'`)
  - `photo`: String (image URL)
  - `hospitalId`: String (nullable ref to hospital)
  - `clinicId`: String (nullable ref to clinic)

### 4. `nurses`
- **Model:** `Nurse`
- **Key fields:**
  - `nurseId`: String (required, unique)
  - `name`: String (required)
  - `password`: String (required, hashed)
  - `hospitalId`: String (required ref to hospital)
  - `mobile`: String

### 5. `ambulances`
- **Model:** `Ambulance`
- **Key fields:**
  - `ambulanceId`: String (required, unique)
  - `hospitalId`: String (required ref to hospital)
  - `vehicleNumber`: String (required)
  - `password`: String (required, hashed)
  - `status`: String (enum: `['Off Duty', 'On Duty', 'In Transit', 'Arrived', 'En Route']`)
  - `location`: `{ lat: Number, lng: Number, updatedAt: Date }`
  - `emt`: `{ name: String, emtId: String, mobile: String }`
  - `pilot`: `{ name: String, pilotId: String, mobile: String }`
  - `assignedTask`: String

### 6. `beds`
- **Model:** `Bed`
- **Key fields:**
  - `bedId`: String (required, unique)
  - `hospitalId`: String (required ref to hospital)
  - `bedNumber`: String (required)
  - `wardNumber`: String (required)
  - `bedType`: String (e.g. ICU, General, Ventilator)
  - `status`: String (enum: `['Available', 'Occupied', 'Cleaning']`)
  - `patientName`: String
  - `updatedAt`: Date

### 7. `bloodbanks`
- **Model:** `BloodBank`
- **Key fields:**
  - `hospitalId`: String (required ref to hospital)
  - `bloodType`: String (required, unique per hospital)
  - `units`: Number (default: `0`)
  - `updatedAt`: Date

### 8. `donors`
- **Model:** `Donor`
- **Key fields:**
  - `hospitalId`: String (required ref to hospital)
  - `name`: String (required)
  - `bloodGroup`: String (required)
  - `contact`: String (required)
  - `status`: String (enum: `['Pending', 'Approved', 'Rejected']`)
  - `createdAt`: Date

### 9. `announcements`
- **Model:** `Announcement`
- **Key fields:**
  - `hospitalId`: String (nullable ref to hospital)
  - `clinicId`: String (nullable ref to clinic)
  - `title`: String (required)
  - `content`: String (required)
  - `expiresAt`: Date
  - `createdAt`: Date

### 10. `pharmacies`
- **Model:** `Pharmacy`
- **Key fields:**
  - `pharmacyId`: String (required, unique)
  - `name`: String (required)
  - `password`: String (required, hashed)
  - `email`: String
  - `contact`: String
  - `address`: String
  - `location`: `{ lat: Number, lng: Number }`

### 11. `medicines`
- **Model:** `Medicine`
- **Key fields:**
  - `pharmacyId`: String (required ref to pharmacy)
  - `name`: String (required)
  - `dosage`: String (e.g. 500mg)
  - `quantity`: Number (default: `0`)
  - `price`: Number (default: `0`)
  - `category`: String
  - `requiresPrescription`: Boolean (default: `false`)

### 12. `clinics`
- **Model:** `Clinic`
- **Key fields:**
  - `clinicId`: String (required, unique)
  - `name`: String (required)
  - `password`: String (required, hashed)
  - `clinicType`: String
  - `email`: String
  - `contact`: String
  - `address`: String
  - `location`: `{ lat: Number, lng: Number }`

### 13. `clinicservices`
- **Model:** `ClinicService`
- **Key fields:**
  - `clinicId`: String (required ref to clinic)
  - `name`: String (required)
  - `cost`: Number (default: `0`)
  - `available`: Boolean (default: `true`)

### 14. `appointmentrequests`
- **Model:** `AppointmentRequest`
- **Key fields:**
  - `clinicId`: String (required ref to clinic)
  - `name`: String (required)
  - `phone`: String (required)
  - `preferredTime`: Date
  - `status`: String (enum: `['Pending', 'Confirmed', 'Completed', 'Cancelled']`)
  - `createdAt`: Date

### 15. `otptokens`
- **Model:** `OtpToken`
- **Key fields:**
  - `email`: String (required)
  - `otpHash`: String (required)
  - `purpose`: String (e.g. `'master-delete'`, `'password-reset'`)
  - `attempts`: Number (default: `0`)
  - `expiresAt`: Date
  - `createdAt`: Date

---

## Summary of Removed Modules (V2 Legacy Cleanups)
The following database concepts and collections from V2 are **completely removed** to simplify the architecture:
- `emergencyrequests`: Unified REST APIs for patient queues and triage are now standard clinic appointment requests or local bed management.
- `attendances`: geofencing, check-in, check-out, geofence coordinates, and QR attendance schedules are removed. Doctor availability is tracked in real-time as a simple state toggle on their profile.
