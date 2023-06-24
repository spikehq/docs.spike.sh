---
description: Rate limiting for duplicate incidents.
---

# Rate limiting on duplicate incidents
To avoid noise and excessive information, duplicate incidents will be rate-limited for just 1 minute. We only rate-limit an incident and **not an integration**. These are the rules - 

- Trigger 20 duplicate incidents every 60 seconds (duplicate incidents will also get suppressed automatically) 
- After the first 60 seconds, rate limiting will be applied for 1 minute
- Rate limiting will be uplifted after one minute and duplicate incidents will be allowed


## F.A.Qs
### Does this affect other incidents?
No. Any other incident on any integration including the integration for which incident was rate-limited will not be rate-limited or affected.

### Will other incidents be triggered for the same integration?
Yes. We rate-limit an incident, not an integration. 

### Will I be informed about rate limiting?
Yes. Admins will get an email alert only when rate limiting applies. An email alert will be sent only once every 30 minutes.

### What are duplicate incidents?
Spike.sh will parse a payload into human-readable format. We call this incident title. Incidents with the same title are duplicates. 

### Is any action needed to uplift the rate limits?
No action is needed on your end. Rate limiting is automatically set and uplifted in just one minute.

### Will any incidents be missed?
No way. A duplicate incident has to be sent to your hooks endpoint a 20 times in under a minute for it to be rate-limited. You would have gotten alerts for the very first incident that was created.
