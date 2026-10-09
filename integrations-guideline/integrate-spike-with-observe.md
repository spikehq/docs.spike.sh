---
description: >-
  Send Observe monitor alarms to Spike with a webhook action, so a firing alarm pages your on-call rotation and the incident resolves when the alarm condition ends.
---

# Integrate Spike with Observe

[Observe](https://www.observeinc.com) is an observability platform for logs, metrics and traces. Its monitors watch your data and raise an alarm when a condition is met. A monitor sends its alarms to an **action**, and a webhook action can post them to any URL.

Point a webhook action at a Spike integration URL and a firing alarm pages your on-call rotation, repeat notifications land on the incident already open, and the incident resolves itself when Observe reports the alarm condition has ended.

## What Spike does with each alarm event

Every delivery carries `alert.type.eventType`, and that field decides what Spike does with it.

| `alert.type.eventType` | What Spike does |
| --- | --- |
| `NewAlarm` | Opens an incident and pages. |
| `Reminder` | A repeat notification for an alarm that is still active. It joins the open incident for the same `alert.id` and never opens a new one. |
| `AlarmConditionEnded` | The alarm condition has cleared. Resolves the open incident. |

{% hint style="info" %}
Observe only sends `AlarmConditionEnded` when end notifications are enabled on the action. Without them nothing tells Spike the alarm has cleared and the incident has to be resolved by hand.
{% endhint %}

## Incident identity

Spike identifies the incident by `alert.id`, the alarm's UUID. It is not the monitor's numeric id. Observe repeats it on `NewAlarm`, `Reminder` and `AlarmConditionEnded`, so one alarm's whole life reads as one Spike incident: it pages once, reminders join it, and the end notification resolves it.

If `alert.id` is missing, Spike falls back to matching on the incident title. In that case keep the monitor title free of changing readings, so the opening and closing notifications produce the same title.

## What the incident title looks like

* **Your monitor title.** If you set a title on the monitor, that sentence is the incident title (whitespace collapsed, up to 200 characters), for example `Checkout API 5xx error rate above 5% in us-east-1`. Write it as the sentence you want to read at 3am.
* **Built from the alarm.** With no monitor title, Spike builds one from the monitor name, the severity, the captured reading and the group-by values, for example `Checkout API error rate (Critical): error_rate 7.4 on checkout-api, us-east-1`. Severity and readings only appear when `alert.id` is present.
* **Recovery.** `Alarm ended: <monitor name> on <group-by values>`.
* **Nothing usable.** `Observe alert with no details`.

`alert.url` links to the alarm in the Observe console. Spike keeps it in the payload so responders can open it, but it is not used in the title.

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
7. Enable **Send end notifications** so Observe sends `AlarmConditionEnded` and Spike can resolve the incident.
8. Save the action.

**Step 3:** Attach the action to your monitors.

1. Open the monitor, or create a new one, and go to its **Actions** step.
2. Add the webhook action you just created.
3. Optionally set the monitor's **title** variable (`monitor.variables.title`) to the sentence you want as the incident title.
4. Save the monitor.

## Webhook body

Paste this body into the action. Observe fills in the `{{…}}` variables when it sends the alarm. Do not add, rename or drop fields.

```
{
  "monitor": {
    "name": "{{monitor.name}}",
    "variables": {
      "title": "{{monitor.variables.title}}"
    }
  },
  "alert": {
    "id": "{{alert.id}}",
    "type": {
      "eventType": "{{alert.type.eventType}}"
    },
    "severity": {
      "level": "{{alert.severity.level}}"
    },
    "url": "{{alert.url}}",
    "values": [
      {{#alert.values}}
      {
        "name": "{{name}}",
        "value": "{{value}}",
        "type": {
          "isGroupBy": "{{type.isGroupBy}}"
        }
      }{{^last}},{{/last}}
      {{/alert.values}}
    ]
  }
}
```

### Fields

| Field | Required | What Spike uses it for |
| --- | --- | --- |
| `alert.type.eventType` | Yes | `NewAlarm` and `Reminder` are firing, `AlarmConditionEnded` is recovery. |
| `alert.id` | Strongly recommended | The alarm UUID. Identity of the incident across all three events. |
| `monitor.variables.title` | No | Your own title sentence. Used as the incident title when not empty. |
| `monitor.name` | Yes | The monitor name, used in the built and recovery titles. |
| `alert.severity.level` | No | `Critical`, `Error`, `Warning`, `Informational` or `NoData`. Appears in the built title when `alert.id` is present. |
| `alert.values[].name` | No | Column name of one captured value, for example `error_rate`. |
| `alert.values[].value` | No | The captured value. Group-by values say where; aggregation values are the readings. |
| `alert.values[].type.isGroupBy` | No | `true` marks a group-by value; anything else marks an aggregation reading. |
| `alert.url` | No | Link to the alarm in the Observe console. Kept for responders. |

## Example payloads

A firing alarm (`NewAlarm`):

```json
{
  "monitor": {
    "name": "Checkout API error rate",
    "variables": {
      "title": "Checkout API 5xx error rate above 5% in us-east-1"
    }
  },
  "alert": {
    "id": "8c2f4a1e-6b7d-4f3a-9e21-5d0c7b3a9f64",
    "type": {
      "eventType": "NewAlarm"
    },
    "severity": {
      "level": "Critical"
    },
    "url": "https://123456789012.observeinc.com/workspace/41000001/monitor/41203877?alarmId=8c2f4a1e-6b7d-4f3a-9e21-5d0c7b3a9f64&alertStartTime=1791515520000",
    "values": [
      {
        "name": "service_name",
        "value": "checkout-api",
        "type": {
          "isGroupBy": "true"
        }
      },
      {
        "name": "region",
        "value": "us-east-1",
        "type": {
          "isGroupBy": "true"
        }
      },
      {
        "name": "error_rate",
        "value": "7.4",
        "type": {
          "isGroupBy": "false"
        }
      }
    ]
  }
}
```

The same alarm once the condition has cleared (`AlarmConditionEnded`):

```json
{
  "monitor": {
    "name": "Checkout API error rate",
    "variables": {
      "title": "Checkout API 5xx error rate above 5% in us-east-1"
    }
  },
  "alert": {
    "id": "8c2f4a1e-6b7d-4f3a-9e21-5d0c7b3a9f64",
    "type": {
      "eventType": "AlarmConditionEnded"
    },
    "severity": {
      "level": "Critical"
    },
    "url": "https://123456789012.observeinc.com/workspace/41000001/monitor/41203877?alarmId=8c2f4a1e-6b7d-4f3a-9e21-5d0c7b3a9f64&alertStartTime=1791515520000&alertEndTime=1791516420000",
    "values": [
      {
        "name": "service_name",
        "value": "checkout-api",
        "type": {
          "isGroupBy": "true"
        }
      },
      {
        "name": "region",
        "value": "us-east-1",
        "type": {
          "isGroupBy": "true"
        }
      },
      {
        "name": "error_rate",
        "value": "3.1",
        "type": {
          "isGroupBy": "false"
        }
      }
    ]
  }
}
```

## Test the integration

Trigger a test notification from the action in Observe, or send the firing example above to your Spike webhook URL with `curl`. An incident should open. Send the recovery example with the same `alert.id` and it should resolve.

## Troubleshooting

* **The incident never resolves.** End notifications are off on the action, or the recovery's `alert.id` differs from the opening one.
* **Every reminder opens a new incident.** `alert.id` is missing from the body, so Spike is matching on the title. Confirm the body above is pasted as written, and keep changing readings out of the monitor title.
* **The title is built from the monitor name instead of your sentence.** `monitor.variables.title` is empty on that monitor.
