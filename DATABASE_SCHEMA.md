# RapidCare MongoDB Schema Map

This file documents the MongoDB collections used by the current project, which UI pages depend on them, and whether they exist in a fresh setup.

## Fresh setup behavior

There are 2 distinct stages:

1. Fresh backend startup on an empty cluster

   - `superadmins` gets 1 document automatically from server bootstrap:
     - `username`: `admin@rapidcare`
     - `password`: `rapidcare123`
   - No other collection gets a document automatically.

2. First hospital registration from Admin Portal
   - `hospitals` gets 1 document when `POST /api/admin/register-hospital` is used.
   - Other collections still remain empty until the related portal action is used.

Important MongoDB note:

- MongoDB creates collections lazily.
- If a collection has no documents yet, it may not appear in Atlas even though the schema/model exists in code.

## App pages to collection map

| Page / Portal                   | Collections read                                                                                                                    | Collections written                                 |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Home `/`                        | `superadmins` via auth, `hospitals`, `bloodbanks`                                                                                   | `donors`                                            |
| Public Portal `/public`         | `hospitals`, `beds`, `doctors`, `bloodbanks`, `announcements`                                                                       | `donors`                                            |
| Bed Scan `/bed/:bedId`          | `beds`                                                                                                                              | `beds`                                              |
| Reception Portal `/reception/*` | `hospitals`, `beds`, `doctors`, `nurses`, `ambulances`, `bloodbanks`, `donors`, `announcements`, `emergencyrequests`, `attendances` | same collections except `hospitals` is update-only  |
| Doctor Portal `/doctor/*`       | `doctors`, `attendances`, `hospitals`                                                                                               | `doctors`, `attendances`                            |
| Nurse Portal `/nurse/*`         | `nurses`, `beds`                                                                                                                    | `beds`                                              |
| Ambulance Portal `/ambulance/*` | `ambulances`, `emergencyrequests`, `hospitals`                                                                                      | `ambulances`, `emergencyrequests`                   |
| Admin Portal `/admin/*`         | `superadmins`, `hospitals`, `doctors`, `nurses`, `ambulances`, `emergencyrequests`                                                  | `hospitals`, optional deletes in listed collections |

## Collections

### `superadmins`

- Model: `SuperAdmin`
- Used by:
  - Admin login
  - Home page staff login
  - Admin portal auth
- Key fields:
  - `username` required unique
  - `password` required
  - `createdAt`
- Present after fresh backend startup:
  - Yes
- Present after first hospital registration:
  - Yes
- Auto-created by:
  - `server.js` bootstrap

### `hospitals`

- Model: `Hospital`
- Used by:
  - Home page
  - Public portal
  - Reception portal
  - Admin portal
  - Doctor geofence attendance
- Key fields:
  - `hospitalId` required unique
  - `name` required
  - `contact`
  - `email`
  - `password` required
  - `address.street`
  - `address.city`
  - `address.district`
  - `address.state`
  - `location.lat`
  - `location.lng`
  - `googleMapUrl`
  - `services[]`
  - `facilities[]`
  - `insurance[]`
  - `tests[]`
  - `procedures[]`
  - `surgery[]`
  - `therapy[]`
  - `management[]`
  - `highlights[]`
  - `treatment[]`
  - `gallery[]`
  - `attendanceQR.presentQR`
  - `attendanceQR.absentQR`
  - `attendanceQR.generatedAt`
  - `forcePasswordChange`
  - `createdAt`
- Present after fresh backend startup:
  - No
- Present after first hospital registration:
  - Yes
- Auto-created by:
  - Admin registering a hospital

### `doctors`

- Model: `Doctor`
- Used by:
  - Public portal
  - Reception portal
  - Doctor portal
  - Admin portal
- Key fields:
  - `doctorId` required unique
  - `hospitalId` required
  - `name` required
  - `speciality`
  - `qualification`
  - `experience`
  - `photoUrl`
  - `availability`
  - `shift`
  - `password` required
  - `forcePasswordChange`
  - `createdAt`
- Present after fresh backend startup:
  - No
- Present after first hospital registration:
  - No
- Created when:
  - Reception or superadmin creates doctors via `POST /api/doctors`

### `nurses`

- Model: `Nurse`
- Used by:
  - Reception portal
  - Nurse portal
  - Admin portal
- Key fields:
  - `nurseId` required unique
  - `hospitalId` required
  - `name` required
  - `mobile` required
  - `photoUrl`
  - `password` required
  - `createdAt`
- Present after fresh backend startup:
  - No
- Present after first hospital registration:
  - No
- Created when:
  - Reception or superadmin creates nurses via `POST /api/nurses`

### `ambulances`

- Model: `Ambulance`
- Used by:
  - Reception portal
  - Ambulance portal
  - Admin portal
  - Hospital stats
- Key fields:
  - `ambulanceId` required unique
  - `hospitalId` required
  - `vehicleNumber` required
  - `ambulanceNumber`
  - `password` required
  - `status`
  - `location.lat`
  - `location.lng`
  - `location.updatedAt`
  - `emt.name`
  - `emt.emtId`
  - `emt.mobile`
  - `pilot.name`
  - `pilot.pilotId`
  - `pilot.mobile`
  - `assignedTask`
  - `forcePasswordChange`
  - `lastLogin`
  - `createdAt`
- Present after fresh backend startup:
  - No
- Present after first hospital registration:
  - No
- Created when:
  - Reception or superadmin creates ambulances via `POST /api/ambulances`

