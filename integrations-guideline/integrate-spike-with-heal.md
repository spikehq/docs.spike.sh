---
description: >-
  Send HEAL signal notifications to Spike over email so a Problem, Early Warning or Info signal pages your on-call team by phone, SMS, Slack or Teams.
---

# Integrate Spike with HEAL

[HEAL](https://healsoftware.ai) is an AIOps platform that turns anomalies into **signals** — Problem, Early Warning, Info and Batch. HEAL notifies over email and SMS and has no outbound webhook, so the Spike HEAL integration is an email integration: HEAL emails the integration's own address, and every notification that arrives opens or joins an incident that escalates through your on-call policy.

Nothing is installed anywhere and no webhook is configured on either side. You create the integration in Spike, copy its email address, and add that address as a notification recipient in HEAL.

{% hint style="warning" %}
HEAL's close notification does not resolve the incident today. Spike matches email incidents on the subject line alone, and a closed signal's subject is not the same string as its open one. Give the integration a [resolve timer](../incidents/resolve-timer.md), as described in Step 4.
{% endhint %}

## What reaches Spike

HEAL sends a notification when a signal is created, when a new service joins the signal timeline, when a new severe event is added, when the severity changes, when the signal is upgraded, on the **open for long** and **open for too long** reminders, and when the signal closes. Spike filters none of that, and it reads no signal type, severity or status out of the email:

| HEAL notification | What happens in Spike |
| --- | --- |
| Signal opens | Opens an incident titled after the email's subject and pages the escalation policy |
| A later notification whose subject is identical — a new service on the timeline, a new severe event, a reminder | Added as an event to the incident already open. It never pages again |
| A later notification whose subject differs — typically a severity change, an upgrade or a close | Opens a second incident, because the subject is all Spike has to match on |
| Signal closes | Same as above. The close email opens an incident rather than resolving one. See [Nothing auto-resolves yet](#nothing-auto-resolves-yet) |

Which notifications reach Spike at all is decided entirely in HEAL's notification preferences (Step 3). Spike has no per-signal-type switch of its own, so the HEAL-side preference is the only volume control you have. Send Spike the signal types and severities a human should be woken up for, and leave the rest in HEAL.

## The subject line is the title, and it is also the matching key

{% hint style="info" %}
The subject line becomes the incident title verbatim, and the body of the email goes into incident details. That is the same behaviour as Spike's generic [Email](integrate-spike-with-email.md) integration, which this integration shares.
{% endhint %}

Spike groups email incidents by exact subject. Two emails with byte-identical subjects land on one incident; any difference at all opens a new one. So whether a signal's whole life shows up as one Spike incident or as several depends on HEAL's notification template, not on anything you can configure in Spike.

HEAL documents the subject line for two of its templates on [Signal Notifications Templates](https://docs.healsoftware.ai/heal-knowledge-base-2/signal-notifications-templates-2/):

| HEAL template | Documented subject | One incident for the whole signal? |
| --- | --- | --- |
| Info Signal | `<Signal Type> [<Signal ID>: <Description>]` | Yes. The subject carries no status, so every notification for that signal joins the incident already open |
| Batch Problem, both open and closed | `Batch Problem[{Signal_ID}:{Batch_Job_Details}, Current Status: {batch_job_status}] {Signal_Status}` | No. `{Signal_Status}` and `{batch_job_status}` change as the job progresses, so the close email opens a second incident |

For Lead Signals — Problem and Early Warning — HEAL publishes the body of each template (Lead Problem Open, Lead Problem Closed, Early Warning Open, Early Warning Closed, Early Warning Upgraded) but not their subject line. HEAL's SMS templates for the same signals read `<Signal Type> [<Signal ID>: <Description>] <Status> on application(s) <Application Names>`, so the email subject most likely carries `<Status>` as well, which would mean an upgrade or a close arrives under a different subject from the open notification and opens its own incident.

{% hint style="warning" %}
Confirm this on your own HEAL server before you rely on updates joining one incident. Trigger a signal, let it escalate or close, and compare the two emails' subjects character for character. If they are identical, every update for that signal joins the one incident. If the status is in the subject, expect one incident per status change and plan for it with an [alert rule](../alerts/alert-rules.md), as described under [Nothing auto-resolves yet](#nothing-auto-resolves-yet).
{% endhint %}

Incident titles come straight from that subject, so a responder reads HEAL's own wording — the signal type, the signal id and the impact summary — on a phone call or a lock screen. A [Title Remapper](../alerts/title-remapper.md) on the integration rewrites the title if you would rather see a team or an environment in it.

## Step 1 — Create the HEAL integration in Spike

In Spike, go to **Integrations → Add integration → HEAL**, attach it to a service and an escalation policy, and copy the email address from the integration page. A HEAL integration shows an email address instead of a webhook URL. The address is unique to this integration, emails sent to it are processed by Spike, and there is no inbox to read.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

Use one integration per team or per set of applications, the same way you would use one webhook per service. Each gets its own address, service, escalation policy and alert rules.

## Step 2 — Add that address as a recipient in HEAL

Notification preferences in HEAL live on a user profile, so the Spike address is added as a recipient of one HEAL user's notifications.

{% tabs %}
{% tab title="Setup on HEAL" %}
1. **Open the profile:**
   Click the user icon in the top-right corner and pick **My Profile**.

2. **Turn emails on:**
   Switch on **Email Notifications**. Recipients only receive emails while this is on.

3. **Add Spike as a recipient:**
   Switch on **Enable Email Recipients** and paste the Spike integration's address into **Email To**, comma-separated with any other addresses you want it alongside. If you fill **Email Cc**, **Email To** must hold at least one address.

4. **Save:**
   Click **Save**. The preferences apply to every application in the selected account that the user is assigned to.
{% endtab %}
{% endtabs %}

{% hint style="info" %}
Add Spike on the profile of a HEAL user dedicated to paging rather than on an engineer's own profile. Filling **Email To** redirects that user's signal notifications to the addresses you listed, and the notification preferences you set in Step 3 for Spike are that user's preferences. A HEAL user assigned to the applications that should page, with Spike's address as its only recipient, keeps the two concerns apart. Account-level and application-level defaults are a Product Admin job in HEAL's Control Center.
{% endhint %}

{% hint style="warning" %}
A HEAL user only receives notifications for services in the applications assigned to it, so a signal on an application the paging user cannot see never reaches Spike. Check the assignment before concluding the integration is broken.
{% endhint %}

## Step 3 — Choose which signals page

On the same screen, HEAL takes a preference per application for each signal type: **Severe Problem**, **Default Problem**, **Severe Early Warning**, **Default Early Warning**, **Severe Info Signal** and **Default Info Signal**, plus severe and default batch signals when batch job monitoring is on. Each one is set to **Immediately**, **If Open for long**, **If Open for too long** or **Off**.

Because Spike pages on everything it receives, this is where you decide what on-call hears about:

| HEAL signal type | Suggested preference | Why |
| --- | --- | --- |
| Severe Problem | **Immediately** | End-user impact. This is what the pager is for |
| Default Problem | **Immediately**, or **If Open for long** on noisier applications | Real impact, but a short-lived one may not be worth a phone call |
| Severe Early Warning | **Immediately** or **If Open for long** | A warning that is about to become a problem |
| Default Early Warning | **If Open for too long** or **Off** | Useful in HEAL, rarely worth waking somebody |
| Info signals | **Off** | Informational by design. Send them to a human's inbox, not to the pager |
| Batch signals | Per team | Page on a batch job only if somebody can act on it at the hour it runs |

{% hint style="warning" %}
Reminders multiply emails. Picking **Immediately** also subscribes the user to **Open for long** and **Open for too long**, so a signal that stays open keeps sending reminder emails on the admin-configured interval until it closes or upgrades. Each reminder whose subject matches joins the incident already open, and each one whose subject differs opens another incident. Granularity — **Component Type**, **Component Name** or **Instance Level** for Lead Signals, **Category Level** for Info Signals — decides how finely those events are split up before they ever become emails.
{% endhint %}

{% hint style="info" %}
Leave HEAL's **forensic notifications** off for the paging user. They are a separate toggle, they fire per event rather than per signal, and they carry an attachment. Spike's email integrations have a 30 MB payload limit, which a forensic attachment is the only realistic way to reach.
{% endhint %}

## Step 4 — Set a resolve timer

Nothing HEAL sends resolves a Spike incident today, so give the integration a [resolve timer](../incidents/resolve-timer.md) and stale incidents stop piling up:

1. Edit the HEAL integration in Spike.
2. Scroll to **Advanced Configuration** and turn on the **Resolve Timer**.
3. Set a duration comfortably longer than your reminder interval, so a signal that is still open is not resolved out from under the person looking at it.

| HEAL reminder interval | Suggested resolve timer |
| --- | --- |
| 15 minutes | 1 hour |
| 1 hour | 4 hours |
| 4 hours | 1 day |

## Severity and routing

Set severity on a HEAL incident with [alert rules](../alerts/alert-rules.md). The same rules route the incident to another escalation policy or suppress it entirely, which is how a Default Early Warning on a staging application goes somewhere quieter than the pager.

{% hint style="warning" %}
HEAL's own **Severe** and **Default** severities do not become Spike severities automatically. A notification email carries no structured payload for Spike to lift a severity out of — there is only the subject and the body text. Write an alert rule matching on that text instead, for example on `Severity: Severe` in the body, or on the signal type in the subject.
{% endhint %}

Read more about [priority and severity](../incidents/priority-and-severity.md).

## Nothing auto-resolves yet

HEAL does send a close notification, and it does carry the signal id. Spike still cannot use it to resolve, because matching an email to an open incident needs the subject line to be identical and a close notification's subject is not the same string as the open one — HEAL's batch templates append `{Signal_Status}` to the subject, and its Lead Signal SMS templates carry the status too.

Until Spike can recognise a recovery email by a keyword and match it on the signal id instead of the whole subject, the practical options are:

* Use the [resolve timer](../incidents/resolve-timer.md) from Step 4, which is what we recommend.
* Resolve incidents by hand as your team closes the signal in HEAL.
* If close notifications are creating incidents nobody needs to see, write an [alert rule](../alerts/alert-rules.md) matching the closed wording in the title and suppress it, so the close email is recorded without paging anybody.

{% hint style="info" %}
Two different signals whose subjects happen to render identically would join into one incident. That is the standard trade-off for any email integration and is unlikely with HEAL, because the signal id is part of the documented subject format.
{% endhint %}

## HEAL's Action API

HEAL ships an **Action API**: a `.jar` plugin dropped into the HEAL server's plugins folder and registered in `plugin-details.json`, which fires on events such as `Signal_Created` and can call out to an external system. A plugin like that could post the signal id to Spike directly and would fix both the matching and the auto-resolve gaps described above.

Spike does not support that path today. It has to be built, shipped and supported per HEAL install, where the email route needs nothing installed on either side. If it is the right shape for your HEAL deployment, talk to us.

## Troubleshooting

<details>

<summary>No incidents show up in Spike</summary>

Work down the chain. **Email Notifications** must be on for the HEAL user whose profile carries the Spike address, **Enable Email Recipients** must be on with the address in **Email To**, that user must be assigned to the application the signal fired on, and the preference for that signal type must not be **Off**. Then check that a signal actually opened in HEAL during the window you are looking at, and that the address in **Email To** matches the one on the Spike integration page exactly, with no trailing characters.

</details>

<details>

<summary>One signal opened several incidents</summary>

HEAL sent notifications whose subjects were not identical, and Spike matches email incidents on the subject. A severity change, an upgrade or a close typically carries its status in the subject, which is enough to make a new incident. Compare the subjects of the two emails to confirm. This is a known limitation of the email route rather than a misconfiguration, and the [resolve timer](../incidents/resolve-timer.md) keeps the extra incidents from sitting open.

</details>

<details>

<summary>Incidents open but never resolve</summary>

That is expected today. Nothing HEAL emails resolves an incident, including its close notification. Turn on the resolve timer from Step 4.

</details>

<details>

<summary>Too many incidents, or the wrong people paged</summary>

Tighten HEAL's notification preferences first, since that is the only filter that stops an email being sent at all. Turn Info signals **Off**, move Default Early Warning to **If Open for too long**, and check the granularity setting, which decides how finely HEAL splits events before they become notifications. Then use [alert rules](../alerts/alert-rules.md) in Spike to route or suppress what still gets through.

</details>

<details>

<summary>Severity is never set on the incident</summary>

There is no structured payload on an email for Spike to read a severity from. Set it with [alert rules](../alerts/alert-rules.md) matching HEAL's wording in the subject or the body.

</details>

<details>

<summary>An email never arrived and the incident is missing details</summary>

Spike's email integrations have a 30 MB payload limit. HEAL's signal notifications sit far below it, but a forensic notification carries an attachment and is the one to look at first. Keep forensic notifications off for the paging user.

</details>
