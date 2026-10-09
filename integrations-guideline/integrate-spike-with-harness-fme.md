---
description: >-
  Send Harness FME (formerly Split) metric alerts to Spike so a feature flag or experiment that degrades a metric pages your on-call rotation by phone, SMS, Slack or Teams.
---

# Integrate Spike with Harness FME

[Harness Feature Management & Experimentation](https://www.harness.io/products/feature-management-experimentation) (FME, formerly Split) measures what a feature flag does to your metrics. When a metric moves the wrong way under a treatment, FME raises a metric alert. Point FME's metric alert webhook at a Spike integration URL and that alert pages your on-call rotation.

Nothing is installed anywhere. One webhook, configured once in FME, covers every flag and experiment it is set up for.

## What Spike does with each alert

Every delivery is a `METRIC_ALERT`. Spike opens an incident for it and pages. A repeat of the same alert joins the incident that is already open instead of paging again.

{% hint style="info" %}
Harness documents no recovery or resolve webhook, so **Spike never resolves a Harness FME incident by itself.** Resolve it in Spike once the flag or metric is dealt with. A [resolve timer](../incidents/resolve-timer.md) is a reasonable backstop.
{% endhint %}

## Incident identity

Spike identifies the alert by five fields together:

| Field | What it is |
| --- | --- |
| `source.id` | Id of the feature flag or experiment that caused the alert |
| `data.environment.id` | The FME environment |
| `data.metric.id` | The degraded metric |
| `data.alertType` | `ALERT_POLICY` or `SIGNIFICANCE` |
| `data.comparisonTreatment` | The treatment compared against the baseline |

The same flag degrading the same metric in the same environment, for the same kind of alert and treatment, is one incident. A different metric, environment or treatment is a separate incident. A significance notice never joins an alert-policy degradation.

`source.id` and `data.metric.id` are required for this. If either is missing, Spike falls back to matching on the incident title, which then carries no readings.

## Incident title

The payload has no sentence from Harness about the fault, so Spike builds the title from the metric, the readings, and the flag and environment:

```
checkout_conversion_rate down 17% (0.043 vs 0.052 baseline), degraded by new_checkout_flow in Production
```

* The percentage is computed from `data.comparisonValue` and `data.baselineValue`, not taken from `relativeImpact`.
* The verb follows `data.direction`: `UNDESIRED` gives `degraded by`, `DESIRED` gives `improved by`, anything else gives `with`.
* The readings are left out when an id is missing, a value is missing or not numeric, the baseline is `0`, the two values are equal, or the change is under 1%.
* With no metric name, the title is built from the alert policy name, or `Harness FME significance alert` / `Harness FME alert policy alert`.
* With nothing usable at all, the title is `Harness FME metric alert with no details`.

Titles are capped at 200 characters; the flag and environment are always kept whole.

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
Harness does not document what **Send Test Message** posts. If it names no flag, metric or environment, Spike opens an incident titled `Harness FME metric alert with no details`. Run the test before you attach a live escalation policy, or expect one incident to acknowledge and resolve afterwards.
{% endhint %}

The menu names above follow Harness's published schema; Harness changes its screens often, so follow the closest equivalent if a label differs.

## Step 3 — Make sure alerts are switched on

A webhook only receives alerts that FME raises. In FME, make sure an **alert policy** exists on the metrics you care about, and that significance alerts are enabled on key and guardrail metrics if you want those too.

## Step 4 — Confirm it end to end

Send a test message, or wait for the first real alert. An incident opens in Spike on the service you attached, with the metric, readings, flag and environment in the title.

## Payload reference

FME sends a JSON `POST` with `Content-Type: application/json`. A full alert looks like this:

```json
{
  "type": "METRIC_ALERT",
  "firedAt": "2026-10-08T21:14:03Z",
  "firedAtMs": 1791494043000,
  "integrationId": "c2b8f0a1-6d3e-4b7a-9f15-2e8d4c7a1b90",
  "source": {
    "id": "8f3c2a10-4b6e-11ee-9d2a-0a58a9feac02",
    "name": "new_checkout_flow",
    "type": "FEATURE_FLAG",
    "url": "https://app.harness.io/ng/account/Xk2LpQ7sT9uVw3/module/fme/orgs/default/projects/storefront/setup/resources/feature-flags/new_checkout_flow"
  },
  "data": {
    "alertType": "ALERT_POLICY",
    "baselineTreatment": "off",
    "comparisonTreatment": "on",
    "baselineValue": 0.052,
    "comparisonValue": 0.043,
    "absoluteImpact": -0.009,
    "relativeImpact": -0.173,
    "pValue": 0.003,
    "direction": "UNDESIRED",
    "targetingRule": "default rule",
    "environment": {
      "id": "5b1e9c40-7a2d-11ee-b962-0242ac120002",
      "name": "Production"
    },
    "metric": {
      "id": "d41f6e20-7a2d-11ee-b962-0242ac120002",
      "name": "checkout_conversion_rate",
      "url": "https://app.harness.io/ng/account/Xk2LpQ7sT9uVw3/module/fme/orgs/default/projects/storefront/setup/resources/metrics/d41f6e20-7a2d-11ee-b962-0242ac120002"
    },
    "metricCategory": {
      "id": "ALERT_POLICY",
      "name": "Alert policy"
    },
    "alertPolicy": {
      "name": "Checkout conversion drop over 10%",
      "threshold": 10,
      "thresholdType": "RELATIVE"
    }
  }
}
```

### Fields Spike reads

| Field | Required | Used for |
| --- | --- | --- |
| `source.id` | Yes | Incident identity |
| `data.metric.id` | Yes | Incident identity |
| `data.environment.id` | No | Incident identity (missing counts as none) |
| `data.alertType` | No | Incident identity; placeholder title when the metric name is missing |
| `data.comparisonTreatment` | No | Incident identity |
| `source.name` | No | Title: the flag or experiment |
| `data.metric.name` | No | Title: starts it |
| `data.environment.name` | No | Title: where it happened |
| `data.comparisonValue` | No | Title: reading and percentage (number or numeric string) |
| `data.baselineValue` | No | Title: baseline and percentage (number or numeric string) |
| `data.direction` | No | Title: `degraded by`, `improved by` or `with` |

Every other field is kept on the incident and is visible on the incident page, but does not change the title or identity.

## Things worth knowing

* **No recovery.** Resolve incidents in Spike yourself; Harness FME does not tell Spike when an alert clears.
* **Repeats.** Spike assumes FME re-sends the same alert on later recalculations, and those join the open incident. Harness does not document this.
* **Several Spike integrations are fine.** Create one per team and point the matching FME webhook at each.
* **Unverified.** This guide follows Harness's published schema; the sample values are illustrative.

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Check that the webhook URL is the full `https://hooks.spike.sh/<your-token>/push-events` with nothing appended and that the integration is not archived in Spike. Then check that an alert policy exists on the metric, because FME only sends alerts it raises.

</details>

<details>

<summary>Every alert opens its own incident</summary>

Open two incidents and compare the payloads. If `source.id`, `data.metric.id`, `data.environment.id`, `data.alertType` or `data.comparisonTreatment` differ, they are separate alerts and separate incidents by design. If `source.id` or `data.metric.id` is missing, Spike matches on the title instead.

</details>

<details>

<summary>The incident never resolves</summary>

Expected. Harness FME sends no recovery. Resolve the incident in Spike, or set a [resolve timer](../incidents/resolve-timer.md).

</details>

<details>

<summary>The title has no percentage or readings</summary>

Readings are left out when an id is missing, a value is missing or not numeric, the baseline is `0`, the values are equal, or the change is under 1%.

</details>

Disclaimer: These integration instructions are offered independently by Spike.sh, and Spike.sh is not affiliated with nor a partner of Harness Inc.
