---
description: >-
  Send StarTree ThirdEye anomaly reports to Spike so anomalies detected on your Apache Pinot data page your on-call rotation by phone, SMS, Slack or Teams, and the incident resolves when every anomaly in the subscription group has completed.
---

# Integrate Spike with StarTree ThirdEye

[StarTree ThirdEye](https://startree.ai/products/startree-thirdeye/) runs anomaly detection on Apache Pinot. Alerts watch a metric, ThirdEye records an anomaly when the metric leaves its baseline, and a **subscription group** decides who hears about it: the group lists the alerts it covers, carries a cron that says how often to look, and one of its notification channels is a **webhook**.

Point that webhook at a Spike integration URL and every run of the group's cron posts its anomalies to Spike. The first run that finds something opens an incident and pages your escalation policy, later runs land on that same incident instead of paging again, and the incident resolves itself once ThirdEye reports that the anomalies have completed.

Nothing is installed anywhere. One subscription group in ThirdEye, one URL, and the whole lifecycle flows.

{% hint style="warning" %}
**Check that your ThirdEye offers the `webhook` notification type before you plan around it.** StarTree documents four notification channels for a subscription group — email, Slack, PagerDuty and webhook — and this guide uses the webhook one. It is the StarTree Cloud documentation that describes it; the open-source ThirdEye distribution ships only the email notification plugin (`thirdeye-notification-email` is the only notification plugin in the community repository), so a self-hosted open-source build may not accept `"type": "webhook"` at all.

If a subscription group with a webhook spec is rejected, or saves but never posts anything, that is the thing to check first — with StarTree, or by looking at which notification plugins your deployment loaded. On a build with no webhook channel, use ThirdEye's email notification into [Spike's email integration](integrate-spike-with-email.md) instead.
{% endhint %}

## One report per subscription group, not one per anomaly

A run of the group's cron posts **one** request carrying **every** anomaly that run found. Spike turns one request into one incident, so the unit of identity here is the subscription group, not the individual anomaly: three anomalies delivered together are one incident with all three on it, not three incidents.

