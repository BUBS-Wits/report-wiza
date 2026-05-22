# Meeting Minutes — Sprint 4

**Date:** 11 May  
**Attendees:** Kiran, Sam, Germaine, Ab, Sibu

---

## Key Decisions

- All features to be completed by **end of Friday**. No new additions to the project after that deadline.
- Only user stories tied to rubric requirements need to be completed; others can be dropped.

---

## Updates

**Kiran**
- Completed the messages feature.
- Built an admin page for reviewing chats between workers and residents; admin can close chats or disable workers from chatting further.
- Needs more testing before merging to main branch.

**Germaine**
- Fixing a bug with closing/completing a request.
- Identified a security issue: unauthenticated or unauthorised users can navigate directly to the admin dashboard via the URL (e.g. `/admin`). Worker dashboard already has this protection; admin dashboard does not yet.
- Will close off the unprotected endpoints.

**Ab**
- Public dashboard is largely complete.
- Live data and a filter feature still outstanding; filter code is written, test cases still needed.

**Sibu**
- Completed the request management user stories.
- Confirmed the priority level is not yet linked to the number of likes — will fix this.
- Confirmed each resident can only like a service request once.

**Sam**
- Noted that the resident satisfaction feedback/review feature has not been implemented yet.
- Will take it on.

---

## Action Items

| Owner | Task | Due |
|-------|------|-----|
| Kiran | Finalise admin message review page and testing | Friday |
| Germaine | Fix admin dashboard auth guard; fix request-closing bug | Friday |
| Ab | Complete live data, filter + tests on public dashboard | Friday |
| Sibu | Link likes to priority level | Friday |
| Sam | Begin resident feedback/review feature | Friday |