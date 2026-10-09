---
description: "Connect Simple Observability to Spike for real-time alerts on alert rules, server heartbeats, scheduled jobs, and endpoint checks, with auto-resolution."
---
# Simple Observability

## Overview

[Simple Observability](https://simpleobservability.com) is a monitoring platform for servers, scheduled jobs, and HTTP endpoints. It evaluates alert rules over your metrics, watches server heartbeats, tracks job runs, and checks endpoint availability.

With Spike's integration, you can receive real-time alerts for:

* **Alert rules**: A rule on your metrics starts firing, for example "CPU usage above 90% for 5 minutes", and when it resolves.
* **Server alerts**: A server stops sending heartbeats (`SERVER_DOWN`) and when it comes back (`SERVER_UP`).
* **Job alerts**: A scheduled job fails, is missed, or times out, and when it succeeds again.
* **Endpoint alerts**: An endpoint becomes unreachable (`ENDPOINT_DOWN`) and when it recovers (`ENDPOINT_UP`).

{% hint style="info" %}
Spike will automatically group repeated incidents and also suppress alerts while an incident is open. You can set up [alert rules](https://docs.spike.sh/alerts/alert-rules) to determine incident severity and take actions accordingly.
{% endhint %}

## Set up instructions

**Step 1:** Create a Simple Observability integration in the Spike dashboard and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

**Step 2:**

{% tabs %}
{% tab title="Setup on Simple Observability" %}

1. Log in to Simple Observability and open the **Alerts** section.
2. Add a **Webhook** notification channel.
   * **URL**: paste the Spike webhook URL copied in Step 1. This is the only required field.
   * Leave the method as `POST` with a JSON body. Spike does not need an authentication header.
3. Attach the channel to the alert rules, server alerts, jobs, and endpoints you want Spike to hear about.
4. Send a test notification from the channel. It arrives in Spike as an incident with the vendor's test message.

The exact menu names can differ between Simple Observability versions. If you cannot find the webhook option, check the vendor's notification channel documentation.

{% endtab %}

{% tab title="Test with cURL" %}

Send a firing alert (replace `<webhook-url>` with the URL from Step 1):

```bash
curl -X POST '<webhook-url>' \
  -H 'Content-Type: application/json' \
  -d '{
  "event_type": "RULE_ALERT",
  "title": "[FIRING] High CPU Usage",
  "status": "FIRING",
  "severity": null,
  "description": "CPU usage above 90% for 5 minutes",
  "timestamp": "2026-08-10T12:00:00+00:00",
  "url": "https://app.simpleobservability.com/alerts/abc-123",
  "data": {
    "rule": {
      "id": "abc-123",
      "name": "High CPU Usage",
      "description": "CPU usage above 90% for 5 minutes",
      "threshold": 90
    },
    "evaluation_window": {
      "start": "2026-08-10T11:55:00+00:00",
      "end": "2026-08-10T12:00:00+00:00"
    },
    "trigger_values": [
      {
        "tags": {
          "host": "server-01"
        },
        "value": "95.3000"
      }
    ]
  }
}'
```

Then resolve it:

```bash
curl -X POST '<webhook-url>' \
  -H 'Content-Type: application/json' \
  -d '{
  "event_type": "RULE_ALERT",
  "title": "[RESOLVED] High CPU Usage",
  "status": "RESOLVED",
  "severity": null,
  "description": "CPU usage above 90% for 5 minutes",
  "timestamp": "2026-08-10T12:20:00+00:00",
  "url": "https://app.simpleobservability.com/alerts/abc-123",
  "data": {
    "rule": {
      "id": "abc-123",
      "name": "High CPU Usage",
      "description": "CPU usage above 90% for 5 minutes",
      "threshold": 90
    },
    "evaluation_window": {
      "start": "2026-08-10T12:15:00+00:00",
      "end": "2026-08-10T12:20:00+00:00"
    }
  }
}'
```

{% endtab %}
{% endtabs %}

## Event payload structure

Simple Observability sends a JSON body for every notification. The example above is a rule alert.

**Key fields:**

| Field | Required | Meaning |
| --- | --- | --- |
| `event_type` | Yes | Kind of message: `RULE_ALERT`, `SYSTEM_ALERT`, `JOB_ALERT`, `ENDPOINT_ALERT` or `TEST`. |
| `status` | Yes (absent on `TEST`) | State of the event. Firing: `FIRING`, `SERVER_DOWN`, `FAIL`, `MISSED`, `TIMEOUT`, `ENDPOINT_DOWN`. Recovered: `RESOLVED`, `SERVER_UP`, `SUCCESS`, `ENDPOINT_UP`. |
| `description` | Recommended | The vendor's sentence about what is wrong. It becomes the incident title. |
| `title` | Optional | Short label such as `[FIRING] High CPU Usage`. Used only when there is no description. |
| `severity` | Optional | `CRITICAL`, `ERROR`, `WARNING`, `INFO` or `SUCCESS` for server alerts, `ERROR`, `WARNING`, `SUCCESS` or `INFO` for endpoint alerts, `null` for rule and job alerts. |
| `data.rule.id` / `data.server.id` / `data.job.id` / `data.endpoint.id` | Yes | Stable id of the rule, server, job or endpoint, depending on `event_type`. Spike uses it to group repeats and to resolve. |
| `data.rule.name`, `data.rule.description`, `data.rule.threshold` | Optional | Rule details used when the description is empty and for recovery titles. |
| `data.trigger_values[].tags` and `.value` | Optional | The series that triggered a rule, shown in the incident title. |
| `data.job.server`, `data.endpoint.last_status` | Optional | Server a job runs on, and last HTTP status of an endpoint. |

## How Spike creates incidents

* The incident title is the vendor's own sentence from `description`, for example "CPU usage above 90% for 5 minutes: 95 on server-01".
* Spike matches repeat alerts and recoveries by the id for the alert kind (`data.rule.id`, `data.server.id`, `data.job.id` or `data.endpoint.id`). A recovery status (`RESOLVED`, `SERVER_UP`, `SUCCESS`, `ENDPOINT_UP`) resolves the open incident with the same id.
* One rule is one incident, even when several hosts trigger it.
* Test notifications and bodies without an id are matched by title.

## Troubleshooting

**No incident appears in Spike:**
* Confirm the webhook URL is the one from Step 1 and the channel is attached to the alert.
* Send the cURL example above to check that the integration works.

**Incident does not resolve:**
* Make sure Simple Observability sends the recovery notification to the same channel, and that the body carries the same id as the firing one.

{% hint style="success" %}
This integration auto resolves
{% endhint %}