That is worth knowing before you design your groups, because it decides how readable your pages are. See [Keep one subscription group per Spike integration](#keep-one-subscription-group-per-spike-integration).

### What Spike does with each report

Every report carries `anomalyReports`, the anomalies that are open, and — once you turn resolution notifications on — `completedAnomalyReports`, the ones that have finished. Spike reads both:

| The report carries | What happens in Spike |
| --- | --- |
| `anomalyReports` with at least one anomaly | Opens an incident for the subscription group and pages your escalation policy, or adds an event to the incident already open for that group |
| `anomalyReports` empty and `completedAnomalyReports` with at least one anomaly | Auto-resolves the open incident. Dropped when nothing is open |
| Both empty | Nothing. The cron ran and found nothing, so there is nothing to report |

A report where some anomalies have completed and others are still open **does not resolve the incident**. It still lists the open ones under `anomalyReports`, so Spike treats it as an update: the incident stays open, the completions are recorded on it, and nobody is paged a second time. One of three anomalies clearing is not the problem being over.

### Incident identity

Spike identifies the incident by `subscriptionGroup.id`, the numeric id ThirdEye gives the group. Every later run of that group's cron carries the same id, so an anomaly that persists across ten runs pages your team once.

Identity is the group and not the anomaly, and it is not the title either. The anomalies in a group's report change from run to run, which means the title changes too — one run reads `3 anomalies in checkout-latency-anomalies` and the next reads `2 anomalies in checkout-latency-anomalies`. Both land on the one incident, because the group id has not moved.

{% hint style="info" %}
A completion report that arrives with no matching open incident is dropped rather than turned into anything. That happens when the incident was already resolved in Spike, by hand or by a [resolve timer](../incidents/resolve-timer.md). Resolving an incident in Spike does not touch the anomalies in ThirdEye.
{% endhint %}

## Incident titles

Titles name the subscription group and how much is wrong with it, so they read cleanly when Spike reads them out on a phone call. A report carrying exactly one anomaly names that anomaly's metric instead of counting it:

| The report | Title in Spike |
| --- | --- |
| One anomaly, on `checkout_p99_latency_ms` | `checkout_p99_latency_ms anomaly in checkout-latency-anomalies` |
| Three anomalies | `3 anomalies in checkout-latency-anomalies` |
| Two open, one newly completed | `2 anomalies in checkout-latency-anomalies` |
| One anomaly, carrying no metric name | `1 anomaly in checkout-latency-anomalies` |
| Two anomalies, all completed | `2 anomalies completed in checkout-latency-anomalies` |
| One completed anomaly, on `checkout_p99_latency_ms` | `checkout_p99_latency_ms anomaly completed in checkout-latency-anomalies` |
| Nothing open and nothing completed | `No open anomalies in checkout-latency-anomalies` |

Open anomalies always decide the title. A report with two open and one completed is titled by the two that are still firing, because that is what somebody being woken up needs to know.

Everything else stays in the payload and shows up on the incident page: the anomaly ids, each anomaly's link into ThirdEye, the current and baseline values, the detection window, the cron and the alerts the group covers. Titles are capped at 200 characters.

{% hint style="info" %}
Give your subscription groups names a responder can read cold. The group's name is most of the title, so `checkout-latency-anomalies` pages far better than `sg-42` or `data-team-group-3`. A group with no name at all falls back to `{metric} anomaly detected by ThirdEye`.
{% endhint %}

## Severity

Spike does not set a severity on a ThirdEye incident. ThirdEye's report says what is anomalous, not how much you care, so the judgement is yours to make with [alert routing rules](../alerts/alert-rules.md): match on the group name or a metric and set SEV1, route the incident to another service or escalation policy, or suppress it entirely. Read more about [priority and severity](../incidents/priority-and-severity.md).

## Prerequisites

* A ThirdEye deployment whose subscription groups offer the `webhook` notification type — see the note at the top of this page
* At least one ThirdEye alert that is detecting anomalies, and its alert id
* A StarTree ThirdEye integration in Spike and its webhook URL
* Outbound HTTPS from ThirdEye to `hooks.spike.sh`

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → StarTree ThirdEye**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Create the subscription group in ThirdEye

{% tabs %}
{% tab title="In the ThirdEye UI" %}
1. **Start a subscription group:**
   In ThirdEye, click **Create** and choose **Subscription Group**.

2. **Name the group:**
   Use a name a woken-up responder can read, for example `checkout-latency-anomalies`. It becomes most of the incident title.

3. **Add the alerts it covers:**
   Select the alerts whose anomalies should page this rotation. Keep the list tight — see the recommendation below.

4. **Set the cron:**
   The cron decides how often ThirdEye looks for anomalies to report, in Quartz's six-or-seven-field format. `0 */15 * * * ?` is every fifteen minutes, which is a reasonable starting point for a paging group.

5. **Add a webhook channel:**
   Choose the **Webhook** notification type and paste the Spike URL from Step 1 as the webhook URL.

6. **Turn on resolution notifications:**
   Switch on notifying about resolved anomalies. Without it ThirdEye never tells Spike that anomalies have finished, and incidents never auto-resolve. In the API this is `notifyResolvedAnomalies`; see the next tab.

7. **Save the group.**
{% endtab %}

{% tab title="Through the ThirdEye API" %}
`POST /api/subscription-groups` with a body like this, replacing the URL with the one from Step 1 and the alert id with your own:

```json
[
  {
    "name": "checkout-latency-anomalies",
    "cron": "0 */15 * * * ?",
    "alertAssociations": [
      { "alert": { "id": 101 } }
    ],
    "specs": [
      {
        "type": "webhook",
        "params": {
          "url": "https://hooks.spike.sh/<your-token>/push-events",
          "notifyResolvedAnomalies": true
        }
      }
    ]
  }
]
```

The response carries the group's `id`. That id is what Spike groups incidents on, so it is worth keeping next to the integration in your own notes.

The same call with a `PUT` and the `id` included updates an existing group, which is how you add the Spike webhook to a group that already notifies over email or Slack.
{% endtab %}
{% endtabs %}

{% hint style="warning" %}
**`notifyResolvedAnomalies` is what makes auto-resolve work.** Without it ThirdEye reports anomalies as they open and stays silent when they close, so Spike never learns the metric recovered and the incident stays open until somebody resolves it.

StarTree documents the flag inside a notification spec's `params`, alongside the webhook URL, which is where the example above puts it. If your ThirdEye takes the group but completion reports never arrive, check where your version expects the flag before assuming the integration is broken — and until it is sorted, turn on **Resolve by Timer** on the Spike integration so anomaly incidents do not pile up.
{% endhint %}

{% content-ref url="../incidents/resolve-timer.md" %}
[resolve-timer.md](../incidents/resolve-timer.md)
{% endcontent-ref %}

## Step 3 — Confirm it end to end

ThirdEye has no "send test notification" button for a webhook, so the first real anomaly is the test. The quickest way to force one is an alert on a metric you can move on demand, with a sensitivity tight enough that ordinary variation trips it.

Watch for three things, in this order:

1. The next run of the group's cron opens an incident in Spike, titled with the metric or the anomaly count and the group's name, on the service you attached, escalating through your policy.
2. A later run while the anomaly is still open adds an event to that same incident without paging again.
3. Once the metric recovers and ThirdEye marks the anomalies completed, the following run resolves the incident.

If the first step works and the third never does, `notifyResolvedAnomalies` is the thing to check.

## Payload reference

A report with one open anomaly, which opens the incident:

```json
{
  "subscriptionGroup": {
    "id": 42,
    "name": "checkout-latency-anomalies",
    "cron": "0 */15 * * * ?",
    "alertAssociations": [{ "alertId": 101 }]
  },
  "anomalyReports": [
    {
      "anomaly": {
        "id": 9001,
        "startTime": 1758700500000,
        "endTime": 1758700800000,
        "avgCurrentVal": 842.3,
        "avgBaselineVal": 310.5
      },
      "url": "https://thirdeye.acme.internal/anomalies/9001",
      "data": { "metric": "checkout_p99_latency_ms" }
    }
  ],
  "report": { "startTime": 1758700500000, "endTime": 1758700800000 }
}
```

Title: `checkout_p99_latency_ms anomaly in checkout-latency-anomalies`

A report where that anomaly has completed and nothing else is open, which resolves the incident:

```json
{
  "subscriptionGroup": {
    "id": 42,
    "name": "checkout-latency-anomalies",
    "cron": "0 */15 * * * ?",
    "alertAssociations": [{ "alertId": 101 }]
  },
  "anomalyReports": [],
  "completedAnomalyReports": [
    {
      "anomaly": {
        "id": 9001,
        "startTime": 1758700500000,
        "endTime": 1758701400000,
        "avgCurrentVal": 320.1,
        "avgBaselineVal": 310.5
      },
      "url": "https://thirdeye.acme.internal/anomalies/9001",
      "data": { "metric": "checkout_p99_latency_ms" }
    }
  ],
  "report": { "startTime": 1758700800000, "endTime": 1758701400000 }
}
```

Title: `checkout_p99_latency_ms anomaly completed in checkout-latency-anomalies`

Both arrays carry the same shape, and ThirdEye fills far more of it than the fields above: `anomaly` also carries the alert and metric it came from, the anomaly's score and weight and when it was created, and `data` carries the current and baseline values, the lift, the dimensions, the detection function and the anomaly's own URL. Spike keeps the whole body on the incident, so every field ThirdEye sends is available to [alert routing rules](../alerts/alert-rules.md) and the [Title Remapper](../alerts/title-remapper.md).

### Title Remapper sample

A [Title Remapper](../alerts/title-remapper.md) on the ThirdEye integration replaces the default title with one you write against the payload, which is how you fold in the dataset or the team that owns the group:

```handlebars
{{data.subscriptionGroup.name}}: {{data.anomalyReports.[0].data.metric}} off baseline
```

Output: `checkout-latency-anomalies: checkout_p99_latency_ms off baseline`

Reading a field that moves between runs is safe here, unlike on integrations that group by title: grouping is on `subscriptionGroup.id`, so a remapper built on the first anomaly's metric still lands every run of the group on the one incident. Do keep the group's name in the title, though — with several ThirdEye integrations in a Spike account, a title that only names a metric leaves a responder guessing which rotation owns it.

Avoid loops. A remapper cannot summarise a whole `anomalyReports` array, which is exactly why the built-in title counts the anomalies rather than listing them.

## Keep one subscription group per Spike integration

A subscription group is the grouping key, so the group decides what one incident means. One group per Spike integration, covering alerts that page the same rotation about the same system, keeps incidents meaningful:

* **A tight group reads well.** `2 anomalies in checkout-latency-anomalies` tells a responder where to look before they have opened anything.
* **A catch-all group does not.** One group covering every alert in the account produces `47 anomalies in all-alerts`, on one incident, paging one rotation about problems in four unrelated systems. It also means the incident cannot resolve until every anomaly in the account has completed.
* **Split by rotation, not by metric.** Two groups pointed at two Spike integrations, each with its own service and escalation policy, is how the data-ops rotation stops hearing about the ingestion team's anomalies.

Several subscription groups can also point at the same Spike integration if you want them on one service — they stay separate incidents, because their ids differ.

## Things worth knowing

* **The cron is the paging frequency.** ThirdEye notifies on the group's schedule, not the instant an anomaly is detected, so a group on `0 0 * * * ?` can sit on an anomaly for the best part of an hour before Spike hears about it. Tighten the cron on groups that page a human.
* **One request, one incident, however many anomalies.** Anomalies from different alerts in the same group arrive together and share the incident. If two alerts in a group should page different people, they belong in two groups.
* **Resolution is judged at the group level.** The incident resolves when the report shows nothing open, not when the anomaly that opened it completes. This is deliberate: while anything in the group is still anomalous, somebody should still be working on it.
* **The URL is the credential.** ThirdEye's webhook spec carries a `hashKey` field whose purpose is not documented as request signing, and Spike verifies no signature on ThirdEye deliveries. Treat the webhook URL like a password, and if it leaks, archive the integration and create a new one.
* **`startree-thirdeye` also works.** If you are scripting against Spike and reach for the longer spelling of the slug, it routes to this same integration.

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Work backwards from the group. Confirm the group actually has anomalies to report — a group whose alerts have detected nothing posts nothing, and both-arrays-empty reports are dropped rather than shown. Then confirm the cron has run since you saved the group. Then confirm the webhook URL is the full `https://hooks.spike.sh/<your-token>/push-events` with nothing appended, and that the integration has not been archived in Spike.

If all of that is right, the deployment may not have a webhook notification channel at all. See the note at the top of this page, and check whether the same group notifies successfully over email.

</details>

<details>

<summary>Incidents open but never resolve</summary>

`notifyResolvedAnomalies` is off, or set somewhere your ThirdEye version does not read. Without completion reports there is nothing for Spike to resolve on. Confirm it by looking at a ThirdEye incident in Spike after the metric recovered: if the only events on it carry a non-empty `anomalyReports`, ThirdEye has never sent a completion.

Resolution also needs the report to show **nothing** open. A group where one anomaly completed but two are still firing stays open on purpose. And an anomaly that ThirdEye never marks completed — because the metric never came back to baseline — keeps the incident open, correctly.

Turn on **Resolve by Timer** on the integration if you want a backstop.

</details>

<details>

<summary>Every run opens a new incident</summary>

Check `subscriptionGroup.id` on two of the incidents. Different ids mean they are different groups, which are different incidents by design. The same id on both means the earlier incident was no longer open when the second report arrived — resolved by hand, by a [resolve timer](../incidents/resolve-timer.md) that is shorter than the group's cron, or by a completion report — and Spike only joins an incident that is still open. Raise the resolve timer above the cron interval.

A report that names no subscription group at all has nothing to group on and falls back to matching on the title, which is fragile because the title moves with the anomaly count. If your incidents carry no group id, the reports are not coming from a ThirdEye subscription group.

</details>

<details>

<summary>One incident is paging about several unrelated systems</summary>

The subscription group covers too much. Split it: one group per rotation, each pointed at its own Spike integration with its own service and escalation policy. See [Keep one subscription group per Spike integration](#keep-one-subscription-group-per-spike-integration).

</details>

<details>

<summary>The title counts anomalies instead of naming them</summary>

Expected once a report carries more than one. A title that listed every metric in a 47-anomaly report would be unreadable on a phone call and truncated everywhere else, so the count is the title and the anomalies — each with its link into ThirdEye — are on the incident page. The single-anomaly case does name its metric.

</details>

<details>

<summary>Severity is always unset</summary>

Expected. ThirdEye does not grade its anomalies and Spike does not invent a grade. Set severity with an [alert routing rule](../alerts/alert-rules.md) matched on the group name or the metric.

</details>

Disclaimer: These integration instructions are offered independently by Spike.sh, and Spike.sh is not affiliated with nor a partner of StarTree, Inc.
