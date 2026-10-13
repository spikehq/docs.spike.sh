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

In StatusGator, go to **Integrations → Webhooks** and choose **Add**.

**Step 2**

Enter the Spike webhook URL and **Save**. StatusGator documents no signing or auth header for webhooks; the token in the Spike URL is the credential, so treat the URL like a password.

**Step 3**

Send a test notification from the webhook's page in StatusGator. A real status change then opens, joins or resolves incidents as described below.

{% hint style="info" %}
StatusGator disables a webhook after five responses that are not `200`. If incidents stop arriving, check the integration's **Logs** tab in StatusGator and re-enable the webhook.
{% endhint %}

## What Spike does with each event

The `type` field decides what Spike does.

| `type` | What happens |
| --- | --- |
| `StatusChange` with `status` `down`, `warn` or `maintenance` | Opens an incident, or joins the one already open for that monitor, and pages. |
| `StatusChange` with `status` `up` | Resolves the open incident for that monitor. |
| `StatusChange` with any other or missing `status` | Treated as firing: opens or joins. |
| `EarlyWarningSignal` | Has no `status`. Opens, or joins, the incident for that monitor. It never resolves it. |

`status` is compared exactly after trimming and ignoring case. `maintenance` is treated as firing.

{% hint style="info" %}
An early warning that StatusGator never follows with a `StatusChange` stays open until someone resolves it by hand.
{% endhint %}

## Incident identity

Spike identifies the incident by `monitor.id`, the stable id of your StatusGator monitor. The firing, the early warning and the recovery of one monitor are therefore one incident, and a recovery only closes the incident of the same monitor. The title is for display only.

`monitor.id` counts as an id when it is a non-empty string or a number, and is not an unexpanded template variable such as `$monitor_id` or `{{monitor.id}}`. Without a usable id Spike falls back to matching by title, which is why that shape gets the plain title described below.

## Incident title

With a `monitor.id`, the title is `{message} - {where} {state}`:

* Firing: `Elevated Error Rate on ChatGPT - OpenAI down`
* `status` `warn`: `Increased latency - OpenAI degraded`
* `status` `maintenance`: `Scheduled database upgrade - OpenAI under maintenance`
* Missing or unknown `status`: `Elevated Error Rate on ChatGPT - OpenAI status changed`
* Empty `message`, naming up to two components whose `current_status` is not `up`: `Chat, Images down on OpenAI` or `Chat, Images +2 more down on OpenAI`; with no components, `OpenAI is down`
* Early warning: `Service outage - possible outage on OpenAI`, or `Possible outage on OpenAI (early warning)` when `summary` is empty
* Recovery: `OpenAI is back up`
* No usable `monitor.id`: `OpenAI status alert`, for both firing and recovery
* Nothing usable in the body: `StatusGator alert with no details`

`where` is `monitor.display_name`, then `service.name`, then `monitor.host`; never a URL or an id. Whitespace is collapsed and titles are capped at 200 characters, shortening the sentence and never the name. A long `message` is cut at its first clause.

## Fields

Required: `type` and `monitor.id`. `status` is required to resolve; without it a `StatusChange` is treated as firing.

Read when present: `message`, `summary` (early warnings), `monitor.display_name`, `service.name`, `monitor.host`, `component_status_changes[].name` and `component_status_changes[].current_status`.

Everything else in the body is kept on the incident page.

## Example payloads

### Firing

```json
{
  "type": "StatusChange",
  "recorded_at": "2026-10-13T02:20:45Z",
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
  "details": "We have identified that users are experiencing elevated errors for the impacted services. We are working on implementing a mitigation.",
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
  "recorded_at": "2026-10-13T03:05:12Z",
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
  "details": "This incident has been resolved.",
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
