---
description: >-
  Send SnappyFlow alerts to Spike through a webhook notification channel so a violated alert pages your on-call rotation by phone, SMS, Slack or Teams.
---

# Integrate Spike with SnappyFlow

[SnappyFlow](https://snappyflow.io) is a full-stack observability platform. Its alerts watch metrics for your projects and applications and notify a channel when an alert is violated. Point a webhook notification channel at a Spike integration URL and a violated SnappyFlow alert pages your on-call rotation.

{% hint style="warning" %}
SnappyFlow decides what its webhook sends; the channel form has no body, method or content-type settings. SnappyFlow does not publish that payload, so the field names Spike reads (below) are Spike's best reading of the labels SnappyFlow shows in its alert screens, not yet checked against a real delivery. After setup, open the first incident in Spike and look at its payload. If the fields differ, [tell us](mailto:support@spike.sh) and we will adjust the integration.
{% endhint %}

## Prerequisites

* A SnappyFlow account that can create notification channels and edit projects and alerts
* A SnappyFlow integration in Spike (Step 1)

## Step 1 — Create the integration in Spike

In Spike go to **Integrations** → **Add Integration** → **SnappyFlow**, and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Create a webhook notification channel in SnappyFlow

1. Go to the **Manage** tab, open **Profile**, then the **Notifications** section.
2. Click **Add New**.
3. In the **Add New Notification** window:
   * **Type:** select **Webhook**.
   * **Time Zone:** select your time zone.
   * **Name:** for example `Spike`.
   * **URL:** paste the Spike webhook URL from Step 1.
   * **Response Field:** SnappyFlow describes it as an attribute that identifies notifications from this channel; any value, such as `spike`, works for Spike.
   * **Authorization:** select **None**. The secret is already in the URL.
4. Click **Verify**, then **Add**.

{% hint style="info" %}
If **Verify** sends a test request, Spike may open a test incident titled `SnappyFlow alert with no details`. Resolve it by hand.
{% endhint %}

## Step 3 — Add the channel to your project

1. Open the **Application** tab, click the project's **...** menu and select **Edit Project**.
2. Open the **Notification** tab, choose **Webhook** under **Add New Notification Type** and click **Configure**.
3. Select the `Spike` channel, click the right-arrow icon, then **Save**.

## Step 4 — Send alerts to the channel

SnappyFlow only notifies a channel for alerts that have notifications enabled.

1. In the **Application** tab, expand the project and click **View Dashboard** for the application.
2. Open **Alerts** → **Alerts Definition**.
3. For each alert you want paged: select it, click **Edit** under **Alert Operations**, and in the **Notification** section pick a **Severity** and the `Spike` **Notification Channel**. Click **Save**.
4. Select the alert again, click **Enable Notification**, choose the severities to notify, and click **Yes**.

## What Spike reads

This is the shape Spike expects. Every key is unconfirmed until a real SnappyFlow delivery is seen:

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

| Field | What Spike does with it |
| --- | --- |
| `alert_id` | Identifies the alert. Repeats with the same `alert_id` join the open incident. |
| `status` | `resolved`, `recovered`, `cleared`, `ok`, `normal`, `closed` or `up` (any case) is a recovery. Anything else, or none, is firing. |
| `severity` | `Sev1`, `Sev2` or `Sev3`, shown at the start of a built title. |
| `alert_name` | The alert's name, as in **Alert Name** in the alert history. |
| `alert_message` | SnappyFlow's own sentence about what is wrong. When present it becomes the incident title. |
| `metric`, `value`, `threshold` | The reading shown in a built title. |
| `instance`, `application`, `project` | Where the alert fired, shown in the title. |

Spike also reads the label-form keys `Alert Name`, `Alert Message`, `Instance`, `Application` and `Project` when the matching field is empty.

If the delivery carries a top-level `message` key, Spike uses that text as the incident title as is.

## What happens in Spike

* **Grouping:** with an `alert_id`, a repeat notification for the same alert joins the open incident instead of paging again.
* **Without `alert_id`:** Spike matches by title, so the title is kept plain and stable: `High CPU Utilization on prod-db-01 in payments-api`.
* **Recovery:** SnappyFlow's documentation describes only violation notifications, so it is not confirmed that it sends a recovery at all. If it does send one with a recovery `status`, Spike resolves the open incident for the same `alert_id` (or, without one, the same alert name, instance, application and project), and never opens a new incident for it. Otherwise, resolve incidents in Spike yourself.
* **Batches:** a delivery that is a list, or has an `alerts` list, becomes one incident titled like `3 SnappyFlow alerts: High CPU Utilization, Disk Usage High +1 more`, keyed on the first alert's `alert_id`.

## Incident title

* With `alert_message`, the title is that sentence: `CPU utilization on prod-db-01 has been above 90% for the last 10 minutes`.
* Without it, Spike builds one: `Sev1 High CPU Utilization: cpu_util 97 is 8.2% above threshold 90 on prod-db-01 in payments-api`. The reading is left out when `value` or `threshold` is missing or not a number, they are equal, the threshold is 0, or they differ by under 1%.
* Without `alert_id`: `High CPU Utilization on prod-db-01 in payments-api`.
* On recovery: `High CPU Utilization on prod-db-01 in payments-api recovered`.
* With nothing usable at all: `SnappyFlow alert with no details`.

Use a [Title Remapper](../alerts/title-remapper.md) if you prefer a different format.

## Troubleshooting

* **Nothing arrives:** check that notifications are enabled for the alert and severity (Step 4), that the channel is added to the project (Step 3), and that the URL was copied whole.
* **Title reads `SnappyFlow alert with no details`, or repeats open new incidents:** SnappyFlow's delivery does not use the field names above. Open the incident's payload in Spike and send it to [support@spike.sh](mailto:support@spike.sh) so we can map the real fields.
* **Incidents do not resolve:** SnappyFlow may not send recoveries. Resolve the incident in Spike, or check the payload of the later deliveries for a recovery `status`.
