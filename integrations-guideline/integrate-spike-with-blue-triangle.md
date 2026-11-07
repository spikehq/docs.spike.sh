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
| `Clear` | Resolves the open incident for that alert. With no incident open, it is dropped and opens nothing |

## One incident per alert

Spike identifies a Blue Triangle incident by `alertName`, the name you gave the alert in Blue Triangle. It is the same on the Warning or Critical notification and on the Clear notification of one alert, which is how a recovery finds its incident:

* An alert that keeps notifying while it is firing stays **one** incident and pages once.
* A Warning that later becomes Critical joins the same incident.
* Two alerts with different names are two incidents.

Give every alert a name that is unique and stable. Renaming an alert while it is firing means its Clear notification no longer matches the incident that is open, and a Clear only ever resolves the incident of the alert it names. Read more about [grouping](../incidents/grouping-incidents.md).

If a notification carries no `alertName`, Spike can only match it by its title. That title carries no severity and no readings, so a Warning, the Critical it becomes and the Clear that ends it all find the same incident.

## How incidents are titled

| Payload | Incident title in Spike |
| --- | --- |
| `subject` is filled in | The `subject` text, whitespace collapsed, at most 200 characters |
| `subject` is empty | `<Status>: <alertName> — <metric> <currentValue> vs <threshold> <status> threshold (<change>) on <pages>` |
| No `alertName` | `<metric> alert on <pages>`, with no status and no readings |
| `status` is `Clear` | `Recovered: <alertName> on <pages>` (`Recovered: <metric> alert on <pages>` without an `alertName`) |
| Nothing usable | `Blue Triangle alert with no details` |

For example, the body below gives `Checkout page onload time is above 6s in synthetic tests`. With an empty `subject` it gives `Critical: Checkout - Synthetic Onload Time — Onload Time 7.4 vs 6 critical threshold (+23%) on Checkout - Payment, Checkout - Review`.

The reading compares `currentValue` with `criticalThreshold` on a Critical notification and with `warningThreshold` on a Warning one. It is left out when `thresholdType` is not `Fixed Value` (a Percent Change or Standard Deviation threshold is not in the metric's units), when either number is missing, when the threshold is 0, or when the change is under 1%. Numbers from 10 up are whole, with thousands separators; smaller ones keep two significant digits. No unit is shown.

The place after `on` is the alert's `pages`, up to two, then `+N more`. When there are no pages it reads `in <trafficSegment>`. If `metric` is empty, `alertType` is used instead.

{% hint style="info" %}
Write a **Subject Line** on each alert that says what is wrong in plain words. It is the one sentence Blue Triangle sends about the fault, and Spike uses it as the title. Because Spike keys a named alert on `alertName`, a title that changes between notifications, for example with a new reading, still lands on the same incident.
{% endhint %}

## Prerequisites

* A Blue Triangle account where you can create alerts and Notification Groups
* A Blue Triangle integration in Spike and its webhook URL

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Blue Triangle**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Point a Notification Group at Spike

1. In Blue Triangle, open **Settings & Administration** (the gear icon) → **Notification Groups**.
2. Create a group, for example `Spike`, or edit the one your alerts already use.
3. Paste the Spike webhook URL from Step 1 into **Custom Webhook Endpoint**. Leave **Custom Webhook Post** empty: text there could arrive as a top-level `message`, which makes Spike skip the Blue Triangle fields.
4. Click **Save & Close**.

## Step 3 — What Blue Triangle sends

Blue Triangle builds the notification body itself; there is no template to edit. Blue Triangle does not publish it, so the keys below are modelled on the labels in its alert settings and are not confirmed. A firing notification:

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
| `alertName` | No | The alert's name. Spike matches repeats and the recovery on it; without it, Spike matches on the title |
| `status` | No | `Warning`, `Critical` or `Clear`. Without it a notification opens an incident and never resolves one |
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

When the alert recovers, Blue Triangle sends the same alert with `status` set to `Clear`:

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

## Step 4 — Use the group on your alerts

Assign the `Spike` Notification Group wherever Blue Triangle notifies: on the **Notification** step of an alert, on a Synthetic Monitor, or in Error State Tracking. On each alert, give it a unique **Alert Name** and write a **Subject Line** for the best incident titles. Save.

Alerts that Blue Triangle sends as Error State Tracking or Test Failure may carry failure counts instead of thresholds. They still open incidents, with the plain title.

{% hint style="success" %}
This integration auto resolves. A notification with `status` `Clear` closes the incident for that `alertName`.
{% endhint %}

## Troubleshooting

* **Incident never resolves**: the `alertName` on the Clear notification differs from the firing one, or Blue Triangle is not sending Clear notifications for that alert.
* **A second incident opens when an alert escalates**: compare `alertName` on the two notifications. Different names are different alerts, and different alerts are different incidents.
* **Title is a generic sentence from Blue Triangle**: fill in the alert's Subject Line, or leave it empty to get the built title.
* **Every incident has the same title, not the alert's**: check that **Custom Webhook Post** is empty on the Notification Group. Text there can replace the Blue Triangle fields.
