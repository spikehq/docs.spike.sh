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
4. Send a test notification from the channel. It arrives in Spike as an incident titled by the vendor's test description.

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
  "timestamp": "2026-10-13T03:12:00+00:00",
  "url": "https://app.simpleobservability.com/alerts/3f6c2a9e-8b1d-4c7a-9e2f-5d1b7a0c4e68",
  "data": {
    "rule": {
      "id": "3f6c2a9e-8b1d-4c7a-9e2f-5d1b7a0c4e68",
      "name": "High CPU Usage",
      "description": "CPU usage above 90% for 5 minutes",
      "threshold": 90
    },
    "evaluation_window": {
      "start": "2026-10-13T03:07:00+00:00",
      "end": "2026-10-13T03:12:00+00:00"
    },
    "trigger_values": [
      {
        "tags": {
          "host": "prod-web-01"
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
  "timestamp": "2026-10-13T03:27:00+00:00",
  "url": "https://app.simpleobservability.com/alerts/3f6c2a9e-8b1d-4c7a-9e2f-5d1b7a0c4e68",
  "data": {
    "rule": {
      "id": "3f6c2a9e-8b1d-4c7a-9e2f-5d1b7a0c4e68",
      "name": "High CPU Usage",
      "description": "CPU usage above 90% for 5 minutes",
      "threshold": 90
    },
    "evaluation_window": {
      "start": "2026-10-13T03:22:00+00:00",
      "end": "2026-10-13T03:27:00+00:00"
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
| `event_type` | Yes | Kind of message: `RULE_ALERT`, `SYSTEM_ALERT`, `JOB_ALERT`, `ENDPOINT_ALERT` or `TEST`. Compared after trimming and upper-casing. |
| `status` | Yes (absent on `TEST`) | State of the event. Opening: `FIRING`, `SERVER_DOWN`, `FAIL`, `MISSED`, `TIMEOUT`, `ENDPOINT_DOWN`. Closing: `RESOLVED`, `SERVER_UP`, `SUCCESS`, `ENDPOINT_UP`. Compared after trimming and upper-casing. |
| `data.event_type` | Optional | Repeats the state for server, job and endpoint alerts. Read only when the top-level `status` is missing or empty. |
| `description` | Recommended | The vendor's sentence about what is wrong. It is the incident title whenever it is not empty. |
| `title` | Optional | Label such as `[FIRING] High CPU Usage`. Used only when there is no description and no name. |
| `severity` | Optional | `CRITICAL`, `ERROR`, `WARNING`, `INFO` or `SUCCESS` for server and endpoint alerts, `null` for rule and job alerts. |
| `data.rule.id` / `data.server.id` / `data.job.id` / `data.endpoint.id` | Yes | Stable id of the rule, server, job or endpoint, depending on `event_type`. A non-empty string or a number (0 included). Spike uses it to group repeats and to resolve. |
| `data.rule.name`, `data.rule.threshold` | Optional | Used in the title when the description is empty. |
| `data.trigger_values[].tags.host` and `.value` | Optional | The host that breached the rule, and the reading. Hosts are added to a rule alert's title when the rule has an id. |
| `data.server.name`, `data.job.name`, `data.job.server`, `data.endpoint.name`, `data.endpoint.last_status` | Optional | Names used in the title when the description is empty. |

## How Spike creates incidents

* **Opening:** any status other than the closing ones opens an incident. A closing status (`RESOLVED`, `SERVER_UP`, `SUCCESS`, `ENDPOINT_UP`) never opens one: it resolves the open incident, or is dropped if none is open.
* **Title:** the vendor's `description`, whitespace collapsed. For a rule alert with a usable id, ` on {hosts}` is added: the distinct `tags.host` values, at most two, then `+N more`. Example: "CPU usage above 90% for 5 minutes on prod-web-01". The title never exceeds 200 characters; when it is longer the hosts are kept and the sentence is cut at a word boundary with `...`.
* **Empty description:** the title is built from names instead: `{rule name} firing (95 vs threshold 90) on prod-web-01` (the reading only with a rule id and a single trigger value), `{server} is down` / `is back up`, `{job} failed` / `missed its run` / `timed out` / `succeeded` followed by ` on {job server}`, `{endpoint} is down (HTTP 503)` / `is back up`. Without a name Spike uses the vendor's `title`, then "Simple Observability alert with no details".
* **Recovery of a rule:** titled "Resolved: {description}" (or "Resolved: {rule name}"), with no hosts or readings.
* **Grouping:** Spike matches repeats and recoveries by the id for the alert kind (`data.rule.id`, `data.server.id`, `data.job.id` or `data.endpoint.id`), so one rule is one incident even when several hosts trigger it. Moving values (`timestamp`, `evaluation_window`, `trigger_values`, `threshold`) do not start a new incident.
* **Without an id:** the alert is matched by title, so the title is kept free of readings and the recovery resolves it by that title.
* **Test notifications** have no id or status. They open an incident titled by their description and are matched by title.

## Troubleshooting

**No incident appears in Spike:**
* Confirm the webhook URL is the one from Step 1 and the channel is attached to the alert.
* Send the cURL example above to check that the integration works.

**Incident does not resolve:**
* Make sure Simple Observability sends the recovery notification to the same channel, and that the body carries the same id as the firing one.

{% hint style="success" %}
This integration auto resolves
{% endhint %}
