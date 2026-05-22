# Meeting Minutes — Sprint 4

**Date:** 8 May  
**Attendees:** Kiran, Speaker 1, Speaker 2

---

## Worker Dashboard

- Dashboard UI updated to a new page design.
- Logic split into two routes:
  - `/available` — unclaimed/open requests visible to all workers.
  - `My Queue` — requests claimed by the logged-in worker.
- Speaker 2's existing work to be integrated into the `My Queue` section.

**Agreed:**
- Kiran to refactor the request display into a separate component to fix visual layout issues.
- Speaker 2 to update stylesheet using colours from Kiran's dashboard for consistency.
- Claude AI suggested for automating CSS class and colour swaps.
- Speaker 2 to prioritise filtering options to finalise the worker module within the next two days.
- Completing the worker dashboard finalises the "Worker" user persona.

---

## Messaging Feature

- Resident-to-worker message board integration is complete but untested end-to-end.
- Test workflow: resident account → submit service request → worker initiates message → verify real-time communication.
- Kiran confirmed backend implementation is complete; live testing underway.
- Messaging identified as a **differentiator** feature (grade-boosting) rather than a core requirement.
- Core outstanding requirements: analytics, request management, and public dashboards take priority.

**Agreed:** Full end-to-end messaging test scheduled for the following day.

---

## Task Allocation

- Speaker 1 to transition to admin dashboard tasks — focus areas: analytics and dashboard features.
- Public dashboard noted as a potential last-minute addition.
- Kiran has completed approximately 2–4 resident-related user stories, including visible ward boundaries on submissions (US 12) and resident ability to cancel/withdraw their own service requests.

---

## Database — Manual Configuration for Testing

To test service request self-assignment manually:

- **Service Request collection:** set `status` field to integer `1`.
- **Assignments collection:** create a new document where the `requestUID` field matches the document name of the target service request.
- Assignments are a separate collection (not a subcollection) to support future multi-worker assignment per request.
- Implementation deferred until Speaker 2 completes the accepting functionality to avoid version conflicts.

---

## Status Naming Convention

- Speaker 2 changed status values to integers in `constants.js` to avoid casing inconsistencies.
- Kiran disagreed, citing poor readability.

**Agreed:** All-caps string format to be used as the standard (e.g. `"OPEN"`, `"CLOSED"`) to resolve merge conflicts and improve readability.

---

## End-of-Day Plan

- Kiran to return in ~45 minutes to begin local branch implementation.
- Branch merging to be completed tonight.

---

## Action Items

| Owner | Task | Due |
|-------|------|-----|
| Kiran | Refactor worker dashboard display component; complete local branch implementation | Tonight |
| Speaker 2 | Integrate work into My Queue; update stylesheet; complete filtering | 2 days |
| Speaker 2 | Revert status values to all-caps strings in `constants.js` | Tonight |
| All | End-to-end messaging test | Tomorrow |