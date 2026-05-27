# HAQMS: Hospital Appointment & Queue Management System

Welcome to **HAQMS (Hospital Appointment & Queue Management System)**. This is a fully functional, deliberately imperfect full-stack web application designed for engineering internship candidate evaluations. 

Candidates are tasked with auditing the codebase to identify, debug, profile, secure, and optimize performance bottlenecks, memory leaks, concurrency issues, and security vulnerabilities.

---

## 🛠️ Tech Stack
- **Frontend**: Next.js (App Router, Tailwind CSS, Lucide icons, Context API)
- **Backend**: Node.js + Express
- **Database & ORM**: PostgreSQL + Prisma ORM
- **Process Management**: Docker Compose (Optional local PostgreSQL helper)

---

## 🚀 Getting Started & Setup

Follow these steps to spin up the local development workspace:

### 1. Auto-Install Dependencies
Run the included workspace orchestrator bootstrap script to install packages in the root, frontend, and backend packages:
```bash
chmod +x setup.sh
./setup.sh
```

### 2. Launch the Database
You need a running PostgreSQL server. If you have Docker installed, you can spin up the preconfigured container:
```bash
docker-compose up -d
```
Alternatively, configure your local PostgreSQL server and update the connection URL in `backend/.env`:
```env
DATABASE_URL="postgresql://<user>:<password>@localhost:5432/haqms?schema=public"
```

### 3. Deploy Schema & Seed Mock Data
Apply Prisma schema migrations to the database and populate it with pre-built mock records (including administrative logins, medical histories, physician slots, and queue tokens):
```bash
npm run db:setup --prefix backend
```

### 4. Boot Dev Servers
Launch both the Next.js development client (port `3000`) and the Express API server (port `5000`) concurrently using:
```bash
npm run dev
```

---

## 🔑 Pre-Seeded Accounts
The database seed script populates the database with default accounts (All passwords are **`password123`**):

| Role | Email | Purpose / Flow Testing |
|---|---|---|
| **Administrator** | `admin@haqms.com` | Access system reports, view audit logs, view full physician registries |
| **Receptionist** | `reception1@haqms.com` | Register patients, book slots, perform direct queue check-in |
| **Doctor** | `doctor1@haqms.com` | View daily patient worklist, manage active calling monitors, read history |

---

## 🎯 Completed Internship Evaluation Tasks

All five challenges in the evaluation checklist have been successfully audited, refactored, and verified:

### 🔍 Challenge 1: Security Audit (Completed ✅)
- **Credential Logging**: Plaintext passwords removed from console logs in [auth.js](file:///d:/dev/Assignment/backend/src/routes/auth.js).
- **Leaky Token Signature**: Expiration is strictly verified (8-hour limit) and token signature mismatches are hidden from clients in the [auth middleware](file:///d:/dev/Assignment/backend/src/middleware/auth.js).
- **SQL Injection**: Parameterized Prisma queries secure the doctor lookup directory in [doctors.js](file:///d:/dev/Assignment/backend/src/routes/doctors.js).
- **Bypassed Authorization**: Enforced admin-only validation check on delete routes.
- **Error Stack Trace Leakage**: Sanitized catch blocks to prevent database schema and server trace leaks.

### ⚡ Challenge 2: Backend Performance & Concurrency (Completed ✅)
- **N+1 Database Queries**: Refactored appointments listing in [appointments.js](file:///d:/dev/Assignment/backend/src/routes/appointments.js) to retrieve joined patient and doctor details in a single query using Prisma `include` joins.
- **Event-Loop Blocking**: Parallelized independent doctor statistics calls using `Promise.all()`.
- **Slow Reports Aggregation**: Optimized the `/doctor-stats` reports endpoint in [reports.js](file:///d:/dev/Assignment/backend/src/routes/reports.js) using SQL group-by queries, reducing database requests from $5N+1$ to 5 concurrent queries and removing the artificial 80ms delay.
- **Check-in Concurrency Race Condition**: Implemented a Prisma transaction with a row-level write lock (`SELECT FOR UPDATE` on Doctor) inside check-in routing in [queue.js](file:///d:/dev/Assignment/backend/src/routes/queue.js), preventing duplicate token numbers.

### 💾 Challenge 3: Database & Schema Optimization (Completed ✅)
- **Schema Vulnerability**: Added `@@unique([doctorId, appointmentDate])` to the `Appointment` model to prevent double-bookings.
- **Missing Indexes**: Added performance indexes on `Doctor` (specialization, department), `Appointment` (doctorId+status, patientId), and `QueueToken` (doctorId+createdAt, status).
- **Paging Optimization**: Moved patient directory paging (`take`/`skip`) to SQL level in [patients.js](file:///d:/dev/Assignment/backend/src/routes/patients.js).
- **Idempotent Seeding**: Clear existing tables before seeding inside [seed.js](file:///d:/dev/Assignment/backend/prisma/seed.js) to make setup repeatable.

### 🖥️ Challenge 4: Frontend Memory & React Optimization (Completed ✅)
- **Severe Memory Leak**: Added `clearInterval` cleanup to the Live monitor polling hook in [queue/page.js](file:///d:/dev/Assignment/frontend/src/app/queue/page.js).
- **Keystroke Re-renders**: Implemented a debounced search input component to prevent parent page re-renders in [dashboard/page.js](file:///d:/dev/Assignment/frontend/src/app/dashboard/page.js).
- **NULL Value App Crash**: Safeguarded null history renderings, fixed Hook ordering render warning, and restored missing next/link references.

### 🏗️ Challenge 5: Incomplete Feature Delivery (Completed ✅)
- **Legacy Records Page**: Built out the dynamically routed Next.js history records page under [history-records/page.js](file:///d:/dev/Assignment/frontend/src/app/patients/[id]/history-records/page.js) with auto-printing formatting.

---

For a detailed breakdown of all implemented fixes, performance gains, and concurrency verification logs, please refer to the **[DOCUMENTATION.md](./DOCUMENTATION.md)** file in the root folder.
