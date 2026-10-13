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

**Step 3:** Make sure the body Sedai sends has the fields below, and choose JSON (not YAML) as the format. Send a test.

## What Sedai sends

When an alert fires, Spike expects a JSON body like this:

```json
{
  "eventId": "evt-839201",
  "eventType": "Availability",
  "title": "High Error Rate Detected",
  "message": "Error rate for checkout-api exceeded the 5% threshold",
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
  "message": "Error rate for checkout-api has returned to normal levels",
  "severity": "INFO",
  "status": "RESOLVED",
  "resource": {
    "name": "checkout-api",
    "type": "Kubernetes Service",
    "region": "us-west-2"
  },
  "timestamp": "2023-11-15T10:15:00Z",
  "resolvedAt": "2023-11-15T10:15:00Z",
  "link": "https://dashboard.sedai.io/events/evt-839201"
}
```

| Field | Required | What Spike does with it |
| --- | --- | --- |
| `eventId` | Yes, for grouping and auto-resolve | Identifies one Sedai alert across firing and recovery. A string with text in it or a number (0 included) counts; an unexpanded template variable such as `$x`, `${x}`, `{{x}}` or `%x%` does not. A repeat with the same id joins the open incident, and a recovery resolves it. |
| `status` | Yes, for auto-resolve | `OPEN` opens an incident or joins the open one with the same `eventId`. `RESOLVED` marks a recovery (any letter case, surrounding spaces ignored); `CLOSED` and `OK` close too. A recovery with nothing open is dropped. Any other or missing value opens or joins and never closes. |
| `message` | Recommended | Sedai's sentence about what is wrong. It becomes the incident title when `eventId` is present. It is left out of the title when there is no `eventId`. |
| `title` | Recommended | The alert's name. Used in the title when `message` is empty or there is no `eventId`. |
| `resource.name` | Recommended | The affected service, workload or host. Added to the title as ` on {resource.name}`. |
| `eventType` | No | Only used in the last-resort title `Sedai {eventType} alert on {resource.name}`. |
| `severity` | No | Kept on the incident and used for its priority. Never part of the title. |
| `resource.type`, `resource.region`, `timestamp`, `link`, `resolvedAt` | No | Kept on the incident for context. |

## Incident identity

Spike identifies the incident by `eventId`. Sedai repeats it on the recovery, so one alert reads as one incident: it pages once, repeats join it, and the `RESOLVED` body resolves it.

If a body has no usable `eventId`, Spike matches by title instead, so the title is built only from `title` and `resource.name` and is the same on firing and recovery. `message` is never used on that path.

## Incident title

With an `eventId`, the title is Sedai's `message` with whitespace collapsed, plus ` on {resource.name}` when the sentence does not already contain the resource name:

```
Error rate for checkout-api exceeded the 5% threshold
```

If `message` is empty, the title is built from what is there: `{title} on {resource.name}`, then `{title}`, then `Sedai {eventType} alert on {resource.name}`, then `Sedai alert with no details`.

A recovery gets the same title with `[RESOLVED] ` in front:

```
[RESOLVED] Error rate for checkout-api has returned to normal levels
```

A body with no `eventId` always gets `{title} on {resource.name}`, for example `High Error Rate Detected on checkout-api`, whatever its `message` says. Its recovery is `[RESOLVED] {title} on {resource.name}` and closes the incident by status alone.

The title is at most 200 characters, `[RESOLVED] ` and the resource included. The resource name is never cut; the sentence is shortened at a word boundary and ends in `...`.

{% hint style="info" %}
Spike will automatically group repeated incidents and also suppress alerts while an incident is open. You can set up [alert rules](https://docs.spike.sh/alerts/alert-rules) to determine incident severity and take actions accordingly.
{% endhint %}

## Troubleshooting

* **The incident did not resolve.** Check that the recovery body carries the same `eventId` as the firing one and a `status` of `RESOLVED`. If Sedai does not send recoveries to custom webhooks, resolve the incident in Spike.
* **Optimization or remediation events create odd titles.** Those events may lack `eventId`, `status` or `message`. Without an `eventId` they use the `{title} on {resource.name}` title.
* **Nothing arrives.** Confirm the webhook URL is the one from Step 1 and that the alert type is selected in Sedai's notification settings.
