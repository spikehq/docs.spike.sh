---
description: Spike rate-limits duplicate incidents to reduce noise when the same incident triggers repeatedly in a short window.
---

# Rate limiting on duplicate incidents

Rate limiting kicks in when the same incident triggers too many times in a short window. It prevents your team from being overwhelmed with duplicate alerts.

## How it works

If an incident triggers 20 or more times within 60 seconds, Spike rate-limits it for one minute. During that window, duplicate incidents are suppressed. After one minute, rate limiting is lifted and new incidents from the same integration are allowed through again.

## FAQs

### What counts as a duplicate incident?

Incidents with the same title are considered duplicates.

### Does rate limiting affect other incidents?

No. Rate limiting applies to a specific incident, not the integration. All other incidents on the same integration continue to trigger normally.

### Will I be notified when rate limiting applies?

Yes. Admins receive an email alert when rate limiting kicks in. However, Spike sends no more than one email every 30 minutes.

### Will any incidents be missed?

No. An incident has to trigger 20 or more times within 60 seconds for rate limiting to apply. You would have received an alert for the very first occurrence.

### Is any action needed to lift rate limiting?

No. Rate limiting is automatic. It lifts itself after one minute.
