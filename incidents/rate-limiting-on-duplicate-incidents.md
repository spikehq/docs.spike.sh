---
description: Rate limiting for duplicate incidents.
---

# Rate limiting on duplicate incidents
To avoid noise and excessive information, duplicate incidents will be rate-limited for just 1 minute. We only rate-limit an incident and **not an integration**. This enables you to trigger 100 duplicate incidents every 60 seconds. After 1 minute, the rate limiting will be uplifted. Bear in mind that duplicate incidents anyway gets suppressed while the incident is in triggered state.

## F.A.Qs
### Does this affect other incidents?
No. Any other incident on any integration including the integration for which incident was rate-limited will not be rate-limited or affected.

### Will other incidents be triggered for the same integration?
Yes. We rate-limit an incident, not an integration. 

### What are duplicate incidents?
Spike.sh will parse a payload into human-readable format. We call this incident title. Incidents with the same title are duplicates. 

### Is any action needed to uplift the rate limits?
No action is needed on your end. Rate limiting is automatically set and uplifted in just one minute.

### Will any incidents be missed?
No way. A duplicate incident has to be sent to your hooks endpoint a 100 times in under a minute for it to be rate-limited. You would have gotten alerts for the very first incident that was created.
