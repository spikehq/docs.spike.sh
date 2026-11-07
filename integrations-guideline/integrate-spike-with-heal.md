---
description: >-
  Send HEAL problem, early warning and info emails to Spike so a HEAL signal pages your on-call rotation by phone, SMS, Slack or Teams, and resolves its incident when HEAL closes the problem.
---

# Integrate Spike with HEAL

[HEAL](https://www.healsoftware.ai) is an AIOps platform that watches your applications and their services, and raises a **signal** when something goes wrong: an Early Warning when a problem is building, a Problem when users are affected, and an Info when it has something worth knowing. HEAL tells people about each signal by email, once when it opens and again when it closes.

HEAL notifies by email, so the Spike HEAL integration has an email address instead of a webhook URL. Add that address as a recipient of your HEAL notifications and a HEAL signal pages your on-call rotation when it opens, every later email about the same signal lands on the incident already open, and the incident resolves itself when HEAL sends the closed email.

Nothing is installed. One notification recipient, configured once in HEAL, covers every signal for the applications it is set up on.

## What Spike does with each HEAL email

Spike reads the status word in HEAL's own sentence, `Problem is OPEN on application(s) Travels.`, and that alone decides what happens.

| Status in the email | What Spike does |
| --- | --- |
| `OPEN` | Opens an incident and pages |
| `UPGRADED` | Joins the incident already open for the signal, or opens one |
| `CLOSED` | Resolves the incident for the same signal |

A closed email never opens an incident. When no incident is open for the signal (the open email was never sent to Spike, or the incident was already resolved in Spike), the closed email is dropped.

## Incident identity

Spike identifies the incident by HEAL's **Signal ID**, which HEAL puts in the email subject in square brackets: `Problem [112558: Travel Web transactions failing] open on application(s) Travels`. The Signal ID is a number for a Problem and an Early Warning, and starts with `I-` for an Info. HEAL repeats it on the open email, on the updates and on the closed email, so one signal's whole life reads as one Spike incident.

Because the incident is matched on the Signal ID, the email subject must keep HEAL's format. Do not rewrite the subject in your mail system or in HEAL's notification template.

{% hint style="warning" %}
When the subject carries no `[<id>: <description>]` bracket, or HEAL left the Signal ID unfilled (a literal `{Signal_ID}`), Spike cannot tell which signal the email is about. It then titles the incident by the email subject and matches on that: those emails still page, and a repeat with the same subject joins the open incident, but they never resolve themselves, because nothing proves a closed email is about the same signal. Resolve those incidents by hand.
{% endhint %}

## Incident title

The title is HEAL's own status sentence from the email body, with whitespace tidied:

```
Problem is OPEN on application(s) Travels.
```

The closed email for the same signal reads:

```
Problem is CLOSED on application(s) Travels.
```

That closed email resolves the incident, which keeps the title it opened with. An Early Warning reads `Early Warning is OPEN on application(s) Payments.`

When the signal covers so many applications that the sentence would pass 200 characters, the list is shortened to two names and a count, for example `Problem is OPEN on application(s) Alpha-Billing-Platform, Beta-Orders-Platform +5 more.` When the body has no such sentence (a Batch Problem email, for example), the title is the signal type and the description from the subject bracket, such as `Batch Problem: Nightly settlement job, Current Status: Failed`. An email without a Signal ID is titled by its subject. The full email, including the signal summary, is on the incident page.

Use a [Title Remapper](../alerts/title-remapper.md) if your team reads HEAL signals differently.

## Severity

Spike does not set the severity badge from HEAL. The `Severity:` line of the email (`Severe` or `Default`) is kept on the incident as `details.severity`. Write an [alert rule](../alerts/alert-rules.md) on it to set the badge, route to another service or escalation policy, or suppress an incident. Read more about [priority and severity](../incidents/priority-and-severity.md).

## Prerequisites

* A HEAL account that can edit notification settings, and, for emails to reach Spike, HEAL's mail server (SMTP) set up to send to external addresses
* A Spike HEAL integration and its email address
* Nothing to open on your own network

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → HEAL**, attach it to a service and an escalation policy, and copy the integration's email address. It looks like `<your-token>@email-hooks.spike.sh`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Add the Spike address in HEAL

HEAL sends signal emails to the address on a HEAL user's profile. We recommend a dedicated user for paging, so the Spike address does not replace a teammate's own email. In the HEAL console:

1. Open **My Profile** and go to **Email Notifications**.
2. In the **Email To** field, enter the Spike address from Step 1. This is the only required field.
3. Under the notification preferences, choose the signal types that should be emailed: **Early Warning**, **Problem**, and optionally **Info** and **Batch Problem**. Pick the applications they apply to.
4. Make sure the preferences cover both when a signal **opens** and when it **closes**. Without the closed email the incident stays open until someone resolves it by hand.
5. Save.

{% hint style="info" %}
HEAL's screens vary a little between versions. If you do not see these labels, look for where your team already sets the email address that receives HEAL notifications.
{% endhint %}

{% hint style="warning" %}
Leave HEAL's default subject and body in place. Spike reads the Signal ID from the subject and the status, applications and severity from the body. Auto-resolve works only when the subject carries the Signal ID.
{% endhint %}

## Step 3 — Confirm it end to end

Wait for the next real signal, or ask your HEAL admin to trigger a test notification, and watch for three moments:

1. A signal opens in HEAL and an incident opens in Spike, titled with HEAL's sentence (`Problem is OPEN on application(s) …`), on the service you attached.
2. HEAL sends an update about the same signal and it lands on the same incident without paging again.
3. HEAL closes the signal and the incident resolves itself.

If step 1 works and step 3 does not, check that the closed email reaches the Spike address too.

## Email reference

HEAL's email reaches Spike as an inbound email, and these are the fields Spike reads. Spike keeps `subject`, `text`, `html`, `from` and `to` on the incident under `details`, so alert rules and the Title Remapper read them as `data.body.details.<field>`, for example `{{data.body.details.subject}}`. `envelope` is used only to route the email and is not kept.

| Field | What Spike uses it for |
| --- | --- |
| `to` | Routes the email to your integration (the token before the `@`) |
| `envelope` | Adds the envelope recipients, so forwarded mail still routes |
| `from` | Kept on the incident as `details.from` |
| `subject` | The Signal ID and the description, in `[<id>: <description>]` |
| `text` | HEAL's status sentence, the severity, the applications and the signal summary |
| `html` | The HTML version, used when `text` is empty and shown in the incident preview |

Spike adds the following to the incident from those fields. They sit next to the email's fields, so alert rules and the Title Remapper read them the same way, for example `{{data.body.details.signal_id}}`:

| Field | Value |
| --- | --- |
| `details.signal_id` | The Signal ID, such as `112558` or `I-4471` |
| `details.signal_status` | `open`, `upgraded` or `closed`, lowercased from the status sentence (or from the word after the subject bracket) |
| `details.signal_type` | `Problem`, `Early Warning`, `Info` or `Batch Problem` |
| `details.applications` | The application names after `on application(s)` |
| `details.severity` | The `Severity:` value |
| `details.description` | The description in the subject bracket |
| `details.message` | The incident title |

An open email, as Spike receives it:

```json
{
  "to": "9f3c2a71be5d4e08a6c1@email-hooks.spike.sh",
  "from": "HEAL Alerts <heal-alerts@travels-corp.com>",
  "subject": "Problem [112558: Travel Web transactions failing] open on application(s) Travels",
  "text": "Dear User,\n\nProblem is OPEN on application(s) Travels.\nAffected service(s): Travel-Web-Service, Travel-DB-Service.\nFor the detailed overview, please select here.\nImpacted Entry Point Service: Travel-Web-Service\nSuggested Root Cause at Travel-DB-Service\nAffected Application(s): Travels\nSeverity: Severe\nStarted On: 2026-10-08 02:41:00 (GMT +05:30)\nSignal summary so far:\nTravel-DB-Service: 12 severe, 31 default events. 2 affected instances.\nTravel-Web-Service: 0 severe, 18 default events. 4 affected requests.\nTotal 61 event(s) detected so far on this Problem\n",
  "html": "<p>Dear User,</p><p>Problem is OPEN on application(s) Travels.<br>Affected service(s): Travel-Web-Service, Travel-DB-Service.<br>For the detailed overview, please <a href=\"https://heal.travels-corp.com/signals\">select here</a>.</p><p>Impacted Entry Point Service: Travel-Web-Service<br>Suggested Root Cause at Travel-DB-Service<br>Affected Application(s): Travels<br>Severity: Severe<br>Started On: 2026-10-08 02:41:00 (GMT +05:30)</p><p>Signal summary so far:<br>Travel-DB-Service: 12 severe, 31 default events. 2 affected instances.<br>Travel-Web-Service: 0 severe, 18 default events. 4 affected requests.</p><p>Total 61 event(s) detected so far on this Problem</p>",
  "envelope": "{\"to\":[\"9f3c2a71be5d4e08a6c1@email-hooks.spike.sh\"],\"from\":\"heal-alerts@travels-corp.com\"}"
}
```

The closed email for the same signal, which resolves the incident:

```json
{
  "to": "9f3c2a71be5d4e08a6c1@email-hooks.spike.sh",
  "from": "HEAL Alerts <heal-alerts@travels-corp.com>",
  "subject": "Problem [112558: Travel Web transactions failing] closed on application(s) Travels",
  "text": "Dear User,\n\nProblem is CLOSED on application(s) Travels.\nFor the detailed overview, please select here.\nImpacted Entry Point Service: Travel-Web-Service\nSuggested Root Cause at Travel-DB-Service\nSeverity: Severe\nStarted On: 2026-10-08 02:41:00 (GMT +05:30)\nEnded On: 2026-10-08 03:07:20 (GMT +05:30)\nSignal summary so far:\nTravel-DB-Service: 19 severe, 47 default events. 2 affected instances.\nTravel-Web-Service: 0 severe, 26 default events. 4 affected requests.\nTotal 92 event(s) were detected on this Problem\n\nAppreciate your efforts!\n",
  "html": "<p>Dear User,</p><p>Problem is CLOSED on application(s) Travels.<br>For the detailed overview, please <a href=\"https://heal.travels-corp.com/signals\">select here</a>.</p><p>Impacted Entry Point Service: Travel-Web-Service<br>Suggested Root Cause at Travel-DB-Service<br>Severity: Severe<br>Started On: 2026-10-08 02:41:00 (GMT +05:30)<br>Ended On: 2026-10-08 03:07:20 (GMT +05:30)</p><p>Signal summary so far:<br>Travel-DB-Service: 19 severe, 47 default events. 2 affected instances.<br>Travel-Web-Service: 0 severe, 26 default events. 4 affected requests.</p><p>Total 92 event(s) were detected on this Problem</p><p>Appreciate your efforts!</p>",
  "envelope": "{\"to\":[\"9f3c2a71be5d4e08a6c1@email-hooks.spike.sh\"],\"from\":\"heal-alerts@travels-corp.com\"}"
}
```

{% hint style="info" %}
There is a 30 MB payload limit on email integrations, the same as the generic [Email integration](integrate-spike-with-email.md).
{% endhint %}

## Troubleshooting

* **No incident opens.** Check that the address is the one on the Spike integration page and that your mail server allows sending to external domains.
* **The incident does not resolve.** Check that HEAL sends the closed email to the same address and that the subject still carries the same Signal ID.
* **A second incident opens for the same signal.** The subject was rewritten between emails, or it has no `[<id>: <description>]` bracket, so Spike matched on the subject instead of the Signal ID.
