---
description: >-
  Send Chronosphere monitor notifications to Spike so a firing monitor pages your on-call rotation by phone, SMS, Slack or Teams, and resolves its incident when the monitor recovers.
---

# Integrate Spike with Chronosphere

[Chronosphere](https://chronosphere.io) is a cloud-native observability platform. A **monitor** watches a query over your metrics, and a **notification policy** routes the alerts it raises to **notifiers**, which are the places a notification is delivered.

A Chronosphere **webhook notifier** posts every notification to a URL as JSON. Point one at a Spike integration URL and a firing monitor pages your on-call rotation, repeat notifications for the same alerting series land on the incident already open, and the incident resolves itself when Chronosphere sends the recovery.

Nothing is installed anywhere. One notifier and one notification policy route, configured once, cover every monitor you send through them.

## What Spike does with each notification

The top-level `status` and each alert's `status` decide what Spike does:

| `status` | What Spike does |
| --- | --- |
| `firing` | Opens an incident and pages. A repeat for the same alert joins the incident already open |
| `resolved` | Resolves the incident, once every alert in the notification is resolved |

A `resolved` notification with no matching open incident is dropped rather than turned into a new incident.

## Incident identity

Spike identifies the incident by `alerts[0].fingerprint`, the stable hash of the alert's labels that Chronosphere repeats on the firing notification and on the recovery. Because identity is the fingerprint, the title is for display only: a repeat joins the open incident even when the reading in the sentence has moved, and the recovery resolves the right incident whatever it is titled.

A notification with no fingerprint cannot be matched that way. Spike then matches by title, so the title is built from the monitor's name, severity and place only, never from the sentence, which can carry a changing reading.

## Incident title

Chronosphere's monitor annotations carry your own sentence about what is wrong, so the title is that sentence whenever there is one. Spike reads `commonAnnotations.summary`, then `alerts[0].annotations.summary`, then `commonAnnotations.description`, then `alerts[0].annotations.description`:

```
Checkout API 5xx error rate is 7.3%, above the 5% threshold for 5 minutes
```

Whitespace is collapsed and the title is capped at 200 characters. When one notification carries several alerts, the sentence is followed by the count:

```
Checkout API 5xx error rate is 7.3%, above the 5% threshold for 5 minutes (2 alerts)
```

With no sentence, or no fingerprint, the title is the monitor name, the severity and where it fired:

```
Checkout API high error rate (critical) on checkout-api
```

The monitor name is `commonLabels.alertname`, then `alerts[0].labels.alertname`, then `alerts[0].annotations.monitor_slug`. The severity is `labels.severity`. The place is the first of `labels.service`, `labels.instance`, `labels.pod_name` and `labels.job` that is set. A batch with no shared monitor name is titled by the names of its alerts:

```
3 alerts firing: Disk almost full, Memory pressure +1 more
```

A recovery is written as one, with no readings:

```
Checkout API high error rate on checkout-api resolved
```

A notification with nothing usable is titled `Chronosphere alert with no details`.

Use a [Title Remapper](../alerts/title-remapper.md) if your team reads Chronosphere alerts by monitor rather than by your own sentence:

```handlebars
{{data.body.commonLabels.alertname}} ({{data.body.commonLabels.severity}})
```

## Severity

Spike does not read a severity from the payload. `labels.severity` is kept on the incident and shown in the fallback title, but incidents open at your integration's default. Write an [alert rule](../alerts/alert-rules.md) on `severity` if you want Chronosphere's levels on the badge. Read more about [priority and severity](../incidents/priority-and-severity.md).

## Prerequisites

* A Chronosphere account that can create **notifiers** and edit **notification policies**
* A Chronosphere integration in Spike and its webhook URL
* Nothing to open on your own network. Chronosphere calls out to Spike

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Chronosphere**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Create a webhook notifier in Chronosphere

1. **Sign in to Chronosphere** and open **Alerts → Notifiers** (in older tenants the notifier screens sit under **Platform → Notifiers**).
2. **Create a new notifier** and select **Webhook** as its type.
3. **Fill in the notifier.**
   * **Name** (required) — something your team will recognise, for example `spike-oncall-webhook`. Chronosphere sends it as `notifier` in every body.
   * **URL** (required) — the URL from Step 1.
   * **Send resolved notifications** — keep it on, which is the default. Without it Chronosphere never sends the recovery and incidents do not resolve themselves.
   * Leave any HTTP basic-auth or bearer-token settings empty. The token already in the webhook URL is the credential.
4. **Save** the notifier.

{% hint style="warning" %}
Treat the webhook URL like a password. If it leaks, archive the integration in Spike, create a new one and update the notifier URL in Chronosphere.
{% endhint %}

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

## Step 3 — Route monitors to the notifier

A notifier receives nothing until a notification policy sends alerts to it.

1. Open **Alerts → Notification Policies** and open the policy that routes the monitors you want paged, or create one.
2. **Add the notifier** from Step 2 as a route for the severities you want Spike to receive (for example `critical` and `warn`), and save the policy.
3. Make sure each monitor you care about uses that policy, either directly or through the policy you edited.

## Step 4 — Write the sentence you want as the title

Spike uses your monitor's own `summary` annotation as the incident title, and falls back to `description`. In each monitor, under **Annotations**, add a `summary` that says what is wrong in one line. Chronosphere renders annotation templates when it sends, so you can include the value:

```
Checkout API 5xx error rate is {{ $value | humanizePercentage }}, above the 5% threshold for 5 minutes
```

Add the labels you want in the title and incident, for example a `service` label on the monitor or its series. These are optional: the notification works without them.

## Step 5 — Confirm it end to end

1. Let a monitor fire, or lower its threshold briefly. An incident opens in Spike with your sentence as the title, on the service you attached, escalating through your policy.
2. Let the monitor recover. The incident resolves itself.

If the incident opens but never resolves, check that **Send resolved notifications** is on for the notifier.

## Payload reference

Chronosphere sends its own payload and there is no template to edit, so this section is a reference for what lands on the incident page and for what [alert rules](../alerts/alert-rules.md) and the [Title Remapper](../alerts/title-remapper.md) can read as `data.body.<field>`.

A firing notification, which opens the incident:

```json
{
  "notifier": "spike-oncall-webhook",
  "status": "firing",
  "alerts": [
    {
      "status": "firing",
      "labels": {
        "alertname": "Checkout API high error rate",
        "severity": "critical",
        "service": "checkout-api",
        "instance": "checkout-api-7d9f6c5b8-x2kqp:8080",
        "job": "checkout-api",
        "pod_name": "checkout-api-7d9f6c5b8-x2kqp"
      },
      "annotations": {
        "summary": "Checkout API 5xx error rate is 7.3%, above the 5% threshold for 5 minutes",
        "description": "HTTP 5xx responses from checkout-api have exceeded 5% of requests in us-east-1. Check recent deploys and the payments dependency.",
        "ruleid": "8c1f2e7a-4b3d-4f6a-9e21-5d7c0b9a3f14",
        "monitor_slug": "checkout-api-high-error-rate",
        "notification_policy_slug": "payments-oncall"
      },
      "startsAt": "2026-10-11T03:12:41.52Z",
      "endsAt": "0001-01-01T00:00:00Z",
      "fingerprint": "5f3c9a1e7b20d4c8"
    }
  ],
  "groupLabels": {
    "alertname": "Checkout API high error rate",
    "severity": "critical"
  },
  "commonLabels": {
    "alertname": "Checkout API high error rate",
    "severity": "critical",
    "service": "checkout-api",
    "instance": "checkout-api-7d9f6c5b8-x2kqp:8080",
    "job": "checkout-api",
    "pod_name": "checkout-api-7d9f6c5b8-x2kqp"
  },
  "commonAnnotations": {
    "summary": "Checkout API 5xx error rate is 7.3%, above the 5% threshold for 5 minutes",
    "description": "HTTP 5xx responses from checkout-api have exceeded 5% of requests in us-east-1. Check recent deploys and the payments dependency.",
    "ruleid": "8c1f2e7a-4b3d-4f6a-9e21-5d7c0b9a3f14",
    "monitor_slug": "checkout-api-high-error-rate",
    "notification_policy_slug": "payments-oncall"
  },
  "version": "4"
}
```

It opens an incident titled:

```
Checkout API 5xx error rate is 7.3%, above the 5% threshold for 5 minutes
```

The recovery for the same alert. `alerts[0].fingerprint` is the one the firing notification carried, and that is what joins the two:

```json
{
  "notifier": "spike-oncall-webhook",
  "status": "resolved",
  "alerts": [
    {
      "status": "resolved",
      "labels": {
        "alertname": "Checkout API high error rate",
        "severity": "critical",
        "service": "checkout-api",
        "instance": "checkout-api-7d9f6c5b8-x2kqp:8080",
        "job": "checkout-api",
        "pod_name": "checkout-api-7d9f6c5b8-x2kqp"
      },
      "annotations": {
        "summary": "Checkout API 5xx error rate is 7.3%, above the 5% threshold for 5 minutes",
        "description": "HTTP 5xx responses from checkout-api have exceeded 5% of requests in us-east-1. Check recent deploys and the payments dependency.",
        "ruleid": "8c1f2e7a-4b3d-4f6a-9e21-5d7c0b9a3f14",
        "monitor_slug": "checkout-api-high-error-rate",
        "notification_policy_slug": "payments-oncall"
      },
      "startsAt": "2026-10-11T03:12:41.52Z",
      "endsAt": "2026-10-11T03:41:06.18Z",
      "fingerprint": "5f3c9a1e7b20d4c8"
    }
  ],
  "groupLabels": {
    "alertname": "Checkout API high error rate",
    "severity": "critical"
  },
  "commonLabels": {
    "alertname": "Checkout API high error rate",
    "severity": "critical",
    "service": "checkout-api",
    "instance": "checkout-api-7d9f6c5b8-x2kqp:8080",
    "job": "checkout-api",
    "pod_name": "checkout-api-7d9f6c5b8-x2kqp"
  },
  "commonAnnotations": {
    "summary": "Checkout API 5xx error rate is 7.3%, above the 5% threshold for 5 minutes",
    "description": "HTTP 5xx responses from checkout-api have exceeded 5% of requests in us-east-1. Check recent deploys and the payments dependency.",
    "ruleid": "8c1f2e7a-4b3d-4f6a-9e21-5d7c0b9a3f14",
    "monitor_slug": "checkout-api-high-error-rate",
    "notification_policy_slug": "payments-oncall"
  },
  "version": "4"
}
```

It resolves the incident, and the event reads:

```
Checkout API high error rate on checkout-api resolved
```

Spike keeps the whole body on the incident, so every field above is available to alert rules and the Title Remapper.

### Fields Spike reads

| Field | Required | Used for |
| --- | --- | --- |
| `status` | Yes | `firing` opens, `resolved` resolves |
| `alerts[].status` | Yes | A resolved alert never opens an incident; every alert must be resolved to resolve |
| `alerts[].fingerprint` | Yes | Identity of the incident across firing and recovery |
| `alerts[].labels.alertname` | No | Monitor name in the fallback title |
| `alerts[].labels.severity` | No | Severity in the fallback title |
| `alerts[].labels.service`, `instance`, `pod_name`, `job` | No | Where it fired, first one set wins |
| `alerts[].annotations.summary`, `description` | No | The title sentence |
| `alerts[].annotations.monitor_slug` | No | Monitor name when `alertname` is missing |
| `commonLabels.alertname`, `severity` | No | Preferred over the first alert's labels |
| `commonAnnotations.summary`, `description` | No | Preferred title sentence |

## Things worth knowing

* **One notifier covers every monitor.** Add it once and route as many notification policies to it as you want.
* **Several Spike integrations are fine.** Create one Spike integration and one Chronosphere notifier per team, and route each team's policy to its own notifier.
* **Resolving in Spike does not touch Chronosphere.** The monitor keeps evaluating, and a still-firing alert is not re-sent as a new incident until Chronosphere notifies again.
* **Summary and description are yours.** Chronosphere documents them only as example monitor annotations, so they appear in the payload only when you have set them on the monitor. Without them the title falls back to the monitor name.

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Check that the notifier URL is the full `https://hooks.spike.sh/<your-token>/push-events` with nothing appended and that the integration has not been archived in Spike. Then check that a notification policy routes the monitor's severity to the notifier. A notifier with no route receives nothing.

</details>

<details>

<summary>Incidents never resolve</summary>

Check that **Send resolved notifications** is on for the notifier. Spike resolves only when every alert in the notification is `resolved`, and only while the incident is still open.

</details>

<details>

<summary>The title is the monitor name, not my sentence</summary>

The monitor has no `summary` or `description` annotation, or Chronosphere did not include it in the notification. Add a `summary` annotation to the monitor and open the payload on the incident page to confirm it arrives under `alerts[0].annotations`. A notification with no `fingerprint` is also titled by monitor name, severity and place.

</details>

<details>

<summary>Every notification opens its own incident</summary>

Open two of the incidents and compare `alerts[0].fingerprint` in the payloads. The fingerprint is a hash of the alert's labels, so a label that changes between sends, such as a pod name after a restart, makes a new alerting series and a new incident.

</details>

Disclaimer: These integration instructions are offered independently by Spike.sh, and Spike.sh is not affiliated with nor a partner of Chronosphere.
