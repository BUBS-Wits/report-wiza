# Meeting Minutes — Sprint 4

**Date:** 12 May  
**Attendees:** Kiran, Sam, Germaine, Ab, Sibu

---

## Key Decisions

- Saturday kept open for finishing features if needed; Sunday reserved for verification; final week for polishing.
- Rubric-required analytics features identified and assigned.
- Likes must be stored as an array of user IDs on the service request record to enforce one-like-per-user and derive like count from array length.

---

## User Stories Added to Iteration 4

| # | Story | Assigned To |
|---|-------|-------------|
| 51 | As a resident, I want to give feedback to a worker after they complete my service request | Sam |
| 61 | As an admin, I want to view worker performance in a custom view | Kiran |
| — | Analytics reports exportable as CSV/PDF | Ab |
| — | Public dashboard voting (one like per resident, linked to priority) | Sibu |
| — | Cancel a service request before it is assigned | Sibu |

---

## Technical Decisions

- **Analytics:** Kiran's request volume and resolution times by category feature is mostly done but needs updating to use the new `constants.js` file Sam added, so all service categories are reflected correctly.
- **Likes storage:** Store liked user IDs as an array on the service request. Like count = array length. Check array on each like attempt to enforce the one-like rule.
- **Public dashboard voting:** Sibu to implement as a separate section on the public dashboard to avoid conflicts with Ab's work.
- **Worker-side cards:** Kiran to update service request cards to display like counts and support sorting by likes (most to least).
- **Database reference doc:** Kiran shared a doc of all table names and field names with the team via Discord.

---

## Action Items

| Owner | Task | Due |
|-------|------|-----|
| Kiran | Fix analytics constants; custom analytics/worker performance view; update worker-side cards for likes/sorting | Friday |
| Sam | Implement resident feedback/review feature (US 51) | Friday |
| Ab | Exportable reports (CSV/PDF) | Friday |
| Sibu | Public dashboard voting section; cancel-request feature; confirm likes linked to priority | Friday |
| All | Add assigned user stories to Iteration 4 on the project board | ASAP |