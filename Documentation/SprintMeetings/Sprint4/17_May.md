
---

### 📝 WardWatch - Scrum Meeting Minutes

**Meeting Type:** Daily Scrum & Final Sprint Integration
**Sprint:** Sprint 4 (Final Review)
**Date:** 17 May 2026 | **Time:** 10:00 AM
**Attendees:** Kiran (Scrum Master/Lead), Sibu, Germaine, Thendo, Sam, Abdur

**Update by Team Member:**

* **Kiran (Lead / Public Dashboard & Analytics - US038–US045):** * *Yesterday:* Implemented the final message components, completed associated test cases, and updated the project's UML diagrams (Component, State, Class, and Use Case).
* *Today:* Led the final project walkthrough. Merged all pending pull requests. Fixed a casing mismatch bug in the Admin Category Report and resolved the missing "likes" on the Public Dashboard (caused by a status text case inconsistency). Cleared the Firestore database for the final submission and triggered the final Azure deployment.
* *Blockers:* Strict pipeline linting errors and merge conflicts temporarily blocked the final Azure deployment, but these were resolved during the meeting.


* **Sam (Messaging & Notifications - US029–US034, US036–US037):**
* *Yesterday:* Pushed unit tests which successfully brought the project's overall code coverage up to ~79%. Fixed the ward number filtering logic on the Public Dashboard (extracting the last 3 digits).
* *Today:* Conducted thorough QA testing on the Public Dashboard and Admin Dashboard. Identified the missing likes/status bug on the open requests which prompted the fix.
* *Blockers:* None currently.


* **Thendo (Request Management — Worker/Admin - US022–US028):**
* *Yesterday:* Finalized logic for the Worker Dashboard and Admin priority settings.
* *Today:* Conducted end-to-end QA testing on the Resident and Worker dashboards. Identified a bug where the Worker Dashboard wasn't showing ratings/reviews for completed requests; successfully debugged this by updating the binary expression to check for both `status.closed` OR `status.resolved`.
* *Blockers:* Was concerned about potentially missing commits from yesterday, but verified that all code is intact.


* **Abdur (Analytics Dashboard + Exporting - US046–US050):**
* *Yesterday:* Worked on analytics logic and resolving UI state issues.
* *Today:* Implemented a `window.location.reload()` fix to ensure the Resident Dashboard refreshes correctly after feedback is submitted. Identified an issue with the dynamic priority scaling (jumping between critical and low based on a single like); collaborated with the team to finalize hardcoded threshold bands (0-4 Low, 5-9 Medium, 10-19 High, 20+ Critical).
* *Blockers:* None for the project workflow.


* **Sibu (Auth & Core Submission - US001–US004, US006–US009):**
* *Yesterday:* Finalized core submission testing and authentication flows.
* *Today:* Assisted with end-to-end testing of the resident request submission process. Verified CSS displays, and tested the new priority threshold logic alongside the team.
* *Blockers:* None.


* **Germaine (Geo/SA Data + Tracking - US010–US014, US016, US018, US020):**
* *Yesterday:* Ensured StatsSA ward boundaries were rendering correctly on the final build.
* *Today:* Participated in the full system walkthrough. Conducted general QA on the CSS and map components before dropping off to attend to other academic deadlines.
* *Blockers:* None.



**Action Items & Blockers to Resolve:**

* **Kiran:** Monitor the final Azure GitHub Actions pipeline to ensure a successful production build.
* **Sam:** Clear the Firebase Storage buckets of all test images to ensure a clean slate for the marker.
* **All Team Members:** Refrain from pushing any new code. Prepare to record the mandatory 6-minute screen recording video demoing the PUBLICLY HOSTED application as per the Final Project Submission Brief.
