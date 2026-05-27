# HAQMS: Engineering Evaluation Refactoring Documentation

This document details the issues identified, fixes implemented, performance optimizations, and overall architectural reasoning applied to the **Hospital Appointment & Queue Management System (HAQMS)** codebase.

---

## 📋 Table of Contents
1. [Challenge 1: Security Audit & Patches](#1-challenge-1-security-audit--patches)
2. [Challenge 2 & 3: Concurrency, Performance & Database Optimizations](#2-challenge-2--3-concurrency-performance--database-optimizations)
3. [Challenge 4: Frontend Memory & React Optimizations](#3-challenge-4-frontend-memory--react-optimizations)
4. [Challenge 5: Incomplete Feature Delivery](#4-challenge-5-incomplete-feature-delivery)
5. [Remaining Known Issues & Deployment Recommendations](#5-remaining-known-issues--deployment-recommendations)

---

## 1. Challenge 1: Security Audit & Patches

### 1.1 Plaintext Credential Logging
* **Issue**: The application printed cleartext passwords to the backend console inside `POST /api/auth/register` (logging the raw payload) and `POST /api/auth/login` (logging the plaintext password string).
* **Fix**: Removed password properties from all log statements. Consoles now only log safe identifiers (e.g., `[AUTH] Login attempt for email: admin@haqms.com`).
* **Files Modified**: `backend/src/routes/auth.js`

### 1.2 User Object Password Leaks
* **Issue**: The register route directly returned the created database user object, including the hashed password string, exposing password details in the client-facing payload.
* **Fix**: Destructured the returned user record and excluded the `password` field from the registration response JSON payload.
* **Files Modified**: `backend/src/routes/auth.js`

### 1.3 Leaky Token Signatures & Expiry
* **Issue**:
  1. JWT tokens were signed with an insecure `365d` (365 days) expiry.
  2. The authentication middleware used `jwt.verify` with `{ ignoreExpiration: true }`, completely bypassing token expiration limits.
  3. Token verification exceptions directly returned error messages (such as signature mismatch information) to HTTP clients, revealing internal server keys.
* **Fix**:
  1. Updated token signatures to expire in `8h` (8 hours).
  2. Removed `ignoreExpiration: true` to enforce active expiration checking.
  3. Sanitized exception returns to only return a generic `Invalid token.` response.
* **Files Modified**: `backend/src/routes/auth.js`, `backend/src/middleware/auth.js`

### 1.4 SQL Injection
* **Issue**: The doctor search endpoint in `GET /api/doctors` executed dynamic query construction via string interpolation (`SELECT * FROM "Doctor" WHERE name ILIKE '%${search}%'`) and sent it via `prisma.$queryRawUnsafe()`.
* **Fix**: Replaced raw string interpolation and raw unsafe SQL queries with standard, parameterized Prisma queries (`prisma.doctor.findMany` utilizing filtering options).
* **Files Modified**: `backend/src/routes/doctors.js`

### 1.5 Bypassed Route Authorization
* **Issue**: The legacy admin authorization check (`authorizeAdminOnlyLegacy`) had its role check commented out by a junior developer, permitting receptionists or doctors to execute admin-only patient deletes.
* **Fix**: Restored the role validation checks (`if (req.user.role !== 'ADMIN')`) to ensure proper access controls.
* **Files Modified**: `backend/src/middleware/auth.js`

### 1.6 System Information Leakage
* **Issue**: Exception catch blocks returned detailed database system error messages (`databaseError: error.message`, `sqlMessage: error.message`, or `errorStack: error.stack`) directly to the client.
* **Fix**: Sanitized caught exceptions across all router files, returning only generic user-friendly messages while keeping detailed logs on the server console.
* **Files Modified**: All routes under `backend/src/routes/`

---

## 2. Challenge 2 & 3: Concurrency, Performance & Database Optimizations

### 2.1 N+1 Query Patterns
* **Issue**: The `GET /api/appointments` endpoint queried core appointments and then ran a `for` loop executing separate `findUnique` queries to fetch patient and doctor details individually for each appointment.
* **Fix**: Refactored the query to utilize Prisma's relation `include` syntax. This executes database-level SQL joins and queries all details in a single query.
* **Files Modified**: `backend/src/routes/appointments.js`

### 2.2 Event-Loop Blocking
* **Issue**: Independent database aggregations in `GET /api/doctors/stats` were queried sequentially using individual `await` commands, blocking progress unnecessarily.
* **Fix**: Wrapped the queries in `Promise.all()` to execute the counts and aggregates concurrently.
* **Files Modified**: `backend/src/routes/doctors.js`

### 2.3 Slow Aggregation Reports Route
* **Issue**: The `/doctor-stats` reports endpoint looped through every doctor in the database, running 5 sequential database calls per loop (including an artificial 80ms sleep delay). This resulted in an $O(N)$ database query scaling pattern.
* **Fix**:
  1. Refactored the route to run unified, parallel database group-by queries (`prisma.appointment.groupBy` and `prisma.queueToken.groupBy`).
  2. Aggregated records in-memory using Maps, reducing database queries from $5N+1$ to exactly 5 concurrent queries total.
  3. Removed the artificial sleep.
* **Files Modified**: `backend/src/routes/reports.js`

### 2.4 Check-in Queue Token Race Condition
* **Issue**: Creating a waiting token read the maximum current token number, slept for 350ms, and created the token. If multiple check-ins occurred in parallel, they would read the same maximum number and generate duplicate tokens.
* **Fix**:
  1. Wrapped the aggregation and creation inside a Prisma transaction (`$transaction`).
  2. Executed a row-level lock on the `Doctor` record using `SELECT id FROM "Doctor" WHERE id = $1 FOR UPDATE` at the beginning of the transaction.
  3. This serializes parallel check-in operations for a given doctor, ensuring absolute uniqueness. Removed the artificial sleep.
* **Files Modified**: `backend/src/routes/queue.js`

### 2.5 Database Schema Constraints & Indexes
* **Issue**:
  1. There were no indexes on foreign keys, categories, or status fields.
  2. A lack of unique constraint allowed booking a doctor for the exact same millisecond slot multiple times.
* **Fix**:
  1. Added `@@unique([doctorId, appointmentDate])` to the `Appointment` model.
  2. Added performance indexes on `Doctor` (specialization, department), `Appointment` (doctorId+status, patientId), and `QueueToken` (doctorId+createdAt, status) inside the Prisma schema.
  3. Created an idempotent database seed script by cleaning existing tables on launch.
* **Files Modified**: `backend/prisma/schema.prisma`, `backend/prisma/seed.js`

### 2.6 Paging
* **Issue**: The `GET /api/patients` route fetched all database patient records and performed filtering and page slicing in Node.js memory.
* **Fix**: Relocated query constraints directly into the Prisma query using `skip`, `take`, and `where` operations.
* **Files Modified**: `backend/src/routes/patients.js`

---

## 3. Challenge 4: Frontend Memory & React Optimizations

### 3.1 Polling Memory Leak
* **Issue**: The `/queue` monitor page created a `setInterval` to sync queue details but did not return a cleanup function, leaving polling active after navigating away.
* **Fix**: Added a cleanup function returning `clearInterval(intervalId)` inside the page `useEffect`. Sanitized stale logs by moving the logger inside the state updater.
* **Files Modified**: `frontend/src/app/queue/page.js`

### 3.2 Keystroke Re-renders
* **Issue**: Typing in the patient lookup search bar updated the global state of the parent `Dashboard` component, causing complete re-renders of the large page and firing API requests on every single keystroke.
* **Fix**: Extracted the search bar input into a debounced component (`PatientSearchInput`) with its own localized state, which notifies the parent page only after 300ms of inactivity.
* **Files Modified**: `frontend/src/app/dashboard/page.js`

### 3.3 Blank History Null Crashes
* **Issue**:
  1. The doctor worklist crashed when trying to access `.toUpperCase()` on nullable `medicalHistory` properties.
  2. The missing `Link` import from `next/link` caused application runtime reference crashes.
* **Fix**:
  1. Added null-safe checks displaying `"NO CLINICAL HISTORY ON RECORD"` if `medicalHistory` is blank.
  2. Added the missing `import Link from 'next/link'` import at the top of the file.
  3. Corrected Dashboard Hook ordering warning/crash by relocating the early return block to the end of the state/effect hook definitions.
* **Files Modified**: `frontend/src/app/dashboard/page.js`

---

## 4. Challenge 5: Incomplete Feature Delivery

### 4.1 Legacy Diagnostic History Records Page
* **Requirement**: Provide the missing page at `/patients/[id]/history-records` to display patient info, clinical background, and history.
* **Implementation**:
  * Created the new route at `frontend/src/app/patients/[id]/history-records/page.js` (adapted for Next.js App Router parameters).
  * Styled the page with a clean glassmorphism layout, featuring quick summaries, medical history panels, and list cards showing historical appointments (with details of doctors, status, and objectives).
  * Implemented an auto-printing stylesheet trigger to hide navigation menus and format the grid cleanly on standard paper layouts.
  * Enhanced backend `GET /api/patients/:id` to fetch doctor relationships associated with historical appointments.
* **Files Created**: `frontend/src/app/patients/[id]/history-records/page.js`
* **Files Modified**: `backend/src/routes/patients.js`

---

## 5. Remaining Known Issues & Deployment Recommendations

1. **Localhost API Hardcoding**:
   * **Details**: The frontend uses `http://localhost:5000/api` as its base API url.
   * **Recommendation**: Before deploying to production, this should be refactored to use an environment variable (e.g. `process.env.NEXT_PUBLIC_API_URL`) to dynamically bind backend endpoints.
2. **Environment Secret Exposure**:
   * **Details**: Database credentials and JWT secrets are stored in plain text in `.env` files.
   * **Recommendation**: For production, bind database strings and authentication keys directly to container environments or use a secure vault manager (like AWS Secret Manager, HashiCorp Vault, or deployment secret settings).
3. **Database Locks at Scale**:
   * **Details**: The `SELECT ... FOR UPDATE` lock on the `Doctor` record prevents check-in token collisions but serializes queue creations.
   * **Recommendation**: Under extreme check-in request volumes, consider switching to Redis-based distributed lock queues or PostgreSQL sequences per doctor to improve throughput.
