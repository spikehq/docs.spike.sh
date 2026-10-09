---
description: >-
  Send LangSmith alert webhooks to Spike so a tracing project's error, latency, feedback or cost alert pages your on-call rotation by phone, SMS, Slack or Teams.
---

# Integrate Spike with LangSmith

[LangSmith](https://smith.langchain.com) is LangChain's platform for tracing, evaluating and monitoring LLM applications. You can set an alert rule on a tracing project, for example "more than 10 errored runs in 5 minutes", and LangSmith calls a webhook when the rule's threshold is crossed.

Point that webhook at a Spike integration URL and a LangSmith alert pages your on-call rotation, titled with the sentence you wrote for the rule. Nothing is installed: one webhook on each alert rule is the whole setup.

{% hint style="warning" %}
**LangSmith does not send a recovery webhook.** Nothing LangSmith sends says an alert has cleared, so nothing can resolve a Spike incident on its own. Give the integration a [resolve timer](../incidents/resolve-timer.md) or resolve incidents by hand.
{% endhint %}

## What Spike does with each delivery

| Delivery | What happens in Spike |
| --- | --- |
| The first alert from a rule | Opens an incident and pages your escalation policy |
| The same rule alerting again while its incident is open | Added as an event to that incident. It never pages again |
| A different rule | A separate incident, paged on its own |
| A delivery with no `alert_rule_id` | Matched to an open incident by title instead, so the same title joins and a different title opens a new incident |

## Incident identity

Spike identifies the incident by `alert_rule_id`, the UUID of the alert rule, which LangSmith documents as the de-duplication key and repeats on every firing of one rule. The title is for display only, so the readings can change from one firing to the next without opening a new incident.

## Incident title

The title is the rule's own description, which you write in LangSmith, with whitespace collapsed and cut at 200 characters:

```
Support bot runs are failing: more than 10 errored runs in 5 minutes
```

A rule with no description is titled from its name, the metric, the readings and the project:

```
Support bot error spike: error count 42 above 10 threshold in support-bot-prod
```

The readings appear only when the delivery carries an `alert_rule_id`, the rule type is `threshold` (or absent), and the metric value and threshold are both numbers that differ. Without them the title is the rule name and project:

```
Support bot error spike in support-bot-prod
```

If the rule has no name either, the metric stands in (`latency alert in support-bot-prod`), and a delivery with nothing usable is titled `LangSmith alert with no details`. Titles never contain ids, URLs or timestamps; those are on the incident page. If a fallback title would pass 200 characters, the rule name is shortened and the project is kept whole.

Use a [Title Remapper](../alerts/title-remapper.md) if you want a different format.

## Severity

Spike does not read a severity from the payload. Write an [alert rule](../alerts/alert-rules.md) on `alert_rule_attribute` or `project_name` if you want to set severity, route or suppress. Read more about [priority and severity](../incidents/priority-and-severity.md).

## Prerequisites

* A LangSmith workspace in which you can create alert rules on a tracing project
* A Spike integration and its webhook URL
* Nothing to open on your own network. LangSmith calls out to Spike

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → LangSmith**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Add a webhook to the alert rule in LangSmith

1. **Sign in to LangSmith** at [https://smith.langchain.com](https://smith.langchain.com), switch to the workspace that owns your tracing project and open the project from **Tracing Projects**.
2. **Open the project's alerts.** Select the **Alerts** tab, then create a new alert rule, or open an existing one to edit it.
3. **Set the rule.** Choose the metric to watch (error count, feedback score, latency or cost), the threshold and the window. Give the rule a clear **name**, and write a **description** that says what is wrong in a sentence, because Spike uses it as the incident title.
4. **Add a webhook notification.** In the rule's notification options choose **Webhook** and fill in:
   * **URL** (required) — the Spike URL from Step 1
   * **Headers** (optional) — leave empty; the token in the URL is the credential
   * **Body** (optional) — leave it empty, or add your own JSON keys. LangSmith adds its alert fields to whatever you put there
5. **Save the rule.**

The delivery LangSmith adds to the payload is the body below. Spike reads `alert_rule_id`, `alert_rule_description`, `alert_rule_name`, `project_name`, `alert_rule_attribute`, `alert_rule_type`, `triggered_metric_value` and `triggered_threshold`. `workspace_name`, `alert_rule_url`, `runs_url` and `timestamp` are kept on the incident page but are not used. Only `alert_rule_id` is needed to join repeat firings of one rule into one incident; the others only shape the title.

{% hint style="warning" %}
Treat the webhook URL like a password. If it leaks, archive the integration in Spike and create a new one, then update the URL on each rule.
{% endhint %}

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

## Step 3 — Add a resolve timer

Because LangSmith never reports a recovery, open **Settings** on the Spike integration and set a [resolve timer](../incidents/resolve-timer.md) that suits how long your alerts usually last. Without one, every incident stays open until somebody resolves it.

## Step 4 — Confirm it end to end

Send a test request with the example body below, or trigger the rule in LangSmith.

```bash
curl -X POST "https://hooks.spike.sh/<your-token>/push-events" \
  -H "Content-Type: application/json" \
  -d '{
    "project_name": "support-bot-prod",
    "workspace_name": "Acme AI",
    "alert_rule_id": "5f1c2a9e-8b3d-4c7a-9e21-6d0f4b7a3c18",
    "alert_rule_name": "Support bot error spike",
    "alert_rule_description": "Support bot runs are failing: more than 10 errored runs in 5 minutes",
    "alert_rule_type": "threshold",
    "alert_rule_attribute": "error_count",
    "alert_rule_url": "https://smith.langchain.com/o/2b7c9d10-4e5f-4a6b-8c7d-1e2f3a4b5c6d/projects/p/9a8b7c6d-5e4f-4321-9876-0fedcba98765?tab=alerts",
    "runs_url": "https://smith.langchain.com/o/2b7c9d10-4e5f-4a6b-8c7d-1e2f3a4b5c6d/projects/p/9a8b7c6d-5e4f-4321-9876-0fedcba98765?runtab=0",
    "triggered_metric_value": 42,
    "triggered_threshold": 10,
    "timestamp": "2026-10-09T03:12:00Z"
  }'
```

An incident opens on your service, titled:

```
Support bot runs are failing: more than 10 errored runs in 5 minutes
```

Send it again and the second delivery lands on the same incident without paging. Resolve the test incident when you are done.

## Payload reference

```json
{
  "project_name": "support-bot-prod",
  "workspace_name": "Acme AI",
  "alert_rule_id": "5f1c2a9e-8b3d-4c7a-9e21-6d0f4b7a3c18",
  "alert_rule_name": "Support bot error spike",
  "alert_rule_description": "Support bot runs are failing: more than 10 errored runs in 5 minutes",
  "alert_rule_type": "threshold",
  "alert_rule_attribute": "error_count",
  "alert_rule_url": "https://smith.langchain.com/o/2b7c9d10-4e5f-4a6b-8c7d-1e2f3a4b5c6d/projects/p/9a8b7c6d-5e4f-4321-9876-0fedcba98765?tab=alerts",
  "runs_url": "https://smith.langchain.com/o/2b7c9d10-4e5f-4a6b-8c7d-1e2f3a4b5c6d/projects/p/9a8b7c6d-5e4f-4321-9876-0fedcba98765?runtab=0",
  "triggered_metric_value": 42,
  "triggered_threshold": 10,
  "timestamp": "2026-10-09T03:12:00Z"
}
```

| Field | Required | Used for |
| --- | --- | --- |
| `alert_rule_id` | Recommended | Identifies the incident, and enables readings in the fallback title |
| `alert_rule_description` | No | The title, when it is not empty |
| `alert_rule_name` | No | The fallback title |
| `project_name` | No | The fallback title, always kept whole |
| `alert_rule_attribute` | No | The metric in words: `error_count`, `feedback_score`, `latency`, `run_latency`, `run_count`, `cost` and `total_cost` |
| `alert_rule_type` | No | Readings are added only for `threshold` (or when absent) |
| `triggered_metric_value`, `triggered_threshold` | No | The readings and whether the value is above or below the threshold. A number or a numeric string |
| `workspace_name`, `alert_rule_url`, `runs_url`, `timestamp` | No | Kept on the incident page, never used |

Spike keeps the whole body on the incident, so every field is available to [alert rules](../alerts/alert-rules.md) and the [Title Remapper](../alerts/title-remapper.md) as `data.body.<field>`.

## Things worth knowing

* **One webhook per rule.** Add the Spike webhook to each alert rule you want paged, or create several Spike integrations if teams own different projects.
* **No recovery.** A cleared alert does not resolve its incident. Use the resolve timer.
* **Resolving in Spike does not touch LangSmith.** The rule keeps running and will page again the next time it fires and nothing is open.

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Check that the URL on the rule is the full `https://hooks.spike.sh/<your-token>/push-events`, that the integration is not archived, and that the rule has actually fired. A webhook is only sent when the threshold is crossed.

</details>

<details>

<summary>The title is the rule name and project, not my description</summary>

The rule's description is empty, so Spike fell back to the name. Write a description on the rule in LangSmith.

</details>

<details>

<summary>Each firing opens a new incident</summary>

Compare `alert_rule_id` on two incidents. If it is missing from the payload, Spike can only match on the title, so a title that changes between firings opens a new incident. If the ids match and the first incident was resolved, the next firing opens a new one by design.

</details>

<details>

<summary>The title has no readings</summary>

Readings only appear on the fallback title, and only when the delivery has an `alert_rule_id`, a `threshold` rule type, and two different numbers for `triggered_metric_value` and `triggered_threshold`.

</details>

Disclaimer: These integration instructions are offered independently by Spike.sh, and Spike.sh is not affiliated with nor a partner of LangChain, Inc.
