# Meeting Minutes — Sprint 1

**Date:** 16 April  
**Attendees:** Kiran, Sam, Germaine, Thendo, Sibu, Abdul

---

## Progress Review

- Individual progress updates initiated for the period since Wednesday.
- User Story 14 conflict flagged: Thendo intended to start it but Sam had already completed it without prior communication.
  - **Resolution being discussed:** Thendo needs to identify an alternative user story. Team acknowledging the need for better upfront coordination to avoid overlapping work.
- Team noting that random story selection is creating hand-off friction and potential mid-feature technical debt.
  - **Proposed fix:** Shift to a section-based ownership model — each person owns a feature area end-to-end rather than picking stories at random. Kiran to own all admin-side analytics stories; Thendo to take integration-heavy stories.

---

## Individual Updates

**Germaine**
- Completed three worker onboarding user stories:
  - All new sign-ins default to "resident" status.
  - Admin can enter a worker's email via the dashboard to trigger a verification link.
  - Workers verify via a unique email link and are redirected to the worker page.
  - Admin can revoke worker roles.
- Still working through how to cleanly separate this logic from the frontend.

**Abdul**
- Completed the Ward Map feature — interactive map displaying all wards; selecting a ward retrieves relevant data.
- PR not yet sent to main — **needs to submit pull request for review and merge.**

**Kiran**
- Built the Category Report page using live database data. Tracks total, pending, and resolved requests; average resolution time; most inefficient categories. Data visualised in two graph formats.
- Fixed routing issues across the app and added a dropdown to the nav bar for admin analytics.
- Expanded the test suite — seven test files now in the `/tests` folder. Still working out how to get everyone's tests into the same directory consistently.
- Raised a concern: Firebase backend code is currently mixed into frontend logic rather than being isolated in the backend folder. This is a security and maintainability risk.
  - **Being discussed:** Migrating to a separate `server.js` architecture is the right approach but may not be feasible before Monday's deadline. Decision pending on whether to leave it as-is for now.

**Sam**
- Completed User Story 14.
- Working on the Request page tests — needs to migrate existing tests into the Jest framework, specifically targeting `pages/requests` and `request.test.js`.
- Image storage is currently unresolved — Cloudinary identified as the long-term solution but not yet integrated. A temporary Data URI workaround has been implemented to keep the Submit Request page functional.

**Sibu / Thendo**
- Need to select new or replacement user stories now that the conflict on Story 14 has been identified.

---

## Open Issues Being Worked Through

**Testing coverage**
- Coverage is inconsistent. Kiran proposing to use Gemini AI to generate test suites for components — AI handles logic, team manually fixes imports and file paths.
- Agreement forming: Kiran handles component-level tests; rest of team focuses on page-level tests.
- `npm run test` confirmed as the command to verify coverage.

**Backend architecture**
- Firebase logic is currently imported directly into the frontend. The backend folder exists but isn't being used consistently.
- Proper fix (separate `server.js`) is agreed as the right approach but is being deprioritised given the Monday deadline. Will revisit if time allows over the weekend.

**Image storage**
- Data URI workaround is in place but is a temporary fix. Cloudinary integration still needs to happen — currently a blocker for fully functional image submissions.

---

## Sprint 2 Architecture Documentation (Upcoming Requirement)

- UML and software architecture diagrams required for Sprint 2 submission on Monday.
- Minimum of 6–7 diagrams needed per the Sprint 2 rubric (Lecture 5 material).
- **Model required:** 4+1 Architectural View Model.
- Team working out who owns what — still being discussed. Preliminary assignments:

| View | Owner |
|------|-------|
| Logical | Sam |
| Development | Sibu |
| Process | Kiran |
| Physical | Germaine |
| Scenario | Thendo |

- Process and Development views identified as the most complex. Logical and Scenario considered more straightforward.
- Germaine to draft initial diagrams for team review by tomorrow.
- All diagrams due Sunday. Final task distribution to be confirmed via Discord.
- "DB Diagram" tool flagged for exporting database table views. Claude suggested for generating the Logical view diagram.
- Meeting minutes to be consolidated into a single document — Germaine to handle.

---

## Sprint Status Check

- Sprint requires 4 total meetings and 6 user stories for completion.
- Several completed stories are still sitting in the backlog or in-progress columns — team needs to move them to Done.
- Once 6 functional user stories are verified, development stops and focus shifts entirely to documentation and presentation prep.
- Presentation is the day after tomorrow — timeline is tight.

---

## Action Items

| Owner | Task | Due |
|-------|------|-----|
| Thendo | Select replacement user story | Today |
| Abdul | Submit ward map PR to main branch | Today |
| Kiran | Write test coverage for all code on main; review Lecture 5 for architecture examples; start Process view diagram | Sunday |
| Sam | Migrate Request page tests to Jest; start Logical view diagram | Sunday |
| Germaine | Draft initial architecture diagrams; consolidate meeting minutes; Physical + Scenario views | Tomorrow |
| Sibu | Development view diagram | Sunday |
| All | Move completed user stories to Done column | Today |