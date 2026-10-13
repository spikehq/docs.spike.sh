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

Spike identifies the incident by `alerts[0].fingerprint`, the stable hash of the alert's labels. It is the same on the firing and the resolved notification, so a repeat joins the open incident and the recovery resolves it, even when the readings in the summary have changed.

* If `alerts[0].fingerprint` is empty or an unexpanded template such as `{{ .Fingerprint }}`, Spike uses the notification's `groupKey` under the same rule.
* If neither is usable, Spike can only match by incident title. In that case the title is the plain `<alertname> on <where>` with no readings, so it is identical at firing and at recovery.
* A `resolved` notification (`status` `resolved`, or `state` `ok`) only closes an incident and never opens one.

## Incident title

The title is the sentence you set in the contact point's **Message** setting (see Step 2), with whitespace collapsed and capped at 200 characters:

```
Process CPU on checkout-api-02 has been above 90% for 5 minutes (currently 94%)
```

If **Message** is empty, or is still Grafana's default multi-line template (it starts with `**Firing**` or `**Resolved**`), Spike falls back in this order:

1. The first alert's `annotations.summary`
2. `commonAnnotations.summary`
3. The first alert's `annotations.description`
4. `<alertname> on <where>`, for example `High CPU usage on checkout-api-02`. The alert name is the first alert's `alertname` label, then `commonLabels.alertname`. The place is the `instance` label (first alert, then `commonLabels`), then `grafana_folder`; ` on <where>` is left out when there is none.
5. When several alerts arrive together and there is no sentence: `4 alerts in Production: High CPU usage, Low disk space +2 more`. It names at most two distinct rules.
6. `OpsPilot alert with no details`

A recovery is titled `<alertname> on <where> resolved`. Spike resolves by fingerprint, so this title may differ from the one the incident opened with. The readings in `values` never appear in a title.

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
| `status` | `firing` opens or joins an incident, `resolved` closes it and never opens one |
| `state` | `alerting` when firing, `ok` on recovery (used when `status` is missing) |
| `alerts` | The grouped alert instances. The number of alerts is the batch count |
| `alerts[].status` | `firing` or `resolved` for each alert. If the first alert is `resolved`, no new incident is opened |
| `alerts[].fingerprint` | The stable id of the alert, used to join repeats and to resolve |
| `groupKey` | Identity fallback when the first alert has no usable fingerprint |
| `alerts[].annotations.summary` | First title fallback |
| `commonAnnotations.summary` | Second title fallback |
| `alerts[].annotations.description` | Third title fallback |
| `alerts[].labels.alertname` | The rule name in `<alertname> on <where>` and in batch titles |
| `commonLabels.alertname` | The rule name when the first alert has none |
| `alerts[].labels.instance` | The host the alert is about, first choice for `<where>` (present only if the rule's query returns it) |
| `alerts[].labels.grafana_folder` | `<where>` when there is no instance, and the group name in a batch title |

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
        "alertname": "High CPU usage",
        "grafana_folder": "Production",
        "instance": "checkout-api-02",
        "severity": "critical"
      },
      "annotations": {
        "summary": "Process CPU on checkout-api-02 has been above 90% for 5 minutes (currently 94%)",
        "description": "The FusionReactor agent on checkout-api-02 reports sustained high process CPU."
      },
      "startsAt": "2026-10-13T03:12:00Z",
      "endsAt": "0001-01-01T00:00:00Z",
      "generatorURL": "https://app.opspilot.com/alerting/grafana/c1a9e7f2/view",
      "fingerprint": "8b3a1f0c9d2e4b71",
      "silenceURL": "https://app.opspilot.com/alerting/silence/new?matcher=alertname%3DHigh+CPU+usage&matcher=instance%3Dcheckout-api-02",
      "dashboardURL": "",
      "panelURL": "",
      "values": {
        "A": 94.2,
        "C": 1
      }
    }
  ],
  "groupLabels": {
    "alertname": "High CPU usage",
    "grafana_folder": "Production"
  },
  "commonLabels": {
    "alertname": "High CPU usage",
    "grafana_folder": "Production",
    "instance": "checkout-api-02",
    "severity": "critical"
  },
  "commonAnnotations": {
    "summary": "Process CPU on checkout-api-02 has been above 90% for 5 minutes (currently 94%)",
    "description": "The FusionReactor agent on checkout-api-02 reports sustained high process CPU."
  },
  "externalURL": "https://app.opspilot.com/",
  "version": "1",
  "groupKey": "{}/{__grafana_receiver__=\"Spike\"}:{alertname=\"High CPU usage\", grafana_folder=\"Production\"}",
  "truncatedAlerts": 0,
  "title": "[FIRING:1] High CPU usage Production (checkout-api-02 critical)",
  "state": "alerting",
  "message": "Process CPU on checkout-api-02 has been above 90% for 5 minutes (currently 94%)"
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
        "alertname": "High CPU usage",
        "grafana_folder": "Production",
        "instance": "checkout-api-02",
        "severity": "critical"
      },
      "annotations": {
        "summary": "Process CPU on checkout-api-02 has been above 90% for 5 minutes (currently 94%)",
        "description": "The FusionReactor agent on checkout-api-02 reports sustained high process CPU."
      },
      "startsAt": "2026-10-13T03:12:00Z",
      "endsAt": "2026-10-13T03:31:00Z",
      "generatorURL": "https://app.opspilot.com/alerting/grafana/c1a9e7f2/view",
      "fingerprint": "8b3a1f0c9d2e4b71",
      "silenceURL": "https://app.opspilot.com/alerting/silence/new?matcher=alertname%3DHigh+CPU+usage&matcher=instance%3Dcheckout-api-02",
      "dashboardURL": "",
      "panelURL": "",
      "values": {
        "A": 41.7,
        "C": 0
      }
    }
  ],
  "groupLabels": {
    "alertname": "High CPU usage",
    "grafana_folder": "Production"
  },
  "commonLabels": {
    "alertname": "High CPU usage",
    "grafana_folder": "Production",
    "instance": "checkout-api-02",
    "severity": "critical"
  },
  "commonAnnotations": {
    "summary": "Process CPU on checkout-api-02 has been above 90% for 5 minutes (currently 94%)",
    "description": "The FusionReactor agent on checkout-api-02 reports sustained high process CPU."
  },
  "externalURL": "https://app.opspilot.com/",
  "version": "1",
  "groupKey": "{}/{__grafana_receiver__=\"Spike\"}:{alertname=\"High CPU usage\", grafana_folder=\"Production\"}",
  "truncatedAlerts": 0,
  "title": "[RESOLVED] High CPU usage Production (checkout-api-02 critical)",
  "state": "ok",
  "message": "Process CPU on checkout-api-02 has been above 90% for 5 minutes (currently 94%)"
}
```

## Troubleshooting

* **The title is a rule name, not a sentence.** **Message** is empty or still the default template, and the rule has no `summary` annotation. Set **Message** as in Step 2 or add a `summary` annotation to the rule.
* **Repeats open new incidents.** Check that the payload carries `alerts[].fingerprint`. Without it Spike matches by title.
* **The incident does not resolve.** Check that the contact point is set to send resolved notifications (leave **Disable resolved message** off) and that the resolved notification carries the same `fingerprint`.
