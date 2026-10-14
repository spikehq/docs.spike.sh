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

Set the webhook's payload schema to **v3.0**. Spike reads only the v3.0 fields (`type`, `monitor`, `service`, `status`). The v2.0 schema has no `type` and no `monitor`, so its deliveries all get the title `StatusGator alert with no details`, are not told apart by monitor and never auto resolve.

**Step 4**

Choose which statuses notify. Keep **up** enabled: it is the status that resolves the incident, so without it incidents stay open until someone resolves them by hand. Enable **down** and **warn** to open incidents. If you also enable **maintenance**, a maintenance window opens an incident too.

**Step 5**

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

`status` is compared after trimming and ignoring case. `maintenance` is treated as firing.

{% hint style="info" %}
An early warning that StatusGator never follows with a `StatusChange` stays open until someone resolves it by hand.
{% endhint %}

## Incident identity

Spike identifies the incident by `monitor.id`, the stable id of your StatusGator monitor. The firing, the early warning and the recovery of one monitor are therefore one incident, and a recovery only closes the incident of the same monitor. The title is for display only.

`monitor.id` counts as an id when it is a non-empty string or a finite number, and is not an unexpanded template variable such as `$x`, `${x}`, `{{x}}` or `%x%`. Without a usable id Spike falls back to matching by title, which is why that shape gets the plain title described below.

## Incident title

With a `monitor.id`, a firing `StatusChange` is titled `{message} ({where} {level})`:

* `down`: `Elevated Error Rate on ChatGPT (OpenAI down)`
* `warn`: `Increased latency (OpenAI degraded)`
* `maintenance`: `Scheduled database upgrade (OpenAI under maintenance)`
* Missing or unknown `status`: the level is left out, `Elevated Error Rate on ChatGPT (OpenAI)`
* Empty `message`, naming up to two components whose `current_status` is not `up`: `Chat, Images down on OpenAI` or `Chat, Images +2 more down on OpenAI`; with no such components, `OpenAI is down`
* Unknown or missing `status` with an empty `message`: `Chat changed on OpenAI` (components named) or `OpenAI status changed`
* Early warning: `Service outage reported for OpenAI (early warning)`, or `Possible outage reported for OpenAI (early warning)` when `summary` is empty
* Recovery (`status` `up`): `OpenAI is back up`, without the message
* No usable `monitor.id`: `StatusGator alert for OpenAI`, identical for firing and recovery, because Spike matches these by title
* Nothing usable in the body: `StatusGator alert with no details`

`where` is the first non-empty of `monitor.display_name`, `service.name` and `monitor.host`, else `StatusGator monitor`. Titles never hold ids, URLs or timestamps. Whitespace is collapsed and titles are capped at 200 characters; to fit, the sentence is cut and the parenthesised name and level are kept whole.

## Fields

Required: `type` and `monitor.id`. `status` is required to resolve; without it a `StatusChange` is treated as firing. `StatusChange` with `up` and nothing open is dropped; it never opens an incident.

Read when present: `message`, `summary` (early warnings), `monitor.display_name`, `service.name`, `monitor.host`, `component_status_changes[].name` and `component_status_changes[].current_status`.

Everything else in the body is kept on the incident page.

## Example payloads

### Firing

```json
{
  "type": "StatusChange",
  "recorded_at": "2026-10-14T03:12:08Z",
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
  "details": "We are investigating elevated error rates for ChatGPT requests. Some users may see failed or slow responses.",
  "component_status_changes": [
    {
      "group_name": "APIs",
      "name": "Chat",
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
  "recorded_at": "2026-10-14T04:05:51Z",
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
  "details": "This incident has been resolved. ChatGPT error rates have returned to normal.",
  "component_status_changes": [
    {
      "group_name": "APIs",
      "name": "Chat",
      "last_status": "down",
      "current_status": "up"
    }
  ]
}
```

{% hint style="success" %}
This integration auto resolves
{% endhint %}
