---
description: Automatically trigger incidents from incoming calls using Live Call Routing.
---

!(<../.gitbook/assets/live-call-routing/incidents.png>)

# How to Trigger Incidents

Spike allows you to manually or automatically trigger incidents from incoming calls using Live Call Routing.

You can:
- Manually trigger an incident by filling in the title, integration, escalation, and optional fields like priority and severity.
- Automatically trigger incidents for every call received, based on your configuration.

---

## Auto-Triggering Incidents

You can configure Spike to automatically trigger an incident after each incoming call is completed.

{% hint style="info" %}
A call is considered **complete** if:
- It is answered and finishes normally, **or**
- It goes unanswered (regardless of whether the caller left a message)
{% endhint %}

To set up automatic incident creation:

1. Go to **Settings → Incidents**
2. Enable **Auto-trigger incident for Live Call Routing**
3. Choose:
   - The **integration** the incident should be triggered under
   - The **escalation policy** to be used  
     > You can choose to default to the escalation policy set on the selected integration. If the policy is updated on the integration later, it will automatically reflect here.

4. (Optional) Set a default **priority** and **severity** to help with alert routing or analytics.

---

### Auto-Generated Incident Titles

Each automatically triggered incident will have a title in this format:

`On-call hotline: Call from Mitchell Starc (+14156040016) (33s)`

This includes:
- The Live Call Routing setup name
- Caller name (if known)
- Phone number
- Duration of the call

---

### Incident Payload Example

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

You can use this payload to view who answered or missed the call, Track escalation behavior, Access the call recording, and Run follow-up automation using Spike or external tools.

---

## FAQs
<details> 
<summary>Can I trigger incidents for missed calls only?</summary>
Yes.
</details> 
<details> 
<summary>Can I customize the incident title?</summary> 
Not yet. The incident title is auto-generated using the routing name, caller name/number, and call duration to ensure uniqueness. 
</details> 
<details>
<summary>Will changing the escalation policy on the integration affect auto-triggering?</summary>
Yes but on ff you’ve selected to `sync escalation with integration`. Any updates to the integration’s escalation will automatically apply here.
</details>
<details>
<details>
<summary>Can I use this with webhooks or automation tools?</summary>
Yes. The incident payload contains detailed metadata (call ID, responder info, timestamps, etc.), which you can use in Spike's outbound webhooks or alert rules.
</details>