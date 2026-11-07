---
description: "Connect Simple Observability to Spike for alerts on alert rules, servers, scheduled jobs and endpoints, with auto-resolution."
---
# Simple Observability

## Overview

[Simple Observability](https://simpleobservability.com) is a monitoring platform for servers, scheduled jobs, and HTTP endpoints. It evaluates alert rules over your metrics, watches server heartbeats, tracks job runs, and checks endpoint availability.

With Spike's integration, you can receive real-time alerts for:

* **Alert rules**: A rule fires (`FIRING`), for example "CPU usage above 90% for 5 minutes", and when it resolves (`RESOLVED`).
* **Server alerts**: A server stops sending heartbeats (`SERVER_DOWN`) and when it comes back (`SERVER_UP`).
* **Job alerts**: A job fails, is missed, or times out (`FAIL`, `MISSED`, `TIMEOUT`), and when it succeeds (`SUCCESS`).
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

These steps follow Simple Observability's [webhook documentation](https://simpleobservability.com/docs/alerts/webhook).

1. In your Simple Observability account, open the **Channels** page.
2. In the top right corner, click **Add Channel**.
3. From the list of channel types, select **Webhook**.
4. Enter the Spike webhook URL copied in Step 1.
5. Save the channel.
6. Click **Test** to send a test payload. It arrives in Spike as an incident titled "This is a test webhook message from Simple Observability."

{% endtab %}

{% tab title="Test with cURL" %}

Send the vendor's documented rule alert (replace `<webhook-url>` with the URL from Step 1):

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
      {"tags": {"host": "server-01"}, "value": "95.3000"}
    ]
  }
}'
```

Then resolve it. Simple Observability documents the `RESOLVED` status for rule alerts but publishes no resolved example, so this is the same body with `status` set to `RESOLVED`:

```bash
curl -X POST '<webhook-url>' \
  -H 'Content-Type: application/json' \
  -d '{
  "event_type": "RULE_ALERT",
  "title": "[RESOLVED] High CPU Usage",
  "status": "RESOLVED",
  "severity": null,
  "description": "CPU usage above 90% for 5 minutes",
  "timestamp": "2026-08-10T12:15:00+00:00",
  "url": "https://app.simpleobservability.com/alerts/abc-123",
  "data": {
    "rule": {
      "id": "abc-123",
      "name": "High CPU Usage",
      "description": "CPU usage above 90% for 5 minutes",
      "threshold": 90
    }
  }
}'
```

{% endtab %}
{% endtabs %}

## Event payload structure

Simple Observability sends an HTTP POST with a JSON body for every notification ([payload format](https://simpleobservability.com/docs/alerts/webhook)).

**Fields Spike reads:**

| Field | Meaning |
| --- | --- |
| `event_type` | `RULE_ALERT`, `SYSTEM_ALERT`, `JOB_ALERT`, `ENDPOINT_ALERT` or `TEST`. |
| `status` | A rule alert's state: `FIRING` or `RESOLVED`. Server and job alerts send their state here too. |
| `data.event_type` | The state of a server (`SERVER_DOWN`, `SERVER_UP`), job (`FAIL`, `MISSED`, `TIMEOUT`, `SUCCESS`) or endpoint (`ENDPOINT_DOWN`, `ENDPOINT_UP`) alert. Spike reads it first for those kinds, then `status`. |
| `data.rule.id`, `data.server.id`, `data.job.id`, `data.endpoint.id` | The UUID of the rule, server, job or endpoint. Spike groups repeats and resolves by it. |
| `description` | The vendor's sentence about the alert. |
| `data.rule.name` | The rule's name, which leads a rule alert's title. |
| `data.trigger_values[].tags.host` | The hosts that triggered a rule. |
| `severity` | `CRITICAL`, `ERROR`, `WARNING`, `INFO` or `SUCCESS` for server alerts; `ERROR`, `WARNING`, `SUCCESS` or `INFO` for endpoint alerts; `null` for rule and job alerts. |

## How Spike creates incidents

| Simple Observability sends | Spike does |
| --- | --- |
| Rule alert, `FIRING` | Opens an incident titled "{rule name}: {description} on {hosts}", for example "High CPU Usage: CPU usage above 90% for 5 minutes on server-01". |
| Rule alert, `RESOLVED` | Resolves the open incident with the same `data.rule.id`. |
| System alert, `SERVER_DOWN` | Opens an incident titled by the vendor's description, for example "Server 'prod-web-01' may be down. No heartbeat received in the last 5 minutes." |
| System alert, `SERVER_UP` | Resolves the open incident with the same `data.server.id`. |
| Job alert, `FAIL`, `MISSED` or `TIMEOUT` | Opens an incident titled by the vendor's description, for example "Job 'nightly-backup' has failed." |
| Job alert, `SUCCESS` | Resolves the open incident with the same `data.job.id`. |
| Endpoint alert, `ENDPOINT_DOWN` | Opens an incident titled by the vendor's description, for example "Endpoint 'billing-api' is currently unreachable." |
| Endpoint alert, `ENDPOINT_UP` | Resolves the open incident with the same `data.endpoint.id`. |
| Test message | Opens an incident titled by its description. |

* **Repeats:** an alert with the same id as an open incident joins that incident instead of opening a new one. Changing values (`timestamp`, `evaluation_window`, `trigger_values`) do not start a new incident.
* **Recoveries with nothing open** are dropped. A recovery never opens an incident.
* **Severity:** `CRITICAL` sets SEV1, `ERROR` and `WARNING` set SEV2, `INFO` sets SEV3. `SUCCESS` and `null` set no severity.
* **Acknowledge:** Simple Observability documents no acknowledge event, so incidents are acknowledged in Spike.
* **Without an id:** an alert is matched by its title, and its recovery does not resolve anything.
* **Empty description:** Spike builds the title from the name and state, for example "prod-web-01 is down" or "nightly-backup missed its run on prod-db-01". Titles are at most 200 characters.

## Troubleshooting

**No incident appears in Spike:**
* Confirm the channel's URL is the one from Step 1.
* Click **Test** on the channel, or send the cURL example above.

**Incident does not resolve:**
* Spike resolves only when the recovery carries the same rule, server, job or endpoint id as the alert that opened the incident.

{% hint style="success" %}
This integration auto resolves
{% endhint %}
