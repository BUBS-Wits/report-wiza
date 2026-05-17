# Report-Wiza — Municipal Service Delivery Reporting Portal

[![codecov](https://codecov.io/gh/BUBS-Wits/report-wiza/branch/CodeCoverage/graph/badge.svg)](https://app.codecov.io/gh/BUBS-Wits/report-wiza)

**Live Application:** [Report-Wiza on Azure](https://report-wiza-heeba2h0cbgacjc6.italynorth-01.azurewebsites.net)  
**Course:** COMS3009A — Software Design 2026, Wits University  
**Project Brief:** Project 5  

[![Codecov Sunburst](https://codecov.io/gh/BUBS-Wits/report-wiza/branch/CodeCoverage/graphs/sunburst.svg)](https://app.codecov.io/gh/BUBS-Wits/report-wiza)

---

## 📖 Overview

**Report-Wiza** is a web-based service delivery reporting portal designed to bridge the gap between South African residents and local municipalities. Residents can seamlessly submit, track, and escalate service requests (such as potholes, water issues, electricity outages, and waste management) using ward-level geolocation. The platform also provides municipal workers and administrators with the tools needed to manage, resolve, and analyze these requests in an accountable and transparent manner.

---

## 👥 User Roles & Features

The system supports 3 authenticated roles (via Google/Microsoft SSO) and 1 unauthenticated access level:

* **Public Viewer (No Login):** Can view a read-only, publicly accessible dashboard showing open and recently resolved requests mapped on real ward boundaries.
* **Resident:** Can submit requests with categories, descriptions, photos, and geolocation data. Residents receive real-time notifications on status changes, have access to dedicated messaging threads, and can provide satisfaction feedback upon resolution.
* **Municipal Worker:** Can view assigned requests, claim unassigned requests, update request statuses (Acknowledged, In Progress, Resolved), and communicate with residents.
* **Admin:** Has full system oversight to assign requests, moderate and disable messaging threads, set priority levels, block malicious users, and generate CSV/PDF exportable analytics reports on worker performance and category resolution times.

---

## 🗄️ Database Architecture (Firestore NoSQL)

Report-Wiza utilizes a strict document-based NoSQL structure in Firebase Firestore, consisting of 9 core collections. The Node.js Express backend securely calculates fields (like `sla_deadline`) to prevent client-side manipulation.

1. **`service_requests`**: Central entity tracking the lifecycle of reported issues (contains `request_id`, `category`, `status`, `priority`, `ward_info`, `location`, `sla_deadline`, `messaging_enabled`, etc.).
2. **`users`**: Stores user profiles, SSO metadata, and role assignments (`resident`, `worker`, `admin`).
3. **`messages`**: Kept as a Root Collection (indexed by `request_id` or `user_uid`) to allow admins to query all communications system-wide for moderation without deep nesting.
4. **`notifications`**: Powers the NotificationBell component across dashboards (status changes, new messages, assignments).
5. **`audit_logs`**: Tracks critical system events, such as admins soft-deleting messages or locking threads (`disabled_by`, `disabled_at`).
6. **`assignments`**: Manages the linking of workers to specific service requests and tracks workload capacity.
7. **`categories`**: Dynamic configuration for request types (e.g., Potholes, Water, Electricity) managed by admins.
8. **`wards`**: Stores spatial and metadata reference information for municipal ward boundaries.
9. **`system_config`**: Global settings and SLA timeframe definitions used by the backend to calculate deadlines.

---

## 🛠 Tech Stack & Infrastructure

* **Frontend:** React (Create React App — *NOT Vite*)
* **Backend:** Node.js (Express v5 API)
* **Database:** Firebase Firestore (NoSQL)
* **Authentication:** Firebase Auth (Google & Microsoft SSO integration)
* **Storage:** Firebase Storage (for request photo attachments)
* **CI/CD Pipeline:** GitHub Actions (Running on every push to `main`)
* **Deployment Environment:** Azure Static Web Apps (via MSDeploy/ZipDeploy)
* **Testing:** Jest for unit testing, acceptance tests, and Codecov for code coverage tracking.
* **Architecture Modeling:** 4+1 Architectural View Model (Activity, Sequence, Class, State, Use Case, Component, and Deployment diagrams).

---

## 🌍 Mandatory SA Data Integration

To meet the strict regional rubric requirements, Report-Wiza integrates real South African geographic datasets:
* **Source:** StatsSA / DRDLR GeoJSON boundary dataset.
* **Functionality:** Every submitted service request is automatically tagged to the correct municipal ward and municipality based entirely on the user's GPS coordinates.
* **Visualization:** Real ward boundaries are natively rendered on both the submission map and the public viewing dashboard.

---

## 🏗 Developer Guidelines & Architecture Rules

For any developer contributing to the codebase, the following architectural boundaries and rules are strictly enforced to prevent Azure deployment failures:

### 1. API Architecture Flow
A strict architectural rule is that the Node.js (Express v5) backend acts as the secure data processor, while the React frontend remains "dumb" regarding direct database writes for critical operations.
1. React frontend components call a local service.
2. The service retrieves the Firebase Auth token and issues an HTTP `fetch()` to the backend.
3. The Express `server.js` endpoint authenticates the token, queries Firestore securely, performs data aggregations, and returns the final JSON payload.

### 2. The "100% No-Nos" in `server.js`
* **Never import React/Frontend logic:** Do not import any files containing JSX or React logic into `server.js`. This will trigger an `ERR_MODULE_NOT_FOUND` error and crash the Azure boot sequence.
* **No String Wildcards in Express 5:** Express v5 does not support string wildcards (e.g., `app.get('*', ...)`). You must use native JavaScript Regular Expressions.
* **No Quotes in Azure Config:** When storing Base64 Firebase credentials in Azure Environment Variables, do not include quotation marks, or `JSON.parse()` will crash.

### 3. File Naming Conventions
* All project files (including React components, tests, and CSS) must use `snake_case.js`. 
* Component functions *inside* the files follow React `PascalCase`, but the files themselves strictly adhere to `snake_case` (e.g., `resident_dashboard.js` instead of `ResidentDashboard.js`).

---

## 📋 Course & Assessment Constraints

As per COMS3009A Project 5 requirements, this repository adheres to the following criteria:
* **Minimum 4 user stories** completed by the end of Sprint 1.
* All user stories are documented in **Who–What–Why format** with tasks assigned to named individuals.
* **Acceptance tests** are written in **Given–When–Then format** for every story.
* Proof of 4 Scrum meeting types required (Sprint Planning, Daily Standup, Backlog Refinement, Sprint Retrospective).
* Automated **Jest Code Coverage** is configured via GitHub Actions.
* **Markers Note:** Markers will cross-reference git commit history with stated contributions below. Commit often and against your own stories!
