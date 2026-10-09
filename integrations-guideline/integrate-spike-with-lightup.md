---
description: >-
  Send Lightup data quality incident emails to Spike so a failing monitor pages your on-call rotation, and the incident resolves when Lightup says it has ended.
---

# Integrate Spike with Lightup

[Lightup](https://lightup.ai) monitors the data in your warehouse and lakehouse, such as row counts, null rates and freshness, and opens an incident when a monitor sees a metric leave its expected range. Lightup delivers those incidents by email, so Spike receives them through its email address rather than a webhook.

Add a Spike integration email address to a Lightup **Email List** and an incident in Lightup pages your on-call rotation by phone, SMS, Slack or Teams. When Lightup sends the email saying the incident has ended, the Spike incident resolves.

## Prerequisites

* A Lightup workspace where you can create Email Lists and attach them to monitors or alert destinations
* A Lightup integration in Spike and its email address

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Lightup**, attach it to a service and an escalation policy, and copy the email address. It looks like `<your-token>@email-hooks.spike.sh`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Add the address to a Lightup Email List

1. Sign in to Lightup and open the page where your **Email Lists** are managed.
2. Create a new Email List, for example `Spike`, or open an existing one.
3. Paste the Spike email address from Step 1 as a recipient and save the list.

## Step 3 — Send incidents to that list

Attach the Email List to the monitors, or to the alert configuration, whose incidents should page you. Lightup only emails the lists a monitor notifies, so a monitor without the list never reaches Spike.

Where Lightup offers a setting to also send an email when an incident is resolved or ends, turn it on. Without it Spike never sees the recovery.

## What Spike does with each email

Spike reads these fields of the email:

| Field | Required | What Spike does with it |
| --- | --- | --- |
| `to` | Yes | Finds your integration from the address at `email-hooks.spike.sh` |
| `envelope` | No | Finds the integration when the mail was forwarded to the address |
| `from` | No | Kept on the incident for display |
| `subject` | No | Used as the title when the body is empty, kept on the incident, and checked for the recovery words |
| `text` | No | Its first paragraph is the incident title; searched for the Lightup incident link |
| `html` | No | Used when `text` is empty, and searched for the incident link when `text` has none |

Only the address is needed to reach your integration. Lightup sends the rest.

## Incident title

The title is Lightup's own sentence about the fault: the first paragraph of the email body, with links removed, whitespace collapsed and cut at a word boundary at 200 characters.

```
New incident detected by monitor "orders row count drop": orders_row_count went down 62% (1,140 vs 3,020 expected) on analytics.orders, slice region=us-east-1.
```

When the body is empty, the title falls back to the subject, and with neither it reads `Lightup alert with no details`.

## Incident identity and recovery

Spike identifies the incident by the Lightup incident id, which it reads from the first `/incidents/<id>` link in the email. A repeat email for the same incident lands on the incident already open instead of paging again, and the recovery email resolves it. Because the id decides this and not the title, the title can carry the readings Lightup writes.

If an email has no incident link, Spike falls back to the exact subject line.

An email is a recovery when its subject contains the whole word `resolved` or `ended`, in any case. Every other email is a firing alert.

{% hint style="warning" %}
A recovery or update that arrives when no matching incident is open is dropped. Digest emails (hourly, daily or weekly) are treated as one event titled by their first paragraph and are not split into incidents.
{% endhint %}

## Example

A Lightup incident email, as Spike receives it:

```json
{
  "to": "3f9c2a7e1b4d6c8e0a5f@email-hooks.spike.sh",
  "from": "Lightup <alerts@lightup.ai>",
  "subject": "[Lightup] New incident: orders row count drop",
  "text": "New incident detected by monitor \"orders row count drop\": orders_row_count went down 62% (1,140 vs 3,020 expected) on analytics.orders, slice region=us-east-1.\n\nWorkspace: Production\nDatasource: prod-snowflake\nMetric: orders_row_count\nImpact: 8 of 10\nStarted: Oct 9, 2026 03:12 UTC\n\nView incident: https://app.lightup.ai/ws/5d1e7a20-3c4b-4f6e-9a8d-2b7c1e0f4a93/incidents/7b1e2c4a-9d3f-4e8a-b6c1-0f2d5a7e9c31\n",
  "html": "<p>New incident detected by monitor \"orders row count drop\": orders_row_count went down 62% (1,140 vs 3,020 expected) on analytics.orders, slice region=us-east-1.</p><p>Workspace: Production<br>Datasource: prod-snowflake<br>Metric: orders_row_count<br>Impact: 8 of 10<br>Started: Oct 9, 2026 03:12 UTC</p><p><a href=\"https://app.lightup.ai/ws/5d1e7a20-3c4b-4f6e-9a8d-2b7c1e0f4a93/incidents/7b1e2c4a-9d3f-4e8a-b6c1-0f2d5a7e9c31\">View incident</a></p>",
  "envelope": "{\"to\":[\"3f9c2a7e1b4d6c8e0a5f@email-hooks.spike.sh\"],\"from\":\"alerts@lightup.ai\"}"
}
```

And the email that resolves it:

```json
{
  "to": "3f9c2a7e1b4d6c8e0a5f@email-hooks.spike.sh",
  "from": "Lightup <alerts@lightup.ai>",
  "subject": "[Lightup] Incident resolved: orders row count drop",
  "text": "Incident ended for monitor \"orders row count drop\": orders_row_count on analytics.orders, slice region=us-east-1, is back within the expected range.\n\nWorkspace: Production\nDatasource: prod-snowflake\nMetric: orders_row_count\nEnded: Oct 9, 2026 04:05 UTC\n\nView incident: https://app.lightup.ai/ws/5d1e7a20-3c4b-4f6e-9a8d-2b7c1e0f4a93/incidents/7b1e2c4a-9d3f-4e8a-b6c1-0f2d5a7e9c31\n",
  "html": "<p>Incident ended for monitor \"orders row count drop\": orders_row_count on analytics.orders, slice region=us-east-1, is back within the expected range.</p><p>Workspace: Production<br>Datasource: prod-snowflake<br>Metric: orders_row_count<br>Ended: Oct 9, 2026 04:05 UTC</p><p><a href=\"https://app.lightup.ai/ws/5d1e7a20-3c4b-4f6e-9a8d-2b7c1e0f4a93/incidents/7b1e2c4a-9d3f-4e8a-b6c1-0f2d5a7e9c31\">View incident</a></p>",
  "envelope": "{\"to\":[\"3f9c2a7e1b4d6c8e0a5f@email-hooks.spike.sh\"],\"from\":\"alerts@lightup.ai\"}"
}
```

## Step 4 — Confirm it end to end

1. Let a monitor open an incident, or trigger one. An incident opens in Spike with Lightup's sentence as the title.
2. A repeat email for the same Lightup incident lands on that incident without paging again.
3. When the Lightup incident ends and Lightup emails about it, the Spike incident resolves.

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Check that the Spike address is a recipient of the Email List, that the List is attached to the monitor, and that the integration has not been archived in Spike.

</details>

<details>

<summary>Incidents never resolve</summary>

Spike resolves on an email whose subject contains `resolved` or `ended`. Check that Lightup sends an email when the incident ends, and that the incident link in it matches the one in the original email.

</details>

Disclaimer: These integration instructions are offered independently by Spike.sh, and Spike.sh is not affiliated with nor a partner of Lightup.
