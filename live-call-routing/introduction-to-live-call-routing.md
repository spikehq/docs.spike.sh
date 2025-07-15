---
description: Live Call Routing, a direct phone line that connects incoming calls to on-call engineers.
---

![Live Call Routing](<../.gitbook/assets/live-call-routing/banner-image.png>)

# Introduction

Live Call Routing gives your team a dedicated phone line that instantly connects incoming calls to the right on‑call engineer.  
It captures human‑reported incidents—like a security vendor reporting a breach or a payment partner flagging a failure—that automated monitors might miss.

Instead of wasting minutes tracking down the right person, the caller reaches the responder on shift within seconds.  
This closes the gap between automated alerts and real‑world reports, helping your team act faster, reduce downtime, and keep every critical signal from slipping through the cracks.

{%hint style="success%}
Live Call Routing is available on **all paid plans**.
{%endhint%}



---

## How Live Call Routing Works

![Routing example](<../.gitbook/assets/live-call-routing/routing-example.png>)

Spike uses your **on‑call schedules** to determine who should receive calls.  
- An incoming call first rings a configured **on‑call responder**.
- If there is no answer, it rings **fallback responder**.
- If still unanswered, it rings **fallback responder 2**.
- If no one answers, Spike plays your configured **No Answer** message and takes a message from the caller.

{% hint style="info" %}
If a call reaches voicemail, it is treated as a successful connection. Spike cannot detect that the call went to voicemail, so it will not route the call to a fallback responder.
{% endhint %}

Every call is recorded and logged. A detailed alert is sent to your configured **Slack** or **Microsoft Teams** channels.

From the call log, you can:
- Create a new incident 
- or link the call to an existing incident
- Save the caller’s number as a contact

---

## How to set up Live Call Routing?

Visit [Live Call Routing](https://app.spike.sh/call-routing) on dashboard to get started. 

Live Call Routing works with any phone number from **Twilio** or **Plivo**.  
You can use an existing number you already own, or you can purchase a new number directly from Twilio or Plivo.  

Your number stays completely private. Spike does **not** require API keys or direct access to your account.  
Instead, Spike gives you a simple **webhook URL**. Paste this webhook into your Twilio or Plivo console so all incoming calls are forwarded to Spike. From there, Spike handles the routing, fallbacks, and call logging for you.

{% content-ref url="lcr-with-twilio.md" %} lcr-with-twilio.md {% endcontent-ref %}


> If you would like Spike to provide you with a number, contact us at [support@spike.sh](mailto:support@spike.sh).

{% stepper %}
{% step %}
### 1. Add and name your phone number
   Choose a clear name (e.g., *Engineering Hotline*) and enter your phone number in **full international format**, including the `+` symbol.
{% endstep %}
{% step %}
### 2. Configure who receives the calls
Select an on-call schedule or a responder.  
Optionally add up to **two fallback responders**.
{% endstep %}
{% step %}
### 3. Customize your messages
   Set up three audio messages:
   - **Welcome Message** – played when someone calls.
   - **No One On‑Call Message** – played if no one is currently on call.
   - **No Answer Message** – played if all responders fail to answer.
{% endstep %}
{% step %}
### 4. Connect your Twilio or Plivo account
Spike provides a **webhook URL**  
Paste this webhook into your Twilio or Plivo console as per their instructions.
{% endstep %}
{% step %}
### 5. Go Live !
   Your phone number is now ready to start routing calls.
{% endstep %}
{% endstepper %}

---

## Personalise Messaging

![Custom messaging](<../.gitbook/assets/live-call-routing/custom-messaging.png>)

You can make every call feel unique by customizing the messages callers hear.  
Spike lets you set up three types of audio messages, giving you full control over how you greet and guide callers:

<details>
<summary>1. **Welcome Message** </summary>
Played as soon as the call begins.  
Use this to greet callers and let them know they’re being connected to your on‑call team.  
*Example:*
*“Hi, thanks for calling the Engineering Hotline. Please hold while we connect you to the on‑call engineer.”*
</details>
<details>
<summary>2. **No-one Answered Message** </summary>
Played when no one answers after trying the primary and fallback responders.  
You can ask the caller to leave a voicemail after the beep.  
*Example:*  
*“Sorry, no one is available to take your call right now. Please leave a message and we’ll get back to you as soon as possible.”*
</details>
<details>
<summary>3. **No-one On‑Call Message** </summary>
Played when there is no on‑call responder at the moment.  
You can customize this to explain your schedule or provide next steps, while still letting them leave a message.  
*Example:*  
*“Our on‑call team is currently offline. Please leave a message with your name and number, and we’ll return your call as soon as we’re back on shift.”*
</details>

These options let you create a professional, branded experience for anyone calling your number—whether it’s during an incident or off‑hours.

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
<summary>How many fallback responders can I add?</summary>
You can add upto 2 fallbacks.
</details>

<details>
<summary>I do not have a Twilio or Plivo account. How can I get started?</summary>
Our team can help set you up. Please email [support@spike.sh](mailto:support@spike.sh)
</details>

<details>
<summary>What happens if no one is on‑call?</summary>
The caller hears your configured **No One On‑Call Message**, and Spike will take a message for you. A call log will also be created.
</details>

<details>
<summary>Can I review past calls?</summary>
Yes. All calls are logged with full details and a recording in the **Call Logs** section.
</details>

<details>
<summary>Can I have a transcript on my call?</summary>
Not yet, sorry!
</details>

---

*If you need help configuring Live Call Routing or integrating your Twilio/Plivo account, reach out to [support@spike.sh](mailto:support@spike.sh).*
