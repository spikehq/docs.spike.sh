---
description: "Send StatusGator alerts to Spike via webhook so an outage on a third-party status page pages your on-call and resolves when the service recovers."
---
# Integrate Spike with StatusGator

[StatusGator](https://statusgator.com) watches the status pages of the third-party services you depend on (OpenAI, AWS, Stripe and so on), plus websites and hosts you add yourself. Point a StatusGator webhook at Spike and an outage at a vendor pages your on-call rotation, and the incident resolves itself when StatusGator reports the service as up again.

### Service and Integration

Make sure to add a StatusGator integration and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

### Using Webhooks with StatusGator

**Step 1**

In StatusGator, open the notification settings of the board or monitor you want to be paged for and choose **Add notification**, then **Webhook**.

**Step 2**

Paste the Spike webhook URL. Send the notification as a `POST` with a JSON body.

**Step 3**

Tick the events you want to be notified about: status changes and, if you want to hear about suspected outages before the vendor confirms them, early warnings. Save.

## What Spike does with each event

The `type` field decides what Spike does.

| `type` | What happens |
| --- | --- |
| `StatusChange` with `status` `down`, `warn` or `maintenance` | Opens an incident and pages. |
| `StatusChange` with `status` `up` | Resolves the open incident for that monitor. |
| `EarlyWarningSignal` | Opens, or joins, the incident for that monitor. It never resolves it. |

`status` is compared after trimming and lower-casing. `maintenance` is treated as firing.

{% hint style="info" %}
An early warning that StatusGator never follows with a `StatusChange` stays open until someone resolves it by hand.
{% endhint %}

## Incident identity

Spike identifies the incident by `monitor.id`, the stable id of your StatusGator monitor. The firing, the early warning and the recovery of one monitor are therefore one incident. `monitor.id` must be a non-empty string; without one, Spike falls back to matching by title.

## Incident title

The title is the vendor's own sentence about the fault, followed by the monitor's name:

* `message` from the status page, plus the name: `Elevated Error Rate on ChatGPT (OpenAI)`
* Early warning: `Service outage (OpenAI), early warning`
* Recovery: `OpenAI is back up`

The name is `monitor.display_name`, then `service.name`, then `monitor.url`, then `monitor.host`. When `message` is empty the title reads `OpenAI is down: Chat, Images`, naming up to two affected components from `component_status_changes`.

## Fields

Required: `type`, `status` and `monitor.id`.

Read when present: `message`, `summary` (early warnings), `previous_status`, `monitor.display_name`, `monitor.url`, `monitor.host`, `service.name`, `component_status_changes[].name` and `component_status_changes[].current_status`.

## Example payloads

### Firing

```json
{
  "type": "StatusChange",
  "recorded_at": "2025-07-17T02:20:45Z",
  "service": {
    "id": "OUQJLhNcSb",
    "name": "OpenAI",
    "slug": "openai",
    "home_page_url": "https://openai.com",
    "status_page_url": "https://status.openai.com",
    "icon_url": "https://favicons.statusgator.com/openai.png",
    "landing_page_url": "https://statusgator.com/services/openai"
  },
  "monitor": {
    "id": "UIMPLWZg9D",
    "type": "ServiceMonitor",
    "display_name": "OpenAI",
    "icon_url": "https://favicons.statusgator.com/openai.png"
  },
  "board": {
    "id": "Pwg0NMcnNF",
    "name": "Production dependencies"
  },
  "status": "down",
  "previous_status": "up",
  "message": "Elevated Error Rate on ChatGPT",
  "details": "We have identified that users are experiencing elevated errors for ChatGPT and the API. We are working on a mitigation.",
  "component_status_changes": [
    {
      "group_name": "APIs",
      "name": "Chat",
      "last_status": "up",
      "current_status": "down"
    },
    {
      "group_name": "APIs",
      "name": "Images",
      "last_status": "up",
      "current_status": "down"
    }
  ]
}
```

### Recovery

```json
{
  "type": "StatusChange",
  "recorded_at": "2025-07-17T03:05:12Z",
  "service": {
    "id": "OUQJLhNcSb",
    "name": "OpenAI",
    "slug": "openai",
    "home_page_url": "https://openai.com",
    "status_page_url": "https://status.openai.com",
    "icon_url": "https://favicons.statusgator.com/openai.png",
    "landing_page_url": "https://statusgator.com/services/openai"
  },
  "monitor": {
    "id": "UIMPLWZg9D",
    "type": "ServiceMonitor",
    "display_name": "OpenAI",
    "icon_url": "https://favicons.statusgator.com/openai.png"
  },
  "board": {
    "id": "Pwg0NMcnNF",
    "name": "Production dependencies"
  },
  "status": "up",
  "previous_status": "down",
  "message": "Elevated Error Rate on ChatGPT",
  "details": "This incident has been resolved. Error rates for ChatGPT and the API have returned to normal.",
  "component_status_changes": [
    {
      "group_name": "APIs",
      "name": "Chat",
      "last_status": "down",
      "current_status": "up"
    },
    {
      "group_name": "APIs",
      "name": "Images",
      "last_status": "down",
      "current_status": "up"
    }
  ]
}
```

{% hint style="success" %}
This integration auto resolves
{% endhint %}
