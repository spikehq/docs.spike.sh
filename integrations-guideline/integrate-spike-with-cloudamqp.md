---
description: >-
   Integrate Spike with CloudAMQP to receive real-time alerts via Phone calls, SMS, Slack, MS Teams, and more for queue and broker incidents.
---

# How Spike Integrates with CloudAMQP

## Intro
[CloudAMQP](https://www.cloudamqp.com) is a managed RabbitMQ platform that helps teams run, monitor, and scale message brokers without managing infrastructure directly.

Teams commonly use CloudAMQP alerts for queue depth spikes, node health issues, connection surges, and broker-related availability problems.

## Prerequisites
* A CloudAMQP account with access to alert/notification configuration
* A CloudAMQP integration webhook URL from Spike
* JSON webhook payloads with a `message` field

## Step 1 — Create the integration in Spike
In Spike → Integrations → Add Integration → CloudAMQP

Copy the webhook URL for your CloudAMQP integration.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Configure Webhook in CloudAMQP
In CloudAMQP, open your instance notification/alerting settings and add a webhook destination.

Use the following settings:
* URL: Paste the Spike webhook URL copied in Step 1
* Method: POST
* Content-Type: `application/json`

Save the webhook and attach it to the alert conditions you want to send to Spike.

## What happens in Spike?
Spike processes CloudAMQP events using the integration finder and resolver logic:

* Deduplication: incidents are grouped by the `message` field.
* Incident creation rules: if `metadata.resolved === true`, Spike does not create a new incident.
* Incident creation rules: when `metadata.resolved` is not `true`, Spike creates a new incident or groups into an existing open one with the same `message`.
* Auto-resolve: if the event contains top-level `resolved: true`, Spike resolves the matching open incident.

## Test it
1. Trigger a CloudAMQP test alert (for example, a queue depth threshold alert).
2. Confirm a new incident appears in Spike with the expected `message`.
3. Send a resolved payload for the same `message` with `resolved: true`.
4. Confirm the existing incident is auto-resolved and no extra incident is created when `metadata.resolved === true`.

## Troubleshooting
* Wrong webhook URL: verify the full Spike webhook URL was copied correctly.
* Invalid JSON: make sure the payload is valid JSON and sent as `application/json`.
* Missing `message` field: dedup/grouping depends on `message`, so include it in all events.
* `resolved` set incorrectly: auto-resolution requires top-level `resolved: true`.
* `metadata.resolved` set incorrectly: if `metadata.resolved === true`, Spike will not create a new incident.
* Outbound network blocked: confirm CloudAMQP can reach `hooks.spike.sh` from your network.
* Alert/resolution timing mismatch: ensure the resolved payload is sent for the same `message` and after the alert event.

## Sample Payload (Anonymized)
### Alert payload
```json
{
  "message": "Queue depth exceeded threshold on queue orders",
  "resolved": false,
  "metadata": {
    "resolved": false,
    "queue": "orders",
    "vhost": "/",
    "instance": "example-instance",
    "environment": "production"
  }
}
```

### Resolved payload
```json
{
  "message": "Queue depth exceeded threshold on queue orders",
  "resolved": true,
  "metadata": {
    "resolved": true,
    "queue": "orders",
    "vhost": "/",
    "instance": "example-instance",
    "environment": "production"
  }
}
```
