---
description: "Connect Edge Delta to Spike via webhook to turn monitor alerts and recoveries into real-time on-call incidents."
---
# Integrate Spike with Edge Delta

Edge Delta monitors notify through webhooks whose JSON body you write yourself. This guide gives you the exact body Spike expects. You create two webhooks: one for alerts and one for recoveries. Both post to the same Spike URL.

### Service and Integration

Make sure to add an Edge Delta integration and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

### Using webhooks with Edge Delta

#### Step 1: Create the alert webhook

In Edge Delta, go to **Admin** → **Legacy Integrations** and add a **Webhook** integration.

* **Name:** `spike`
* **Endpoint / URL:** the Spike webhook URL you copied (required)
* **Method:** POST
* **Body:** paste the JSON below (required)

```json
{
  "event_action": "triggered",
  "event_id": "$EVENT_ID",
  "event_type": "$EVENT_TYPE",
  "title": "$EVENT_TITLE",
  "message": "$EVENT_MSG",
  "status": "$EVENT_STATUS",
  "monitor_query": "$EVENT_QUERY",
  "metric": "$EVENT_METRIC",
  "value": "$EVENT_EVALUATED_VALUE",
  "group": "$EVENT_GROUP_ALL",
  "event_url": "$EVENT_URL",
  "event_time": "$EVENT_DATE",
  "org_id": "$EVENT_ORG_ID"
}
```

Edge Delta replaces each `$EVENT_*` token when the monitor fires. `event_action` is the only fixed value: keep it as `triggered` in this webhook.

#### Step 2: Create the recovery webhook

Add a second **Webhook** integration under **Admin** → **Legacy Integrations**, named `spike-resolve`, with the **same Spike webhook URL** and POST. Use the same body, but with `event_action` set to `resolved`:

```json
{
  "event_action": "resolved",
  "event_id": "$EVENT_ID",
  "event_type": "$EVENT_TYPE",
  "title": "$EVENT_TITLE",
  "message": "$EVENT_MSG",
  "status": "$EVENT_STATUS",
  "monitor_query": "$EVENT_QUERY",
  "metric": "$EVENT_METRIC",
  "value": "$EVENT_EVALUATED_VALUE",
  "group": "$EVENT_GROUP_ALL",
  "event_url": "$EVENT_URL",
  "event_time": "$EVENT_DATE",
  "org_id": "$EVENT_ORG_ID"
}
```

Spike uses `event_action` to decide whether to open or resolve an incident, so it must be set correctly in each webhook.

#### Step 3: Route your monitor to both webhooks

Open the monitor, and in its notification message add:

```
{{#is_alert}} @webhook-spike {{/is_alert}}
{{#is_recovery}} @webhook-spike-resolve {{/is_recovery}}
```

Write your message text inside these blocks. The sentence you write there is sent as `$EVENT_MSG`, and becomes the Spike incident title when the alert carries both a monitor query and a group, for example: `Checkout API 5xx error rate is 12.4% which is above the alert threshold of 5% for checkout-api in prod-us-east`. The recovery's sentence titles the recovery.

{% hint style="warning" %}
Keep double quotes and line breaks out of the notification message. Edge Delta places it inside a JSON string, and if it does not escape them the body arrives as invalid JSON and no incident is created.
{% endhint %}

#### Example payload

An alert sends:

```json
{
  "event_action": "triggered",
  "event_id": "2y2TNDdF0aKe5ijl8bfhoirPIKR",
  "event_type": "metric_threshold",
  "title": "Checkout API 5xx error rate",
  "message": "Checkout API 5xx error rate is 12.4% which is above the alert threshold of 5% for checkout-api in prod-us-east",
  "status": "Alert",
  "monitor_query": "avg(http.server.error_rate) by k8s.namespace.name, service.name",
  "metric": "http.server.error_rate",
  "value": "12.4",
  "group": "k8s.namespace.name:checkout, service.name:checkout-api",
  "event_url": "https://app.edgedelta.com/monitors/2y2B1q3XZrvz0rOZuLLxVaneU4T/events/2y2TNDdF0aKe5ijl8bfhoirPIKR",
  "event_time": "2026-10-07T09:14:22Z",
  "org_id": "2y1XmQ8bKf3nTzRpLwVcHdYsJ4A"
}
```

### How Spike handles alerts and recoveries

* **Grouping.** Spike groups repeat alerts with the same `monitor_query` and `group` into one incident, and the recovery webhook resolves that incident automatically. A recovery for a different group, or a different monitor, leaves the incident open.
* **Alerts without a query or group.** If a monitor has no group-by, or `$EVENT_QUERY` or `$EVENT_GROUP_ALL` is missing from the body, Spike matches alerts by title instead. The title is then the monitor's name and group, `{title} on {group}`, with no reading, so every repeat lands on the same incident.
* **Recoveries.** A recovery with no open incident to resolve is dropped; it never opens an incident. Spike treats a delivery as a recovery when `event_action` is `resolved` (or `recovered`, `closed`, `cleared`, `ok`). If `event_action` is missing, a `status` of `OK` is a recovery; `No Data` is not.
* **Titles.** Titles are cut to 200 characters. With no message, the title is `{metric} at {value} in {group}`, or the monitor's name and group.
