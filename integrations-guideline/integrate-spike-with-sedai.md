---
description: >-
  Send Sedai alerts to Spike through a custom webhook so an issue Sedai detects pages your on-call rotation by phone, SMS, Slack or Teams, and resolves its incident when Sedai reports the alert as resolved.
---

# Integrate Spike with Sedai

[Sedai](https://sedai.io) is an autonomous cloud optimization platform. It watches the availability, performance and cost of your services and workloads, flags what is going wrong and can act on it. Sedai can post those alerts to a custom webhook.

Point that webhook at a Spike integration URL and an alert from Sedai pages your on-call rotation when it fires. The incident resolves itself when Sedai sends the same alert again with a `status` of `RESOLVED`.

{% hint style="warning" %}
Sedai does not publish a webhook schema. The body below is the shape Spike reads, based on a third-party guide that calls its examples representative. Trigger an alert, or use a test option if Sedai offers one, and check the incident in Spike before you rely on it for paging.
{% endhint %}

## Set up instructions

**Step 1:** Create a Sedai integration in the Spike dashboard and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

**Step 2:** Add a webhook integration in Sedai.

* In Sedai, go to **Settings → Integrations**, click **Add Integration**, select **Notifications** and choose **Webhook**.
* In **Name**, enter a name you will recognise, such as `Spike`.
* Paste the Spike webhook URL from Step 1 into the **URL** field.
* Set the method to `POST` and the format to JSON, not YAML. Spike cannot read a YAML body.
* Save the integration.

**Step 3:** Subscribe the integration to alerts in Sedai.

* Go to **Settings → Notifications**.
* Select a notification category to see its alerts, and choose the webhook integration from Step 2 in the dropdown.
* Subscribe only the availability categories. Optimization and remediation notifications may carry no `status`, so Spike would open an incident for each one and nothing would resolve it.

**Step 4:** Trigger an alert, or use a test option if Sedai offers one, then check in Spike that the incident's payload has an `eventId` and a `status` as shown below. If a field is missing, see Troubleshooting.

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
| `eventType` | No | Only used in the last-resort title `Sedai {eventType} alert on {resource.name}`, and only together with `resource.name`. |
| `severity` | No | Lifted onto the incident as its severity when the incident opens (`CRITICAL` → sev1, `INFO` → sev3). Never part of the title. |
| `resource.type`, `resource.region`, `timestamp`, `link`, `resolvedAt` | No | Kept on the incident for context. |

## Incident identity

Spike identifies the incident by `eventId`. Sedai repeats it on the recovery, so one alert reads as one incident: it pages once, repeats join it, and the `RESOLVED` body resolves it.

If a body has no usable `eventId`, Spike matches by title instead, so the title is built only from `title`, `resource.name` and `eventType` (see below) and is the same on firing and recovery. `message` is never used on that path.

## Incident title

With an `eventId`, the title is Sedai's `message` with whitespace collapsed, plus ` on {resource.name}` when the sentence does not already contain the resource name:

```
Error rate for checkout-api exceeded the 5% threshold
```

If `message` is empty, the title is the first of these that the body has the fields for:

1. `{title} on {resource.name}`
2. `{title}`
3. `Sedai {eventType} alert on {resource.name}`
4. `Sedai alert with no details`

So a body with only an `eventType`, or only a `resource.name`, is titled `Sedai alert with no details`.

A recovery gets the same title with `[RESOLVED] ` in front:

```
[RESOLVED] Error rate for checkout-api has returned to normal levels
```

A body with no `eventId` always gets the title from that same list, starting at `{title} on {resource.name}`, for example `High Error Rate Detected on checkout-api`, whatever its `message` says. Its recovery gets the same title with `[RESOLVED] ` in front, and closes the incident by status alone.

The title is at most 200 characters, `[RESOLVED] ` and the resource included. The resource name is never cut; the sentence is shortened at a word boundary and ends in `...`.

{% hint style="info" %}
Spike will automatically group repeated incidents and also suppress alerts while an incident is open. You can set up [alert rules](https://docs.spike.sh/alerts/alert-rules) to determine incident severity and take actions accordingly.
{% endhint %}

## Troubleshooting

* **The incident did not resolve.** Check that the recovery body carries the same `eventId` as the firing one and a `status` of `RESOLVED`. If Sedai does not send recoveries to custom webhooks, resolve the incident in Spike.
* **Optimization or remediation events create odd titles.** Those events may lack `eventId`, `status` or `message`. Without an `eventId` they use the `{title} on {resource.name}` title.
* **Nothing arrives.** Confirm the webhook URL is the one from Step 1 and that the alert type is selected in Sedai's notification settings.
