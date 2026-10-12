---
description: >-
  Send Expel Workbench notifications to Spike so an Expel alert, investigation or incident pages your on-call rotation by phone, SMS, Slack or Teams, and resolves its incident when Expel's analysts close it.
---

# Integrate Spike with Expel

[Expel](https://expel.com) is managed detection and response. Its analysts triage the alerts your own security tools raise, open an investigation when something needs looking into, promote the ones that turn out to be real into incidents, and hand remediation actions back to you. All of that work happens in the Expel Workbench.

Workbench posts every one of those moves as a webhook. Point the webhook destination at a Spike integration URL and an Expel alert pages your on-call rotation the moment Expel raises it, every later move on that same object lands on the incident already open instead of paging again, and the incident resolves itself when Expel closes the object in Workbench.

Nothing is installed anywhere. One webhook destination and a handful of notification rules, configured once in Workbench, cover every Expel alert, investigation and incident for the organisation.

## What Spike does with each Workbench event

Every delivery carries an `event_name`, and that field alone decides what Spike does with it. Ten of Workbench's events are acted on; everything else Expel sends is kept, on the incident it belongs to.

### Events that open an incident and page

| `event_name` | The notification rule in Workbench |
| --- | --- |
| `expel_alert_created` | Expel alert is created |
| `expel_alert_reopened` | Expel alert is reopened |
| `investigation_created` | Investigation is created |
| `incident_created` | Incident is created |
| `incident_reopened` | Incident is reopened |
| `remediation_action_assigned` | Remediation action is assigned to me |
| `remediation_action_automation_failed` | Remediation action is assigned to me |

The two remediation events are there because a remediation action is work handed to you: assigned means somebody has to go and do it, and an automation failure means Expel tried to do it for you and could not.

### Events that resolve an incident

| `event_name` | The notification rule in Workbench |
| --- | --- |
| `expel_alert_closed` | Expel alert is closed |
| `investigation_closed` | Investigation is closed |
| `incident_closed` | Incident is closed |

A close is the only recovery there is. A downgrade, a reassignment or a reopen never resolves a Spike incident, because none of them is the finding being dealt with.

### Everything else

Every other Workbench event — `expel_alert_assigned`, `investigation_alert_added`, `incident_downgraded`, `incident_promoted`, the investigative, verify and notify actions, `security_device_unhealthy`, `assembler_disconnected`, `announcement_created` — is added as an event on the matching open incident. It never pages again, and it is dropped when nothing is open. Expel is telling you something about work in progress, not about a new problem.

{% hint style="info" %}
A recovery or an update that arrives with no matching open incident is dropped rather than turned into a new incident. That happens when the opening notification was never ticked in Workbench, or when the incident was already resolved in Spike. Resolving an incident in Spike does not close anything in Workbench; close the object in Workbench and let the close webhook resolve the incident to keep the two sides in step.
{% endhint %}

## Incident identity

Spike identifies the incident by the id of the Expel object the delivery is about — `data.expel_alert_id` for an Expel alert, `data.investigation_id` for an investigation or an incident, and the delivery's top-level `guid` for the models that carry neither, such as a remediation action or a security device. Expel repeats that id on the created delivery, on every move in between and on the close, so one alert's whole life reads as one Spike incident: it pages once, the triage lands on it, and Expel closing it resolves it.

Identity is the object, not the host and not the detection rule. The same noisy rule firing twice on one laptop is two Expel alerts with two ids, so it is two incidents — which is what you want, since Expel's analysts triage each one separately.

{% hint style="warning" %}
An Expel alert and the investigation Expel opens from it are **two objects with two ids**, so they are two Spike incidents. If you tick both `Expel alert is created` and `Investigation is created`, one piece of activity can page your rotation twice: once when the alert is raised and again when an analyst starts looking into it.

Pick the level your team actually responds at. Most teams want the Expel alert rules, or the investigation and incident rules, not both. Step 3 has a recommended starting set.
{% endhint %}

## Incident title

Expel writes its own prose about what is wrong, so the title is Expel's own line whenever Expel gives one that reads as a line:

```
Encoded PowerShell on FIN-WS-0421 downloaded and ran a remote payload from 185.199.84.12; the process chain started from an Outlook attachment.
```

That comes from `expel_message` on an Expel alert, and from `title`, then `lead_description`, then `open_summary` on an investigation or an incident — the first of those that fits a title whole:

```
Suspicious PowerShell execution on WEB-PROD-03
```

When Expel's prose is a paragraph rather than a line, the title is built instead: the detection Expel named, then where it fired. The where is the host named in Expel's own sentence, else the security device the alert came out of (`data.vendor.name`), else your organisation:

```
Encoded PowerShell download cradle on FIN-WS-0421
Encoded PowerShell download cradle on Crowdstrike Falcon
Encoded PowerShell download cradle for Acme Corp
```

A delivery that carries no prose at all is titled by what it is about:

```
Isolate host remediation action assigned
Crowdstrike Falcon security device unhealthy
```

And a close is written as a recovery, in Expel's words, naming the disposition its analysts closed on:

```
Encoded PowerShell download cradle closed by Expel as BENIGN
Suspicious PowerShell execution on WEB-PROD-03 closed by Expel as TRUE_POSITIVE
```

Titles are capped at 200 characters and carry no ids, no `short_link`, no counters and no timestamps. Those are all on the incident page.

{% hint style="info" %}
A close reads differently from the notification that opened the incident, and that is on purpose — the person scanning an event list needs to know which of their open incidents went away. It still resolves the right incident, because matching is done on the Expel object's id and never on the title.
{% endhint %}

Use a [Title Remapper](../alerts/title-remapper.md) if your team reads Expel alerts by detection and vendor rather than by Expel's sentence:

```handlebars
{{data.body.data.current.expel_name}} ({{data.body.data.vendor.name}})
```

## Severity

Spike does not read a severity from the Expel payload. Expel's own `expel_severity` on an alert and `analyst_severity` on an investigation are kept on the incident but do not set the severity badge, so incidents open at your integration's default.

If you want Expel's levels on the badge, write an [alert rule](../alerts/alert-rules.md) on `expel_severity` or `analyst_severity`. Alert rules can also route an incident to another service or escalation policy, or suppress it entirely. Read more about [priority and severity](../incidents/priority-and-severity.md).

## Prerequisites

* An Expel Workbench account with **organization admin** permissions — Expel requires them to add a webhook destination and to create organization notifications
* An Expel integration in Spike and its webhook URL
* Nothing to open on your own network. Expel calls out to Spike

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Expel**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Add Spike as a webhook destination in Workbench

1. **Sign in to Workbench** at [https://workbench.expel.io](https://workbench.expel.io) and, in the side menu, go to **Settings → Organization Settings**. Select your organization if you have more than one.

2. **Open the Integrations tab,** scroll to the Webhooks section and select **Add a webhook destination**.

3. **Fill in the destination.** All three fields are required:
   * **Webhook destination name** — something your team will recognise, for example `Spike`
   * **Webhook destination URL** — the URL from Step 1. Workbench requires it to start with `https://`, which it does
   * **Webhook auth type** — see the note below

4. **Select Add,** then select **Test connection** and look for the `Successfully sent` message with a timestamp.

{% hint style="warning" %}
**Workbench has no "no auth" option,** so you have to pick one of **Basic Auth**, **HMAC Header** or **Bearer Token**. Choose **Bearer Token** and enter any value you like, for example `spike` — Spike does not check it, and the token already in the webhook URL is the credential, the same model every other Spike integration uses. Spike redacts the `Authorization` header before storing the request, so the value never shows up on the incident page.

Treat the webhook URL like a password. If it leaks, archive the integration in Spike and create a new one, then update the destination URL in Workbench.
{% endhint %}

{% hint style="info" %}
Expel does not document what its **Test connection** posts. A test delivery that names no `event_name` cannot be classified, and Spike opens an incident titled `Expel alert with no details` for it rather than throwing away something that might be a real finding. Run the test before you attach a live escalation policy, or expect one incident to acknowledge and resolve afterwards.
{% endhint %}

## Step 3 — Add the notifications that feed it

A webhook destination receives nothing until at least one organization notification points at it. This is the step that decides which Expel events reach Spike.

1. On the same **Settings → Organization Settings** page, select the **Notifications** tab and select **Add Notification**.
2. Under **Conditions**, select an event and then an action — for example the `Expel alert` event with the `is created` action. Some events also let you add conditions of your own.
3. Under **Notify via**, select the webhook destination you named in Step 2.
4. Select **Save**, and repeat for each rule you want.

A good starting set, which pages on triaged detections and closes itself:

* **Expel alert is created**
* **Expel alert is closed**
* **Expel alert is reopened**

Add **Investigation is created** / **is closed** and **Incident is created** / **is closed** / **is reopened** if your team responds at that level instead — and read the warning under [Incident identity](#incident-identity) before you add them alongside the Expel alert rules.

{% hint style="info" %}
Always tick the close that matches each open you tick. `Expel alert is created` without `Expel alert is closed` pages your rotation and then leaves the incident open until somebody resolves it by hand. A [resolve timer](../incidents/resolve-timer.md) is a reasonable backstop, not a replacement.

One Workbench rule, `Remediation action is assigned to me`, produces two events — `remediation_action_assigned` and `remediation_action_automation_failed` — and Spike opens an incident for both. There is no close event for a remediation action, so those incidents are resolved in Spike by the person who carries the action out.
{% endhint %}

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

## Step 4 — Confirm it end to end

Expel has no "send me a sample alert" button beyond **Test connection**, so the first real Expel alert is the test. Watch for all three moments:

1. An Expel alert is raised and an incident opens in Spike with Expel's own sentence as the title, on the service you attached, escalating through your policy.
2. An analyst assigns it or adds it to an investigation, and that lands on the same incident without paging again.
3. The analyst closes the alert in Workbench and the incident resolves itself, with `closed by Expel as <disposition>` on the event list.

If the first step works and the other two do not, the notification rules are the thing to check: the close and the update rules have to point at the same webhook destination as the open.

## Payload reference

Expel sends its own payload and there is no template to edit, so this section is a reference for what lands on the incident page, and for what [alert rules](../alerts/alert-rules.md) and the [Title Remapper](../alerts/title-remapper.md) can read as `data.body.<field>`.

Every delivery has the same envelope — `rule` (your own name for the notification rule that fired, which Spike ignores), `event_name`, `guid` and `data` — and `data` holds one Expel object, with the object's own attributes a level down again in `current` and `previous`.

An `expel_alert_created`, which opens the incident:

```json
{
  "rule": "Expel alert is created",
  "event_name": "expel_alert_created",
  "guid": "7c1f0b48-2d93-4a5e-9f6b-3a8e5d21c044",
  "data": {
    "expel_alert_id": "7c1f0b48-2d93-4a5e-9f6b-3a8e5d21c044",
    "change_action": "created",
    "current": {
      "id": "7c1f0b48-2d93-4a5e-9f6b-3a8e5d21c044",
      "expel_name": "Encoded PowerShell download cradle",
      "expel_message": "Encoded PowerShell on FIN-WS-0421 downloaded and ran a remote payload from 185.199.84.12; the process chain started from an Outlook attachment.",
      "expel_severity": "HIGH",
      "expel_alias_name": "",
      "expel_signature_id": "EXPEL-WIN-PS-DOWNLOAD-CRADLE",
      "alert_type": "ENDPOINT",
      "status": "OPEN",
      "status_updated_at": "2026-10-05T04:18:11.284Z",
      "expel_alert_time": "2026-10-05T04:18:02.000Z",
      "activity_first_at": "2026-10-05T04:17:54.000Z",
      "activity_last_at": "2026-10-05T04:18:02.000Z",
      "vendor_alert_count": 3,
      "investigative_action_count": 0,
      "close_reason": null,
      "close_comment": null,
      "created_at": "2026-10-05T04:18:11.284Z",
      "updated_at": "2026-10-05T04:18:11.284Z"
    },
    "previous": null,
    "organization": {
      "id": "b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e",
      "name": "Acme Corp"
    },
    "vendor": {
      "id": "5a21e7c0-6b14-4a9d-8f33-c0d7e1b45a92",
      "name": "crowdstrike_falcon"
    },
    "vendor_id": "ldt:8f1c44aa9b2e4d57:4455",
    "investigation": null,
    "updated_by_user_account": null
  }
}
```

It opens an incident titled with Expel's own sentence:

```
Encoded PowerShell on FIN-WS-0421 downloaded and ran a remote payload from 185.199.84.12; the process chain started from an Outlook attachment.
```

The `expel_alert_closed` for the same alert, which resolves it. Note that `guid` and `data.expel_alert_id` are the ones the created delivery carried — that is what joins the two:

```json
{
  "rule": "Expel alert is closed",
  "event_name": "expel_alert_closed",
  "guid": "7c1f0b48-2d93-4a5e-9f6b-3a8e5d21c044",
  "data": {
    "expel_alert_id": "7c1f0b48-2d93-4a5e-9f6b-3a8e5d21c044",
    "change_action": "closed",
    "current": {
      "id": "7c1f0b48-2d93-4a5e-9f6b-3a8e5d21c044",
      "expel_name": "Encoded PowerShell download cradle",
      "expel_message": "Encoded PowerShell on FIN-WS-0421 downloaded and ran a remote payload from 185.199.84.12; the process chain started from an Outlook attachment.",
      "expel_severity": "HIGH",
      "expel_alias_name": "",
      "expel_signature_id": "EXPEL-WIN-PS-DOWNLOAD-CRADLE",
      "alert_type": "ENDPOINT",
      "status": "CLOSED",
      "status_updated_at": "2026-10-05T05:02:41.903Z",
      "expel_alert_time": "2026-10-05T04:18:02.000Z",
      "activity_first_at": "2026-10-05T04:17:54.000Z",
      "activity_last_at": "2026-10-05T04:18:02.000Z",
      "vendor_alert_count": 3,
      "investigative_action_count": 2,
      "close_reason": "BENIGN",
      "close_comment": "Confirmed benign: the script is Acme's approved patch-deployment job, run by svc-patching from a scheduled task. No remote payload executed.",
      "created_at": "2026-10-05T04:18:11.284Z",
      "updated_at": "2026-10-05T05:02:41.903Z"
    },
    "previous": {
      "status": "OPEN",
      "status_updated_at": "2026-10-05T04:18:11.284Z",
      "close_reason": null,
      "close_comment": null,
      "updated_at": "2026-10-05T04:18:11.284Z"
    },
    "organization": {
      "id": "b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e",
      "name": "Acme Corp"
    },
    "vendor": {
      "id": "5a21e7c0-6b14-4a9d-8f33-c0d7e1b45a92",
      "name": "crowdstrike_falcon"
    },
    "vendor_id": "ldt:8f1c44aa9b2e4d57:4455",
    "investigation": null,
    "updated_by_user_account": {
      "display_name": "Expel Analyst"
    }
  }
}
```

It resolves the incident, and the event reads:

```
Encoded PowerShell download cradle closed by Expel as BENIGN
```

An `investigation_created`, which carries `data.investigation_id` instead and is titled from the analyst's own one-liner:

```json
{
  "rule": "Investigation is created",
  "event_name": "investigation_created",
  "guid": "8f3c2a1d-4b5e-4c7a-9d0e-1f2a3b4c5d6e",
  "data": {
    "investigation_id": "8f3c2a1d-4b5e-4c7a-9d0e-1f2a3b4c5d6e",
    "change_action": "created",
    "current": {
      "id": "8f3c2a1d-4b5e-4c7a-9d0e-1f2a3b4c5d6e",
      "title": "Suspicious PowerShell execution on WEB-PROD-03",
      "short_link": "https://workbench.expel.io/investigations/8f3c2a1d",
      "is_incident": false,
      "threat_type": "TARGETED",
      "analyst_severity": "HIGH",
      "detection_type": "ENDPOINT",
      "open_summary": "Opened to confirm whether the encoded PowerShell on WEB-PROD-03 reached the payload it requested, and whether the host made any outbound connection after it.",
      "lead_description": "Encoded PowerShell launched by a macro in an emailed document on WEB-PROD-03.",
      "decision": null,
      "close_comment": null,
      "created_at": "2026-10-05T09:14:03.532Z",
      "updated_at": "2026-10-05T09:14:03.532Z"
    },
    "previous": null,
    "organization": {
      "id": "b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e",
      "name": "Acme Corp"
    },
    "lead_expel_alert": {
      "id": "7c1f0b48-2d93-4a5e-9f6b-3a8e5d21c044"
    }
  }
}
```

```
Suspicious PowerShell execution on WEB-PROD-03
```

Spike keeps the whole body on the incident, so every field above — and anything Expel adds to a model later — is available to alert rules and the Title Remapper.

## Things worth knowing

* **One destination covers every event.** There is no separate setup per event or per Expel object. Add the destination once and point as many notification rules at it as you want.
* **Several Spike integrations are fine.** If different teams own different parts of the estate, create one Spike integration per team and one Workbench destination per integration, then point each notification rule at the right destination.
* **Resolving in Spike does not touch Workbench.** The Expel alert, investigation or incident stays open in Workbench until an analyst closes it there.
* **The disposition is shown, never acted on.** `BENIGN`, `FALSE_POSITIVE`, `TRUE_POSITIVE`, `TESTING`, `INCONCLUSIVE` and the rest all resolve the incident. A close is a close: Expel is finished with it either way, and the disposition is in the title so the responder can see which it was.
* **Workbench's own notifications are separate.** Email and Slack notifications you have already set up in Workbench keep working; the webhook destination is additional, not a replacement.

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Check the three things in order. First, that the destination URL is the full `https://hooks.spike.sh/<your-token>/push-events` with nothing appended, and that the integration has not been archived in Spike — **Test connection** in Workbench answers that in one click.

Second, that at least one organization notification points at the destination. A destination with no notification pointing at it receives nothing at all, and this is the step most often missed.

Third, that the event you are expecting is one of the rules you ticked. Workbench sends only what its notification rules ask for.

</details>

<details>

<summary>Workbench will not let me save the destination without credentials</summary>

Expected — Workbench has no "no auth" option. Pick **Bearer Token** and enter any value. Spike does not check it, because the token in the webhook URL is the credential.

</details>

<details>

<summary>Every update opens its own incident</summary>

Open two of the incidents in Spike and compare the payloads on the incident page. If `data.expel_alert_id` (or `data.investigation_id`, or `guid`) differs, Expel raised separate objects, and separate objects are separate incidents by design — a rule firing twice on one host is two Expel alerts.

If the ids match and the incidents still pile up, check that the original opening notification was delivered. An update that arrives when nothing is open cannot join anything.

</details>

<details>

<summary>One piece of activity pages us twice</summary>

You have ticked both the Expel alert rules and the investigation or incident rules. The alert and the investigation Expel opens from it are two objects with two ids, so they are two Spike incidents. Pick the level your team responds at and untick the other, or route one of them to a different service.

</details>

<details>

<summary>Incidents never resolve</summary>

Spike resolves on a close, and only while the incident is still open. Confirm that **Expel alert is closed** — or **Investigation is closed** / **Incident is closed**, whichever matches the rule that opened it — is one of your notification rules and points at the Spike destination. A close is the only event that resolves anything: a downgrade, a reassignment and a completed remediation do not.

Remediation action incidents have no close event at all; resolve those in Spike when the action is done.

</details>

<details>

<summary>An incident titled "Expel alert with no details" opened</summary>

Spike could not read an `event_name` or any prose from the delivery — Workbench's **Test connection** is the usual cause. Spike opens an incident for an unreadable delivery rather than dropping it, because the alternative is losing a real security finding silently. Acknowledge it, resolve it, and if it was not the connection test, the payload on the incident page is what to send to Spike support.

</details>

<details>

<summary>The severity badge ignores Expel's severity</summary>

Expected. Spike does not set severity from the Expel payload. `expel_severity` and `analyst_severity` are on the incident, so an [alert rule](../alerts/alert-rules.md) matching either can set whatever severity you want, and can also route or suppress the incident.

</details>

Disclaimer: These integration instructions are offered independently by Spike.sh, and Spike.sh is not affiliated with nor a partner of Expel, Inc.
