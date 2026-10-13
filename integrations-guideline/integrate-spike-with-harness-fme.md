---
description: >-
  Send Harness FME (formerly Split) metric alerts to Spike so a feature flag or experiment that degrades a metric pages your on-call rotation by phone, SMS, Slack or Teams.
---

# Integrate Spike with Harness FME

[Harness Feature Management & Experimentation](https://www.harness.io/products/feature-management-experimentation) (FME, formerly Split) measures what a feature flag does to your metrics. When a metric moves the wrong way under a treatment, FME raises a metric alert. Point FME's metric alert webhook at a Spike integration URL and that alert pages your on-call rotation.

Nothing is installed anywhere. One webhook, configured once in FME, covers every flag and experiment it is set up for.

## What Spike does with each alert

Every delivery with `type` set to `METRIC_ALERT` opens an incident and pages. A repeat of the same alert joins the incident that is already open instead of paging again. Both `ALERT_POLICY` and `SIGNIFICANCE` alerts open incidents, and so do alerts where `data.direction` is `DESIRED`.

{% hint style="info" %}
Harness documents no recovery or resolve webhook, so **Spike never resolves a Harness FME incident by itself.** Resolve it in Spike once the flag or metric is dealt with. A [resolve timer](../incidents/resolve-timer.md) is a reasonable backstop.
{% endhint %}

## Incident identity

Spike identifies the alert by these fields together:

| Field | What it is |
| --- | --- |
| `source.id` | Id of the feature flag or experiment that caused the alert |
| `data.environment.id` | The FME environment |
| `data.metric.id` | The degraded metric |
| `data.alertType` | `ALERT_POLICY` or `SIGNIFICANCE` |
| `data.alertPolicy.name` | The alert policy, only when it is a non-empty string |

The same flag degrading the same metric in the same environment, for the same kind of alert and policy, is one incident. A different metric, environment or policy is a separate incident. A significance notice never joins an alert-policy alert.

An id counts only if it is a non-empty string or a number, and is not an unexpanded template variable (starting with `$` or `%`, or wrapped in `{{ }}`). If `source.id`, `data.environment.id` or `data.metric.id` is unusable, Spike matches on the incident title instead, and the title then carries no readings.

## Incident title

The payload has no sentence from Harness about the fault, so Spike builds the title. When all three ids are usable and both values are numbers (or numeric strings), the baseline is not `0`, the values differ and the change is at least 1%:

```
checkout_conversion_rate down 18% (0.027 on vs 0.033 off) on new_checkout_flow in Production
```

* The percentage is `|comparisonValue - baselineValue| / |baselineValue|`, rounded, computed from the two values. `data.relativeImpact` is not read because its units are undocumented.
* `up` or `down` comes from the values, not from `data.direction`.
* Numbers from 10 up are whole with thousands separators (`1,480`); below 10 they keep two significant digits. An empty treatment name is left out.

Otherwise the title is fixed text and identical every time:

* `ALERT_POLICY` with a policy name: `checkout_conversion_rate breached Checkout conversion drop on new_checkout_flow in Production`
* Anything else: `checkout_conversion_rate significant impact on new_checkout_flow in Production`
* Missing parts are dropped: no `on` without a flag name, no `in` without an environment.
* A `type` other than `METRIC_ALERT`, or no metric, flag and environment at all: `Harness FME alert with no details`.

Titles are capped at 200 characters, shortening the metric or readings first so the flag and environment stay whole. Ids, URLs and timestamps never appear in the title.

## Severity

Spike does not read a severity from the payload, so incidents open at your integration's default. To set severity from the alert, write an [alert rule](../alerts/alert-rules.md) on `data.direction` or `data.alertType`. Read more about [priority and severity](../incidents/priority-and-severity.md).

## Severity

Spike does not read a severity from the payload, so incidents open at your integration's default. To set severity from the alert, write an [alert rule](../alerts/alert-rules.md) on `data.direction` or `data.alertType`. Read more about [priority and severity](../incidents/priority-and-severity.md).

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

Send a test message, or wait for the first real alert. An incident opens in Spike on the service you attached, with the metric, flag and environment in the title.

## Payload reference

FME sends a JSON `POST` with `Content-Type: application/json`. A full alert looks like this:

```json
{
  "type": "METRIC_ALERT",
  "firedAt": "2026-10-13T08:42:17Z",
  "firedAtMs": 1791880937000,
  "integrationId": "5f2c9a10-7d3e-11ef-9b1a-0a58a9feac02",
  "source": {
    "id": "a1d4e6f0-3b2c-11ef-8e7a-12b5c3d4e5f6",
    "name": "new_checkout_flow",
    "type": "FEATURE_FLAG",
    "url": "https://app.split.io/org/0a1b2c3d/ws/4e5f6a7b/splits/a1d4e6f0-3b2c-11ef-8e7a-12b5c3d4e5f6"
  },
  "data": {
    "alertType": "ALERT_POLICY",
    "baselineTreatment": "off",
    "comparisonTreatment": "on",
    "baselineValue": 0.0331,
    "comparisonValue": 0.0271,
    "absoluteImpact": -0.006,
    "relativeImpact": -0.1813,
    "pValue": 0.0042,
    "direction": "UNDESIRED",
    "targetingRule": "default rule",
    "environment": {
      "id": "c7e8f9a0-3b2c-11ef-8e7a-12b5c3d4e5f6",
      "name": "Production"
    },
    "metric": {
      "id": "d2e3f4a5-3b2c-11ef-8e7a-12b5c3d4e5f6",
      "name": "checkout_conversion_rate",
      "url": "https://app.split.io/org/0a1b2c3d/ws/4e5f6a7b/metrics/d2e3f4a5-3b2c-11ef-8e7a-12b5c3d4e5f6"
    },
    "metricCategory": {
      "id": "ALERT_POLICY",
      "name": "Alert policy"
    },
    "alertPolicy": {
      "name": "Checkout conversion drop",
      "threshold": 10,
      "thresholdType": "RELATIVE"
    }
  }
}
```

### Fields Spike reads

| Field | Required | Used for |
| --- | --- | --- |
| `type` | Yes | Must be `METRIC_ALERT`; anything else gets the no-details title |
| `source.id` | Yes | Incident identity |
| `data.environment.id` | Yes | Incident identity |
| `data.metric.id` | Yes | Incident identity |
| `data.alertType` | Yes | Incident identity; picks the fallback title wording |
| `data.alertPolicy.name` | No | Incident identity when non-empty; fallback title |
| `source.name` | No | Title: the flag or experiment |
| `data.metric.name` | No | Title: starts it |
| `data.environment.name` | No | Title: where it happened |
| `data.comparisonValue` | No | Title: reading and percentage (number or numeric string) |
| `data.baselineValue` | No | Title: reading and percentage (number or numeric string) |
| `data.comparisonTreatment` | No | Title: name beside the comparison reading |
| `data.baselineTreatment` | No | Title: name beside the baseline reading |

Every other field (`firedAt`, `firedAtMs`, `integrationId`, `source.type`, `source.url`, `absoluteImpact`, `relativeImpact`, `pValue`, `direction`, `targetingRule`, `metric.url`, `metricCategory.*`, `alertPolicy.threshold` and `alertPolicy.thresholdType`) is kept on the incident and visible on the incident page, but does not change the title or identity.

## Things worth knowing

* **No recovery.** Resolve incidents in Spike yourself; Harness FME does not tell Spike when an alert clears.
* **Repeats.** Harness does not document whether FME re-sends an alert. If it does, a repeat with the same identity joins the open incident.
* **Several Spike integrations are fine.** Create one per team and point the matching FME webhook at each.
* **Unverified.** This guide follows Harness's published schema; the sample values are illustrative.

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Check that the webhook URL is the full `https://hooks.spike.sh/<your-token>/push-events` with nothing appended and that the integration is not archived in Spike. Then check that an alert policy exists on the metric, because FME only sends alerts it raises.

</details>

<details>

<summary>Every alert opens its own incident</summary>

Open two incidents and compare the payloads. If `source.id`, `data.metric.id`, `data.environment.id`, `data.alertType` or `data.alertPolicy.name` differ, they are separate alerts and separate incidents by design. If `source.id`, `data.environment.id` or `data.metric.id` is unusable, Spike matches on the title instead.

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
