---
description: >-
  Send DBmarlin database performance alerts to Spike so a breached instance or host alert rule pages your DBA on-call by phone, SMS, Slack or Teams, and the incident resolves itself when the alert ends.
---

# Integrate Spike with DBmarlin

[DBmarlin](https://www.dbmarlin.com) watches your database instances and the hosts they run on, and raises an alert when one of your alert rules is breached. Its Webhook integration posts JSON to a URL of your choosing when an alert starts and again when it ends, so Spike can page the database on-call rotation on the breach and close the incident by itself once the statistic comes back under its threshold.

Nothing is installed anywhere. You point DBmarlin's Webhook integration at a Spike integration URL, paste the two templates published below into it, and the two stay in sync from there.

{% hint style="warning" %}
**A DBmarlin server has room for exactly one Webhook integration.** DBmarlin's own words: "you can only have one Webhook integration defined." Pointing it at Spike means it cannot also post to Slack, an internal service or another Spike integration, and editing it later to send somewhere else silently stops every DBmarlin incident in Spike. If a second destination needs the same alerts, fan them out from a relay of your own or use DBmarlin's Email, Slack or ServiceNow integration for the other one, as described under Troubleshooting below.
{% endhint %}

{% hint style="info" %}
The Webhook integration requires **DBmarlin v5.11 or later**. Older servers have Email, Slack and ServiceNow integrations but no Webhook, so there is nothing to point at Spike until you upgrade.
{% endhint %}

## What Spike does with each alert

| DBmarlin webhook | What happens in Spike |
| --- | --- |
| An alert starts (`phase: started`) | Opens an incident for that rule and target, and pages your escalation policy |
| The same alert starts again while the incident is open | Added as an event to the incident already open. It never pages twice |
| The alert ends (`phase: ended`) | Auto-resolves the open incident |
| An alert ends with nothing open in Spike | Dropped. There is no incident left to resolve |

Both instance alerts and host alerts go through the same integration and are handled identically. You do not need one Spike integration for instances and another for hosts, which matters because DBmarlin only has the one Webhook integration to give.

## How incidents are identified

DBmarlin does not give an alert occurrence an id of its own, so Spike identifies an alert by the rule and the thing the rule fired on:

* `rule_id` — the alert rule in DBmarlin, stable across restarts and rule renames
* `target` — the datasource name for an instance alert, the hostname for a host alert
* `kind` — `instance` or `host`

One rule breaching on three instances is three incidents, because `target` differs. The same rule breaching on an instance and on a host is two incidents as well, even in the unlikely case that a datasource and a machine share a name, because `kind` is part of the identity. An alert that starts, ends and starts again is two incidents: the first was resolved by its own end event.

{% hint style="info" %}
Renaming an alert rule in DBmarlin keeps the incidents together, because `rule_id` does not change. Renaming a datasource or a host does not, so a rename mid-alert leaves the open incident behind and the next start event opens a new one. Rename during quiet hours, or resolve the stale incident by hand.
{% endhint %}

Repeats of the same alert are [grouped](../incidents/grouping-incidents.md) under the incident already open, and the incident shows how many times DBmarlin sent it.

## Incident titles

The title is the rule and what it fired on, so on-call can tell from a Slack message, a lock screen or a phone call which rule broke and where:

```
Lock wait time on prod-postgres-01
```

That is `{rule} on {target}` — `rule` is the alert rule's name in DBmarlin, `target` is the datasource name for an instance alert and the hostname for a host alert. A host alert reads the same way:

```
CPU utilisation on db-node-04
```

| Alert | Title |
| --- | --- |
| Instance rule `Lock wait time` on datasource `prod-postgres-01` | `Lock wait time on prod-postgres-01` |
| Host rule `CPU utilisation` on host `db-node-04` | `CPU utilisation on db-node-04` |
| An alert that arrives with no rule name | `DBmarlin alert on prod-postgres-01` |

{% hint style="info" %}
The values, the threshold, the units, the time window and the link back into DBmarlin are deliberately kept out of the title. They differ between the start event and the end event, and a title that moves breaks the things that read it: the **Repeated N times** grouping on an incident, duplicate suppression, and any [alert rule](../alerts/alert-rules.md) matching on title text. All of it is on the incident page instead.
{% endhint %}

Name your DBmarlin rules the way you want to hear them at 3am. `Lock wait time` reads as a problem; `Rule 17` does not.

### Title Remapper sample

A [Title Remapper](../alerts/title-remapper.md) on the DBmarlin integration replaces the default title with one you write against the payload, which is how you fold in the breached value or the environment:

```handlebars
{{data.rule}} on {{data.target}} — {{data.new_value}}{{data.units}} over {{data.threshold}}{{data.units}}
```

Output: `Lock wait time on prod-postgres-01 — 890ms over 500ms`

Write the remapper against `rule`, `target` and `kind` only if you want repeats to keep grouping on one incident. `new_value`, `old_value`, `from` and `to` change between the start and the end of the same alert, so a title built on them reads well on the page and stops the end event finding the incident the start event opened.

## Severity

DBmarlin has a single alert level. There is no severity, priority or urgency field anywhere in its alerting, so nothing in the payload can set the severity of a Spike incident, and every DBmarlin incident arrives at your integration's default.

Set severity with [alert rules](../alerts/alert-rules.md) in Spike instead. The same rules route the incident to another escalation policy or suppress it entirely, which is how you send a `dev-mysql-02` breach somewhere quieter than the pager while `prod-postgres-01` still wakes the DBA. Read more about [priority and severity](../incidents/priority-and-severity.md).

## Prerequisites

* DBmarlin v5.11 or later, and permission to edit its Integrations
* At least one DBmarlin alert rule on an instance or host statistic
* A DBmarlin integration in Spike and its webhook URL

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → DBmarlin**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Point DBmarlin's Webhook integration at Spike

{% tabs %}
{% tab title="Setup on DBmarlin" %}
1. **Open the integration:**
   In DBmarlin, click **Integrations** and then **Edit** on the **Webhook** integration. There is only one, and this is it.

2. **Webhook URL:**
   Paste the Spike webhook URL from Step 1, including `/push-events`.

3. **DBmarlin URL:**
   Set this to the URL your team uses to reach DBmarlin, such as `https://dbmarlin.acme.internal`. DBmarlin builds the `url` field in the payload from it, and that is the link a responder clicks from the Spike incident to land on the right chart. Leave it wrong and the incident carries a link nobody can open.

4. **Headers:**
   Add `Content-Type` with the value `application/json` if it is not already there. Spike reads the body as JSON. No other header is needed — the token in the URL is what authenticates the delivery.

5. **Content Template:**
   Replace whatever is in the field with Spike's instance template from below, exactly as published.

6. **Host Content Template:**
   Replace it with Spike's host template from below, exactly as published.

7. **Enable and save:**
   Turn the integration on and save it.
{% endtab %}
{% endtabs %}

{% hint style="danger" %}
DBmarlin ships a default Content Template of its own. Spike cannot read it, so an integration left on the default sends deliveries that produce no incidents. Paste the two templates below over it.
{% endhint %}

### Content Template — instance alerts

```json
{
  "source": "dbmarlin",
  "kind": "instance",
  "target": "<datasourcename>",
  "rule_id": "<ruleid>",
  "rule": "<rulename>",
  "statistic": "<statistic>",
  "phase": "<startedended>",
  "old_value": "<oldvalue>",
  "new_value": "<newvalue>",
  "threshold": "<threshold>",
  "units": "<units>",
  "from": "<from>",
  "to": "<to>",
  "url": "<url>"
}
```

### Host Content Template — host alerts

```json
{
  "source": "dbmarlin",
  "kind": "host",
  "target": "<hostname>",
  "rule_id": "<ruleid>",
  "rule": "<rulename>",
  "statistic": "<statistic>",
  "phase": "<startedended>",
  "old_value": "<oldvalue>",
  "new_value": "<newvalue>",
  "threshold": "<threshold>",
  "units": "<units>",
  "from": "<from>",
  "to": "<to>",
  "url": "<url>"
}
```

The two are the same shape. Only `kind` and the placeholder behind `target` differ, which is what lets one Spike integration and one parser handle both.

{% hint style="info" %}
Keep the field names as published. DBmarlin's templates are free-form JSON, so renaming `rule_id` to `ruleid` or dropping `phase` is allowed by DBmarlin and quietly breaks titles, grouping or auto-resolution in Spike. You can **add** DBmarlin's other placeholders — `<interval>`, `<tz>`, `<urlfrom>`, `<urlto>`, `<urltz>` — as extra fields if you want them on the incident page. Spike keeps everything it is sent.
{% endhint %}

## Step 3 — Create the alert rules that should page

The webhook is only a destination. Nothing arrives until a DBmarlin alert rule breaches, so create the rules you actually want to be woken for under DBmarlin's alerting screens: instance statistics such as connections or wait time, instance activity metrics, and host statistics such as CPU utilisation.

A rule can apply to one instance or host, or to all of them at once. A single rule across all instances is one rule to maintain and still one incident per instance in Spike, because `target` is part of the identity.

{% hint style="warning" %}
A threshold tuned to be interesting on a dashboard is usually too sensitive for a pager. A statistic that crosses its threshold every few minutes produces an incident, a resolution and another incident each time, and each one pages. Set thresholds where a human should genuinely be woken up, and use [alert rules](../alerts/alert-rules.md) in Spike to suppress the rest.
{% endhint %}

## Step 4 — Test it end to end

The Webhook integration has no test button. Lower the threshold on a rule against a non-production instance until it breaches, confirm the incident appears in Spike with the title you expect, then put the threshold back and watch the incident resolve itself when the alert ends.

## Payload reference

DBmarlin renders whichever template applies and POSTs it. An instance alert starting looks like this:

```json
{
  "source": "dbmarlin",
  "kind": "instance",
  "target": "prod-postgres-01",
  "rule_id": "142",
  "rule": "Lock wait time",
  "statistic": "avg_lock_wait_ms",
  "phase": "started",
  "old_value": "12",
  "new_value": "890",
  "threshold": "500",
  "units": "ms",
  "from": "2026-09-24T09:15:00Z",
  "to": "",
  "url": "https://dbmarlin.acme.internal/instances/prod-postgres-01"
}
```

The same alert ending carries the same `rule_id` and `target`, and resolves the incident that the start event opened:

```json
{
  "source": "dbmarlin",
  "kind": "instance",
  "target": "prod-postgres-01",
  "rule_id": "142",
  "rule": "Lock wait time",
  "statistic": "avg_lock_wait_ms",
  "phase": "ended",
  "old_value": "890",
  "new_value": "80",
  "threshold": "500",
  "units": "ms",
  "from": "2026-09-24T09:15:00Z",
  "to": "2026-09-24T09:40:00Z",
  "url": "https://dbmarlin.acme.internal/instances/prod-postgres-01"
}
```

| Field | DBmarlin placeholder | What Spike does with it |
| --- | --- | --- |
| `source` | — | Fixed `dbmarlin`. Tells the payload apart from anything else posted to the same URL |
| `kind` | — | Fixed per template, `instance` or `host`. Part of the incident's identity |
| `target` | `<datasourcename>` / `<hostname>` | The datasource or host the rule fired on. Part of the identity, and the second half of the title |
| `rule_id` | `<ruleid>` | The alert rule's id. Part of the identity |
| `rule` | `<rulename>` | The alert rule's name. The first half of the title |
| `statistic` | `<statistic>` | The statistic that breached. Shown on the incident |
| `phase` | `<startedended>` | `started` opens the incident, `ended` resolves it |
| `old_value`, `new_value` | `<oldvalue>`, `<newvalue>` | The values either side of the breach. Shown on the incident, never in the title |
| `threshold`, `units` | `<threshold>`, `<units>` | What the rule was set to, and in what unit. Shown on the incident |
| `from`, `to` | `<from>`, `<to>` | The alert's window. `to` is empty on a start event and filled in on the end event |
| `url` | `<url>` | Built from the **DBmarlin URL** field. The link back into DBmarlin, shown on the incident |

{% hint style="warning" %}
DBmarlin's docs list `<startedended>` as a placeholder without documenting the words it renders, and its ServiceNow integration describes the same two states as **Warning** and **Clear**. Spike matches `started` and `ended`. If your server sends something else, incidents will open but never resolve, or nothing will open at all — open the incident (or the payload preview on a [Title Remapper](../alerts/title-remapper.md)) to see the value that arrived, and send it to [support@spike.sh](mailto:support@spike.sh) with your DBmarlin version. We will match it.
{% endhint %}

## Things worth knowing

* **One Webhook integration per DBmarlin server.** This is DBmarlin's limit, not Spike's. Everything you want to route out of that server goes through this one URL and these two templates, which is why the templates carry `source` and `kind` rather than assuming one alert shape.
* **Use one Spike integration and split with alert rules.** Since the server has one webhook, per-team routing happens in Spike. Create one DBmarlin integration, attach it to a service, and use [alert rules](../alerts/alert-rules.md) to route by title or payload — `prod-` targets to the DBA on-call, everything else to a quieter policy.
* **Instance and host alerts share the integration.** Both templates post to the same URL, and Spike keeps them apart by `kind` and `target`.
* **Every alert arrives at the same level.** DBmarlin has no severity to lift, so severity, priority and routing are Spike-side decisions.
* **The URL is the credential.** DBmarlin signs nothing, so treat the webhook URL as a secret. If it leaks, archive the integration in Spike, create a new one, and update the **Webhook URL** field in DBmarlin.
* **Deliveries come from your own network.** DBmarlin is self-hosted, so the POST leaves your infrastructure. It needs egress to `hooks.spike.sh` on 443. Nothing needs allowlisting on the Spike side.
* **Auto-resolution needs the end event.** If a DBmarlin server is restarted or the alert is deleted mid-breach, the end event may never be sent. A [resolve timer](../incidents/resolve-timer.md) on the integration is a cheap backstop.

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

## Troubleshooting

<details>

<summary>No incidents show up in Spike</summary>

Check in this order:

1. The Webhook integration is **enabled** in DBmarlin, and its **Webhook URL** is the full `https://hooks.spike.sh/<your-token>/push-events` with nothing after it.
2. A rule actually breached. DBmarlin's event history shows alert events starting and ending; if nothing started, nothing was sent.
3. Both templates are Spike's, not DBmarlin's defaults. A default template posts successfully and produces no incident.
4. The DBmarlin server can reach `hooks.spike.sh` on 443. `curl -i https://hooks.spike.sh/<your-token>/push-events -H 'Content-Type: application/json' -d '{"source":"dbmarlin"}'` from the DBmarlin host settles it.

</details>

<details>

<summary>Incidents open but never resolve</summary>

The end event is what resolves them, so either it is not arriving or its `phase` is not the word Spike expects.

Confirm the alert actually ended in DBmarlin — a statistic sitting just over its threshold stays in alert, and the incident is right to stay open. If DBmarlin shows the alert ended, check that `phase` is in the template you pasted and that nothing renamed it, then compare the value that arrived with `ended` as described in the payload reference above.

A rule deleted while it was breaching never sends its end event at all. Resolve that incident by hand, and add a [resolve timer](../incidents/resolve-timer.md) so it cannot happen quietly.

</details>

<details>

<summary>One breach opened several incidents</summary>

Spike groups on `rule_id`, `target` and `kind`. Several incidents for what looks like one problem usually means the rule is set across all instances and several of them breached at once, which is one incident each by design.

A statistic flapping across its threshold does it too: each start opens an incident and each end resolves it. Widen the threshold, or lengthen the rule's evaluation window in DBmarlin.

</details>

<details>

<summary>Titles read "DBmarlin alert on ..."</summary>

The delivery carried no `rule` value. Either the rule has no name in DBmarlin, or `"rule": "<rulename>"` is missing from the template that was pasted. Name the rule, or paste the template again as published.

</details>

<details>

<summary>Another tool needs the same DBmarlin alerts</summary>

DBmarlin will not give you a second Webhook integration, so the fan-out has to happen outside it. Point the webhook at a small relay of your own that forwards to Spike and to the other destination, or use DBmarlin's Email, Slack or ServiceNow integrations for the second destination and keep the webhook for Spike.

Pointing the webhook somewhere else "for a moment" stops every DBmarlin incident in Spike, including the end events for incidents that are currently open, which is the failure mode this note exists to prevent.

</details>

<details>

<summary>Severity is always the same</summary>

Expected. DBmarlin has one alert level and sends no severity, so Spike has nothing to map. Set severity from [alert rules](../alerts/alert-rules.md), which also gets it onto the incident from the first page.

</details>
