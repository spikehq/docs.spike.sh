---
description: "Send Uptrends monitor alerts to Spike so a failing website, API or transaction monitor pages your on-call rotation, and the incident resolves when Uptrends reports the monitor is OK again."
---

# Integrate Spike with Uptrends

[Uptrends](https://www.uptrends.com) monitors websites, APIs, servers and multi-step transactions from checkpoints around the world. When a monitor fails, an alert definition decides who gets told. Add a webhook integration to that alert definition and Uptrends posts every alert to Spike, so a failing monitor pages your on-call rotation by phone, SMS, Slack or Teams.

### Service and integration

Make sure to add the Uptrends integration and copy the webhook.&#x20;

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

### Using the Webhook with Uptrends

### Step 1

Log in to your Uptrends account and open **Alerting** in the left menu.

### Step 2

Open **Integrations** and click **+**. Select the **Uptrends integration** type, click **Choose...**, and give it a name such as `Spike`.

### Step 3

Set the **API URL** to the Spike webhook URL you copied (choose **Specify value here**). Keep the predefined request body on the **Customizations** tab as it is, then click **Save**.

Spike reads these fields of the predefined body. If you edit the body, keep them:

* `alert.type`
* `alert.description`
* `incident.key`
* `monitor.guid`
* `monitor.name`
* `monitor.url`
* `alertDefinition.name`

{% hint style="warning" %}
If you add a free-text variable to the body yourself, wrap it in `@JsonEncode`, as the predefined body does for the description: `"{{@JsonEncode({{@alert.description}})}}"`. Text such as an error message or a response body can contain quotes, and an unencoded quote makes the body invalid JSON that Spike cannot read.
{% endhint %}

This is what Spike receives when a monitor fails (abridged):

```json
{
  "alert": {
    "type": "Alert",
    "description": "HTTP error 503 (Service Unavailable)",
    "timestampUtc": "2026-10-09T01:12:44"
  },
  "alertDefinition": { "name": "Production websites" },
  "incident": { "key": "a91c7d2e-5b3f-4e8a-b6d0-17f4c2e9a835" },
  "monitor": {
    "guid": "5e0f8b3a-6c21-4d97-8f4e-0a2b9c7d1e63",
    "name": "Shop checkout health",
    "url": "https://shop.example.com/health"
  },
  "source": "Uptrends"
}
```

And when it recovers, with the same `incident.key`:

```json
{
  "alert": { "type": "Ok", "description": "", "downtimeDuration": "00:12:26" },
  "alertDefinition": { "name": "Production websites" },
  "incident": { "key": "a91c7d2e-5b3f-4e8a-b6d0-17f4c2e9a835" },
  "monitor": {
    "guid": "5e0f8b3a-6c21-4d97-8f4e-0a2b9c7d1e63",
    "name": "Shop checkout health",
    "url": "https://shop.example.com/health"
  },
  "source": "Uptrends"
}
```

### Step 4

Open **Alerting** > **Alert definitions**, edit the alert definition that covers the monitors you want in Spike (or create one), and open the escalation level you want to page from. Under **Integrations**, tick the **Spike** integration. Leave the Error, Reminder and OK message types enabled, so Uptrends also sends the OK alert when the monitor recovers.

### Step 5

Save the alert definition and make sure your monitors are assigned to it (**Monitors** > edit the monitor > **Alert definitions**).

## Fields Spike reads

| Field | Required | Used for |
| --- | --- | --- |
| `alert.type` | Yes | `Alert` opens an incident, `Reminder` adds to the open one, `Ok` resolves it. |
| `incident.key` | Recommended | Identity of one Uptrends incident. The error alert, its reminders and its OK alert share it. |
| `monitor.guid` | Recommended | Fallback identity when `incident.key` is missing, empty or not filled in by Uptrends. |
| `alert.description` | Recommended | Uptrends' own sentence about the error. It becomes the incident title. |
| `monitor.name` | Recommended | The monitor named in the title. When empty, the host of `monitor.url` is used. |
| `monitor.url` | Optional | Only used for the title when `monitor.name` is empty. |
| `alertDefinition.name` | Optional | Used in the title when `alert.description` is empty or the body carries no id. |

All other fields are kept on the incident for reference.

## What Spike does with each alert

| `alert.type` | Result |
| --- | --- |
| `Alert` | A new error was detected. Opens an incident and pages. |
| `Reminder` | The original error is still ongoing. Joins the open incident with the same `incident.key` and never resolves it. If no incident is open, it opens one (or reopens the resolved one), so an error whose first alert was missed still pages. |
| `Ok` | The error was resolved. Resolves the open incident with the same `incident.key` (or `monitor.guid`). It never opens an incident. |

Example incident titles:

* `HTTP error 503 (Service Unavailable) on Shop checkout health`
* `Shop checkout health recovered`

{% hint style="warning" %}
If `incident.key` and `monitor.guid` are both removed from the body, every title becomes `{alertDefinition.name} on {monitor.name}`, for example `Production websites on Shop checkout health`, and Spike matches a recovery to its incident by that title and resolves it only when the alert definition and monitor are the same. Keep the ids in the body.
{% endhint %}

{% hint style="success" %}
This integration supports auto-resolution of incidents
{% endhint %}
