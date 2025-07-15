---
description: Live Call Routing, a direct phone line that connects incoming calls to on-call engineers.
---

![Live Call Routing](<../.gitbook/assets/live-call-routing/banner-image.png>)

# Introduction

Live Call Routing gives your team a dedicated phone line that instantly connects incoming calls to the right on‑call engineer.  
It captures human‑reported incidents—like a security vendor reporting a breach or a payment partner flagging a failure—that automated monitors might miss.

Instead of wasting minutes tracking down the right person, the caller reaches the engineer on shift within seconds.  
This closes the gap between automated alerts and real‑world reports, helping your team act faster, reduce downtime, and keep every critical signal from slipping through the cracks.

> [!NOTE]
> Live Call Routing is available on **all paid plans**.

---

## How Live Call Routing Works

- Spike uses your **on‑call schedules** to determine who should receive calls.  
- An incoming call first rings the **primary on‑call engineer**.
- If there is no answer, it rings **fallback 1**.
- If still unanswered, it rings **fallback 2**.
- If no one answers, Spike plays your configured **No Answer** message and takes a message from the caller.

> [!WARNING]
> You can add a maximum of **two fallback responders**.

Every call is recorded and logged. A detailed alert is sent to your configured **Slack** or **Microsoft Teams** channels.

From the call log, you can:
- Create a new incident or link the call to an existing incident
- Save the caller’s number as a contact
- Archive or delete entries later

---

## Setting Up Live Call Routing

Follow these steps to get started:
## Example

{% stepper %}
{% step %}
### 1. Add and name your phone number
   Choose a clear name (e.g., *Engineering Hotline*) and enter your phone number in **full international format**, including the `+` symbol.
{% endstep %}
{% step %}
### 2. Connect your Twilio or Plivo account
    Spike provides a **webhook URL**  
    Paste this webhook into your Twilio or Plivo console as per their instructions.
{% endstep %}
{% step %}
### 3. Configure who receives the calls
    Select an on-call schedule or a responder.  
    Optionally add up to **two fallback responders**.
{% endstep %}
{% step %}
### 4. Customize your messages
   Set up three audio messages:
   - **Welcome Message** – played when someone calls.
   - **No One On‑Call Message** – played if no one is currently on call.
   - **No Answer Message** – played if all responders fail to answer.
{% endstep %}
{% step %}
### 5. Go Live !
   Your phone number is now ready to start routing calls.
{% endstep %}
{% endstepper %}

---

## Call Logs and Recordings

All calls appear in the **Call Logs** section of your dashboard.  
Each log entry includes:
- Caller information
- Who answered (or if unanswered)
- Fallback activity (e.g., “Primary did not answer → routed to Secondary”)
- Duration of the call
- A link to the audio recording

You can:
- Review the call for post‑incident analysis
- Create or link incidents directly from the log
- Archive or delete entries when no longer needed

---

## Test Mode

Before going live, you can test your setup:

- Enable **Test Mode** for 5 minutes.  
- During this time, all calls will route directly to you.
- Ask a colleague to call your number and confirm that routing, fallback, and messages work as expected.

---

## FAQ

<details>
<summary>Can I add more than two fallback responders?</summary>
No. You can configure one primary on‑call person and up to two fallbacks.
</details>

<details>
<summary>What happens if no one is on‑call?</summary>
The caller hears your configured **No One On‑Call Message**, and the call ends.
</details>

<details>
<summary>Can I review past calls?</summary>
Yes. All calls are logged with full details and a recording in the **Call Logs** section.
</details>

<details>
<summary>Can I test Live Call Routing?</summary>
Yes. Enable **Test Mode** to route calls only to yourself for 5 minutes.
</details>

---

*If you need help configuring Live Call Routing or integrating your Twilio/Plivo account, reach out to [support@spike.sh](mailto:support@spike.sh).*
