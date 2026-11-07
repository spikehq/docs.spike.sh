---
description: >-
  Send OpsPilot (formerly FusionReactor Cloud) alerts to Spike so a firing alert pages your on-call rotation by phone, SMS, Slack or Teams, and closes its incident when the alert recovers.
---

# Integrate Spike with OpsPilot

## Overview

[OpsPilot](https://opspilot.com) (formerly FusionReactor Cloud) monitors your FusionReactor instances and applications. Alert rules watch a metric, and when a rule fires OpsPilot notifies the contact points the rule names or its notification policy routes to.

A **Webhook** contact point posts each notification to Spike as JSON. A firing alert opens an incident and pages your escalation policy. A repeat of the same alert joins the incident that is already open, and the recovery resolves it.

{% hint style="success" %}
Auto-resolution is supported for this integration. Spike also groups repeated notifications for the same alert and suppresses new pages while the incident is open.
{% endhint %}

## How Spike identifies an alert

Spike identifies the incident by the notification's top-level `groupKey`, which names one alert group. A firing notification opens an incident or joins the open one with the same `groupKey`, and the `resolved` notification for that group closes it, even when the readings in the summary have changed.

* `groupKey` counts as an id only when it is a non-empty string (after trimming) or a number. Spike matches it as sent, ignoring surrounding spaces and whether it arrives as a number or text.
* A `groupKey` that is a template variable that was never filled in, such as `$groupKey`, `${groupKey}` or `{{ .GroupKey }}`, counts as no id.
* If there is no usable `groupKey`, Spike can only match by incident title. The title is then always the plain `<alertname> on <where>` with no sentence and no readings, so it is identical at firing and at recovery.
* A top-level `status` of `resolved` (trimmed, case-insensitive) only closes an incident and never opens one. Any other value opens an incident. `state` is not read.
* In a batch, alerts whose own `status` is `resolved` are not counted.

## Incident title

The title is the sentence you set in the contact point's **Message** setting (see Step 2), with whitespace collapsed and capped at 200 characters:

```
CPU usage on app-prod-02 is 96.4%, above the 90% threshold
```

If **Message** is empty, or is still Grafana's default multi-line template (it starts with `**Firing**` or `**Resolved**`, or has `Labels:`, `Annotations:` or `Source: http` lines), Spike falls back in this order:

1. When more than one alert is firing: `2 alerts in Production: High CPU usage, Low disk space`. The batch title wins over any alert's summary. It names at most two alerts and adds `+K more` for the rest.
2. The first alert's `annotations.summary`
3. The first alert's `annotations.description`
4. `<alertname> on <where>`, for example `High CPU usage on app-prod-02`. The place is the first alert's `instance` label, then its `grafana_folder` label.
5. `OpsPilot alert with no details` when nothing is usable.

`{{ .CommonAnnotations.summary }}` renders empty when the alerts in one notification have different summaries, for example several hosts each reporting their own reading. **Message** is then empty, so a notification with more than one firing alert gets the batch title from item 1.

Every title is capped at 200 characters, however long the values in it are.

A recovery is titled `<alertname> on <where> resolved`. Spike resolves by `groupKey`, so this title may differ from the one the incident opened with. The readings in `values` never appear in a title.

Use a [Title Remapper](../alerts/title-remapper.md) if you want a different title.

## Prerequisites

* An OpsPilot account that can create contact points and alert rules or notification policies
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
   In OpsPilot, go to **Alerting > Notifications** and open the **Contact Points** tab.

2. **Choose Webhook:**
   Click **+ New contact point** to open the integration picker, open the **Webhook** category tab and select **Webhook**.

3. **Paste the Spike URL (required):**
   Paste the webhook URL from Step 1 into the webhook URL field, and enter a unique, descriptive **Name** such as `Spike`.

4. **Set the Message, if your form shows it (strongly recommended):**
   OpsPilot's alerting is built on Grafana, and Grafana's Webhook form has a **Message** setting (under **Optional Webhook settings**). OpsPilot's documentation does not describe the Webhook form's fields, so if your form has **Message**, set it to:

   ```
   {{ .CommonAnnotations.summary }}
   ```

   This becomes the incident title. Without it, Spike falls back to the rule's summary annotation, so add a **summary** annotation to each alert rule. If the form also shows an **HTTP Method** setting, leave it at **POST**.

5. **Leave authorization empty:**
   The token in the URL is the credential. Treat the URL like a password.

6. **Save:**
   Click **Save contact point**. If your form has a **Test** button, use it to send a test notification to Spike.

7. **Route alerts to it:**
   Either pick the contact point on the alert rule itself: under **Then notify**, click **+ Add contact point** and choose `Spike`. Or route through a notification policy: go to **Alerting > Notifications**, open the **Notification Policy** tab, click **+ New route**, choose the `Spike` contact point and add a matcher, such as a `channel` label that your alert rules carry. Make sure the alert rules you route carry **summary** and **description** annotations, and that the route does not group on labels that differ between alerts you want in one incident.
{% endtab %}
{% endtabs %}

{% hint style="info" %}
The only required field is the webhook **URL**. **Message**, where your form has it, only sets the title; the rest of the payload is sent by the webhook contact point automatically.
{% endhint %}

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

## What OpsPilot sends

OpsPilot does not document its webhook body. Its alerting is built on Grafana, so the webhook contact point is expected to send [Grafana's documented webhook body](https://grafana.com/docs/grafana/latest/alerting/configure-notifications/manage-contact-points/integrations/webhook-notifier/). The bodies below are examples in that format, not captured OpsPilot notifications, and the hostnames in them are placeholders. Spike reads only the fields in this table. `groupKey`, `status` and `alerts[].status` are the ones that open and resolve incidents.

| Field | Used for |
| --- | --- |
| `message` | The incident title, when it is a usable sentence |
| `status` | `firing` opens or joins an incident, `resolved` closes it and never opens one |
| `groupKey` | The identity of the alert group, used to join repeats and to resolve |
| `alerts` | The grouped alert instances. The number of alerts not marked `resolved` is the batch count |
| `alerts[].status` | `firing` or `resolved` for each alert. In a batch, resolved alerts are not counted |
| `alerts[].annotations.summary` | First title fallback |
| `alerts[].annotations.description` | Second title fallback |
| `alerts[].labels.alertname` | The rule name in `<alertname> on <where>` and in batch titles |
| `alerts[].labels.instance` | The host the alert is about, first choice for `<where>` |
| `alerts[].labels.grafana_folder` | `<where>` when there is no instance, and the group name in a batch title |

Repeats that change only `message`, `title`, `commonAnnotations.summary` or `commonAnnotations.description` join the open incident.

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
        "instance": "app-prod-02",
        "service": "checkout-api",
        "severity": "critical"
      },
      "annotations": {
        "summary": "CPU usage on app-prod-02 is 96.4%, above the 90% threshold",
        "description": "checkout-api on app-prod-02 has been above 90% CPU for 5 minutes.",
        "runbook_url": "https://wiki.example.com/runbooks/high-cpu"
      },
      "startsAt": "2026-10-14T03:12:30Z",
      "endsAt": "0001-01-01T00:00:00Z",
      "generatorURL": "https://app.fusionreactor.io/alerting/grafana/aez1k9qf/view?orgId=1",
      "fingerprint": "8f3b2c1d9e0a4f57",
      "silenceURL": "https://app.fusionreactor.io/alerting/silence/new?alertmanager=grafana&matcher=alertname%3DHigh+CPU+usage&matcher=instance%3Dapp-prod-02",
      "dashboardURL": "",
      "panelURL": "",
      "values": {
        "A": 96.4,
        "C": 1
      },
      "valueString": "[ var='A' labels={instance=app-prod-02} value=96.4 ], [ var='C' labels={instance=app-prod-02} value=1 ]"
    }
  ],
  "groupLabels": {
    "alertname": "High CPU usage",
    "grafana_folder": "Production"
  },
  "commonLabels": {
    "alertname": "High CPU usage",
    "grafana_folder": "Production",
    "instance": "app-prod-02",
    "service": "checkout-api",
    "severity": "critical"
  },
  "commonAnnotations": {
    "summary": "CPU usage on app-prod-02 is 96.4%, above the 90% threshold",
    "description": "checkout-api on app-prod-02 has been above 90% CPU for 5 minutes.",
    "runbook_url": "https://wiki.example.com/runbooks/high-cpu"
  },
  "externalURL": "https://app.fusionreactor.io/",
  "version": "1",
  "groupKey": "{}/{}:{alertname=\"High CPU usage\", grafana_folder=\"Production\"}",
  "truncatedAlerts": 0,
  "title": "[FIRING:1] High CPU usage Production (app-prod-02 checkout-api critical)",
  "state": "alerting",
  "message": "CPU usage on app-prod-02 is 96.4%, above the 90% threshold"
}
```

### Recovery example

The same alert group with the same `groupKey`, once it has recovered. Spike resolves the open incident and titles the recovery `High CPU usage on app-prod-02 resolved`:

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
        "instance": "app-prod-02",
        "service": "checkout-api",
        "severity": "critical"
      },
      "annotations": {
        "summary": "CPU usage on app-prod-02 is 41.2%, above the 90% threshold",
        "description": "checkout-api on app-prod-02 has been above 90% CPU for 5 minutes.",
        "runbook_url": "https://wiki.example.com/runbooks/high-cpu"
      },
      "startsAt": "2026-10-14T03:12:30Z",
      "endsAt": "2026-10-14T03:27:30Z",
      "generatorURL": "https://app.fusionreactor.io/alerting/grafana/aez1k9qf/view?orgId=1",
      "fingerprint": "8f3b2c1d9e0a4f57",
      "silenceURL": "https://app.fusionreactor.io/alerting/silence/new?alertmanager=grafana&matcher=alertname%3DHigh+CPU+usage&matcher=instance%3Dapp-prod-02",
      "dashboardURL": "",
      "panelURL": "",
      "values": {
        "A": 41.2,
        "C": 0
      },
      "valueString": "[ var='A' labels={instance=app-prod-02} value=41.2 ], [ var='C' labels={instance=app-prod-02} value=0 ]"
    }
  ],
  "groupLabels": {
    "alertname": "High CPU usage",
    "grafana_folder": "Production"
  },
  "commonLabels": {
    "alertname": "High CPU usage",
    "grafana_folder": "Production",
    "instance": "app-prod-02",
    "service": "checkout-api",
    "severity": "critical"
  },
  "commonAnnotations": {
    "summary": "CPU usage on app-prod-02 is 41.2%, above the 90% threshold",
    "description": "checkout-api on app-prod-02 has been above 90% CPU for 5 minutes.",
    "runbook_url": "https://wiki.example.com/runbooks/high-cpu"
  },
  "externalURL": "https://app.fusionreactor.io/",
  "version": "1",
  "groupKey": "{}/{}:{alertname=\"High CPU usage\", grafana_folder=\"Production\"}",
  "truncatedAlerts": 0,
  "title": "[RESOLVED] High CPU usage Production (app-prod-02 checkout-api critical)",
  "state": "ok",
  "message": "CPU usage on app-prod-02 is 41.2%, above the 90% threshold"
}
```

## Troubleshooting

* **The title is a rule name, not a sentence.** **Message** is empty or still the default template, and the rule has no `summary` or `description` annotation. Set **Message** as in Step 2 or add a `summary` annotation to the rule.
* **Repeats open new incidents.** Check that the payload carries a non-empty `groupKey` that is not an unfilled template variable such as `{{ .GroupKey }}`. Without one Spike matches by title.
* **The incident does not resolve.** Check that the contact point sends resolved notifications (if your form has Grafana's **Disable resolved message** setting, leave it off) and that the resolved notification carries the same `groupKey` as the firing one. OpsPilot's documentation does not say whether resolved notifications are sent.
