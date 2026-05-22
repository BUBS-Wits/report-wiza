# Meeting Minutes — Sprint 4

**Date:** 11 May 
**Attendees:** Kiran, Sam, Germaine (Speaker 3), Sibu, Speaker 5

---

## Key Decisions

- Landing page navigation buttons to worker/admin dashboards will be replaced with smart role-based routing: the home button redirects users to their respective dashboard based on user type (resident, worker, admin), or to the homepage if not signed in. Each dashboard will also get a button linking to the public dashboard.
- To run and test against the Azure database locally, use `npm run build` then `node server.js` — not `npm run dev`.

---

## Updates

**Sibu**
- Completed User Story 44: as an admin, control which data fields are visible on the public dashboard (e.g. ward, assigned municipal worker, personal details of reporters) to prevent sensitive information from being exposed.
- Has two remaining user stories to complete by tonight.

**Germaine (Speaker 3)**
- Consolidated the resident requests page into the resident dashboard — the dashboard now handles everything the separate requests page did.
- The request list shows all submitted requests; clicking one displays full details and the messaging thread side by side.
- Messaging tested and confirmed working.
- Considering adding image display (the uploaded photo from the original submission) to the request detail view.
- Plans to integrate the like/upvote feature wherever a resident can view their requests.

**Sam**
- Implemented image URL auto-refresh on expiry, so images load correctly when fetched.
- Added image display to the worker dashboard for request details.
- Implemented rate limiting using the `express-rate-limit` npm package.
- Added input validation on request descriptions using an npm package to ensure submissions are meaningful.
- Implemented image deduplication using hash functions: images are stored in the storage bucket under their computed hash, so re-uploading the same image returns the existing URL instead of creating a duplicate.

**Speaker 5**
- Worker verification flow is fully working; related user stories complete.
- Applied admin dashboard features (priority level display, closed-request status and reason) to both the worker and resident dashboards.
- Workers can now see the priority assigned to a request and whether it has been closed; closed unassigned requests disappear from the worker view.
- Admin can now manually assign a request to a specific worker.
- Stale request logic is implemented (requests surface after a set number of days); for demo purposes, the threshold will be temporarily set to `-1` so stale requests appear immediately without waiting three days.
- Admin can add new service categories.

**Kiran**
- Did not work on user stories this session.
- Focused on reviewing and merging pull requests and resolving merge conflicts across the team's branches.

---

## Action Items

| Owner | Task | Due |
|-------|------|-----|
| Kiran | Implement smart role-based home button navigation | This session |
| Sibu | Complete remaining two user stories | Tonight |
| Germaine | Finalise request detail view; integrate like feature into resident request view | TBD |
| Speaker 5 | Change stale request threshold to `-1` for demo; confirm assign-request flow ready to show | Before demo |