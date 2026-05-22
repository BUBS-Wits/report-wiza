# Meeting Minutes — Sprint 4

**Date:** 7 May  
**Attendees:** Kiran, Speaker 1, Speaker 2

---

## User Story Status

| Story | Status | Notes |
|-------|--------|-------|
| 49 (Analytics) | Complete | Kiran built the analytics page; to be verified and moved to done |
| 24 (Municipal Dashboard) | Complete | Dashboard implementation fulfils this story |
| 22 (Filtering — assigned requests list) | Partial | List is visible; filters for status, ward, and severity still missing |
| 20 (Resolved Requests) | Likely covered | Existing "My Requests" view may satisfy this; adding a "Closed" status discussed |

- Speaker 1 to select new user stories since existing dashboard and request features are already implemented.
- Filtering (status, ward, severity) identified as a simple follow-up task for Speaker 2.
- User Stories 20, 24, and 49 to be moved to Iteration 3. Misplaced stories in wrong repositories to be deleted and recreated manually in the correct repo.

---

## Dashboard Integration

- Discrepancy found between the current `main` branch (missing Tenders) and Kiran's local dashboard version.
- Plan: Kiran to overhaul the primary dashboard while preserving Speaker 2's existing service request and request detail components.
- Current login flow redirects to an older dashboard version — navigation alignment required.
- Speaker 2 previously merged the public branch; Kiran noted the pull request may not have been formally accepted yet.

---

## Debugging

**Critical error on `main` branch on sign-in:**
- `intermediate value: the application is not a function`
- `.toUpperCase()` failing, likely due to a null value — suspected origin in `login.js` or dashboard redirect logic.
- `no routes matched` error on dashboard navigation.
- UI on the request page reported as choppy after recent UI changes.

**Agreed fixes:**
- Kiran to run on `localhost` to isolate environment-specific bugs.
- Add a loading state as a temporary fix for UI latency.
- CORS and VPN ruled out as causes.

---

## Image Submission

- Current image submission uses a placeholder; actual database storage not yet integrated.
- Speaker 2 to prioritise the image submission fix sub-issue to replace the placeholder with functional storage.

---

## Worker Verification

- PR submitted for worker verification logic.
- System message updated for users without accounts.
- Changes intended to resolve previous login display issues.

---

## Sprint Velocity

- Eight user stories required for this sprint (per Adresha).
- Target of 2–3 stories per developer suggested.
- Several completed stories still sitting in backlog/in-progress columns — to be moved.

---

## Action Items

| Owner | Task | Due |
|-------|------|-----|
| Kiran | Verify and close US 49; investigate `.toUpperCase()` error; run app on localhost | Today |
| Speaker 1 | Select new admin dashboard user stories; migrate US 12 to correct repo | Saturday |
| Speaker 2 | Image submission fix; implement filtering by status, ward, severity, and keywords | 2 days |
| All | Manually recreate misplaced user stories in correct repository | ASAP |