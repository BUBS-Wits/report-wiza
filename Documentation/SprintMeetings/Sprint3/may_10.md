# Meeting Minutes — Sprint 4

**Date:** May 10 
**Attendees:** Kiran, Speaker 1, Speaker 2, Speaker 3, Speaker 5, Speaker 6

---

## Updates

**Speaker 1**
- Completed the public dashboard analytics feature.
- Was planning to work on worker dashboard analytics but confirmed Kiran had already done it (worker performance summary, number of assigned requests, average resolution time).
- Will take on analytics user stories 47, 48, and 50 if no one else has — targeting completion by tomorrow.

**Speaker 2**
- Merged the team's worker dashboard work into Kiran's version of the worker dashboard (agreed to keep Kiran's base).
- Migrated service request updates from a polling/interval approach to a Firebase real-time listener.
- Set up the backend for signed image URL refresh — finalising so expired links are automatically renewed.

**Speaker 3**
- Completed user stories 27, 28, 29, and 30 on the admin dashboard:
  - Set priority level (low/medium/high/critical) on any service request via a dropdown.
  - Admin can close requests.
  - Stale requests tab: requests older than three days surface here for the admin to assign to a worker.
  - Admin can add new service categories.
- Still needs to propagate the priority level, closed-request status, and stale-request logic to the resident and worker dashboards.

**Kiran**
- Completed the messaging feature (between a worker and the resident who made the request) — fully working.
- Completed the notification modal/pop-up: triggers when a worker is assigned to a request or receives a message.
- Reviewing and cleaning up user stories on the project board; will delete outdated public dashboard stories and reassign correctly.

**Speaker 5**
- Completed user stories 25 and 26.
- Was working on admin ability to close a request with a description, but confirmed Speaker 3 has already done this.
- Noted that since admins can now assign any open request directly (not just stale ones), the stale-request assignment story may be considered redundant — will reframe or pick up new stories.

**Speaker 6**
- No new changes since last meeting.
- Working on the request list/view page fix discussed previously.
- Will pick up available user stories by end of day.
- Confirmed User Story 18 (resident can view all previously submitted requests and their current status) appears to be implemented.

---

## Issues & Decisions

- User stories added to the wrong repository cannot be assigned correctly — Speaker 3 requested that affected stories be deleted and recreated in the correct repo.
- Speaker 2 confirmed they have been doing this already for their own stories.
- Admin ability to assign open requests directly makes the stale-request forced-assignment flow largely redundant; Speaker 5 will reframe that work.
- Spam/moderation feature (blocking residents showing malicious or abusive activity) has not been picked up yet. Speaker 6 offered to take it. Speaker 2 noted it could use entropy-based description checking, rate limiting, duplicate description detection, and image similarity checks — but flagged it as complex.

---

## Action Items

| Owner | Task | Due |
|-------|------|-----|
| Speaker 1 | Complete analytics user stories 47, 48, and 50 | Tomorrow |
| Speaker 3 | Propagate priority, closed-request, and stale-request logic to resident and worker dashboards | TBD |
| Speaker 2 | Finalise signed image URL auto-refresh | TBD |
| Speaker 5 | Pick up new user stories; reframe stale-request work | TBD |
| Speaker 6 | Fix request list/view page; pick up remaining open user stories | End of day |
| Kiran | Clean up project board (delete/reassign outdated stories); add environment keys if not done | Today |
| All | Full testing of all features | Tomorrow |