# Report-Wiza — Municipal Service Delivery Reporting Portal

[![codecov](https://codecov.io/gh/BUBS-Wits/report-wiza/branch/main/graph/badge.svg)](https://app.codecov.io/gh/BUBS-Wits/report-wiza)

**Live Application:** [Report-Wiza on Azure](https://report-wiza-heeba2h0cbgacjc6.italynorth-01.azurewebsites.net)  
**Course:** COMS3009A — Software Design 2026, Wits University  
**Project Brief:** Project 5  

[![Codecov Sunburst](https://codecov.io/gh/BUBS-Wits/report-wiza/branch/main/graphs/sunburst.svg)](https://app.codecov.io/gh/BUBS-Wits/report-wiza)

---

## Overview

**Report-Wiza** is a web-based service delivery reporting portal designed to bridge the gap between South African residents and local municipalities. Residents can seamlessly submit, track, and escalate service requests (such as potholes, water issues, electricity outages, and waste management) using ward-level geolocation. The platform also provides municipal workers and administrators with the tools needed to manage, resolve, and analyze these requests in an accountable and transparent manner.

---

## User Roles & Features

The system supports 3 authenticated roles (via Google/Microsoft SSO) and 1 unauthenticated access level:

- **Public Viewer (No Login):** Can view a read-only, publicly accessible dashboard showing open and recently resolved requests mapped on real ward boundaries.
- **Resident:** Can submit requests with categories, descriptions, photos, and geolocation data. Residents receive real-time notifications on status changes and can provide satisfaction feedback upon resolution.
- **Municipal Worker:** Can view assigned requests, claim unassigned requests, update request statuses (Acknowledged, In Progress, Resolved), and leave comments.
- **Admin:** Has full system oversight to assign requests, set priority levels, block malicious users, and generate CSV/PDF exportable analytics reports on worker performance and category resolution times.

---

## Tech Stack & Infrastructure

- **Frontend:** React (Create React App)
- **Backend:** Node.js (Express v5 API)
- **Database:** Firebase Firestore (NoSQL)
- **Authentication:** Firebase Auth (Google & Microsoft SSO integration)
- **Storage:** Backblaze Storage (for request photo attachments)
- **CI/CD Pipeline:** GitHub Actions
- **Deployment Environment:** Azure Static Web Apps (via MSDeploy/ZipDeploy)
- **Testing:** Jest for unit testing and code coverage tracking (Codecov)

---

## Mandatory SA Data Integration

To meet the strict regional rubric requirements, WardWatch integrates real South African geographic datasets:

- **Source:** StatsSA GeoJSON boundary dataset and ward data from the [Electoral Commission of South Africa](https://gisapi.elections.org.za/IECGIS_VSFinder)
- **Functionality:** Every submitted service request is automatically tagged to the correct municipal ward and municipality based entirely on the user's GPS coordinates.
- **Visualization:** Real ward boundaries are natively rendered on both the submission map and the public viewing dashboard.

---

## Developer Guidelines & Architecture Rules

For any developer contributing to the codebase, the following architectural boundaries and rules must be adhered to to prevent Azure deployment failures:

> Note: Please use CommonJS and not ESM.

### 1. API Architecture Flow

The backend must act as the secure data processor.

1.  React frontend components call a local service.
2.  The service retrieves the Firebase Auth token and issues an HTTP `fetch()` to the backend.
3.  The Express `server.js` endpoint authenticates the token, queries Firestore securely, performs data operations, and returns the final JSON payload.

### 2. Rules of `server.js`

- **Don't Import Frontend Logic:** Do not import any files containing JSX or React logic into `server.js`. This will trigger an `ERR_MODULE_NOT_FOUND` error and crash the Azure boot sequence.
- **No String Wildcards in Express 5:** Express v5 does not support string wildcards (e.g., `app.get('*', ...)`). You must use native JavaScript Regular Expressions.
- **No Quotes in Azure Config:** When storing Base64 Firebase credentials in Azure Environment Variables, do not include quotation marks, or `JSON.parse()` will crash.

### 3. File Naming Conventions

- All project files (including React components, tests, and CSS) must use `snake_case.js`.
- Component functions _inside_ the files follow React `PascalCase`, but the files themselves strictly adhere to `snake_case` (e.g., `resident_dashboard.js` instead of `ResidentDashboard.js`).

---

## Setup

### Requirements

- [Node.js](https://nodejs.org/)
- npm (comes with Node.js)

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/BUBS-Wits/report-wiza.git
cd report-wiza 
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Open `.env` and update the variables as needed.

### 4. Start the development server

```bash
npm run dev
```

The site will be available at `http://localhost:3000` (or whichever port is set in the environment variable PORT).

---

## Available Scripts

| Command                 | Description                                                 |
|-------------------------|-------------------------------------------------------------|
| `npm run build`         | Builds the project                                          |
| `npm run start`         | Starts the server and serves the frontend through localhost |
| `npm run dev`           | Start the development server with hot reload                |
| `npm run sync`          | Sync files in `shared/` to their necessary locations        |
| `npm run lint`          | Run the linter                                              |
| `npm run format`        | Run the formatter                                           |
| `npm run test`          | Run the test suite                                          |
| `npm run test:coverage` | Run test coverage                                           |

---

## Course & Assessment Constraints

| Member       | Role            | Focus Area (User Stories)                                       |
| :----------- | :-------------- | :-------------------------------------------------------------- |
| **Sibu**     | Developer       | US001–US004, US006–US009 (Auth + Core Submission)               |
| **Germaine** | Developer       | US010–US014, US016, US018, US020 (Geo/SA Data + Tracking)       |
| **Thendo**   | Developer       | US022–US028 (Request Management — Worker + Admin priority)      |
| **Sam**      | Developer       | US029–US034, US036–US037 (Messaging + Notifications)            |
| **Kiran**    | Team Lead / Dev | US038–US045 (Feedback, Moderation, Public Dashboard, Analytics) |
| **Abdur**    | Developer       | US046–US050 (Analytics Dashboard + Exporting)                   |
