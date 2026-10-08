---
description: >-
  Send Last9 alert notifications to Spike so a firing Last9 alert pages your on-call rotation by phone, SMS, Slack or Teams, and resolves its incident when Last9 sends the recovery.
---

# Integrate Spike with Last9

[Last9](https://last9.io) is an observability platform. Its alerting watches the indicators of your entities (services, for example) and notifies a channel when an alert rule breaches.

Last9 notifications use the PagerDuty Events v2 shape. Add a webhook channel in Last9 that points at a Spike integration URL and a breached alert pages your on-call rotation, every repeat notification lands on the incident already open instead of paging again, and the incident resolves itself when Last9 sends the recovery.

Nothing is installed anywhere. One notification channel, configured once, covers every alert rule that uses it.

## What Spike does with each notification

Every delivery carries an `event_action`, and that field decides what Spike does with it.

| `event_action` | What Spike does |
| --- | --- |
| `trigger` | Opens an incident and pages. If an incident with the same `dedup_key` is already open, the notification lands on it instead. |
| `acknowledge` | Treated like `trigger`: it joins the open incident with the same `dedup_key` and never resolves it. Last9 lists it as a possible event type; it is not known to be sent in practice. |
| `resolve` | Resolves the open incident with the same `dedup_key`. A recovery never opens a new incident. |

{% hint style="info" %}
Last9 sends `resolve` only when **Send Resolved** is enabled on the channel. Without it, incidents opened by Last9 stay open until somebody resolves them in Spike.
{% endhint %}

## Incident identity

Spike identifies the incident by `dedup_key`, which Last9 keeps the same for one alert across its `trigger` and `resolve` notifications (it is at most 255 characters). The key is what makes a repeat join the open incident and a recovery resolve it, so the title is for display only.

If a delivery carries no `dedup_key`, Spike falls back to matching on the title. The title is built so that it stays the same across notifications for the same alert.

## Incident title

Last9 writes a sentence about what is wrong in `payload.summary` ("Title for the incident"), and that sentence is the title, with whitespace collapsed and capped at 200 characters:

```
High error rate on checkout-api: 5xx ratio above 5% for 10 minutes
```

When `payload.summary` is empty, the title is built from what the rule carries, in this order:

1. `payload.custom_details.description`, the description written on the alert rule.
2. The indicator, the rule's threshold and the entity, for example `http 5xx ratio above 5 on checkout-api`. The entity is left off when it is empty or `None`.
3. `Last9 alert with no details` when nothing usable is present.

A recovery is written as `Resolved: ` followed by the same title:

```
Resolved: High error rate on checkout-api: 5xx ratio above 5% for 10 minutes
```

The title carries no ids, URLs or readings. Those are on the incident page.

Use a [Title Remapper](../alerts/title-remapper.md) if you would rather read Last9 alerts by service and indicator:

```handlebars
{{data.body.payload.custom_details.expression}} on {{data.body.payload.custom_details.entity_name}}
```

## Severity

Spike does not read a severity from the Last9 payload. `payload.severity` is kept on the incident but does not set the severity badge, so incidents open at your integration's default. To use Last9's levels, write an [alert rule](../alerts/alert-rules.md) on `payload.severity`. Read more about [priority and severity](../incidents/priority-and-severity.md).

## Prerequisites

* A Last9 account with permission to create notification channels and edit alert rules
* A Last9 integration in Spike and its webhook URL
* Nothing to open on your own network. Last9 calls out to Spike

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Last9**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Add a notification channel in Last9

1. **Sign in to Last9** at [https://app.last9.io](https://app.last9.io) and open the notification channel settings for your organisation.
2. **Add a new channel** and choose **Webhook**.
3. **Fill in the channel.** The URL is the only required field; give the channel a name your team will recognise, for example `Spike`:
   * **Name** — for example `Spike`
   * **URL** — the webhook URL from Step 1
4. **Enable Send Resolved** so Last9 sends a recovery and Spike can resolve the incident.
5. **Save** the channel.

{% hint style="warning" %}
Last9's screens are not publicly documented in detail, so the labels above follow its documentation and may differ slightly in your workspace. If your channel has a PagerDuty-style option instead of a plain webhook, the body it sends is the same one shown below.
{% endhint %}

Treat the webhook URL like a password. If it leaks, archive the integration in Spike, create a new one and update the channel in Last9.

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

## Step 3 — Point your alert rules at the channel

A channel receives nothing until an alert rule notifies it. Open each alert rule you want paged, add the channel from Step 2 as a notification destination, and save.

## Step 4 — Confirm it end to end

1. Let an alert rule breach, or temporarily lower a threshold. An incident opens in Spike with Last9's sentence as the title, on the service you attached.
2. A repeat notification for the same alert lands on that incident without paging again.
3. When the alert recovers, the incident resolves itself and the event reads `Resolved: ` followed by the title.

## Payload reference

Last9 sends its own payload; there is no template to edit. A firing notification, which opens the incident:

```json
{
  "routing_key": "https://hooks.spike.sh/********************/push-events",
  "event_action": "trigger",
  "dedup_key": "7c1e9a52-4b3f-4d2e-8f61-0a9d3b6c2e47",
  "payload": {
    "summary": "High error rate on checkout-api: 5xx ratio above 5% for 10 minutes",
    "timestamp": "2026-10-08T03:12:00Z",
    "severity": "critical",
    "source": "7c1e9a52-4b3f-4d2e-8f61-0a9d3b6c2e47",
    "component": "",
    "group": "7c1e9a52-4b3f-4d2e-8f61-0a9d3b6c2e47",
    "class": "static_threshold",
    "custom_details": {
      "alert_condition": "> 5",
      "algo_type": "static_threshold",
      "client_url": "https://app.last9.io/v2/organizations/acme/health/alerts/checkout-api",
      "description": "5xx responses on checkout-api are above 5% of all requests.",
      "start": "2026-10-08T03:02:00Z",
      "end": "2026-10-08T03:12:00Z",
      "expression": "http_5xx_ratio",
      "entity_name": "checkout-api",
      "entity_type": "service",
      "entity_team": "payments",
      "entity_tier": "None",
      "entity_workspace": "None",
      "entity_namespace": "production",
      "severity": "breach",
      "notification_call": "first",
      "runbook": "https://wiki.acme.io/runbooks/checkout-api-5xx",
      "tag_payments": true,
      "time_in_alert": "10m"
    }
  },
  "client": "Last9 Dashboard",
  "client_url": "https://app.last9.io/v2/organizations/acme/health/alerts/checkout-api",
  "links": [],
  "images": []
}
```

The recovery for the same alert. `dedup_key` is the one the firing notification carried, which is what joins the two:

```json
{
  "routing_key": "https://hooks.spike.sh/********************/push-events",
  "event_action": "resolve",
  "dedup_key": "7c1e9a52-4b3f-4d2e-8f61-0a9d3b6c2e47",
  "payload": {
    "summary": "High error rate on checkout-api: 5xx ratio above 5% for 10 minutes",
    "timestamp": "2026-10-08T03:41:00Z",
    "severity": "critical",
    "source": "7c1e9a52-4b3f-4d2e-8f61-0a9d3b6c2e47",
    "component": "",
    "group": "7c1e9a52-4b3f-4d2e-8f61-0a9d3b6c2e47",
    "class": "static_threshold",
    "custom_details": {
      "alert_condition": "> 5",
      "algo_type": "static_threshold",
      "client_url": "https://app.last9.io/v2/organizations/acme/health/alerts/checkout-api",
      "description": "5xx responses on checkout-api are above 5% of all requests.",
      "start": "2026-10-08T03:02:00Z",
      "end": "2026-10-08T03:41:00Z",
      "expression": "http_5xx_ratio",
      "entity_name": "checkout-api",
      "entity_type": "service",
      "entity_team": "payments",
      "entity_tier": "None",
      "entity_workspace": "None",
      "entity_namespace": "production",
      "severity": "breach",
      "notification_call": "first",
      "runbook": "https://wiki.acme.io/runbooks/checkout-api-5xx",
      "tag_payments": true,
      "time_in_alert": "39m"
    }
  },
  "client": "Last9 Dashboard",
  "client_url": "https://app.last9.io/v2/organizations/acme/health/alerts/checkout-api",
  "links": [],
  "images": []
}
```

Spike keeps the whole body on the incident, so every field above is available to alert rules and the Title Remapper as `data.body.<field>`.

## Things worth knowing

* **Several Spike integrations are fine.** Create one Spike integration per team and one Last9 channel per integration.
* **Resolving in Spike does not touch Last9.** The alert recovers in Last9 on its own, and that recovery is what resolves the incident.
* **Without Send Resolved, nothing resolves.** Enable it on the channel, or use a [resolve timer](../incidents/resolve-timer.md) as a backstop.

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Check that the channel URL is the full `https://hooks.spike.sh/<your-token>/push-events` with nothing appended, that the integration has not been archived in Spike, and that at least one alert rule notifies the channel.

</details>

<details>

<summary>Incidents never resolve</summary>

Confirm that **Send Resolved** is enabled on the channel. Spike resolves only on a `resolve` notification, and only while the incident is still open.

</details>

<details>

<summary>Every repeat opens its own incident</summary>

Compare `dedup_key` in the payloads on two incidents. If it differs, Last9 treated them as separate alerts, and separate alerts are separate incidents.

</details>

<details>

<summary>The severity badge ignores Last9's severity</summary>

Expected. `payload.severity` is on the incident, so an [alert rule](../alerts/alert-rules.md) matching it can set the severity you want.

</details>

Disclaimer: These integration instructions are offered independently by Spike.sh, and Spike.sh is not affiliated with nor a partner of Last9.
