---
description: >-
  Route Panther SIEM detections to Spike with a Custom Webhook destination, so security alerts page your on-call rotation on phone, SMS, Slack or Microsoft Teams.
---

# Integrate Spike with Panther

[Panther](https://panther.com) is a cloud-native SIEM. Its detections run over your log pipeline and raise an alert when something matches. Panther's **Custom Webhook** destination posts that alert as JSON, so pointing it at a Spike integration turns a detection into an incident that escalates through your policy like every other source.

Every Panther alert opens its own incident in Spike. Panther already collapses matching events into a single alert for the length of the detection's deduplication window, so the noise is filtered before it reaches Spike.

{% hint style="warning" %}
Panther does not send alert status changes to webhooks. Moving an alert from **Open** to **Triaged** or **Resolved** in the Panther Console is not delivered anywhere, so nothing auto-resolves in Spike. Turn on [Resolve by Timer](../incidents/resolve-timer.md) on this integration, or resolve incidents in Spike by hand.
{% endhint %}

## What Spike does with each alert

Panther tags every alert with a `type`. All of them open an incident, because each one is a distinct thing that happened:

| `type` | What it is | What happens in Spike |
| --- | --- | --- |
| `RULE` | A real-time detection matched an event | Opens an incident |
| `SCHEDULED_RULE` | A scheduled query's detection matched | Opens an incident |
| `POLICY` | A cloud resource failed a policy | Opens an incident |
| `CORRELATION_RULE` | A correlation rule matched across signals | Opens an incident |
| `RULE_ERROR`, `SCHEDULED_RULE_ERROR`, `POLICY_ERROR` | The detection itself threw an exception | Opens an incident |
| `SYSTEM_ERROR` | Panther's own pipeline hit a problem | Opens an incident |

The `*_ERROR` and `SYSTEM_ERROR` types mean your detections are not running, which is usually worth paging someone about. If you would rather handle them during business hours, keep them out of the destination's **Alert Types** filter, or route them with an [alert rule](../alerts/alert-rules.md) to a low-severity service.

### Incident identity

Spike identifies a Panther incident by the alert's `alertId`, and every alert Panther delivers opens a new incident. That is the right behaviour here because Panther deduplicates upstream: matching events are grouped into one alert for the detection's `dedup_period_minutes` window, and Panther sends nothing further for that alert. A single webhook delivery is normally the whole story.

### Incident title

The title is Panther's `title` verbatim, because Panther already writes it as a sentence and it reads well when Spike dials your phone and speaks it:

```
AWS Root Account Activity in prod-payments
```

The detection's `name`, `description`, `runbook`, `link`, `tags` and `alertContext` stay in the payload and show up on the incident page, so responders get the runbook link without it crowding the title. Use the [Title Remapper](../alerts/title-remapper.md) if you want a different shape, for example prefixing the severity:

```
[{{data.body.severity}}] {{data.body.title}}
```

### Severity

Severity comes from Panther's `severity` field:

| Panther severity | Severity in Spike |
| --- | --- |
| `CRITICAL`, `HIGH` | SEV1 |
| `MEDIUM` | SEV2 |
| `LOW`, `INFO` | SEV3 |

{% hint style="info" %}
Severity is set when the incident is created. [Alert rules](../alerts/alert-rules.md) can override it, route the incident to another service, or suppress it entirely.
{% endhint %}

## Prerequisites

* A Panther account with permission to manage alert destinations
* A Panther integration in Spike and its webhook URL

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Panther**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Add a Custom Webhook destination in Panther

In the Panther Console, go to **Configure → Alert Destinations** and create a new destination of type **Custom Webhook**.

| Field | What to put in it |
| --- | --- |
| Display Name | `Spike` — this is the name you pick when routing a detection |
| Webhook URL | The Spike webhook URL from Step 1 |
| Custom HTTP Headers | Leave empty. Spike authenticates on the token in the URL |

Keep the webhook URL out of shared documents and detection descriptions. Anyone holding it can open incidents on your account, so treat it like a credential. If it leaks, archive the integration in Spike and create a new one.

## Step 3 — Choose what reaches the destination

The destination's filters decide which alerts Panther delivers. All three are worth setting before you save:

* **Severity** — the severities this destination receives. Starting with `HIGH` and `CRITICAL` only is the usual way to avoid paging on informational detections, then widening once you trust the routing.
* **Alert Types** — which of the types in the table above to send. Detection errors and system errors are separate entries here, so you can leave them off the pager.
* **Log Types** — restrict the destination to specific log sources, for example only your CloudTrail and Okta detections.

{% hint style="info" %}
A detection can name a destination directly through its **Destination Overrides**, and that routing wins over the severity filter. If a `LOW` alert is paging your on-call even though the destination is set to `HIGH` and `CRITICAL`, check the detection for an override.
{% endhint %}

## Step 4 — Send a test alert

Open the destination in Panther and press **Send Test Alert**. Panther posts a synthetic alert to the webhook, and an incident should appear in Spike within a few seconds and start escalating through the policy you attached.

If the test alert arrives but your real detections do not, the destination's severity, alert type or log type filters are excluding them.

## Step 5 — Turn on Resolve by Timer

Because Panther never tells the webhook that an alert was triaged or resolved, incidents from this integration stay open until someone resolves them. Set Resolve by Timer on the integration so they close on their own once the on-call has had a chance to look:

{% content-ref url="../incidents/resolve-timer.md" %}
[resolve-timer.md](../incidents/resolve-timer.md)
{% endcontent-ref %}

Somewhere between a few hours and a day suits most security teams: long enough that a real investigation is still open in Spike while it is happening, short enough that the dashboard is not full of last week's alerts. Triage still happens in Panther, and the incident in Spike records who was paged and how they responded.

## Things worth knowing

* **Panther retries.** A delivery that does not get a `2xx` is retried up to 10 times. Spike answers the webhook before it escalates, so a slow escalation policy never causes a retry, and the retries only matter if Spike or the network is genuinely unavailable.
* **Resolving in Spike does not resolve in Panther.** The two are not linked in this version. Panther's alert status stays whatever you set it to in the Panther Console.
* **The deduplication window lives in Panther.** If a noisy detection opens more incidents than you expect, raise `dedup_period_minutes` on the detection or change its `dedup()` string. Spike will not merge two alerts that Panther chose to keep apart, because they have different `alertId` values.
* **The runbook comes across.** Detections that set `runbook` put it on the incident, so the responder Spike wakes up has the instructions in front of them.

## Payload reference

A `RULE` alert:

```json
{
  "id": "AWS.CloudTrail.RootActivity",
  "alertId": "1f3b6c1a04a9a5a1a1e1a5e6b3c2d4f5",
  "title": "AWS Root Account Activity in prod-payments",
  "name": "AWS Root Account Activity",
  "severity": "HIGH",
  "type": "RULE",
  "link": "https://acme.runpanther.net/alerts/1f3b6c1a04a9a5a1a1e1a5e6b3c2d4f5",
  "runbook": "https://runbooks.acme.com/aws-root-activity",
  "description": "The AWS root account was used to sign in to the console.",
  "tags": ["AWS", "Identity & Access Management", "Persistence"],
  "alertContext": {
    "accountId": "123456789012",
    "eventName": "ConsoleLogin",
    "sourceIPAddress": "203.0.113.24"
  },
  "createdAt": "2026-09-21T09:42:11.482Z"
}
```

A `RULE_ERROR` alert, raised when the detection's Python throws rather than when it matches:

```json
{
  "id": "Okta.Session.Hijack",
  "alertId": "9c2d0b7e51f84a2ab0a7f1e0c6d39b7c",
  "title": "Rule error: Okta Session Hijack",
  "name": "Okta Session Hijack",
  "severity": "MEDIUM",
  "type": "RULE_ERROR",
  "link": "https://acme.runpanther.net/alerts/9c2d0b7e51f84a2ab0a7f1e0c6d39b7c",
  "runbook": "",
  "description": "KeyError: 'debugContext'",
  "tags": ["Okta"],
  "alertContext": {},
  "createdAt": "2026-09-21T09:44:03.117Z"
}
```

Panther may add fields to this payload. Spike keeps the whole body on the incident, so anything extra is available to alert rules and the Title Remapper as `data.body.<field>`.

## Troubleshooting

<details>

<summary>The test alert works but real detections never arrive</summary>

The destination filters are the usual cause. Open the destination in Panther and check that the detection's severity is in the **Severity** list, that its type is in **Alert Types**, and that its log type passes the **Log Types** filter. A detection with a **Destination Override** pointing somewhere else never reaches this destination at all.

</details>

<details>

<summary>Nothing arrives at all</summary>

Confirm the webhook URL on the destination is the full Spike URL including the token and the `/push-events` suffix, and that the integration has not been archived in Spike. Panther shows delivery failures on the destination, and a repeated failure there means Panther could not get a `2xx` from the URL as written.

</details>

<details>

<summary>One detection opens far more incidents than expected</summary>

Each Panther alert is one incident, so this is a deduplication question rather than a Spike one. Widen the detection's `dedup_period_minutes`, or return a coarser value from `dedup()` so more events fall into the same alert. Until then, an alert rule matching that detection's `name` can hold the noise off the pager.

</details>

<details>

<summary>Incidents stay open forever</summary>

Expected. Panther does not send status changes to webhooks, so nothing in Spike hears about a triage or a resolve done in the Panther Console. Set [Resolve by Timer](../incidents/resolve-timer.md) on the integration.

</details>

Disclaimer: These integration instructions are offered independently by Spike.sh, and Spike.sh is not affiliated with nor a partner of Panther Labs Inc.
