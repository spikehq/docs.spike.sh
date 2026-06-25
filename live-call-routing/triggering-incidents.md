---
description: Automatically trigger incidents from incoming calls using Live Call Routing.
---

<figure><img src="../.gitbook/assets/live-call-routing/incidents.png" alt="Triggering incidents from Live Call Routing"><figcaption></figcaption></figure>

# How to trigger incidents

There are two ways to trigger incidents from Live Call Routing calls: manually from the call log, or automatically after each completed call.

## Manual incident creation

Open any call in the [call log](https://app.spike.sh/lcr) and click **Create incident**. Fill in:

- **Title**
- **Integration**
- **Escalation policy**
- **Priority** (optional)
- **Severity** (optional)

## Auto-trigger incidents

You can configure Spike to automatically trigger an incident after each incoming call is completed.

{% hint style="info" %}
A call is considered **complete** if:
- It is answered and finishes normally, **or**
- It goes unanswered (regardless of whether the caller left a message)
{% endhint %}

To set up automatic incident creation:

1. From [Live Call Routing](https://app.spike.sh/lcr), visit **Settings → Incidents**
2. Enable **Auto-trigger incident for Live Call Routing**
3. Choose:
   - The **integration** to use for this incident
   - The **escalation policy** to use.
     You can default to the escalation policy set on the selected integration. If the policy is updated on the integration later, the change applies automatically.
4. (Optional) Set a default **priority** and **severity** to help with alert routing or analytics.

## Auto-generated incident titles

Each automatically triggered incident will have a title in this format:

`On-call hotline: Call from Mitchell Starc (+14156040016) (33s)`

This includes:
- The Live Call Routing setup name
- Caller name (if known)
- Phone number
- Duration of the call

## Incident payload

Spike includes detailed metadata with each auto-triggered incident, so you can automate follow-up actions or run outbound scripts.

```json
{
  "message": "On-call hotline: Call from Mitchell Starc (+14156040000) (33s)",
  "details": {
    "callId": "call_1234567890abcdef",
    "twilioCallId": "CA0a1b2c3d4e5f678901234567890abcd",
    "liveCallRouting": {
      "name": "On-call hotline",
      "number": "+12245550123",
      "recordingEnabled": true
    },
    "call": {
      "calledAt": "2025-07-29T06:24:32.262Z",
      "answeredAt": "2025-07-29T06:24:55.801Z",
      "duration": 33,
      "recording": "https://api.twilio.com/2010-04-01/Accounts/AC123/Recordings/RE456"
    },
    "caller": {
      "name": "Mitchell Starc",
      "number": "+14156040016"
    },
    "receiver": {
      "id": "user_abcdef123456",
      "name": "Priya S.",
      "oncallId": "oncall_789xyz",
      "oncallName": "Backend Team"
    },
    "details": ""
  },
  "priority": "p1",
  "severity": "high",
  "teams": ["devops", "backend"],
  "title": "On-call hotline: Call from Mitchell Starc (+14156040016) (33s)"
}
```

Use this payload to:
- View who answered or missed the call
- Track escalation behavior
- Access the call recording
- Run follow-up automation using Spike or external tools

## FAQs

### Can I trigger incidents for missed calls only?

Yes.

### Can I customize the incident title?

Not yet. The incident title is auto-generated using the routing name, caller name/number, and call duration to ensure uniqueness.

### Will changing the escalation policy on the integration affect auto-triggering?

Yes, but only if you've selected to sync escalation with the integration. Any updates to the integration's escalation will automatically apply here.

### Can I use this with webhooks or automation tools?

Yes. The incident payload contains detailed metadata (call ID, responder info, timestamps, etc.), which you can use in Spike's outbound webhooks or alert rules.
