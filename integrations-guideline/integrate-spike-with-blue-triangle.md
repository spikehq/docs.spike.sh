---
description: >-
  Send Blue Triangle alerts to Spike with a Notification Group webhook so a Warning or Critical performance alert pages your on-call team, and the incident resolves itself when the alert clears.
---

# Integrate Spike with Blue Triangle

[Blue Triangle](https://bluetriangle.com/) monitors web performance for real users and for synthetic tests, and ties it to business impact. An alert fires when a metric you watch, such as Onload Time, crosses a Warning or Critical threshold, and Blue Triangle sends a notification to the people in a Notification Group. Point a Notification Group at a Spike integration URL and a firing alert pages your on-call team, repeats land on the incident already open, and the incident resolves when Blue Triangle reports the alert as `Clear`.

{% hint style="warning" %}
**Check the payload before you rely on it.** This guide is written from Blue Triangle's alert labels and Active Alerts states. Blue Triangle does not publish a sample webhook body. Send a test notification from your Notification Group to a request inspector first, and compare the keys with the example below. If they differ, contact Spike support with what you captured.
{% endhint %}

## What Spike does with each notification

Spike reads the `status` field of every delivery. It is compared without regard to case.

| `status` | What happens in Spike |
| --- | --- |
| `Warning` | Opens an incident and pages your escalation policy |
| `Critical` | Opens an incident and pages your escalation policy |
| `Warning` or `Critical` again for an alert that already has an open incident | Added as an event to that incident. It never pages again |
| `Clear` | Resolves the open incident for that alert |

## One incident per alert

Spike identifies a Blue Triangle incident by `alertName`, the name you gave the alert in Blue Triangle. It is the same on the Warning or Critical notification and on the Clear notification of one alert, which is how a recovery finds its incident:

* An alert that keeps notifying while it is firing stays **one** incident and pages once.
* A Warning that later becomes Critical joins the same incident.
* Two alerts with different names are two incidents.

Give every alert a name that is unique and stable. Renaming an alert while it is firing means its Clear notification no longer matches the incident that is open. Read more about [grouping](../incidents/grouping-incidents.md).

## How incidents are titled

| Payload | Incident title in Spike |
| --- | --- |
| `subject` is filled in | The `subject` text, whitespace collapsed, at most 200 characters |
| `subject` is empty | `Critical: <alertName> — <metric> on <pages>` |
| No `alertName` | `Critical: <metric> on <pages>` |
| `status` is `Clear` | `Recovered: <alertName> on <pages>` |

For example, the body below gives `Checkout page onload time is above 6s in synthetic tests`. With an empty `subject` it gives `Critical: Checkout - Synthetic Onload Time — Onload Time on Checkout - Payment, Checkout - Review`.

The place after `on` is the alert's `pages`, up to three, then `+N more`. When there are no pages it reads `in <trafficSegment>`. If `metric` is empty, `alertType` is used instead.

{% hint style="info" %}
Write a **Subject Line** on each alert that says what is wrong in plain words. It is the one sentence Blue Triangle sends about the fault, and Spike uses it as the title. Readings such as the current value are never put in a title, because they change with every notification. They are on the incident page instead.
{% endhint %}

## Prerequisites

* A Blue Triangle account where you can create alerts and Notification Groups
* A Blue Triangle integration in Spike and its webhook URL

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Blue Triangle**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Add a webhook to a Notification Group in Blue Triangle

In Blue Triangle, open the **Notification Group** the alert will use, or create a new one called `Spike`. Add a **Custom Webhook Post** destination and paste the Spike webhook URL from Step 1.

Blue Triangle's webhook settings differ by account and version. Where it asks for a content type, choose JSON.

## Step 3 — Send the body Spike expects

Set the webhook body so each notification sends the following. Every key is the alert's own label in Blue Triangle:

```json
{
  "alertName": "Checkout - Synthetic Onload Time",
  "subject": "Checkout page onload time is above 6s in synthetic tests",
  "status": "Critical",
  "alertType": "Performance",
  "dataType": "Synthetic",
  "metric": "Onload Time",
  "thresholdType": "Fixed Value",
  "currentValue": 7.4,
  "warningThreshold": 4,
  "criticalThreshold": 6,
  "evaluationWindow": "15 minutes",
  "trafficSegment": "Checkout",
  "pages": [
    "Checkout - Payment",
    "Checkout - Review"
  ],
  "alertingSince": "2026-10-09T03:12:00Z"
}
```

| Field | Required | What it is |
| --- | --- | --- |
| `alertName` | Yes | The alert's name. Spike matches repeats and the recovery on it |
| `status` | Yes | `Warning`, `Critical` or `Clear` |
| `subject` | No | The alert's Subject Line. Used as the title when filled in |
| `metric` | No | The metric the alert watches, such as `Onload Time` |
| `alertType` | No | `Performance` or `Performance/Business`. Used when `metric` is empty |
| `dataType` | No | `Real User` or `Synthetic` |
| `thresholdType` | No | `Fixed Value`, `Percent Change` or `Standard Deviation` |
| `currentValue` | No | The Current Measured Level of the metric |
| `warningThreshold` | No | The Warning threshold |
| `criticalThreshold` | No | The Critical threshold |
| `evaluationWindow` | No | How long the alert looks back |
| `trafficSegment` | No | The Transaction (Traffic Segment) the alert covers |
| `pages` | No | The Page(s) the alert covers: a list of page names |
| `alertingSince` | No | When the alert started firing |

Send the same body, with `status` set to `Clear`, when the alert recovers:

```json
{
  "alertName": "Checkout - Synthetic Onload Time",
  "subject": "Checkout page onload time is above 6s in synthetic tests",
  "status": "Clear",
  "alertType": "Performance",
  "dataType": "Synthetic",
  "metric": "Onload Time",
  "thresholdType": "Fixed Value",
  "currentValue": 3.1,
  "warningThreshold": 4,
  "criticalThreshold": 6,
  "evaluationWindow": "15 minutes",
  "trafficSegment": "Checkout",
  "pages": [
    "Checkout - Payment",
    "Checkout - Review"
  ],
  "alertingSince": "2026-10-09T03:12:00Z"
}
```

{% hint style="warning" %}
Do not put the body under a top-level `message` key. Spike treats a payload with its own `message` as a plain message and skips the Blue Triangle fields.
{% endhint %}

## Step 4 — Use the group on your alerts

Open the alert in Blue Triangle (or create one), fill in a unique **Alert Name** and, if you can, a **Subject Line**, set the Warning and Critical thresholds, and select the `Spike` Notification Group as the recipient. Save the alert.

Alerts that Blue Triangle sends as Error State Tracking or Test Failure may carry failure counts instead of thresholds. They still open incidents, with the plain title.

{% hint style="success" %}
This integration auto resolves. A notification with `status` `Clear` closes the incident for that `alertName`.
{% endhint %}

## Troubleshooting

* **Incident never resolves**: the `alertName` on the Clear notification differs from the firing one, or Blue Triangle is not sending Clear notifications for that alert.
* **A second incident opens when an alert escalates**: the alert has no `alertName` in the payload, so Spike can only match by title, and the title carries the severity.
* **Title is a generic sentence from Blue Triangle**: fill in the alert's Subject Line, or leave it empty to get the built title.
