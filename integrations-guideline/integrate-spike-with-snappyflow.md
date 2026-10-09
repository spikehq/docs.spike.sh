---
description: >-
  Send SnappyFlow alerts to Spike so a violated alert rule pages your on-call rotation by phone, SMS, Slack or Teams, and resolves its incident when the alert recovers.
---

# Integrate Spike with SnappyFlow

[SnappyFlow](https://snappyflow.io) is a full-stack observability platform. Its alerts watch metrics for your projects and applications and notify a channel when a rule is violated. Point a webhook channel at a Spike integration URL and a violated SnappyFlow alert pages your on-call rotation.

{% hint style="warning" %}
SnappyFlow does not publish a webhook payload format. The body below is the one Spike reads, and the field names are Spike's own, taken from the labels SnappyFlow shows in its alert screens. Send exactly this body from your webhook channel. Check the first delivery in Spike, and tell us if SnappyFlow sends something different.
{% endhint %}

## Prerequisites

* A SnappyFlow account with permission to create alerts and notification channels
* A SnappyFlow integration in Spike (Step 1)

## Step 1 — Create the integration in Spike

In Spike go to **Integrations** → **Add Integration** → **SnappyFlow**, and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Add a webhook channel in SnappyFlow

1. In SnappyFlow open your project and go to **Alerts & Notifications**.
2. Add a notification channel and choose **Webhook**.
3. Set the **URL** to the Spike webhook URL from Step 1, the method to `POST`, and the content type to `application/json`.
4. Set the body to the JSON in Step 3.
5. Save the channel.

{% hint style="info" %}
The channel form's **Verify** button may send a test request to the URL. If it does, a test incident titled `SnappyFlow alert with no details` can open in Spike. Resolve it by hand.
{% endhint %}

## Step 3 — Send this body

```json
{
  "alert_id": "6f1c2a9e-4b7d-4e2a-9c51-0d8e3b7a2f14",
  "status": "triggered",
  "severity": "Sev1",
  "alert_name": "High CPU Utilization",
  "alert_message": "CPU utilization on prod-db-01 has been above 90% for the last 10 minutes",
  "metric": "cpu_util",
  "value": 97.4,
  "threshold": 90,
  "project": "payments",
  "application": "payments-api",
  "instance": "prod-db-01"
}
```

| Field | Required | What it is |
| --- | --- | --- |
| `alert_id` | Yes | A stable id for one alert (one alert rule on one source). It must be the same when the alert fires, repeats and recovers. Spike uses it to group repeats and to resolve. |
| `status` | Yes | `triggered` while the alert is violated. Use `resolved` when it recovers. |
| `severity` | No | `Sev1`, `Sev2` or `Sev3` (`Sev1` is the most severe). |
| `alert_name` | Yes | The alert's name, as in **Alert Name** in the alert history. |
| `alert_message` | No | SnappyFlow's own sentence about what is wrong. When present it becomes the incident title. |
| `metric` | No | The metric the alert watches, for example `cpu_util`. |
| `value` | No | The observed value of the metric. |
| `threshold` | No | The threshold of the alert condition. |
| `project` | No | The SnappyFlow project. |
| `application` | No | The SnappyFlow application. |
| `instance` | No | The instance or service the alert fired on. |

If your channel can only send `Alert Name`, `Alert Message`, `Instance`, `Application` and `Project` as labels, Spike reads those too when the matching field is empty.

For the recovery, send the same body with `"status": "resolved"` and no `alert_message`:

```json
{
  "alert_id": "6f1c2a9e-4b7d-4e2a-9c51-0d8e3b7a2f14",
  "status": "resolved",
  "severity": "Sev1",
  "alert_name": "High CPU Utilization",
  "metric": "cpu_util",
  "value": 41.2,
  "threshold": 90,
  "project": "payments",
  "application": "payments-api",
  "instance": "prod-db-01"
}
```

## What happens in Spike

* **Grouping:** `alert_id` identifies the incident. A repeat notification with the same `alert_id` joins the open incident instead of paging again.
* **Without `alert_id`:** Spike falls back to matching by title, so the title is kept plain: `High CPU Utilization on prod-db-01 in payments-api`.
* **Recovery:** a `status` of `resolved`, `recovered`, `cleared`, `ok` or `normal` (any case) resolves the matching open incident. It never opens a new one. Any other `status`, or none, counts as firing.
* **Batches:** a body that is a list, or has an `alerts` list, becomes one incident titled like `High CPU Utilization on a, Disk Usage High on b +1 more`, keyed on the first item's `alert_id`.

## Incident title

* With `alert_message`, the title is that sentence: `CPU utilization on prod-db-01 has been above 90% for the last 10 minutes`.
* Without it, Spike builds one: `High CPU Utilization on prod-db-01 in payments-api, 97 (8.2% above 90)`. The reading is left out when `value` or `threshold` is missing or not a number, they are equal, the threshold is 0, or they differ by under 1%.
* On recovery: `High CPU Utilization on prod-db-01 in payments-api recovered`.
* With nothing usable at all: `SnappyFlow alert with no details`.

## Test it

1. Send the firing body to the Spike URL, for example with `curl -X POST -H 'Content-Type: application/json' -d @firing.json <webhook-url>`.
2. Confirm an incident opens with the `alert_message` title.
3. Send the same body again and confirm no second incident opens.
4. Send the recovery body and confirm the incident resolves.

## Troubleshooting

* **Repeats open new incidents:** `alert_id` is missing or changes between notifications. Use one fixed id per alert.
* **Recovery does not resolve:** `alert_id` differs from the firing one, or `status` is not a recovery value.
* **Title reads `SnappyFlow alert with no details`:** the body had none of `alert_name`, `alert_message`, `metric`, `instance`, `application` or `project`. Check the channel's body and content type.
* **Nothing arrives:** check the URL was copied whole and that SnappyFlow can reach `hooks.spike.sh`.
