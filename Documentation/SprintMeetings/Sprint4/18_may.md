# WardWatch - Scrum Meeting Minutes

**Meeting Type:** Daily Scrum / QA Debugging Sync
**Sprint:** Sprint 4
**Date:** 18 May 2026
**Attendees:** Kiran (Scrum Master), Sam, Thendo, Abdur

### Update by Team Member:

* **Kiran (Lead / Public Dashboard & Analytics):** * *Yesterday/Today:* Worked on fixing the resident feedback form and testing the Public Dashboard. Switched the geolocation tracking from an IP/Cell-tower-based method to the native `navigator.geolocation` API in `utility.js` for better accuracy. Addressed a major logic bug where residents couldn't leave reviews on "Resolved" requests because the system was strictly looking for a "Closed" status. 
  * *Blockers:* Pipeline is currently failing on Jest tests and linting formatting after pushing the new geolocation commits. Currently fixing locally before re-merging.

* **Sam (Messaging & Notifications):**
  * *Yesterday/Today:* Assisted with end-to-end testing of the request lifecycle. Investigated the UI bug regarding the "Closed" vs "Resolved" states on the worker dashboard and the review form. 
  * *Blockers:* UI state confusion regarding when a worker is allowed to officially close a request versus when a resident is allowed to review it. 

* **Thendo / Abdur (Testing Team):**
  * *Yesterday/Today:* Conducted live testing of the request submission form specifically checking the accuracy of the GPS coordinates and priority levels (e.g., submitting an electricity fault). 
  * *Blockers:* Poor local Wi-Fi caused some timeouts on the Resident Dashboard loading screens.

### Action Items & Blockers to Resolve:
* **Kiran/Sam:** Refactor the feedback/review logic to accept requests with the status of `Resolved`, rather than requiring them to be strictly `Closed`.
* **Kiran:** Fix the failing Jest tests related to the `utility.js` geolocation update and resolve the strict linting errors so the PR can be accepted.

---
