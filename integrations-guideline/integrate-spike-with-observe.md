---
description: >-
  Send Observe monitor alarms to Spike with a webhook action, so a firing alarm pages your on-call rotation and the incident resolves when the alarm condition ends.
---

# Integrate Spike with Observe

[Observe](https://www.observeinc.com) is an observability platform for logs, metrics and traces. Its monitors watch your data and raise an alarm when a condition is met. A monitor sends its alarms to an **action**, and a webhook action can post them to any URL.

Point a webhook action at a Spike integration URL and a firing alarm pages your on-call rotation, repeat notifications land on the incident already open, and the incident resolves itself when Observe reports the alarm condition has ended.

## What Spike does with each alarm event

Every delivery carries `event_type`, filled from `{{alert.type.eventType}}`, and that field decides what Spike does with it. It is compared ignoring spaces and letter case.

| `event_type` | What Spike does |
| --- | --- |
| `NewAlarm` | Opens an incident and pages. |
| `Reminder` | A repeat notification for an alarm that is still active. It joins the open incident with the same `alert_id`, and opens an incident when none is open. |
| `AlarmConditionEnded` | The alarm condition has cleared. Resolves the open incident with the same `alert_id`. Dropped when nothing is open. |

Any other or missing `event_type` opens an incident and never resolves one.

{% hint style="info" %}
Observe only sends `AlarmConditionEnded` when **Send an update when the monitor has stopped triggering** is on for the action. Without them nothing tells Spike the alarm has cleared and the incident has to be resolved by hand.
{% endhint %}

## Incident identity

Spike identifies the incident by `alert_id`, filled from `{{alert.id}}`: the alarm's UUID, not the monitor's numeric id. Observe is expected to repeat it on `NewAlarm`, `Reminder` and `AlarmConditionEnded`, so one alarm's whole life reads as one Spike incident: it pages once, reminders join it, and the end notification resolves it.

A value counts as an id when it is not empty and is not a template variable left unexpanded (for example `$alert_id`, `${alert_id}`, `{{alert.id}}` or `%alert_id%`). When `alert_id` is missing or arrives unexpanded, Spike has no identity to go on and matches on the incident title instead. The title never holds readings, timestamps, ids or URLs, so a repeat of the same alarm joins the open incident. It also means that different alarms with the same title (for example two group-by alarms of one monitor) are one incident, and the second does not page.

Without a usable `alert_id` on both the opening and the ending notification, `AlarmConditionEnded` joins the open incident but does not resolve it. Resolving needs the same `alert_id` on both.

## What the incident title looks like

* **Your monitor title.** `summary`, filled from `{{monitor.variables.title}}`, is the incident title, with whitespace collapsed. For example `High CPU utilization for container checkout-api in prod-us-east-1`.
* **No monitor title.** When `summary` is empty or an unexpanded variable, the title is `monitor_name`, for example `Container CPU utilization`.
* **Nothing usable.** `Observe alert with no details`.
* **Recovery.** `AlarmConditionEnded` gives `Alarm ended: ` followed by the same title, for example `Alarm ended: High CPU utilization for container checkout-api in prod-us-east-1`. Spike matches it to the open incident through `alert_id`. With no id it joins the open incident through the plain firing title but does not resolve it.
* **Length.** The whole title, prefix included, is capped at 200 characters, cut at a word boundary and ended with `...`.

`alert_message`, `description`, timestamps and URLs are never part of the title. They are kept on the incident for responders.

## Severity

Spike reads the top-level `severity` field, filled from `{{alert.severity.level}}`:

| Observe severity | Severity in Spike |
| --- | --- |
| `Critical` | SEV1 |
| `Error` | SEV2 |
| `Warning` | SEV2 |
| `Informational` | SEV3 |
| `NoData` | Left unset |

## Set up instructions

**Step 1:** Create an Observe integration on the [Spike dashboard](https://app.spike.sh/integrations) and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

**Step 2:** Create a webhook action in Observe.

1. Sign in to Observe and open **Monitors**.
2. Open the **Actions** tab and click **New Action** (or edit an existing webhook action).
3. Choose **Webhook** as the action type.
4. Paste the Spike webhook URL into the **URL** field. This field is required.
5. Set the method to `POST` and add the header `Content-Type: application/json`.
6. Paste the body from the next section into the **Body** (template) field. This field is required.
7. Turn on **Send an update when the monitor has stopped triggering** so Observe sends `AlarmConditionEnded` and Spike can resolve the incident.
8. Save the action.

**Step 3:** Attach the action to your monitors.

1. Open the monitor, or create a new one, and go to its **Actions** step.
2. Add the webhook action you just created.
3. Set the monitor's **title** variable (`monitor.variables.title`) to the sentence you want as the incident title. Keep readings that change between notifications out of it.
4. Save the monitor.

## Webhook body

Paste this body into the action. Observe fills in the `{{…}}` variables when it sends the alarm. Do not add, rename or drop fields.

```
{
  "event_type": "{{alert.type.eventType}}",
  "alert_id": "{{alert.id}}",
  "summary": "{{monitor.variables.title}}",
  "monitor_name": "{{monitor.name}}",
  "severity": "{{alert.severity.level}}",
  "alert_message": "{{monitor.variables.message}}",
  "description": "{{monitor.description}}",
  "monitor_id": "{{monitor.id}}",
  "monitor_type": "{{monitor.type}}",
  "is_active": "{{alert.isActive}}",
  "start_time": "{{alert.start.rfc3339}}",
  "end_time": "{{alert.end.rfc3339}}",
  "timestamp": "{{alert.timestamp.rfc3339}}",
  "alert_url": "{{alert.url}}",
  "monitor_url": "{{monitor.url}}"
}
```

### Fields

| Field | Required | What Spike uses it for |
| --- | --- | --- |
| `event_type` | Yes | `NewAlarm` opens, `Reminder` joins, `AlarmConditionEnded` resolves. |
| `alert_id` | Strongly recommended | The alarm UUID. Identity of the incident across all three events. |
| `summary` | No | Your own title sentence. Used as the incident title when not empty. |
| `monitor_name` | Yes | Title when `summary` is empty. |
| `severity` | No | Sets the incident severity, see the table above. |
| `alert_message` | No | Your longer alert message. Shown on the incident, never in the title. Not named `message` on purpose: a top-level `message` makes Spike skip the Observe parser. |
| `description` | No | Monitor description. Display only. |
| `monitor_id` | No | The monitor's numeric id. Display only, not an alarm identity. |
| `monitor_type` | No | `Count`, `Promote`, `Threshold` or `Anomaly`. Display only. |
| `is_active` | No | `true` while the condition is triggering, `false` after it clears. Display only; `event_type` decides. |
| `start_time` | No | When the condition started. Display only. |
| `end_time` | No | When the condition ended, empty while active. Display only. |
| `timestamp` | No | When Observe evaluated this notification. Changes on every delivery. Display only. |
| `alert_url` | No | Link to the alarm in the Observe console. Display only. |
| `monitor_url` | No | Link to the monitor in the Observe console. Display only. |

## Example payloads

A firing alarm (`NewAlarm`):

```json
{
  "event_type": "NewAlarm",
  "alert_id": "5f3c2a9e-8b1d-4e7a-9c62-0d4b7e1a3f58",
  "summary": "High CPU utilization for container checkout-api in prod-us-east-1",
  "monitor_name": "Container CPU utilization",
  "severity": "Critical",
  "alert_message": "Container checkout-api in prod-us-east-1 has been using more than 90% of its CPU limit for the last 10 minutes. Runbook: https://wiki.example.com/runbooks/container-cpu",
  "description": "Fires when a container uses more than 90% of its CPU limit for 10 minutes.",
  "monitor_id": "41234567",
  "monitor_type": "Threshold",
  "is_active": "true",
  "start_time": "2026-10-13T02:47:10Z",
  "end_time": "",
  "timestamp": "2026-10-13T02:57:12Z",
  "alert_url": "https://123456789012.observeinc.com/workspace/41000100/alert/5f3c2a9e-8b1d-4e7a-9c62-0d4b7e1a3f58",
  "monitor_url": "https://123456789012.observeinc.com/workspace/41000100/monitor/41234567"
}
```

The same alarm once the condition has cleared (`AlarmConditionEnded`):

```json
{
  "event_type": "AlarmConditionEnded",
  "alert_id": "5f3c2a9e-8b1d-4e7a-9c62-0d4b7e1a3f58",
  "summary": "High CPU utilization for container checkout-api in prod-us-east-1",
  "monitor_name": "Container CPU utilization",
  "severity": "Critical",
  "alert_message": "Container checkout-api in prod-us-east-1 is back below 90% of its CPU limit. Runbook: https://wiki.example.com/runbooks/container-cpu",
  "description": "Fires when a container uses more than 90% of its CPU limit for 10 minutes.",
  "monitor_id": "41234567",
  "monitor_type": "Threshold",
  "is_active": "false",
  "start_time": "2026-10-13T02:47:10Z",
  "end_time": "2026-10-13T03:21:40Z",
  "timestamp": "2026-10-13T03:22:05Z",
  "alert_url": "https://123456789012.observeinc.com/workspace/41000100/alert/5f3c2a9e-8b1d-4e7a-9c62-0d4b7e1a3f58",
  "monitor_url": "https://123456789012.observeinc.com/workspace/41000100/monitor/41234567"
}
```

## Test the integration

Trigger a test notification from the action in Observe, or send the firing example above to your Spike webhook URL with `curl`. An incident titled `High CPU utilization for container checkout-api in prod-us-east-1` should open. Send the recovery example with the same `alert_id` and it should resolve.

## Troubleshooting

* **The incident never resolves.** **Send an update when the monitor has stopped triggering** is off on the action, the recovery's `alert_id` differs from the opening one, or `alert_id` is missing or unexpanded on either notification.
* **Every reminder opens a new incident.** `alert_id` is missing or arrives unexpanded, so Spike is matching on the title. Confirm the body above is pasted as written, and keep changing readings out of the monitor title.
* **The title is the monitor name instead of your sentence.** `monitor.variables.title` is empty on that monitor.
* **Spike ignores the fields.** Check the body has no top-level `message` field.
