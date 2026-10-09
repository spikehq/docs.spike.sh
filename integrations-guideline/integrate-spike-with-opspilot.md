---
description: >-
  Send OpsPilot (formerly FusionReactor Cloud) alerts to Spike so a firing alert pages your on-call rotation by phone, SMS, Slack or Teams, and closes its incident when the alert recovers.
---

# Integrate Spike with OpsPilot

## Overview

[OpsPilot](https://fusion-reactor.com) (formerly FusionReactor Cloud) monitors your FusionReactor instances and applications. Alert rules watch a metric, and when a rule fires OpsPilot notifies the contact points your alert policies route to.

A **Webhook** contact point posts each notification to Spike as JSON. A firing alert opens an incident and pages your escalation policy. A repeat of the same alert joins the incident that is already open, and the recovery resolves it.

{% hint style="success" %}
Auto-resolution is supported for this integration. Spike also groups repeated notifications for the same alert and suppresses new pages while the incident is open.
{% endhint %}

## How Spike identifies an alert

Spike identifies the incident by the alert's `fingerprint`. OpsPilot generates the same fingerprint for the same rule and labels, so a repeat notification joins the open incident and the recovery notification resolves it, even when the readings in the summary have changed.

* If a notification carries no `fingerprint`, Spike falls back to the notification's `groupKey`.
* If it carries neither, Spike can only match by incident title. In that case the title is the plain `<alertname> on <instance>` with no readings, so that it is identical at firing and at recovery.

## Incident title

The title is the sentence you set in the contact point's **Message** setting (see Step 2), with whitespace collapsed and capped at 200 characters:

```
High CPU on production-server-01: 94.2%
```

If **Message** is empty, or is still Grafana's default multi-line template (it starts with `**Firing**` or `**Resolved**`), Spike falls back in this order:

1. The summary shared by every alert in the notification (`commonAnnotations.summary`)
2. The shared description (`commonAnnotations.description`)
3. For a single alert, that alert's `summary`, then its `description`
4. For several firing alerts: `3 alerts firing for High CPU - Any Instance: production-server-01, production-server-02 +1 more`
5. `<alertname> on <instance>`, where the place is the `instance` label, then `job`, then `group`
6. `OpsPilot alert with no details`

A recovery is titled `Resolved: <alertname> on <instance>`. Spike resolves by fingerprint, so this title may differ from the one the incident opened with.

Use a [Title Remapper](../alerts/title-remapper.md) if you want a different title.

## Prerequisites

* An OpsPilot account that can create contact points and alert policies
* An OpsPilot integration in Spike and its webhook URL
* Outbound HTTPS from OpsPilot to `hooks.spike.sh`

## Set up instructions

**Step 1:** Add the OpsPilot integration in Spike and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

**Step 2:** Create the webhook contact point in OpsPilot.

{% tabs %}
{% tab title="Setup on OpsPilot" %}
1. **Open contact points:**
   In OpsPilot, go to **Alerting → Contact points** and click **Add contact point**.

2. **Name it and choose the type:**
   Enter a name such as `Spike`, and under **Integration** choose **Webhook**.

3. **Paste the Spike URL (required):**
   Paste the webhook URL from Step 1 into the **URL** field and set **HTTP Method** to **POST**.

4. **Set the Message (strongly recommended):**
   Open **Optional Webhook settings** and set **Message** to:

   ```
   {{ .CommonAnnotations.summary }}
   ```

   This becomes the incident title. Without it, Spike falls back to the rule's summary annotation, so add a **summary** annotation to each alert rule.

5. **Leave authorization empty:**
   The token in the URL is the credential. Treat the URL like a password.

6. **Save, then test:**
   Click **Save contact point**. To send a test notification, click **Test** on the contact point before saving or from the contact point list.

7. **Route alerts to it:**
   Go to **Alerting → Notification policies** and add a policy that sends the alerts you want paged to the `Spike` contact point. Make sure the alert rules you route carry **summary** and **description** annotations, and that the policy does not group on labels that differ between alerts you want in one incident.
{% endtab %}
{% endtabs %}

{% hint style="info" %}
The only required field is the **URL**. **Message** only sets the title; the rest of the payload is sent by the webhook contact point automatically.
{% endhint %}

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

## What OpsPilot sends

Spike reads the following fields. `alerts[].fingerprint`, `status` and `alerts` are the ones that open and resolve incidents; the rest build the title and the incident details.

| Field | Used for |
| --- | --- |
| `message` | The incident title |
| `status` | `firing` while any alert in the group fires, `resolved` when the group has recovered |
| `state` | `alerting` when firing, `ok` on recovery (a secondary recovery signal) |
| `groupKey` | Identity fallback when alerts carry no fingerprint |
| `alerts` | The grouped alert instances. The number of alerts is the batch count |
| `alerts[].status` | `firing` or `resolved` for each alert |
| `alerts[].fingerprint` | The stable id of the alert, used to join repeats and to resolve |
| `alerts[].labels.alertname` | The rule name |
| `alerts[].labels.instance` | The instance the alert is about, first choice for the place in a title |
| `alerts[].labels.job` | The application name, second choice |
| `alerts[].labels.group` | The instance group, third choice |
| `alerts[].annotations.summary` | What happened, usually with the reading |
| `alerts[].annotations.description` | Why it matters |
| `commonLabels.alertname` | The rule name shared by every alert in a batch |
| `commonAnnotations.summary` | The summary shared by every alert in the group |
| `commonAnnotations.description` | The description shared by every alert in the group |

### Firing example

```json
{
  "receiver": "Spike",
  "status": "firing",
  "orgId": 1,
  "alerts": [
    {
      "status": "firing",
      "labels": {
        "alertname": "High CPU - Any Instance",
        "instance": "production-server-01",
        "job": "checkout-api",
        "group": "production",
        "channel": "spike"
      },
      "annotations": {
        "summary": "High CPU on production-server-01: 94.2%",
        "description": "CPU usage has been above 90% for over 2 minutes on production-server-01."
      },
      "startsAt": "2026-10-09T02:14:00Z",
      "endsAt": "0001-01-01T00:00:00Z",
      "generatorURL": "https://app.fusionreactor.io/alerting/grafana/c3b1f7e2/view",
      "fingerprint": "6a2f9c1d8e4b7035",
      "silenceURL": "https://app.fusionreactor.io/alerting/silence/new?matchers=alertname%3DHigh%20CPU%20-%20Any%20Instance%2Cinstance%3Dproduction-server-01",
      "dashboardURL": "",
      "panelURL": "",
      "values": {
        "A": 94.2,
        "B": 1
      }
    }
  ],
  "groupLabels": {
    "alertname": "High CPU - Any Instance"
  },
  "commonLabels": {
    "alertname": "High CPU - Any Instance",
    "instance": "production-server-01",
    "job": "checkout-api",
    "group": "production",
    "channel": "spike"
  },
  "commonAnnotations": {
    "summary": "High CPU on production-server-01: 94.2%",
    "description": "CPU usage has been above 90% for over 2 minutes on production-server-01."
  },
  "externalURL": "https://app.fusionreactor.io/",
  "version": "1",
  "groupKey": "{}/{channel=~\".*spike.*\"}:{alertname=\"High CPU - Any Instance\"}",
  "truncatedAlerts": 0,
  "title": "[FIRING:1] High CPU - Any Instance (production-server-01 checkout-api production spike)",
  "state": "alerting",
  "message": "High CPU on production-server-01: 94.2%"
}
```

### Recovery example

The same alert with the same `fingerprint`, once it has recovered. Spike resolves the open incident:

```json
{
  "receiver": "Spike",
  "status": "resolved",
  "orgId": 1,
  "alerts": [
    {
      "status": "resolved",
      "labels": {
        "alertname": "High CPU - Any Instance",
        "instance": "production-server-01",
        "job": "checkout-api",
        "group": "production",
        "channel": "spike"
      },
      "annotations": {
        "summary": "High CPU on production-server-01: 41.7%",
        "description": "CPU usage has been above 90% for over 2 minutes on production-server-01."
      },
      "startsAt": "2026-10-09T02:14:00Z",
      "endsAt": "2026-10-09T02:31:00Z",
      "generatorURL": "https://app.fusionreactor.io/alerting/grafana/c3b1f7e2/view",
      "fingerprint": "6a2f9c1d8e4b7035",
      "silenceURL": "https://app.fusionreactor.io/alerting/silence/new?matchers=alertname%3DHigh%20CPU%20-%20Any%20Instance%2Cinstance%3Dproduction-server-01",
      "dashboardURL": "",
      "panelURL": "",
      "values": {
        "A": 41.7,
        "B": 0
      }
    }
  ],
  "groupLabels": {
    "alertname": "High CPU - Any Instance"
  },
  "commonLabels": {
    "alertname": "High CPU - Any Instance",
    "instance": "production-server-01",
    "job": "checkout-api",
    "group": "production",
    "channel": "spike"
  },
  "commonAnnotations": {
    "summary": "High CPU on production-server-01: 41.7%",
    "description": "CPU usage has been above 90% for over 2 minutes on production-server-01."
  },
  "externalURL": "https://app.fusionreactor.io/",
  "version": "1",
  "groupKey": "{}/{channel=~\".*spike.*\"}:{alertname=\"High CPU - Any Instance\"}",
  "truncatedAlerts": 0,
  "title": "[RESOLVED] High CPU - Any Instance (production-server-01 checkout-api production spike)",
  "state": "ok",
  "message": "High CPU on production-server-01: 41.7%"
}
```

## Troubleshooting

* **The title is a rule name, not a sentence.** **Message** is empty or still the default template, and the rule has no `summary` annotation. Set **Message** as in Step 2 or add a `summary` annotation to the rule.
* **Repeats open new incidents.** Check that the payload carries `alerts[].fingerprint`. Without it Spike matches by title.
* **The incident does not resolve.** Check that the contact point is set to send resolved notifications (leave **Disable resolved message** off) and that the resolved notification carries the same `fingerprint`.
