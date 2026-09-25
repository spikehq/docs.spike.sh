---
description: >-
  Send Expel Workbench incidents and investigations to Spike over a webhook, so a new detection pages your security on-call and closing it in Expel resolves the incident.
---

# Integrate Spike with Expel

[Expel](https://expel.com) is a managed detection and response service. Its analysts watch your alerts around the clock, open an **investigation** when something looks wrong, and raise it to an **incident** when it turns out to be real. Expel Workbench can post every one of those moments to a webhook, so pointing it at a Spike integration wakes your security on-call the moment Expel decides something needs a human.

Nothing is installed anywhere. You add a webhook destination in Workbench, choose which notifications go to it, and Expel posts to Spike from there.

{% hint style="success" %}
Unlike Expel's PagerDuty integration, this one genuinely auto-resolves. Expel's PagerDuty path only ever opens, so teams coming from it are used to closing everything by hand. The webhook path sends the closure events too, so when an Expel analyst closes the investigation, the incident in Spike resolves itself and the escalation stops.
{% endhint %}

## What Spike does with each event

Every delivery carries an `event_name`, and that is what Spike acts on — not the name of the notification rule that fired, so you can rename or split your rules in Workbench without changing anything in Spike.

| Event | What happens in Spike |
| --- | --- |
| `incident_created` | Opens an incident and pages the escalation policy |
| `investigation_created` | Opens an incident and pages the escalation policy |
| `incident_promoted` | Opens an incident. This is Expel deciding an investigation is a real incident |
| `incident_reopened`, `investigation_reopened` | Opens a fresh incident for work Expel has picked back up |
| `remediation_action_assigned` | Opens an incident. A remediation action assigned to your team is waiting on you, not on Expel |
| `incident_closed`, `investigation_closed` | Auto-resolves the open incident. Dropped when nothing is open |
| Assignment, downgrade, comment, status and evidence events | Added as an event on the open incident. They never page anyone and never resolve anything |
| Everything else Expel can send | Recorded on the incident if one is open, and otherwise dropped. No event type opens an incident by accident |

Each event type Expel offers has one of those four behaviours decided for it — open, append, resolve, or ignore. Nothing falls through to "opens an incident" just because it is new or unrecognised, so turning on an extra notification in Workbench to get more detail on the incident page cannot start paging your team for it.

{% hint style="info" %}
A downgrade — Expel deciding an incident is really an investigation after all — appends to the open incident rather than resolving it. The work is still open, so the page should still stand. The same goes for an assignment: it tells the responder who owns it now, and leaves the escalation running.
{% endhint %}

### Incident identity

Spike identifies an Expel incident by `data.investigation_id`. Expel incidents *are* investigations under the hood — promoting one does not give it a new id — so that single field ties the whole story together: the investigation opens, gets assigned, is promoted to an incident, gets a remediation action, and is closed, all on one incident in Spike, paging your team once.

That also means an investigation promoted to an incident does not open a second incident in Spike. The promotion lands on the one that is already open.

### Incident title

The title is the investigation's own title, so it reads as a sentence when Spike dials the on-call and speaks it:

```
Suspicious PowerShell execution on WEB-PROD-03
```

Expel's `data` object is not the same shape for every event type — Workbench documents it per object, so an investigation event carries different fields from a remediation action or a security device event. Spike reads the title out of whichever of those fields carries it, and when an event carries none, the title falls back to the event itself:

```
Expel remediation_action_assigned
```

A title like that is a signal that the event type has no title to give rather than a fault. The link back to Workbench, the investigation id and everything else in the payload stay on the incident page either way, so the responder is one click from the investigation. Use a [Title Remapper](../alerts/title-remapper.md) to build the title differently, for example to put the event type in front of it:

```handlebars
{{data.body.event_name}} — {{data.body.data.title}}
```

### Severity

Expel's webhook payload does not carry a severity, so set it with [alert rules](../alerts/alert-rules.md). The same rules route an incident to another escalation policy or suppress it entirely, which is how you keep, say, low-priority remediation actions off the phone while incidents still page.

{% hint style="info" %}
Expel's own critical/high/medium/low rating lives on the alert inside the investigation, not on the webhook envelope. Run the severity from the Spike side: one alert rule matching `incident_created` at SEV1 and another matching the investigation events at SEV2 gets most teams what they want. Read more about [priority and severity](../incidents/priority-and-severity.md).
{% endhint %}

## Prerequisites

* An Expel Workbench user who can reach **Organization Settings** — creating a webhook destination and notification rules needs an organization administrator
* An Expel integration in Spike and its webhook URL

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Expel**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Add the webhook in Expel Workbench

In Workbench, open **Settings → Organization Settings → Integrations** and add a **Webhook**.

| Field | What to put in it |
| --- | --- |
| Name | `Spike`, or the name of the service you attached the integration to |
| URL | The webhook URL from Step 1 |
| Secret | Leave it blank. See [The webhook signature](#the-webhook-signature) below |

Save it. Workbench now has a destination that your notification rules can point at.

{% hint style="warning" %}
Keep the webhook URL out of shared documents and tickets. The token in it is what identifies your integration, so anyone holding it can open incidents on your account. If it leaks, archive the integration in Spike and create a new one.
{% endhint %}

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

## Step 3 — Choose which notifications reach Spike

Expel's notification picker offers roughly fifty events across investigations, incidents, alerts, remediation actions and security devices. Sending all of them to the pager is not the goal — Spike only pages on the handful that mean a human is needed, and everything else is there to give the incident page more detail.

Create the notification rules under **Settings → Notifications**, point each at the `Spike` webhook from Step 2, and start with this set:

| Notification | Why it is on the list |
| --- | --- |
| Incident created | The page you actually want. Expel has confirmed something real |
| Investigation created | Pages while Expel is still investigating. Leave it off if you only want confirmed incidents |
| Incident promoted | An investigation Expel has escalated to an incident |
| Incident reopened, Investigation reopened | Work that was closed and is live again |
| Incident closed, Investigation closed | **The ones that make auto-resolve work.** Without them nothing ever closes in Spike |
| Remediation action assigned | An action assigned to your team, waiting on you |
| Assignment and downgrade events | Optional. They add context to the open incident without paging |

{% hint style="danger" %}
The closed notifications are the ones people forget. Turn on `incident_created` without `incident_closed` and every Expel incident stays open in Spike until somebody resolves it by hand, which is exactly the behaviour teams are used to from Expel's PagerDuty integration and exactly what this one is meant to fix.
{% endhint %}

{% hint style="info" %}
Turn on the closed notifications even if the matching created notification is off. A closure Spike has no open incident for is simply dropped, which is harmless. The reverse — an opening notification with no closure — is what leaves incidents open forever.

If different Expel investigations should reach different teams, create a second Spike integration on the other service, add a second webhook in Workbench, and split the notification rules between them.
{% endhint %}

## Step 4 — Send a test event

Expel's webhook destination has no synthetic test payload, so confirm it with real work: ask your Expel engagement manager to trigger a test investigation, or wait for the next real one. An incident appears in Spike within a few seconds of the notification firing and starts escalating through the policy you attached.

Once it closes in Workbench, the incident in Spike should resolve on its own. That round trip is the thing worth confirming before you trust the integration overnight.

## Things worth knowing

* **Expel retries, and Spike answers before it escalates.** A delivery that does not get a `2xx` is retried at 1, 8, 27, 64 and 125 minutes. Spike answers `200` as soon as it has accepted the payload and escalates afterwards, so a long escalation policy — several rounds of phone calls — never holds the response open and never causes a retry. The retries only matter if Spike or the network is genuinely unreachable.
* **Spike never answers `406`.** A `406` is how you tell Expel to stop retrying a delivery, and Spike has no reason to send one: a payload it cannot use is accepted and dropped rather than rejected. If Workbench shows `406` against the destination, something between you and Spike is answering, not Spike.
* **Resolving in Spike does not close anything in Expel.** The two are not linked in this direction. Close the investigation in Workbench and let the closure resolve the incident, rather than the other way around, so the two sides stay in step.
* **A closure that arrives with nothing open is dropped.** That is normal — it happens when the incident was already resolved by hand, or when the opening notification was not turned on.
* **Repeats are grouped.** Several events about the same `investigation_id` land on the one incident, so a busy investigation pages your team once. Read more about [grouping incidents](../incidents/grouping-incidents.md).

### The webhook signature

Expel can sign the body and send the result in an `Expel-Signature-256: sha256=<hex>` header. Spike does not verify that header today, so leave the secret blank when you create the webhook. The token in the webhook URL is the shared secret, which is the model every other Spike integration uses.

## Payload reference

You do not need to configure any of this. It is here so you know what lands on the incident page, and so you can write [alert rules](../alerts/alert-rules.md) and remappers against it.

Expel posts `application/json` in the same envelope for every event type: the notification rule that fired, the event name, an event guid, and a `data` object describing the object the event happened to.

```json
{
  "rule": "Page on new incident",
  "event_name": "incident_created",
  "data": {
    "investigation_id": "inv-8f3c2a1d",
    "title": "Suspicious PowerShell execution on WEB-PROD-03",
    "short_link": "https://workbench.expel.io/investigations/inv-8f3c2a1d"
  },
  "guid": "evt-9c1d4b2f"
}
```

The closure repeats the same `investigation_id`, which is how Spike knows which incident to resolve:

```json
{
  "rule": "Page on new incident",
  "event_name": "incident_closed",
  "data": {
    "investigation_id": "inv-8f3c2a1d",
    "title": "Suspicious PowerShell execution on WEB-PROD-03",
    "short_link": "https://workbench.expel.io/investigations/inv-8f3c2a1d"
  },
  "guid": "evt-1a2b3c4d"
}
```

{% hint style="info" %}
`rule`, `event_name`, `data` and `guid` are on every delivery. What is inside `data` is not fixed: Expel documents it per object — investigation, incident, alert, remediation action, security device — so a remediation action event carries different fields from an investigation event. Spike takes the investigation id and the title from wherever they appear and keeps the whole body on the incident, so the fields a particular event type happens to carry are all available to alert rules and the Title Remapper as `data.body.<field>`.
{% endhint %}

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Check that the notification rule in Workbench is enabled and points at the `Spike` webhook rather than at email or Slack, and that the webhook URL is the full `https://hooks.spike.sh/<your-token>/push-events` with nothing appended. Then check the integration has not been archived in Spike. Expel shows delivery attempts against the webhook, and a run of failures there means it could not reach the URL as written.

</details>

<details>

<summary>Incidents open but never resolve</summary>

The closed notifications are almost always the reason. Open **Settings → Notifications** in Workbench and confirm that `incident_closed` and `investigation_closed` both point at the Spike webhook — they are separate rules from the created ones and it is easy to add only half the pair.

If they are on and incidents still stay open, check that the closure carries the same `investigation_id` as the opening event on the incident page. A closure for an investigation Spike never heard of has nothing to resolve.

</details>

<details>

<summary>An assignment or a downgrade resolved the incident</summary>

It should not, and does not. Assignment and downgrade events append to the open incident and leave it open on purpose, because the work is still live. If an incident resolved around the time one arrived, look on the incident for the closure event that actually resolved it, or for a [resolve timer](../incidents/resolve-timer.md) on the integration.

</details>

<details>

<summary>A title reads "Expel incident_created" instead of the investigation title</summary>

That is the fallback for an event whose `data` carried no title. Some of Expel's event types genuinely do not carry one. The investigation link and id are still on the incident, and a [Title Remapper](../alerts/title-remapper.md) can build the title out of whichever field that event type does carry.

</details>

<details>

<summary>One investigation opened several incidents in Spike</summary>

Grouping is on `data.investigation_id`, so two incidents mean two investigations. Expel opens a separate investigation per detection, and several detections on the same host are still separate pieces of work to Expel. A promotion or a reopen of the same investigation lands on the one incident.

A reopen after the first incident was resolved does open a fresh incident, which is the intent — the previous page is closed and the new work needs its own.

</details>

<details>

<summary>Severity is never set</summary>

Expected. Expel's webhook payload carries no severity field, so there is nothing for Spike to read. Set it with [alert rules](../alerts/alert-rules.md) matching on the event name or on anything else in the payload.

</details>

Disclaimer: These integration instructions are offered independently by Spike, and Spike is not affiliated with nor a partner of Expel, Inc.
