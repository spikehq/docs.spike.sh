---
description: >-
  Send Dash0 check rule notifications to Spike so a failing check pages your on-call rotation by phone, SMS, Slack or Teams, and resolves when the check recovers.
---

# Integrate Spike with Dash0

[Dash0](https://www.dash0.com) is an OpenTelemetry-native observability platform. Its check rules watch your traces, metrics and logs, and raise an issue when a rule starts failing. Point a Dash0 **Webhook** notification channel at Spike and that issue becomes an incident: it escalates through your policy like every other integration, and Dash0 resolves it for you when the check recovers.

{% hint style="info" %}
Dash0 also ships an Alertmanager notification channel. If you already send Dash0 alerts through an Alertmanager, keep using the [Prometheus integration](integrate-spike-with-prometheus.md) for that path. This guide covers the Webhook channel, which talks to Spike directly.
{% endhint %}

## What Spike does with each notification

Every Dash0 webhook body carries a `type` that says where the issue is in its lifecycle. Spike acts on it:

| `type` | What happens in Spike |
| --- | --- |
| `alert.ongoing` | Opens an incident for that issue, or adds an event to the one already open |
| `alert.resolved` | Auto-resolves the open incident. Dropped when nothing is open |
| `alert.closed` | Auto-resolves the open incident. Dropped when nothing is open |
| `alert.superseded` | Adds an event to the open incident and leaves it open. Never opens an incident on its own |

`alert.superseded` is what Dash0 sends when the issue instance is replaced, which in practice means you edited the check rule while it was failing. The check can still be failing at that moment, so Spike treats it as an update and not as a recovery: the notification joins the open incident, and the `alert.ongoing` that follows against the new version of the rule joins it too. Editing a rule mid-incident neither resolves the incident nor pages anyone a second time.

There is one incident per `data.issue.issueIdentifier`. That identifier is stable for a given check rule and resource across issue instances, so a check that flaps, a reminder notification, and a `degraded` that turns into a `critical` all land on the incident already open instead of paging the team again.

{% hint style="success" %}
Auto-resolution needs nothing switched on. As long as the channel is attached to the check rule, Dash0 sends `alert.resolved` when the check recovers, or `alert.closed` when the issue is closed in Dash0, and Spike resolves the incident.
{% endhint %}

### Incident titles

Titles read `Check failing: {check rule name} on {service}`, so an incident says what broke and where without anyone having to open it:

```
Check failing: Payments API error rate above 5% on payments-api
```

The `Check failing:` prefix is there because check rule names usually describe the healthy state. Without it, `Checkout page loads` arriving at three in the morning reads like good news.

The service comes from the issue's labels, falling back to the check rule's own labels, and Spike takes the first of these that is set:

`dash0.resource.name`, `service.name`, `service_name`, `service`, `k8s.deployment.name`, `k8s.statefulset.name`, `k8s.daemonset.name`, `k8s.cronjob.name`, `k8s.job.name`, `k8s.pod.name`, `k8s.namespace.name`, `k8s.cluster.name`, `host.name`, `host`, `container.name`, `faas.name`, `cloud.resource_id`, `instance`, `job`

That order is fixed rather than the order the labels happen to arrive in, so one check rule always names its resource the same way. When none of them is set — a synthetic check with no resource behind it, for instance — the title is simply `Check failing: {check rule name}`.

Two fallbacks cover a body that names no rule at all:

| What arrived | Title |
| --- | --- |
| A check rule id but no name | `Dash0 check chk_7e1d0a failing` |
| Nothing usable | `Dash0 alert with no details` |

A recovery is the same title with `[RESOLVED]` in front of it.

{% hint style="info" %}
Titles never carry the status, the summary, the description, a measured number, the issue id, its timestamps or its URL. Every one of those changes while a single issue is open, and a title that moves is unrecognisable when Spike reads it out on a phone call. They are all on the incident page instead.
{% endhint %}

A title over 200 characters is shortened at a word boundary with `...`, keeping ` on {service}` whole, because the service is the part you need to hear.

Use the [Title Remapper](../alerts/title-remapper.md) if you want a different shape — there is an example [further down this page](#rewriting-the-title).

### Severity

Dash0 check rules fail in two degrees, `degraded` and `critical`, and the one that applies is in `data.issue.status`. Spike does not read it today, so a Dash0 incident arrives without a severity whichever degree failed.

Set it with an [alert routing rule](../alerts/alert-rules.md) instead. Add an **Incident details** condition on the key `data.issue.status`, and give each degree the action you want:

| Condition | Action |
| --- | --- |
| `data.issue.status` equals `critical` | **Mark severity as** SEV1, and load a wider escalation policy if you have one |
| `data.issue.status` equals `degraded` | **Mark severity as** SEV2, or **Ignore incident** to keep those out of Spike entirely |

{% hint style="info" %}
The status travels with every notification for an issue, so a `degraded` check that later turns `critical` sends `critical` on its next notification. The rule runs when the incident is created, so the severity reflects the degree that opened it and does not move afterwards.
{% endhint %}

## Prerequisites

* A Dash0 organization with permission to manage notification channels in **Settings**
* At least one check rule to attach the channel to
* A Dash0 integration in Spike and its webhook URL

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Dash0**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Add a Webhook notification channel in Dash0

In Dash0, go to **Settings → Notification channels → Add** and pick **Webhook**. Fill in:

* **Name** — something you will recognise in the check rule editor, for example `Spike - payments on-call`.
* **URL** — the webhook URL you copied in Step 1.
* **Additional HTTP headers** — leave empty. The token in the URL is what authenticates the request to Spike, so there is nothing else to send.
* **Rate limit** — optional. It throttles how often this channel repeats a notification for the same issue. Spike groups repeats onto the open incident and does not page again, so you can leave it at the Dash0 default; lowering it only makes the incident timeline quieter.

Save the channel. A channel can be disabled without deleting it, which is the easiest way to mute Spike during a planned migration.

## Step 3 — Attach the channel to your check rules

Dash0 gives you two ways to route issues to the channel, and they can be combined:

{% tabs %}
{% tab title="Attach to a check rule" %}
Open a check rule, go to its **Notifications** section, and select the Spike channel. Repeat for every rule that should page on-call.

This is the explicit route. Use it when only a handful of rules deserve a page.
{% endtab %}

{% tab title="Attach by label" %}
On the channel, set up label-based routing so any check rule whose labels match is delivered to Spike. Filters are written as label key, operator and value, for example `team.name is sre` and `deployment.environment.name is production`. Conditions inside one group are ANDed, and each group is ORed with the others.

This is the route to use when rules are created by teams or by code and you do not want to remember to tick a box each time.
{% endtab %}
{% endtabs %}

### Only page on critical

A check rule can fail as `degraded` before it fails as `critical`. If you only want Spike involved for the second, add the trigger `dash0.failed_check.max_status=critical` where the channel is attached. Dash0 then holds back the `degraded` notifications and Spike never sees them.

Leave the filter off if you would rather have every failure in Spike and sort it out there — a `degraded` issue opens an incident like any other, and the [alert routing rule](../alerts/alert-rules.md) above can downgrade or drop those without anyone touching Dash0.

## Step 4 — Send a test notification

Back in **Settings → Notification channels**, find the channel and choose **Send test notification**. A test incident appears in Spike within a few seconds. Resolve it by hand — a test notification is a one-off, so nothing arrives afterwards to resolve it for you.

An incident on the right service, with the right escalation policy attached, means Dash0 can reach Spike and the wiring is done.

## Managing the channel as code

Dash0's Kubernetes operator creates notification channels from a `Dash0NotificationChannel` custom resource, so the channel can live next to the check rules it serves:

```yaml
apiVersion: operator.dash0.com/v1alpha1
kind: Dash0NotificationChannel
metadata:
  name: spike-oncall
  namespace: monitoring
spec:
  content: |
    kind: Dash0NotificationChannel
    metadata:
      name: Spike - payments on-call
    spec:
      type: webhook
      config:
        url: "https://hooks.spike.sh/<your-token>/push-events"
      frequency: 10m
      routing:
        filters:
          - - key: team.name
              operator: is
              value: payments
            - key: deployment.environment.name
              operator: is
              value: production
```

The operator syncs the channel to Dash0 and reports back on the custom resource. `frequency` is the reminder interval for an issue that stays failing; set it to `0s` to send one notification and nothing more. `routing` is the label-based attachment from Step 3, and can be left out if you attach the channel to check rules individually.

{% hint style="warning" %}
The webhook URL is a credential — anyone holding it can open incidents on your service. Keep the custom resource out of a public repository, or template the URL in from a secret at deploy time.
{% endhint %}

Terraform users can hand the same YAML to the Dash0 provider:

```hcl
resource "dash0_notification_channel" "spike_oncall" {
  notification_channel_yaml = file("${path.module}/channels/spike-oncall.yaml")
}
```

## Payload reference

Dash0 posts a fixed JSON body. These are the fields Dash0 documents, and the ones Spike's behaviour depends on:

| Field | What it is |
| --- | --- |
| `type` | Where the issue is in its lifecycle: `alert.ongoing`, `alert.resolved`, `alert.superseded` or `alert.closed` |
| `data.issue.id` | Unique ID for this specific issue |
| `data.issue.issueIdentifier` | Identifier for the combination of check rule and resource. Stable across issue instances, which is what Spike groups on |
| `data.issue.checkrule.id` | Unique ID of the check rule that raised the issue |
| `data.issue.checkrule.version` | Version of that check rule. This is what changes when an issue is superseded |

The body carries more than this — the check rule name, a summary, the failing status, a link back to the issue in Dash0 and the issue's labels are all in there. Spike reads the rule name and the labels for the incident title and keeps the rest on the incident page. The full body as Dash0 sent it is stored on the incident, so the first notification you receive shows you exactly what your Dash0 organization sends.

### Label values

Labels arrive in OpenTelemetry's `AnyValue` shape: the value is an object that names its own type rather than a bare value.

```json
{ "key": "service_name", "value": { "stringValue": "payments-api" } }
```

Spike reads `stringValue`, `intValue`, `doubleValue` and `boolValue`, and also accepts a plain string, which is the shape a check rule's own labels use.

Note the underscore in `service_name`. A label that comes out of a query keeps the name the query gave it, so the same concept reaches Spike as `service_name` from one rule and as the OpenTelemetry `service.name` from another. Both are in the list under [Incident titles](#incident-titles), so either one names the service.

### Rewriting the title

Point a [Title Remapper](../alerts/title-remapper.md) at the Dash0 integration to build your own title out of that body. A remapper replaces the whole title, so the `Check failing:` prefix and the ` on {service}` suffix go with it. This one prefers the issue summary and falls back to the check rule id, which is always there:

```
{{#if data.issue.summary}}
  {{data.issue.summary}}
{{else}}
  Dash0 check {{data.issue.checkrule.id}} failing
{{/if}}
```

Open the remapper against a real incident first — the preview shows the payload your check rules actually produce, which is the quickest way to find the field you want.

{% hint style="warning" %}
A summary moves as an issue develops, so remapping onto one gives an incident a title that changes under it. Prefer fields that are fixed for the life of the issue, which is why the built-in title uses the rule name and the service.
{% endhint %}

## Things worth knowing

* **One incident per check rule and resource.** Two resources failing the same check rule are two issues in Dash0, so they are two incidents in Spike. That is usually what you want when they page different people through [alert rules](../alerts/alert-rules.md).
* **Editing a failing check rule does not close its incident.** Dash0 supersedes the issue instance, Spike keeps the one incident open, and the notifications from the new version of the rule join it. Nobody is paged twice for one rule edit.
* **A resolution with nothing open is dropped.** If you resolved the incident in Spike before the check recovered, the `alert.resolved` that follows is ignored rather than reopening anything.
* **Reminders do not page twice.** Dash0's `frequency` re-notifies while an issue is failing. Those land as events on the open incident.
* **The test notification does not auto-resolve.** It is a single synthetic notification with no recovery behind it.

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Check the channel is enabled in **Settings → Notification channels**, then use **Send test notification** to take the check rules out of the picture. If the test arrives and real failures do not, the channel is not attached to the rule that is failing — open the rule and confirm it lists the Spike channel under **Notifications**, or that its labels match the channel's routing filters.

</details>

<details>

<summary>Only some failures reach Spike</summary>

The `dash0.failed_check.max_status=critical` trigger holds back `degraded` notifications. Remove it where the channel is attached if you want those too. A channel rate limit can also be suppressing repeats, though the first notification for an issue always goes out.

</details>

<details>

<summary>Incidents open but never resolve</summary>

Spike resolves on `alert.resolved` and `alert.closed` only. `alert.superseded` deliberately does not resolve, because the check can still be failing when Dash0 replaces the issue instance. If an incident is still open after the check recovered in Dash0, check whether it was opened by a different integration or entered by hand — Spike only resolves the incident that the same `issueIdentifier` opened.

</details>

<details>

<summary>Two incidents from one check rule have the same title</summary>

A title only names a service when the payload carries one of the labels listed under [Incident titles](#incident-titles). When one rule fails for two resources and neither notification carries one of them, both incidents read `Check failing: {rule name}` and are hard to tell apart. Add a label from that list — `service.name` is the OpenTelemetry standard — to the check rule or to the resources it watches.

They are still two separate incidents either way. Grouping is by `issueIdentifier` and never by title, so identical titles do not merge two problems into one.

</details>
