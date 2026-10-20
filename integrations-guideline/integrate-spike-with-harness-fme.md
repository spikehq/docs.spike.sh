---
description: >-
  Send Harness FME (formerly Split) metric alerts to Spike so a feature flag or experiment that degrades a metric pages your on-call rotation by phone, SMS, Slack or Teams.
---

# Integrate Spike with Harness FME

[Harness Feature Management & Experimentation](https://www.harness.io/products/feature-management-experimentation) (FME, formerly Split) measures what a feature flag does to your metrics. When a metric moves the wrong way under a treatment, FME raises a metric alert. Point FME's metric alert webhook at a Spike integration URL and that alert pages your on-call rotation.

Nothing is installed anywhere. One webhook, configured once in FME, covers every flag and experiment it is set up for.

## What Spike does with each alert

Every metric alert FME sends (`type` is `METRIC_ALERT`) opens an incident and pages. A repeat of the same alert joins the incident that is already open instead of paging again. Alerts where `data.direction` is `DESIRED` open incidents too. Nothing in the body closes one.

{% hint style="info" %}
Harness documents no recovery or resolve webhook, so **Spike never resolves a Harness FME incident by itself.** Resolve it in Spike once the flag or metric is dealt with. A [resolve timer](../incidents/resolve-timer.md) is a reasonable backstop.
{% endhint %}

## Incident identity

Spike identifies the alert by these three fields together:

| Field | What it is |
| --- | --- |
| `source.id` | Id of the feature flag or experiment |
| `data.environment.id` | The FME environment |
| `data.metric.id` | The metric |

The same flag moving the same metric in the same environment is one incident, even when the readings, policy name or threshold change between sends. A different metric, flag or environment is a separate incident.

An id counts only if it is a non-empty string (after trimming) or a number (`0` counts), and is not an unexpanded template variable such as `$id`, `${id}`, `{{id}}` or `%id%`. Ids are matched however they are spelled (number or text, surrounding spaces ignored). If any of the three is unusable, Spike matches on the incident title instead, and the title then carries no readings.

## Incident title

The payload has no sentence from Harness about the fault, so Spike builds the title. When all three ids are usable and both values are numbers (or numeric strings), the baseline is not `0` and the change is at least 1%, the title carries the readings:

```
Checkout conversion rate down 16% (on 0.035 vs off 0.041), undesired — new_checkout_flow in Production
```

* The percentage is `(comparisonValue - baselineValue) / |baselineValue| × 100`, rounded, computed from the two values. `data.relativeImpact` is not read because its scale is undocumented.
* `up` or `down` comes from the sign of that change. `, undesired` or `, desired` comes from `data.direction` and is left out for any other value.
* Numbers from 10 up are whole with thousands separators (`1,480`); below 10 they keep two significant digits. An empty treatment name is left out.

Otherwise the title is plain and identical on every send:

```
Checkout conversion rate degraded — new_checkout_flow in Production
```

* The word is `degraded` for `UNDESIRED`, `improved` for `DESIRED` and `alert` for anything else or a missing direction. With no metric name it starts `Metric`.
* Missing parts are dropped with their separator words: no `in` without an environment, no `—` without a flag and environment.
* With no metric, flag or environment name at all: `Harness FME alert with no details`.

Whitespace is collapsed and titles are capped at 200 characters: the readings in brackets are cut first, then the metric name, and the flag and environment stay whole. Ids, URLs and timestamps never appear in the title.

## Severity

Spike does not read a severity from the payload, so incidents open at your integration's default. To set severity from the alert, write an [alert rule](../alerts/alert-rules.md) on `data.direction`. Read more about [priority and severity](../incidents/priority-and-severity.md).

## Prerequisites

* A Harness FME account with permission to manage alert policies and webhooks
* A Harness FME integration in Spike and its webhook URL
* Nothing to open on your own network. FME calls out to Spike

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Harness FME**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Add the webhook in Harness FME

1. **Sign in to Harness** and open the **Feature Management & Experimentation** module for your project.
2. **Open the metric alert webhook settings.** In FME's integrations / alerting settings, add a webhook for metric alerts.
3. **Paste the URL** from Step 1 as the webhook URL. Harness documents no signing header or secret for this webhook, so there is nothing else to fill in. The token in the URL is the credential; treat it like a password.
4. **Save,** then use **Send Test Message** to check the connection.

{% hint style="warning" %}
Harness does not document what **Send Test Message** posts. If it names no flag, metric or environment, Spike opens an incident titled `Harness FME alert with no details`. Run the test before you attach a live escalation policy, or expect one incident to acknowledge and resolve afterwards.
{% endhint %}

The menu names above follow Harness's published schema; Harness changes its screens often, so follow the closest equivalent if a label differs.

## Step 3 — Make sure alerts are switched on

A webhook only receives alerts that FME raises. In FME, make sure an **alert policy** exists on the metrics you care about, and that significance alerts are enabled on key and guardrail metrics if you want those too.

## Step 4 — Confirm it end to end

Send a test message, or wait for the first real alert. An incident opens in Spike on the service you attached, with the metric, flag and environment in the title. A test message that names none of them opens one titled `Harness FME alert with no details`.

## Payload reference

FME sends a JSON `POST` with `Content-Type: application/json`. A full alert looks like this:

```json
{
  "type": "METRIC_ALERT",
  "firedAt": "2026-10-14T03:12:45Z",
  "firedAtMs": 1791947565000,
  "integrationId": "5a8f2c10-7d3e-11ef-9a1b-0242ac120002",
  "source": {
    "id": "8c3b9e40-5f21-11ef-b8d4-12a9c3e5f7a1",
    "name": "new_checkout_flow",
    "type": "FEATURE_FLAG",
    "url": "https://app.split.io/org/2f1c6a30-1b4e-11ee-9c5d-0a58a9feac02/ws/2f4d8e20-1b4e-11ee-9c5d-0a58a9feac02/splits/8c3b9e40-5f21-11ef-b8d4-12a9c3e5f7a1/env/3a7e1d50-1b4e-11ee-9c5d-0a58a9feac02/definition"
  },
  "data": {
    "alertType": "ALERT_POLICY",
    "baselineTreatment": "off",
    "comparisonTreatment": "on",
    "baselineValue": 0.0412,
    "comparisonValue": 0.0347,
    "absoluteImpact": -0.0065,
    "relativeImpact": -0.1578,
    "pValue": 0.003,
    "direction": "UNDESIRED",
    "targetingRule": "default rule",
    "environment": {
      "id": "3a7e1d50-1b4e-11ee-9c5d-0a58a9feac02",
      "name": "Production"
    },
    "metric": {
      "id": "b71e5c90-6a02-11ef-8f3e-0242ac120002",
      "name": "Checkout conversion rate",
      "url": "https://app.split.io/org/2f1c6a30-1b4e-11ee-9c5d-0a58a9feac02/ws/2f4d8e20-1b4e-11ee-9c5d-0a58a9feac02/metrics/b71e5c90-6a02-11ef-8f3e-0242ac120002"
    },
    "metricCategory": {
      "id": "ALERT_POLICY",
      "name": "Alert policy"
    },
    "alertPolicy": {
      "name": "Checkout conversion drop",
      "threshold": 5,
      "thresholdType": "RELATIVE"
    }
  }
}
```

### Fields Spike reads

| Field | Required | Used for |
| --- | --- | --- |
| `source.id` | Yes | Incident identity |
| `data.environment.id` | Yes | Incident identity |
| `data.metric.id` | Yes | Incident identity |
| `data.metric.name` | No | Title: starts it (`Metric` when empty) |
| `source.name` | No | Title: the flag or experiment |
| `data.environment.name` | No | Title: where it happened |
| `data.direction` | No | Title: `undesired` / `desired`, or `degraded` / `improved` |
| `data.comparisonValue` | No | Title: reading and percentage (number or numeric string) |
| `data.baselineValue` | No | Title: reading and percentage (number or numeric string) |
| `data.comparisonTreatment` | No | Title: name beside the comparison reading |
| `data.baselineTreatment` | No | Title: name beside the baseline reading |

Every other field (`type`, `firedAt`, `firedAtMs`, `integrationId`, `source.type`, `source.url`, `alertType`, `absoluteImpact`, `relativeImpact`, `pValue`, `targetingRule`, `metric.url`, `metricCategory.*` and `alertPolicy.*`) is kept on the incident and visible on the incident page, but does not change the title or identity.

## Things worth knowing

* **No recovery.** Resolve incidents in Spike yourself; Harness FME does not tell Spike when an alert clears.
* **Repeats.** Harness does not document whether FME re-sends an alert. If it does, a repeat with the same identity joins the open incident, even when the readings have moved.
* **Several Spike integrations are fine.** Create one per team and point the matching FME webhook at each.
* **Unverified.** This guide follows Harness's published schema; the sample values are illustrative.

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Check that the webhook URL is the full `https://hooks.spike.sh/<your-token>/push-events` with nothing appended and that the integration is not archived in Spike. Then check that an alert policy exists on the metric, because FME only sends alerts it raises.

</details>

<details>

<summary>Every alert opens its own incident</summary>

Open two incidents and compare the payloads. If `source.id`, `data.metric.id` or `data.environment.id` differ, they are separate alerts and separate incidents by design. If `source.id`, `data.environment.id` or `data.metric.id` is unusable, Spike matches on the title instead.

</details>

<details>

<summary>The incident never resolves</summary>

Expected. Harness FME sends no recovery. Resolve the incident in Spike, or set a [resolve timer](../incidents/resolve-timer.md).

</details>

<details>

<summary>The title has no percentage or readings</summary>

Readings are left out when an id is unusable, a value is missing or not numeric, the baseline is `0`, the values are equal, or the change is under 1%.

</details>

Disclaimer: These integration instructions are offered independently by Spike.sh, and Spike.sh is not affiliated with nor a partner of Harness Inc.
