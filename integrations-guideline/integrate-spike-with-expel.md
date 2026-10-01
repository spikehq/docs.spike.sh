---
description: >-
  Send Expel Workbench alerts, investigations and incidents to Spike over a webhook, so a new detection pages your security on-call and closing it in Workbench resolves the incident.
---

# Integrate Spike with Expel

[Expel](https://expel.com) is a managed detection and response service. Its analysts triage the alerts coming out of your own security tools, open an **investigation** when something looks wrong, and promote it to an **incident** when it turns out to be real. Workbench can post every one of those moments to a webhook, so pointing it at a Spike integration wakes your security on-call the moment Expel decides something needs a human.

Nothing is installed anywhere. You add a webhook destination in Workbench, point notifications at it, and Expel posts to Spike from there.

{% hint style="success" %}
Unlike Expel's PagerDuty integration, this one auto-resolves. Expel's own PagerDuty documentation says that after a security incident is resolved in Workbench you have to resolve it in PagerDuty by hand. The webhook path sends the closure events, so when the analyst closes the alert or the investigation, the incident in Spike resolves itself and the escalation stops. The webhook path also takes as many destinations as you like, where PagerDuty notifications can only reach a single service.
{% endhint %}

## What Spike does with each event

Every delivery carries an `event_name`, and that is what Spike acts on — not the name of the notification that fired, so you can rename or split notifications in Workbench without changing anything in Spike.

Workbench's picker lists nearly fifty notification rules, which come down to 34 distinct `event_name` values across nine data models. Every one of them has a decided behaviour in Spike, so turning on another notification to get more detail cannot quietly close an incident or silently disappear.

The notification names below are the ones Workbench's picker uses today. If yours is worded slightly differently, match on the `event_name` column instead — several rules send the same event name.

### Events that open an incident and page

| `event_name` | Notification in Workbench | Why it pages |
| --- | --- | --- |
| `incident_created` | Incident is created | Expel has confirmed something real |
| `incident_promoted` | Investigation is promoted to an incident | Expel decided the investigation is an incident |
| `incident_reopened` | Incident is reopened | Closed work is live again, and the previous incident in Spike is already resolved |
| `investigation_created` | Investigation is created | Expel has started looking into something |
| `expel_alert_created` | Expel alert is created | A managed alert Expel raised. Off by default in Workbench, so switching it on means you want to hear about each one |
| `expel_alert_reopened` | Expel alert is reopened | Closed and live again, so it needs looking at |
| `remediation_action_assigned` | Remediation action is assigned to me / to my org | Expel has handed a containment step to your team and is waiting on you |
| `remediation_action_automation_failed` | Remediation action automation failed | A containment step that was meant to run itself did not, so it is on your team now |
| `investigative_action_manual_action` | Investigative action has manual action | Expel needs your team to collect something by hand before the investigation can go on |
| `verify_action_assigned` | Verify action is assigned to me / to my org | Expel is blocked until your team approves or denies something |
| `notify_action_assigned` | Notify action is assigned to my org | Expel is telling your team something it has to act on |

### Events that resolve the incident

| `event_name` | Notification in Workbench |
| --- | --- |
| `incident_closed` | Incident is closed |
| `investigation_closed` | Investigation is closed |
| `expel_alert_closed` | Expel alert is closed |

A closure that arrives with nothing open is dropped, which is what happens when the incident was already resolved by hand.

`expel_alert_closed` has to agree with itself before it resolves anything: the event name says the alert closed, and `data.current.status` has to say `CLOSED` too. A delivery whose status is still `OPEN` or `IN_PROGRESS` leaves the incident open, whatever its event name claims.

### Events that are added to the open incident

These appear on the incident's timeline, never page anyone and never resolve anything. When no incident is open for the object they name, they are dropped.

| `event_name` | Notification in Workbench |
| --- | --- |
| `incident_assigned` | Incident is assigned to my org |
| `incident_downgraded` | Incident is downgraded |
| `investigation_assigned` | Investigation is assigned to my org |
| `investigation_alert_added` | Investigation has an alert added |
| `investigation_manual_remediations_completed` | Investigation manual remediations completed |
| `expel_alert_assigned` | Expel alert is assigned to my org |
| `investigative_action_assigned` | Investigative action is assigned to me / to my org |
| `verify_action_acknowledged`, `verify_action_unacknowledged` | Verify action is acknowledged |
| `verify_action_approved`, `verify_action_denied` | Verify action has outcome |
| `remediation_action_automated` | Remediation action is automated |

{% hint style="info" %}
A downgrade — Expel deciding an incident is really an investigation after all — appends rather than resolves. The work is still open, so the page should still stand. The same goes for an assignment: it records who owns it now and leaves the escalation running. And a *denied* verify action means your team said "that is not us", not that Expel closed the investigation.
{% endhint %}

### Events Spike never turns into an incident

| `event_name` | Notification in Workbench | Why |
| --- | --- | --- |
| `investigative_action_analysis_assigned` | Investigative action analysis is assigned | Expel assigning analysis to its own analysts. It is Expel's workflow, with nothing for your team to do |
| `security_device_healthy`, `security_device_unhealthy`, `security_device_first_healthy` | Security device has a health status change / is first healthy | Onboarding and plumbing health, not a security event on your estate. A device can sit unhealthy for days, which is its own stream with its own lifecycle, and this version deliberately leaves it out |
| `assembler_connected`, `assembler_disconnected` | Assembler has a health status change | As above |
| `announcement_created` | Announcement is created | An Expel announcement is reading material |
| `custom_rule_created` | Custom rule is created | A configuration change in Workbench |

Send these to email or Slack in Workbench rather than to the pager. If you do point them at the Spike webhook, Spike answers `200` and records the delivery on the integration's events, where you can read the payload, but nothing is escalated and no incident is opened or closed.

{% hint style="warning" %}
An `event_name` Spike has never seen **opens an incident**, unless it belongs to one of the families above or to the ones Workbench offers without publishing their event names — context labels, support tickets and emerging threats. Opening is the only default that cannot lose a page, and nothing Expel adds later can ever resolve an incident, because resolving is only reachable from the three events in the table above.

The practical consequence: if Expel adds a notification type and you switch it on, it may page your team with a title built from whatever the payload carries. Tell us the `event_name` it arrives with and we will classify it.
{% endhint %}

### Incident identity

Spike identifies the object a delivery is about, and which field that is depends on the event:

| Event family | Identity | Where it sits |
| --- | --- | --- |
| The four `expel_alert_*` events | The Expel alert | `data.expel_alert_id` |
| Everything else — incidents, investigations, remediation, investigative, verify and notify actions | The investigation | `data.investigation_id`, or the nested `data.investigation.id` on the models that name their own object |

Expel repeats that id on every delivery about one object, so the id is what joins a repeat and resolves a closure. The title is free to move in between: the delivery that closes an alert reads differently from the one that opened it, and both still land on one incident in Spike.

Expel has no incident model of its own — an Expel incident **is** an investigation it promoted, and promoting one does not give it a new id. So one id ties the whole story together: the investigation opens, gets assigned, becomes an incident, collects a remediation action, and is closed, all on one incident in Spike, paging your team once. Read more about [grouping incidents](../incidents/grouping-incidents.md).

{% hint style="info" %}
An Expel alert and the investigation Expel triages it into are two different objects, so they are two incidents in Spike. That is deliberate: closing one alert underneath a live investigation must not resolve the investigation's incident, because the investigation is still open.

If you only want one page per threat, leave the **Expel alert is created** notification off and let the investigation and incident events do the paging — triaging alerts is what the MDR service is for. Turn the alert notifications on when you want to see every managed alert Expel raises.
{% endhint %}

### Incident title

The title is the vendor's own words about what is wrong, so it reads as a sentence when Spike dials the on-call and speaks it.

An **investigation** and an **incident** carry a `title` of their own, and that is the title. So do the actions hanging off them — a remediation action is titled by its `action`, and falls back to the investigation it belongs to:

```
Suspicious PowerShell execution on WEB-PROD-03
```

An **Expel alert** carries no `title`, so Spike builds one from the detection and the asset it fired on: `data.current.expel_name` (then `data.current.expel_alias_name`), followed by the hostname or the account named in the prose Expel writes in `data.current.expel_message`:

```
Suspicious PowerShell download cradle on FIN-WS-0421
Impossible travel sign-in for jane.doe@example.com
```

With no detection name, Expel's own sentence in `expel_message` is the title, cut at its first sentence or clause — the rest of the paragraph is on the incident page:

```
Encoded PowerShell on FIN-WS-0421 downloaded and executed a remote payload from 185.199.84.12
```

When the prose names no host and no account, the organisation the alert belongs to is the scope that is left, and it reads `for`:

```
Suspicious PowerShell download cradle for Acme Corp
```

A close and a reopen say so, after the subject, so the incident's event list reads as a life rather than as four copies of one line. A close names Expel's own `close_reason`, spelled out:

```
Suspicious PowerShell download cradle on FIN-WS-0421 reopened
[RESOLVED] Suspicious PowerShell download cradle on FIN-WS-0421 closed as benign
[RESOLVED] Suspicious PowerShell execution on WEB-PROD-03
```

An object that arrives with no title at all says so, with what little it carries, rather than claiming to be a title Expel wrote:

```
Critical Expel incident for Acme Corp (no title yet)
Expel alert with no details
```

{% hint style="info" %}
`data.vendor` is not in any title. "CrowdStrike Falcon" is the tool whose telemetry Expel triaged, not a place anything happened, and "… download cradle on CrowdStrike Falcon" reads as though the PowerShell ran on Falcon. It stays on the payload, where the incident page shows it.

No title carries an id, a URL, a timestamp or a count, so repeat deliveries about one alert in one state always read identically.
{% endhint %}

Use a [Title Remapper](../alerts/title-remapper.md) to build the title differently, for example to put the event type in front:

```handlebars
{{data.body.event_name}} — {{data.body.data.current.title}}
```

### Severity

The webhook envelope has no severity field, so set severity with [alert rules](../alerts/alert-rules.md). The same rules route an incident to another escalation policy or suppress it entirely, which is how you keep remediation actions off the phone at 3am while incidents still page.

{% hint style="info" %}
Expel's own rating is inside the object: `data.current.analyst_severity` on an investigation or incident, with values `CRITICAL`, `HIGH`, `MEDIUM`, `LOW` and `INFO`, and `data.current.expel_severity` on an Expel alert, with values `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `TESTING` and `TUNING`. Spike does not map either onto the incident's severity today, because it is Expel's analyst rating of its own work rather than a statement about your service. An alert rule can match on it and set the severity you want. Read more about [priority and severity](../incidents/priority-and-severity.md).
{% endhint %}

## Prerequisites

* A Workbench user who can reach **Organization Settings**, which an organization administrator has
* An Expel integration in Spike and its webhook URL

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Expel**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Add the webhook destination in Workbench

{% tabs %}
{% tab title="Setup on Expel Workbench" %}
1. **Open your organization's settings:**
   In the Workbench side menu, go to [**Settings → Organization Settings**](https://workbench.expel.io/settings/organizations). If you have more than one organization, pick the one this Spike service covers.

2. **Open the Integrations tab:**
   On the My Organization page, select the **Integrations** tab and scroll to the **Webhooks** section.

3. **Add the destination:**
   Select **Add a webhook destination** and fill in every field Workbench asks for:

   * **Webhook destination name** (required) — `Spike`, or the name of the service you attached the integration to
   * **Webhook destination URL** (required) — the webhook URL from Step 1, starting with `https://`
   * **Webhook auth type** (required) — **Basic Auth**, **HMAC Header** or **Bearer Token**. Spike does not check any of them, so pick whichever your team is comfortable with and put a throwaway value in it. See [The webhook signature](#the-webhook-signature) below

4. **Save and test:**
   Select **Add**, then **Test connection**. Workbench shows "Successfully sent" with a timestamp when the request reached Spike.
{% endtab %}
{% endtabs %}

{% hint style="warning" %}
Expel does not let you edit a webhook's authentication after it is created, and it will not show you the HMAC secret again. Changing it means deleting the destination and adding it back, which also means re-pointing every notification at the new one.
{% endhint %}

{% hint style="warning" %}
Keep the webhook URL out of shared documents and tickets. The token in it is what identifies your integration, so anyone holding it can open incidents on your account. If it leaks, archive the integration in Spike and create a new one.
{% endhint %}

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

## Step 3 — Point notifications at it

Still in **Organization Settings**, open the **Notifications** tab and select **Add Notification** for each rule you want. Both fields are required: set **Conditions** to the event, and **Notify via** to the `Spike` destination from Step 2. Save to activate it.

This is the set worth starting with:

| Notification | What it gives you |
| --- | --- |
| Incident is created | The page you actually want. Expel has confirmed something real |
| Investigation is created | Pages while Expel is still investigating. Leave it off if you only want confirmed incidents |
| Incident is reopened | Work that was closed and is live again |
| **Incident is closed** | **Resolves the incident in Spike** |
| **Investigation is closed** | **Resolves the incident in Spike** |
| Remediation action is assigned to my org | A containment step waiting on your team |
| Verify action is assigned to my org | Expel is blocked until your team approves or denies something |
| Expel alert is created | Optional, and noisy: it pages for every managed alert, before an analyst has triaged it. Pair it with **Expel alert is closed** |
| **Expel alert is closed** | **Resolves the incident an Expel alert opened** |
| Incident is assigned to my org, Investigation is assigned to my org, Incident is downgraded | Optional. They add context to the open incident without paging |

{% hint style="danger" %}
The closed notifications are the ones people forget. Turn on **Incident is created** without **Incident is closed** and every Expel incident stays open in Spike until somebody resolves it by hand — exactly the behaviour teams are used to from Expel's PagerDuty integration, and exactly what this one is here to fix. The same pairing applies to **Expel alert is created** and **Expel alert is closed**.
{% endhint %}

{% hint style="info" %}
Turn on the closed notifications even where the matching created notification is off. A closure Spike has no open incident for is dropped, which is harmless. The reverse — an opening notification with no closure — is what leaves incidents open forever.

If different work should reach different teams, create a second Spike integration on the other service, add a second webhook destination in Workbench, and split the notifications between them. Unlike the PagerDuty destination, webhooks are not limited to one.
{% endhint %}

## Step 4 — Confirm it end to end

**Test connection** on the destination proves the URL is reachable, not that your notifications are wired up. The round trip worth confirming before you trust this overnight is a real one: the next alert or investigation Expel opens should appear in Spike within a few seconds and start escalating through your policy, and closing it in Workbench should resolve it in Spike on its own. Your Expel engagement manager can raise a test alert or investigation if you would rather not wait.

## Things worth knowing

* **Expel retries, and a retry is not a duplicate incident.** Expel treats `200` as delivered. Any other `4xx` or `5xx` is retried on a polynomial backoff at 1, 8, 27, 64 and 125 minutes. Spike answers once it has decided what the delivery did — opened an incident, joined an open one, or resolved it — which in a bad minute can take a little over a minute, so Expel can retry a delivery Spike is still working on. The retry does not open a second incident: identity is the Expel alert id or the investigation id, so the second delivery lands on the incident the first one opened.
* **Spike never answers `406`.** A `406` is how a destination tells Expel to stop retrying, and Spike has no reason to send one: an event it does not act on is accepted and recorded rather than rejected. If Workbench shows `406` against the destination, something between you and Spike is answering, not Spike.
* **Resolving in Spike does not close anything in Expel.** The two are not linked in that direction. Close the alert or investigation in Workbench and let the closure resolve the incident, rather than the other way around, so the two sides stay in step.
* **The payload can be large.** Expel sends UTF-8 JSON up to 10 MB, since `current` and `previous` carry whole objects. All of it lands on the incident page for alert rules and the Title Remapper to read as `data.body.<field>`.

### The webhook signature

With **HMAC Header** auth, Expel signs the body and sends the digest in an `Expel-Signature-256: sha256=<hex>` header. With **Basic Auth** or **Bearer Token** it sends an `Authorization` header instead. Spike verifies none of the three today — the token in the webhook URL is the shared secret, which is the model every other Spike integration uses. Expel asks the field to be filled in, so put a throwaway value there and treat the URL as the credential.

## Payload reference

You do not need to configure any of this. It is here so you know what lands on the incident page, and so you can write [alert rules](../alerts/alert-rules.md) and remappers against it.

Every event arrives in the same envelope: the notification that fired, the event name, the event's guid, and a `data` object holding the model the event happened to.

An Expel alert Expel has just raised — this is the delivery that opens the incident, and the whole body is kept on it:

```json
{
  "rule": "Expel alert is created",
  "event_name": "expel_alert_created",
  "guid": "a3f1c9d2-7b48-4e51-9c0a-2d6f8b1e4a77",
  "data": {
    "expel_alert_id": "a3f1c9d2-7b48-4e51-9c0a-2d6f8b1e4a77",
    "change_action": "created",
    "current": {
      "expel_name": "Suspicious PowerShell download cradle",
      "expel_message": "Encoded PowerShell on FIN-WS-0421 downloaded and executed a remote payload from 185.199.84.12; the process chain started from an Outlook attachment.",
      "expel_severity": "HIGH",
      "expel_signature_id": "EXPEL-WIN-PS-DOWNLOAD-CRADLE",
      "expel_alias_name": "",
      "alert_type": "ENDPOINT",
      "status": "OPEN",
      "status_updated_at": "2026-09-30T22:14:05-04:00",
      "expel_alert_time": "2026-09-30T22:14:02-04:00",
      "activity_first_at": "2026-09-30T22:13:58-04:00",
      "activity_last_at": "2026-09-30T22:14:02-04:00",
      "vendor_alert_count": 3,
      "investigative_action_count": 0,
      "close_reason": null,
      "close_comment": null,
      "created_at": "2026-09-30T22:14:05-04:00",
      "updated_at": "2026-09-30T22:14:05-04:00"
    },
    "previous": null,
    "organization": {
      "name": "Acme Corp"
    },
    "vendor": {
      "name": "crowdstrike_falcon",
      "display_name": "CrowdStrike Falcon"
    },
    "vendor_id": "ldt-8f1c44aa9b2e4d57-4455",
    "investigation": null,
    "updated_by_user_account": null
  }
}
```

That opens an incident titled `Suspicious PowerShell download cradle on FIN-WS-0421`.

The closure repeats the same `expel_alert_id`, which is how Spike knows which incident to resolve, and reports `"status": "CLOSED"`, which is the corroboration Spike requires before resolving anything:

```json
{
  "rule": "Expel alert is closed",
  "event_name": "expel_alert_closed",
  "guid": "a3f1c9d2-7b48-4e51-9c0a-2d6f8b1e4a77",
  "data": {
    "expel_alert_id": "a3f1c9d2-7b48-4e51-9c0a-2d6f8b1e4a77",
    "change_action": "closed",
    "current": {
      "expel_name": "Suspicious PowerShell download cradle",
      "expel_message": "Encoded PowerShell on FIN-WS-0421 downloaded and executed a remote payload from 185.199.84.12; the process chain started from an Outlook attachment.",
      "expel_severity": "HIGH",
      "expel_signature_id": "EXPEL-WIN-PS-DOWNLOAD-CRADLE",
      "expel_alias_name": "",
      "alert_type": "ENDPOINT",
      "status": "CLOSED",
      "status_updated_at": "2026-09-30T23:02:41-04:00",
      "expel_alert_time": "2026-09-30T22:14:02-04:00",
      "activity_first_at": "2026-09-30T22:13:58-04:00",
      "activity_last_at": "2026-09-30T22:14:02-04:00",
      "vendor_alert_count": 3,
      "investigative_action_count": 2,
      "close_reason": "BENIGN",
      "close_comment": "Confirmed benign: the script is Acme's approved patch-deployment job run by svc-patching from the scheduled task. No remote payload executed.",
      "created_at": "2026-09-30T22:14:05-04:00",
      "updated_at": "2026-09-30T23:02:41-04:00"
    },
    "previous": {
      "status": "OPEN",
      "status_updated_at": "2026-09-30T22:14:05-04:00",
      "close_reason": null,
      "close_comment": null,
      "updated_at": "2026-09-30T22:14:05-04:00"
    },
    "organization": {
      "name": "Acme Corp"
    },
    "vendor": {
      "name": "crowdstrike_falcon",
      "display_name": "CrowdStrike Falcon"
    },
    "vendor_id": "ldt-8f1c44aa9b2e4d57-4455",
    "investigation": null,
    "updated_by_user_account": {
      "display_name": "Expel Analyst"
    }
  }
}
```

That resolves the incident, and the responder reads `[RESOLVED] Suspicious PowerShell download cradle on FIN-WS-0421 closed as benign`.

An incident or investigation event carries an Investigation instead, identified by `investigation_id` and titled by `current.title`:

```json
{
  "rule": "Page on new incident",
  "event_name": "incident_created",
  "guid": "8f3c2a1d-4b5e-4c7a-9d0e-1f2a3b4c5d6e",
  "data": {
    "investigation_id": "8f3c2a1d-4b5e-4c7a-9d0e-1f2a3b4c5d6e",
    "change_action": "CREATED",
    "current": {
      "id": "8f3c2a1d-4b5e-4c7a-9d0e-1f2a3b4c5d6e",
      "title": "Suspicious PowerShell execution on WEB-PROD-03",
      "short_link": "https://workbench.expel.io/investigations/8f3c2a1d",
      "is_incident": true,
      "is_downgrade": false,
      "threat_type": "TARGETED",
      "analyst_severity": "HIGH",
      "detection_type": "ENDPOINT",
      "attack_vector": "PHISHING",
      "open_reason": "ALERT",
      "lead_description": "Encoded PowerShell launched by a macro in an emailed document.",
      "next_steps": "Isolate WEB-PROD-03 and collect the parent process tree.",
      "created_at": "2026-09-18T09:14:03.532Z",
      "updated_at": "2026-09-18T09:14:03.532Z"
    },
    "previous": null,
    "organization": {
      "id": "b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e",
      "name": "Acme Corp"
    },
    "lead_expel_alert": {
      "id": "4f8a2b1c-9d3e-4f5a-6b7c-8d9e0f1a2b3c"
    },
    "is_detect_only": false
  }
}
```

The matching `incident_closed` repeats the same `investigation_id` and adds `current.decision` and `current.close_comment`.

### What Spike reads

Everything else on the delivery is kept on the incident for alert rules, remappers and the responder to read.

| Field | What Spike does with it |
| --- | --- |
| `event_name` | Decides whether the delivery opens, joins, resolves or is only recorded |
| `data.expel_alert_id` | Identity of an Expel alert: joins a repeat, resolves a closure |
| `data.investigation_id`, `data.investigation.id` | Identity of everything else |
| `data.current.status` | Has to be `CLOSED` before `expel_alert_closed` resolves anything |
| `data.current.expel_name`, `data.current.expel_alias_name` | The detection, which is the first half of an alert's title |
| `data.current.expel_message` | The host or the account the alert's title ends with, and the title itself when Expel named no detection |
| `data.current.close_reason` | What a closed alert's title says it closed as |
| `data.current.title` | The title of an investigation, an incident or an action |
| `data.organization.name` | The scope an alert's title falls back to, and the untitled placeholder |
| `data.current.analyst_severity`, `data.current.expel_severity` | Only the word in the untitled placeholder. They do not set the incident's severity |
| `data.previous`, `data.investigation`, `data.lead_expel_alert` | Read only to title a delivery whose own object carried nothing |
| `rule`, `guid`, `data.change_action`, `data.vendor`, everything else | Nothing. They are on the incident to read |

{% hint style="info" %}
What is inside `data` depends on the model: an investigation event carries `investigation_id`, an alert event `expel_alert_id`, a remediation action event `remediation_action_id`, and so on, each with `change_action`, `current`, `previous` and the relationships that model has. Workbench's API is JSON:API, so `current` may also arrive as a resource object with the attributes under `current.attributes`. Spike reads both shapes.
{% endhint %}

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Run **Test connection** on the webhook destination first. If that fails, the URL is wrong or unreachable: it should be the full `https://hooks.spike.sh/<your-token>/push-events` with nothing appended, and the integration should not be archived in Spike.

If the test succeeds but real events never arrive, the notifications are the problem rather than the destination. Check on the **Notifications** tab that each rule's **Notify via** actually names the `Spike` destination, since a notification created before the destination existed points somewhere else.

</details>

<details>

<summary>Incidents open but never resolve</summary>

The closed notifications are almost always the reason. On the **Notifications** tab, confirm that **Incident is closed**, **Investigation is closed** and — if you page on alerts — **Expel alert is closed** all notify via the Spike destination. They are separate rules from the created ones, and adding only half a pair is easy to do.

If they are all on and incidents still stay open, check the closure on the integration's events. An investigation closure has to carry the same `investigation_id`, and an alert closure the same `expel_alert_id`, as the delivery that opened the incident. An alert closure also has to report `data.current.status` as `CLOSED`: Spike deliberately leaves the incident open when the status still says `OPEN` or `IN_PROGRESS`, because an alert Expel is still working on is not closed.

</details>

<details>

<summary>An assignment or a downgrade resolved the incident</summary>

It should not, and does not. Assignment, downgrade and action events append to the open incident and leave it open on purpose, because the work is still live. If an incident resolved around the time one arrived, look on the incident for the `incident_closed`, `investigation_closed` or `expel_alert_closed` event that actually resolved it, or for a [resolve timer](../incidents/resolve-timer.md) on the integration.

</details>

<details>

<summary>A title reads "Expel incident for Acme Corp (no title yet)"</summary>

That is the placeholder for a delivery whose object carried no title of its own, and the `(no title yet)` is there so nobody reads it as something Expel wrote. The id and the rest of the payload are still on the incident, and a [Title Remapper](../alerts/title-remapper.md) can build the title from whichever field that event type does carry.

`Expel alert with no details` is the same thing for an alert that arrived with no detection name and no prose.

</details>

<details>

<summary>One threat opened two incidents in Spike</summary>

Grouping is per object. An Expel alert is identified by `expel_alert_id` and an investigation by `investigation_id`, so an alert that Expel then triages into an investigation is two objects and two incidents — which is why **Expel alert is created** is worth leaving off unless you want to see every managed alert. Two investigations likewise mean two pieces of work to Expel: it opens one per detection, and several detections on the same host are still separate to it.

A reopen after the first incident was resolved does open a fresh incident, which is the intent: the previous page is closed and the new work needs its own.

</details>

<details>

<summary>Severity is never set</summary>

Expected. Spike does not read Expel's `analyst_severity` or `expel_severity` onto the incident's severity. Set it with [alert rules](../alerts/alert-rules.md), which can match on those fields, on the event name, or on anything else in the payload.

</details>

Disclaimer: These integration instructions are offered independently by Spike, and Spike is not affiliated with nor a partner of Expel, Inc.
