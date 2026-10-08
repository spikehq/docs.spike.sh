---
description: >-
  Send Atatus alert incidents to Spike so a breached threshold pages your on-call rotation by phone, SMS, Slack or Teams, and the incident resolves itself when Atatus closes it.
---

# Integrate Spike with Atatus

[Atatus](https://www.atatus.com) is a full-stack observability platform covering APM, logs, infrastructure, uptime and real user monitoring. Its alerting opens an incident when an alert rule's condition is breached, and closes it when the condition returns to normal or someone closes it by hand.

Atatus can post each of those moves to a webhook. Point a webhook at a Spike integration URL and an Atatus incident pages your on-call rotation when it opens, repeats of the same Atatus incident land on the incident already open instead of paging again, and the Spike incident resolves itself when Atatus closes the incident.

## What Spike does with each notification

Spike reads the `status` field of every delivery. Matching is case-insensitive.

| `status` | What Spike does |
| --- | --- |
| `Opened` | Opens an incident, or joins the open one with the same `incident_id` |
| `Closed` | Resolves the incident with the same `incident_id` |
| `Acknowledged` | Joins the open incident and never resolves it |

## Incident titles

The title is Atatus's own sentence for the condition that fired, taken from `description`, followed by the affected target from `target_name`:

```
Response Time goes above 2000 ms on checkout-service
```

If `description` is empty, Spike falls back to the `rule_name`, then to the `alert_policy_name`. If none of them is present the title is `Atatus alert with no details`. Titles are capped at 200 characters.

A recovery is titled with the same sentence plus `— back to normal`:

```
Response Time goes above 2000 ms on checkout-service — back to normal
```

Matching is done on `incident_id`, not on the title, so an Opened and a Closed notification of one Atatus incident always pair up. Without an `incident_id`, Spike falls back to matching the exact title, which only works while `description` and `target_name` do not change between notifications.

## Severity

Spike does not read `severity` from the payload; it is kept on the incident, but incidents open at your integration's default severity. Write an [alert rule](../alerts/alert-rules.md) on `severity` if you want Atatus levels on the badge. Read more about [priority and severity](../incidents/priority-and-severity.md).

## Prerequisites

* An Atatus account that can manage alert channels and alert policies
* An Atatus integration in Spike and its webhook URL

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Atatus**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Add a webhook in Atatus

1. **Sign in to Atatus** and open **Alerting** from the side menu.
2. **Open Alert Channels** (the Integrations / notification channels page) and choose **Webhook**.
3. **Paste the Spike webhook URL** from Step 1 into the webhook URL field, give the channel a name such as `Spike`, and save.
4. **Attach the channel to your alert policies.** Open **Alerting → Alert Policies**, edit the policy (or create one), and add the Spike webhook under its notification channels. Save the policy.

Atatus sends a JSON `POST` for every incident the policy opens and closes. Menu names can differ slightly between Atatus plans; look for the webhook option under your alert channels.

## What Atatus sends

An Opened notification:

```json
{
  "incident_id": 48213,
  "status": "Opened",
  "severity": "Critical",
  "description": "Response Time goes above 2000 ms",
  "rule_name": "High response time",
  "rule_id": 9127,
  "alert_policy_name": "Checkout APM",
  "alert_policy_id": 3341,
  "product": "APM",
  "target_name": "checkout-service",
  "incident_url": "https://app.atatus.com/alerting/incidents/48213",
  "acknowledge_url": "https://app.atatus.com/alerting/incidents/48213/acknowledge",
  "alert_url": "https://app.atatus.com/alerting/policies/3341",
  "account_id": "a1f3c9e2",
  "timestamp": "2026-10-08T03:12:45Z"
}
```

The Closed notification of the same incident carries the same fields with `status` set to `Closed`, plus `duration`:

```json
{
  "incident_id": 48213,
  "status": "Closed",
  "severity": "Critical",
  "description": "Response Time goes above 2000 ms",
  "rule_name": "High response time",
  "rule_id": 9127,
  "alert_policy_name": "Checkout APM",
  "alert_policy_id": 3341,
  "product": "APM",
  "target_name": "checkout-service",
  "duration": "14 minutes",
  "incident_url": "https://app.atatus.com/alerting/incidents/48213",
  "acknowledge_url": "https://app.atatus.com/alerting/incidents/48213/acknowledge",
  "alert_url": "https://app.atatus.com/alerting/policies/3341",
  "account_id": "a1f3c9e2",
  "timestamp": "2026-10-08T03:26:51Z"
}
```

### Fields Spike reads

| Field | Required | Used for |
| --- | --- | --- |
| `status` | Yes | Opened, Closed or Acknowledged: decides whether to open, join or resolve |
| `incident_id` | Yes | Pairs Opened with Closed. A number or a non-empty string |
| `description` | Recommended | The incident title |
| `target_name` | Recommended | The affected application, host or entity, added to the title |
| `rule_name` | Optional | Title fallback when `description` is empty |
| `alert_policy_name` | Optional | Title fallback when `description` and `rule_name` are empty |

Every other field is kept on the incident and is available to alert rules and the [Title Remapper](../alerts/title-remapper.md).

## Step 3 — Test it

Use the webhook's test option in Atatus if it has one, or temporarily lower a rule's threshold until it fires. The incident should appear in Spike within seconds, and resolve when the Atatus incident closes.

{% hint style="info" %}
Atatus does not publish a schema for its webhook body, so the field names above are the best known set. If a notification arrives with fields missing, open the incident in Spike, check the raw payload, and contact support so the integration can be adjusted.
{% endhint %}
