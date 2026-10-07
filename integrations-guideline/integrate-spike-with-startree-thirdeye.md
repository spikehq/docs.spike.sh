---
description: >-
  Send StarTree ThirdEye anomalies to Spike so an anomaly a subscription group reports pages your on-call rotation by phone, SMS, Slack or Teams, and resolves its incident when ThirdEye reports the anomaly finished.
---

# Integrate Spike with StarTree ThirdEye

[StarTree ThirdEye](https://startree.ai/products/startree-thirdeye) is anomaly detection and root-cause analysis on top of Apache Pinot. You write an **alert** — a detection function over one metric — group your alerts into a **subscription group**, and give the group a notification spec. The group's cron then runs on its own schedule and reports what the alerts found.

One of those notification specs is a **webhook**. Point it at a Spike integration URL and an anomaly pages your on-call rotation the moment ThirdEye raises it, the later cron runs that repeat the same anomaly land on the incident already open instead of paging again, and the incident resolves itself on the run where ThirdEye reports the anomaly finished.

Nothing is installed anywhere. One webhook spec on one subscription group covers every alert that group watches.

## What Spike does with each notification

ThirdEye posts **one envelope per cron run of the subscription group**, not one per anomaly. Two arrays in that envelope decide what Spike does with it:

| What the envelope carries | What it means in ThirdEye | What happens in Spike |
| --- | --- | --- |
| `anomalyReports` with one or more reports | The group's alerts found these anomalies live on this run | Opens an incident and pages your escalation policy. A later run that reports the same anomaly again lands on that incident without paging |
| `completedAnomalyReports`, with `anomalyReports` empty or absent | These anomalies finished since the previous run | Auto-resolves the open incident they belong to. Dropped when nothing is open |
| Neither array | ThirdEye found nothing, or Spike could not read the body | Opens one incident titled `StarTree ThirdEye anomaly with no details` |

{% hint style="info" %}
A recovery never opens an incident. An all-clear that arrives with nothing open — because the opening run was never delivered, or because the incident was already resolved in Spike — is dropped rather than turned into an incident, since paging somebody about an all-clear is worse than losing it.

Resolving an incident in Spike does not touch the anomaly in ThirdEye. Let ThirdEye report the anomaly finished and let the webhook resolve the incident to keep the two sides in step.
{% endhint %}

### Incident identity

Spike identifies the incident by the ThirdEye **anomaly id** — `anomalyReports[].anomaly.id`, the numeric id ThirdEye gives each finding, falling back to `anomalyReports[].data.anomalyId`, the same id as a string. ThirdEye repeats a live anomaly's whole report under that id on every cron run until it finishes, and reports it once more as completed, so one anomaly's whole life reads as one Spike incident: it pages once, every later run is recorded on it, and the completed report closes it.

Identity is the anomaly, not the alert and not the metric. The same alert finding a second anomaly later is a second anomaly id, so it is a second incident — which is what you want, since it is a second thing to look at.

{% hint style="info" %}
A report that carries neither id — no `anomaly.id` and an empty `data.anomalyId` — is matched on its title instead, which is why that one shape is titled without any readings in it. See [Incident title](#incident-title).
{% endhint %}

### A run that finds several anomalies

One cron run of one group can report several anomalies at once, and that run is **one incident**, titled for the batch. Every anomaly id in the run is remembered on it, so a later run that reports any one of them — on its own, or as completed — lands on that same incident. Two of three anomalies finishing is enough to resolve it; the third keeps its place on the incident's event list.

If you would rather have one incident per anomaly, split the alerts across several subscription groups, each with its own Spike integration, or give the group a cron tight enough that its runs rarely find more than one thing.

## Incident title

ThirdEye's envelope carries no sentence about the fault — there is no `summary`, `description`, `message` or `reason` in it — so Spike builds the title out of what the report does carry: the metric, which way it moved and by how much, the two readings, and last the slice the anomaly is in.

| What the report carries | The title |
| --- | --- |
| Both averages, and a change worth a percentage | `checkout_p99_latency_ms up 171% (842 vs 311 expected) in checkout-latency-anomalies` |
| Both averages, but no usable percentage — an expected value of zero, or a pair a hair apart | `checkout_p99_latency_ms up to 42 (0 expected) in checkout-latency-anomalies` |
| Only the observed average, with nothing to compare it against | `checkout_p99_latency_ms anomaly at 842 in checkout-latency-anomalies` |
| Only ThirdEye's own rendered percentage, with no pair behind it | `checkout_p99_latency_ms up 191% in checkout-latency-anomalies` |
| No readable anomaly id, or nothing numeric anywhere in the report | `checkout_queue_depth anomaly in checkout-latency-anomalies` |
| Several anomalies in one run | `3 anomalies in checkout-oncall: checkout_p99_latency_ms, checkout_error_rate +1 more` |
| An anomaly that finished | `checkout_p99_latency_ms back to normal in checkout-latency-anomalies` |
| A run where several finished | `2 anomalies back to normal in checkout-oncall: checkout_p99_latency_ms, checkout_error_rate` |
| No metric named anywhere in the report | `Deviation anomaly up 171% (842 vs 311 expected) in checkout-latency-anomalies` |
| Nothing readable at all | `StarTree ThirdEye anomaly with no details` |

**The metric** is read from `data.metric`, then `anomaly.metric.name`, then `anomaly.metadata.metric.name` — whichever ThirdEye filled in. When it named no metric at all, its own word for the kind of anomaly stands in for it (`data.anomalyType`, as `Deviation anomaly`), and the vendor's name behind that, so no title ever opens on a bare number.

**The "where"** is the slice the anomaly is in, and it is the last thing in the title because it is what tells two anomalies on one metric apart. It is read from `data.dimensions` (joined with `, `), then `anomaly.enumerationItem.name`, then `data.function` — the name of the alert — then `anomaly.metadata.dataset.name`, then `subscriptionGroup.name`. A dimension-exploration alert therefore titles its anomalies by slice:

```
checkout_p99_latency_ms up 171% (1,680 vs 620 expected) in US-West, mobile
```

**The direction and the percentage are computed by Spike** from the numeric `anomaly.avgCurrentVal` and `anomaly.avgBaselineVal`. ThirdEye's own rendered strings — `data.lift` (`"+170.74 %"`), `data.currentVal` (`"842.00"`) and `data.baselineVal` — are read only as a fallback, and never shown verbatim, because their formatting is not consistent across ThirdEye versions.

Titles are capped at 200 characters and carry no anomaly ids, no `url` and no timestamps. Those are all on the incident page.

{% hint style="info" %}
**Why the readings are allowed to be in the title here.** The readings move between cron runs — the same anomaly arrives as `up 171% (842 vs 311 expected)` and then as `up 191% (905 vs 311 expected)` — and that is fine, because Spike matches on the anomaly id and not on the title.

The one exception is a report where neither id is readable. Spike then has nothing but the title to match on, so that shape is titled `{metric} anomaly in {where}`, identical on every run, and the runs still group onto one incident. A recovery carries the same plain line alongside its own `back to normal` title for exactly this reason.
{% endhint %}

Use a [Title Remapper](../alerts/title-remapper.md) if your team reads anomalies by alert and dataset rather than by metric and movement:

```handlebars
{{data.body.anomalyReports.[0].data.function}} — {{data.body.anomalyReports.[0].data.metric}} on {{data.body.anomalyReports.[0].anomaly.metadata.dataset.name}}
```

## Severity

Spike does not read a severity from the ThirdEye payload. ThirdEye's envelope carries no severity on the notification — `anomaly.severity` exists on its API but is not in what the webhook posts — so incidents open at your integration's default.

Write an [alert rule](../alerts/alert-rules.md) if you want some anomalies louder than others. The alert name (`data.function`), the dataset, the metric and the dimensions are all on the incident, so a rule can set severity from any of them, route the incident to another service or escalation policy, or suppress it. Read more about [priority and severity](../incidents/priority-and-severity.md).

## Prerequisites

* A StarTree ThirdEye instance with at least one alert you want to be paged for
* Permission to create or edit a subscription group, and access to the ThirdEye API to put the webhook spec on it
* A StarTree ThirdEye integration in Spike and its webhook URL
* Nothing to open on your own network. ThirdEye calls out to Spike

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → StarTree ThirdEye**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Create the subscription group in ThirdEye

A subscription group is what decides which alerts notify, and how often. In the ThirdEye UI:

1. Click **Create**, then **Subscription Group**.
2. Type in the **Name of the Subscription Group** — something your team will recognise, for example `checkout-oncall`. It is required, and Spike uses it in a batch title.
3. Enter the schedule in cron job style. ThirdEye's own example, `0 */5 * * * ?`, runs the group every five minutes.
4. In the **All alerts** section, select the alerts this group should notify for by clicking **->** next to each alert name. A group with no alerts associated to it reports nothing.
5. Click **Next** and then **Finish**.

You can leave **Subscribe Emails** empty if Spike is the only destination you want, or fill it in and keep your existing email notifications alongside the webhook.

## Step 3 — Point a webhook spec at Spike

The webhook channel is configured as a notification **spec** on the subscription group, through the ThirdEye API. The spec Spike needs is:

```json
{
  "type": "webhook",
  "params": {
    "url": "https://hooks.spike.sh/<your-token>/push-events",
    "notifyResolvedAnomalies": true
  }
}
```

Both params matter:

* **`url`** — required. The webhook URL from Step 1, exactly as Spike gave it to you, with nothing appended.
* **`notifyResolvedAnomalies`** — set it to `true` if you want incidents to resolve themselves. This is the switch that makes ThirdEye send `completedAnomalyReports`, and without it ThirdEye only ever tells Spike about anomalies starting. Anomaly-resolution notification is supported for webhook and Slack notifications.

To add the spec to the group you created in Step 2, fetch the group, add the spec to its `specs` array, and send the whole entity back — ThirdEye's `PUT` replaces the entity, so send everything the `GET` returned:

```bash
curl -H 'Authorization: Bearer <your-thirdeye-api-token>' \
  '<your-thirdeye-url>/api/subscription-groups/<id>'

curl -X PUT '<your-thirdeye-url>/api/subscription-groups' \
  -H 'Authorization: Bearer <your-thirdeye-api-token>' \
  -H 'Content-Type: application/json' \
  -d '[{ ...the group as GET returned it, with the webhook spec added to "specs"... }]'
```

Or create the whole group in one call with `POST /api/subscription-groups`. This is the group that sends the envelopes in the [payload reference](#payload-reference) below:

```json
[
  {
    "name": "checkout-oncall",
    "cron": "0 */5 * * * ?",
    "alertAssociations": [
      { "alert": { "id": 136062 } }
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

{% hint style="info" %}
ThirdEye's interactive API docs are at `<your-thirdeye-url>/swagger`, which is the easiest place to try these two calls and to find the id of the group you created. ThirdEye's own docs describe the bearer token as the one its frontend uses, which you can read in your browser's devtools; on StarTree Cloud, use an API token instead.

One subscription group supports several specs, so a group can keep its email or Slack notifications and gain the Spike webhook without losing anything.
{% endhint %}

{% hint style="warning" %}
Treat the webhook URL like a password — it is the credential. If it leaks, archive the integration in Spike, create a new one, and update the spec's `url`.
{% endhint %}

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

## Step 4 — Confirm it end to end

ThirdEye has no "send a sample notification" button, so the first anomaly one of the group's alerts finds is the test. Watch for the three moments:

1. The cron run that finds the anomaly opens an incident in Spike, titled with the metric and the movement, on the service you attached, escalating through your policy.
2. The next run, while the anomaly is still live, is recorded on that same incident without paging again.
3. The run where ThirdEye reports the anomaly finished resolves the incident, with `back to normal` on the event list.

If the first moment works and the third does not, `notifyResolvedAnomalies` is the thing to check: without it ThirdEye never sends a completed report, so nothing can close the incident.

{% hint style="info" %}
A [resolve timer](../incidents/resolve-timer.md) on the integration is a sensible backstop while you are confirming auto-resolution, not a replacement for it.
{% endhint %}

## Payload reference

ThirdEye sends its own payload and there is nothing to template, so this section is what Spike expects, and what [alert rules](../alerts/alert-rules.md) and the [Title Remapper](../alerts/title-remapper.md) can read as `data.body.<field>`.

Every envelope has the same four parts: the `subscriptionGroup` whose cron sent it, the `anomalyReports` the run found, `completedAnomalyReports` on the runs where something finished, and a `report` summary of the run's own window.

A run that found one anomaly, which opens the incident:

```json
{
  "subscriptionGroup": {
    "id": 188059,
    "name": "checkout-oncall",
    "alertAssociations": [
      {
        "alert": {
          "id": 136062
        }
      }
    ],
    "cron": "0 */5 * * * ?",
    "specs": [
      {
        "type": "webhook",
        "params": {
          "url": "https://hooks.spike.sh/<spike-integration-token>/push-events",
          "notifyResolvedAnomalies": true
        }
      }
    ]
  },
  "anomalyReports": [
    {
      "anomaly": {
        "id": 188180,
        "startTime": 1759824000000,
        "endTime": 1759827600000,
        "avgCurrentVal": 842,
        "avgBaselineVal": 311,
        "score": 0,
        "weight": 0,
        "impactToGlobal": 0,
        "sourceType": "DEFAULT_ANOMALY_DETECTION",
        "created": 1759827723451,
        "notified": true,
        "alert": {
          "id": 136062
        },
        "metric": {
          "name": "checkout_p99_latency_ms"
        },
        "metadata": {
          "dataset": {
            "name": "checkout_events"
          },
          "metric": {
            "name": "checkout_p99_latency_ms"
          }
        }
      },
      "url": "https://acme.startree.cloud/anomalies/188180",
      "data": {
        "metric": "checkout_p99_latency_ms",
        "startDateTime": "Oct 07, 2025 08:00",
        "lift": "+170.74 %",
        "feedback": "Not Resolved",
        "anomalyId": "188180",
        "anomalyURL": "https://acme.startree.cloud/anomalies/",
        "currentVal": "842.00",
        "baselineVal": "311.00",
        "dimensions": [],
        "swi": "0.00 %",
        "function": "checkout-latency-anomalies",
        "funcDescription": "",
        "duration": "1 hours",
        "endTime": "Oct 07, 2025 09:00",
        "timezone": "UTC",
        "anomalyType": "Deviation",
        "properties": ""
      }
    }
  ],
  "report": {
    "startTime": "Oct 07, 2025 08:00",
    "endTime": "Oct 07, 2025 09:00",
    "reportGenerationTimeMillis": 1759827723600,
    "dashboardHost": "https://acme.startree.cloud",
    "relatedEvents": []
  }
}
```

It opens an incident titled:

```
checkout_p99_latency_ms up 171% (842 vs 311 expected) in checkout-latency-anomalies
```

The run where that anomaly finished, which resolves it. `anomalyReports` is empty, the report has moved into `completedAnomalyReports`, and `anomaly.id` is the one the opening envelope carried — that is what joins the two:

```json
{
  "subscriptionGroup": {
    "id": 188059,
    "name": "checkout-oncall",
    "alertAssociations": [
      {
        "alert": {
          "id": 136062
        }
      }
    ],
    "cron": "0 */5 * * * ?",
    "specs": [
      {
        "type": "webhook",
        "params": {
          "url": "https://hooks.spike.sh/<spike-integration-token>/push-events",
          "notifyResolvedAnomalies": true
        }
      }
    ]
  },
  "anomalyReports": [],
  "completedAnomalyReports": [
    {
      "anomaly": {
        "id": 188180,
        "startTime": 1759824000000,
        "endTime": 1759838400000,
        "avgCurrentVal": 318,
        "avgBaselineVal": 311,
        "score": 0,
        "weight": 0,
        "impactToGlobal": 0,
        "sourceType": "DEFAULT_ANOMALY_DETECTION",
        "created": 1759827723451,
        "notified": true,
        "alert": {
          "id": 136062
        },
        "metric": {
          "name": "checkout_p99_latency_ms"
        },
        "metadata": {
          "dataset": {
            "name": "checkout_events"
          },
          "metric": {
            "name": "checkout_p99_latency_ms"
          }
        }
      },
      "url": "https://acme.startree.cloud/anomalies/188180",
      "data": {
        "metric": "checkout_p99_latency_ms",
        "startDateTime": "Oct 07, 2025 08:00",
        "lift": "+2.25 %",
        "feedback": "Not Resolved",
        "anomalyId": "188180",
        "anomalyURL": "https://acme.startree.cloud/anomalies/",
        "currentVal": "318.00",
        "baselineVal": "311.00",
        "dimensions": [],
        "swi": "0.00 %",
        "function": "checkout-latency-anomalies",
        "funcDescription": "",
        "duration": "4 hours",
        "endTime": "Oct 07, 2025 12:00",
        "timezone": "UTC",
        "anomalyType": "Deviation",
        "properties": ""
      }
    }
  ],
  "report": {
    "startTime": "Oct 07, 2025 12:00",
    "endTime": "Oct 07, 2025 12:05",
    "reportGenerationTimeMillis": 1759838700000,
    "dashboardHost": "https://acme.startree.cloud",
    "relatedEvents": []
  }
}
```

It resolves the incident, and the event reads:

```
checkout_p99_latency_ms back to normal in checkout-latency-anomalies
```

Spike keeps the whole envelope on the incident, so every field above — the anomaly's `url` back into ThirdEye, the window, the dataset, `feedback`, `duration` — is on the incident page and available to alert rules and the Title Remapper.

## Things worth knowing

* **One spec covers every alert in the group.** There is nothing to configure per alert. Associate as many alerts as you like with the group and they all notify through the same webhook.
* **The cron is your paging frequency.** ThirdEye finds the anomaly on its next run after it happens, so a group on `0 */5 * * * ?` pages up to five minutes after the fact, and reports the anomaly again every five minutes until it finishes. Those repeats are recorded on the incident and never page again.
* **Several Spike integrations are fine.** If different teams own different metrics, create one Spike integration per team and one subscription group per integration, then associate each team's alerts with its own group.
* **An anomaly's own url is kept, not put in the title.** `url` and `data.anomalyURL` are on the incident page so a responder can open the anomaly in ThirdEye.
* **Resolving in Spike does not touch ThirdEye.** The anomaly stays as it is in ThirdEye until the detection says it is over.
* **Spike's own notifications are separate.** Email, Slack and PagerDuty specs already on the group keep working; the webhook spec is additional.

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Check three things in order. First, that the spec's `url` is the full `https://hooks.spike.sh/<your-token>/push-events` with nothing appended, and that the integration has not been archived in Spike.

Second, that the group has alerts associated with it. A subscription group with an empty `alertAssociations` runs its cron and reports nothing.

Third, that one of those alerts has actually detected an anomaly in the window the run covers. ThirdEye posts an envelope per run, but a run that found nothing has nothing to tell Spike about. Confirm in ThirdEye that the alert recorded an anomaly in the window before looking any further at the webhook.

</details>

<details>

<summary>Incidents never resolve</summary>

The usual cause is `notifyResolvedAnomalies`. `GET /api/subscription-groups/<id>` and look at the webhook spec's `params`: without `"notifyResolvedAnomalies": true` ThirdEye never sends a completed report, so nothing Spike receives can close the incident.

If it is set, check that the anomaly has actually finished in ThirdEye rather than still being live, and that the incident was still open when the completed report arrived — a recovery with nothing open is dropped.

A [resolve timer](../incidents/resolve-timer.md) on the integration, or a **Resolve After** action on an [alert rule](../alerts/alert-rules.md), is the backstop for the cases ThirdEye cannot tell you about.

</details>

<details>

<summary>Every cron run opens a new incident</summary>

Open two of the incidents and compare the payloads on the incident page. If `anomalyReports[].anomaly.id` differs, ThirdEye genuinely found separate anomalies, and separate anomalies are separate incidents by design.

If the ids match and the incidents still pile up, check whether the first incident was still open when the second run arrived — a run that arrives after the incident was resolved in Spike opens a new one.

</details>

<details>

<summary>One run paged us about several anomalies at once</summary>

Expected, and it is one incident, not several: ThirdEye posts one envelope per cron run of the whole group, so everything the group's alerts found in that window arrives together and is titled `3 anomalies in <group>: …`.

Split the alerts across several subscription groups, each pointing at its own Spike integration, if you want them to page separately.

</details>

<details>

<summary>An incident titled "StarTree ThirdEye anomaly with no details" opened</summary>

Spike could not read a metric, a dimension, an alert name, a dataset or a group name out of the envelope. Rather than throw away something that might be a real anomaly, Spike pages on an honest title. Acknowledge it, resolve it, and send the payload on the incident page to Spike support.

</details>

<details>

<summary>The severity badge is always the same</summary>

Expected. ThirdEye's webhook payload carries no severity, so Spike opens every anomaly at the integration's default. Use [alert rules](../alerts/alert-rules.md) on the alert name, dataset, metric or dimensions to set severity, route or suppress.

</details>

Disclaimer: These integration instructions are offered independently by Spike.sh, and Spike.sh is not affiliated with nor a partner of StarTree, Inc.