### `beds`

- Model: `Bed`
- Used by:
  - Public portal
  - Reception portal
  - Nurse portal
  - Bed scan page
  - Hospital stats
- Key fields:
  - `bedId` required unique
  - `hospitalId` required
  - `bedNumber` required
  - `wardNumber` required
  - `bedType`
  - `status`
  - `qrUrl`
  - `patientName`
  - `admittedAt`
  - `updatedAt`
- Present after fresh backend startup:
  - No
- Present after first hospital registration:
  - No
- Created when:
  - Reception bulk-creates beds via `POST /api/beds/bulk`

### `emergencyrequests`

- Model: `EmergencyRequest`
- Used by:
  - Reception portal emergency queue
  - Ambulance portal
  - Admin stats
- Key fields:
  - `hospitalId` required
  - `ambulanceId`
  - `source`
  - `patientName` required
  - `age`
  - `gender`
  - `mobile`
  - `address`
  - `emergencyType`
  - `equipment`
  - `symptoms`
  - `ambulanceNotes`
  - `condition`
  - `reason`
  - `denialReason`
  - `assignedDoctor`
  - `replyMessage`
  - `status`
  - `transferredTo`
  - `referredFrom`
  - `bedId`
  - `createdAt`
  - `updatedAt`
- Present after fresh backend startup:
  - No
- Present after first hospital registration:
  - No
- Created when:
  - Ambulance creates an emergency request via `POST /api/emergency`
  - A transfer creates another cloned request for the receiving hospital

### `bloodbanks`

- Model: `BloodBank`
- Used by:
  - Home page blood overview
  - Public portal
  - Reception blood bank section
- Key fields:
  - `hospitalId` required
  - `bloodType` required
  - `units`
  - `lastUpdated`
  - `notes`
- Present after fresh backend startup:
  - No
- Present after first hospital registration:
  - No
- Created when:
  - Reception or superadmin upserts stock via `POST /api/bloodbank/upsert`
  - Reception creates stock via `POST /api/bloodbank`

### `donors`

- Model: `Donor`
- Used by:
  - Home page donor form
  - Public portal donor form
  - Reception donor management
- Key fields:
  - `hospitalId` required
  - `name` required
  - `bloodType` required
  - `contact` required
  - `city` required
  - `unitsDonated`
  - `status`
  - `remarks`
  - `createdAt`
  - `updatedAt`
- Present after fresh backend startup:
  - No
- Present after first hospital registration:
  - No
- Created when:
  - Public or home donor form submits via `POST /api/bloodbank/donors`

### `announcements`

- Model: `Announcement`
- Used by:
  - Public portal hospital detail
  - Reception announcements section
- Key fields:
  - `hospitalId` required
  - `title` required
  - `content` required
  - `priority`
  - `expiresAt`
  - `createdAt`
- Present after fresh backend startup:
  - No
- Present after first hospital registration:
  - No
- Created when:
  - Reception posts an announcement via `POST /api/announcements`

### `attendances`

- Model: `Attendance`
- Used by:
  - Doctor portal
  - Reception attendance QR flow
  - Public portal doctor freshness timestamps
- Key fields:
  - `doctorId` required
  - `hospitalId` required
  - `date` required
  - `availability`
  - `shift`
  - `checkIn`
  - `checkOut`
  - `totalHours`
  - `method`
  - `markedBy`
  - `createdAt`
- Present after fresh backend startup:
  - No
- Present after first hospital registration:
  - No
- Created when:
  - Doctor checks in/out
  - Reception overrides attendance
  - Attendance QR scan endpoint is used

## What will exist after a fresh registration?

If by "fresh registration" you mean:

### Case A: brand new cluster + first backend startup

- Documents present:
  - `superadmins`: Yes
- Documents absent:
  - `hospitals`
  - `doctors`
  - `nurses`
  - `ambulances`
  - `beds`
  - `emergencyrequests`
  - `bloodbanks`
  - `donors`
  - `announcements`
  - `attendances`

### Case B: after logging in as admin and registering the first hospital

- Documents present:
  - `superadmins`: Yes
  - `hospitals`: Yes
- Documents still absent until user actions create them:
  - `doctors`
  - `nurses`
  - `ambulances`
  - `beds`
  - `emergencyrequests`
  - `bloodbanks`
  - `donors`
  - `announcements`
  - `attendances`

## Practical minimum for each portal to work

- Home:
  - `superadmins`
  - at least 1 `hospital`
- Public Portal:
  - at least 1 `hospital`
  - optional `beds`, `doctors`, `bloodbanks`, `announcements`
- Reception:
  - 1 `hospital` login document
  - optional `beds`, `doctors`, `nurses`, `ambulances`, `bloodbanks`, `announcements`, `emergencyrequests`
- Doctor:
  - 1 `doctor`
- Nurse:
  - 1 `nurse`
  - usually some `beds`
- Ambulance:
  - 1 `ambulance`
- Admin:
  - 1 `superadmin`

## Source of truth in code

- Models: [server/models](/d:/2026Final%20Minor/rapidcarev3-master/rapidcarev3-master/server/models)
- Startup bootstrap: [server/server.js](/d:/2026Final%20Minor/rapidcarev3-master/rapidcarev3-master/server/server.js)
- Main registration flow: [server/routes/admin.js](/d:/2026Final%20Minor/rapidcarev3-master/rapidcarev3-master/server/routes/admin.js)
