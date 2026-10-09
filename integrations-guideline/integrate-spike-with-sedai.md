---
description: >-
  Send Sedai alerts to Spike through a custom webhook so an issue Sedai detects pages your on-call rotation by phone, SMS, Slack or Teams, and resolves its incident when Sedai reports the alert as resolved.
---

# Integrate Spike with Sedai

[Sedai](https://sedai.io) is an autonomous cloud optimization platform. It watches the availability, performance and cost of your services and workloads, flags what is going wrong and can act on it. Sedai can post those alerts to a custom webhook.

Point that webhook at a Spike integration URL and an alert from Sedai pages your on-call rotation when it fires. The incident resolves itself when Sedai sends the same alert again with a `status` of `RESOLVED`.

{% hint style="warning" %}
Sedai does not publish a webhook schema. The body below is the shape Spike reads, based on a third-party guide that calls its examples representative. Send a test from Sedai and check the incident in Spike before you rely on it for paging.
{% endhint %}

## Set up instructions

**Step 1:** Create a Sedai integration in the Spike dashboard and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

**Step 2:** Add a custom webhook in Sedai.

* In Sedai, go to **Settings → Notifications**.
* Choose **Custom Webhook** and add a new webhook.
* Paste the Spike webhook URL from Step 1 into the webhook URL field. This is the only required field.
* Set the method to `POST` and the content type to `application/json`. Sedai's documentation does not describe other form fields, so leave any others at their defaults.
* Select the alert and event types you want delivered to Spike, then save.

**Step 3:** Make sure the body Sedai sends has the fields below, and send a test.

## What Sedai sends

When an alert fires, Spike expects a JSON body like this:

```json
{
  "eventId": "evt-839201",
  "eventType": "Availability",
  "title": "High Error Rate Detected",
  "message": "Error rate for service 'checkout-api' exceeded 5% threshold.",
  "severity": "CRITICAL",
  "status": "OPEN",
  "resource": {
    "name": "checkout-api",
    "type": "Kubernetes Service",
    "region": "us-west-2"
  },
  "timestamp": "2023-11-15T10:00:00Z",
  "link": "https://dashboard.sedai.io/events/evt-839201"
}
```

When the alert recovers, the same `eventId` comes back with a `status` of `RESOLVED`:

```json
{
  "eventId": "evt-839201",
  "eventType": "Availability",
  "title": "High Error Rate Detected",
  "message": "Error rate for service 'checkout-api' has returned to normal levels.",
  "severity": "INFO",
  "status": "RESOLVED",
  "resource": {
    "name": "checkout-api",
    "type": "Kubernetes Service",
    "region": "us-west-2"
  },
  "timestamp": "2023-11-15T10:15:00Z",
  "resolvedAt": "2023-11-15T10:15:00Z"
}
```

| Field | Required | What Spike does with it |
| --- | --- | --- |
| `eventId` | Yes, for grouping and auto-resolve | Identifies one Sedai alert across firing and recovery. A repeat with the same id joins the open incident, and a recovery resolves it. |
| `status` | Yes, for auto-resolve | `RESOLVED` (any letter case) marks a recovery. Any other value, such as `OPEN`, is treated as a firing alert. |
| `message` | Recommended | Sedai's sentence about what is wrong. It becomes the incident title. |
| `title` | Recommended | The alert's name. Used in the title when `message` is empty. |
| `resource.name` | Recommended | The affected service, workload or host. Used in the title when `message` is empty. |
| `eventType`, `severity`, `resource.type`, `resource.region`, `timestamp`, `link`, `resolvedAt` | No | Kept on the incident for context. |

## Incident identity

Spike identifies the incident by `eventId`. Sedai repeats it on the recovery, so one alert reads as one incident: it pages once, repeats join it, and the `RESOLVED` body resolves it.

If a body has no `eventId`, Spike matches by title instead, so the title is built only from `title` and `resource.name` and is the same on firing and recovery.

## Incident title

The title is Sedai's own `message`, with whitespace collapsed and cut at 200 characters:

```
Error rate for service 'checkout-api' exceeded 5% threshold.
```

If `message` is empty, the title is built from what is there: `{title} on {resource.name}`, then `{title}`, then `{resource.name}`, then `Sedai alert with no details`. A recovery with no `message` reads `{title} resolved on {resource.name}`.

A body with no `eventId` always gets `{title} on {resource.name}`, for example `Optimization Recommendation on billing-worker`, whatever its `message` says.

{% hint style="info" %}
Spike will automatically group repeated incidents and also suppress alerts while an incident is open. You can set up [alert rules](https://docs.spike.sh/alerts/alert-rules) to determine incident severity and take actions accordingly.
{% endhint %}

## Troubleshooting

* **The incident did not resolve.** Check that the recovery body carries the same `eventId` as the firing one and a `status` of `RESOLVED`. If Sedai does not send recoveries to custom webhooks, resolve the incident in Spike.
* **Optimization or remediation events create odd titles.** Those events may lack `eventId`, `status` or `message`. They then use the `{title} on {resource.name}` title.
* **Nothing arrives.** Confirm the webhook URL is the one from Step 1 and that the alert type is selected in Sedai's notification settings.
