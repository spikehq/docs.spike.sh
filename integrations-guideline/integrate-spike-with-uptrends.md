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

Open **Integrations** and choose to add a new integration. Select the **Webhook** type (a custom or generic webhook), and give it a name such as `Spike`.

### Step 3

Set the following:

| Field | Value |
| --- | --- |
| URL | The Spike webhook URL you copied |
| HTTP method | **POST** |
| Content type | **application/json** |
| Body | The JSON below, exactly as shown |

Paste this body into the message template. Every `{{...}}` placeholder is filled in by Uptrends when the alert is sent.

```json
{
  "alert": {
    "alertGuid": "{{@alert.alertGuid}}",
    "type": "{{@alert.type}}",
    "description": "{{@alert.description}}",
    "failureMessage": "{{@alert.failureMessage}}",
    "timestampUtc": "{{@alert.timestampUtc}}",
    "timestamp": "{{@alert.timestamp}}",
    "timestampUtcFormatted": "{{@alert.timestampUtcFormatted}}",
    "timestampFormatted": "{{@alert.timestampFormatted}}",
    "firstErrorUtc": "{{@alert.firstErrorUtc}}",
    "firstError": "{{@alert.firstError}}",
    "firstErrorUtcFormatted": "{{@alert.firstErrorUtcFormatted}}",
    "firstErrorFormatted": "{{@alert.firstErrorFormatted}}",
    "firstErrorCheckUrl": "{{@alert.firstErrorCheckUrl}}",
    "firstErrorCheckId": "{{@alert.firstErrorCheckId}}",
    "serverIpv4": "{{@alert.serverIpv4}}",
    "serverIpv6": "{{@alert.serverIpv6}}",
    "resolvedIpAddress": "{{@alert.resolvedIpAddress}}",
    "responseBody": "{{@alert.responseBody}}",
    "downtimeDuration": "{{@alert.downtimeDuration}}"
  },
  "alertDefinition": {
    "guid": "{{@alertDefinition.guid}}",
    "name": "{{@alertDefinition.name}}"
  },
  "escalationLevel": {
    "id": "{{@escalationLevel.id}}",
    "message": "{{@escalationLevel.message}}"
  },
  "incident": {
    "key": "{{@incident.key}}"
  },
  "monitor": {
    "guid": "{{@monitor.monitorGuid}}",
    "name": "{{@monitor.name}}",
    "type": "{{@monitor.type}}",
    "url": "{{@monitor.url}}",
    "notes": "{{@monitor.notes}}",
    "dashboardUrl": "{{@monitor.dashboardUrl}}",
    "editUrl": "{{@monitor.editUrl}}"
  },
  "account": {
    "id": "{{@account.id}}"
  },
  "source": "Uptrends",
  "version": "1.0"
}
```

{% hint style="info" %}
Uptrends also offers a predefined **Uptrends integration** template that produces this structure. If you use it, check the placeholder names against the body above, because the incident key and monitor id are what let Spike group alerts and resolve them.
{% endhint %}

### Step 4

Open **Alerting** > **Alert definitions**, edit the alert definition that covers the monitors you want in Spike (or create one), and open the escalation level you want to page from. Under **Integrations**, tick the **Spike** integration. Make sure the escalation level is also set to send a message when the monitor recovers, so Uptrends sends the OK alert.

### Step 5

Save the alert definition and make sure your monitors are assigned to it (**Monitors** > edit the monitor > **Alert definitions**).

## Fields Spike reads

| Field | Required | Used for |
| --- | --- | --- |
| `alert.type` | Yes | `Alert` opens an incident, `Reminder` adds to the open one, `Ok` resolves it. |
| `incident.key` | Yes | Identity of one Uptrends incident. The error alert, its reminders and its OK alert share it. |
| `monitor.guid` | Recommended | Fallback identity when `incident.key` is missing or empty. |
| `alert.description` | Recommended | Uptrends' own sentence about the error. It becomes the incident title. |
| `monitor.name` | Recommended | The monitor named in the title. When empty, the host of `monitor.url` is used. |
| `monitor.url` | Optional | Only used for the title when `monitor.name` is empty. |
| `alertDefinition.name` | Optional | Used in the title when `alert.description` is empty. |

All other fields are kept on the incident for reference.

## What Spike does with each alert

| `alert.type` | Result |
| --- | --- |
| `Alert` | A new error was detected. Opens an incident and pages. |
| `Reminder` | The original error is still ongoing. Joins the open incident with the same `incident.key` and never resolves it. |
| `Ok` | The error was resolved. Resolves the incident. |

Example incident titles:

* `HTTP error 503 (Service Unavailable) on Shop checkout health`
* `Shop checkout health recovered`

{% hint style="warning" %}
If `incident.key` and `monitor.guid` are both removed from the body, Spike can only match a recovery to its incident by title. Keep them in the body.
{% endhint %}

{% hint style="success" %}
This integration supports auto-resolution of incidents
{% endhint %}
