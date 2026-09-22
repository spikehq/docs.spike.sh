---
description: >-
  Send Papertrail saved-search alerts to Spike so new matching log lines open an incident and page your on-call team by phone, SMS, Slack or Teams.
---

# Integrate Spike with Papertrail

[Papertrail](https://www.papertrail.com/) watches your logs and can alert on a saved search. Point that alert at a Spike webhook and every period with new matching log lines opens an incident that escalates through your on-call policy, titled with the log line that tripped the search and carrying the rest of the matches and a link back to Papertrail.

Papertrail sends nothing when the matches stop, so there is no recovery event to close the incident with. Use a [resolve timer](../incidents/resolve-timer.md) or resolve by hand, as described in Step 4 below.

## What Spike does with each alert

| Papertrail alert | What happens in Spike |
| --- | --- |
| First period with new matches | Opens an incident for that saved search and pages your escalation policy |
| Every later period with new matches | Added as an event to the incident already open. It never pages again |
| A period with no matches | Papertrail sends nothing at all, so Spike sees nothing |

There is one incident per saved search. Spike groups on `saved_search.id`, so renaming a search or editing its query keeps the incidents together, and two searches that match the same log line stay two separate incidents.

## How incidents are titled

The title is the name of the saved search followed by the log line that tripped it, so on-call can read the problem off a Slack message or a lock screen without opening the incident:

```
Payments 5xx: status=502 upstream=checkout latency=1204ms (+2 more)
```

| Part | Where it comes from |
| --- | --- |
| `Payments 5xx` | `saved_search.name`, the name you gave the search in Papertrail |
| `status=502 upstream=checkout latency=1204ms` | The `message` of the worst line in that callback. Papertrail's syslog severity picks it, `Error` over `Warning` over `Info`. Ties, and callbacks where no line carries a severity, fall back to the first line |
| `(+2 more)` | The other lines in the same callback. Left off when the callback carried a single line |

A quoted line longer than 90 characters is trimmed with an ellipsis, so a stack trace or a large JSON blob can never push the saved search name off the end of the title. The full line, the rest of the batch, the hostnames, the programs and the link back to the search are on the incident page.

Each callback brings different log lines, so the title of an open incident is the newest thing that matched. That does not affect grouping: repeats are matched on `saved_search.id`, never on the title text, so they land on the one incident however much the wording moves.

{% hint style="warning" %}
The quoted line is your raw log content, and a title travels further than the incident page does: Slack, phone push notifications and email subject lines. If the search can match lines carrying customer emails, tokens or internal paths, run it in [count-only mode](#count-only-alerts), where there are no log lines to quote, or rewrite the title with a [Title Remapper](../alerts/title-remapper.md).
{% endhint %}

{% hint style="info" %}
The syslog severity on a log line only decides which line gets quoted. It is not the incident's severity — Papertrail alerts carry no severity of their own, so incidents come in at your integration's default. Set severity per saved search with [alert rules](../alerts/alert-rules.md), which can also route the incident to another escalation policy or suppress it entirely.
{% endhint %}

## Prerequisites

* A Papertrail account with permission to create saved searches and alerts
* A Papertrail integration in Spike and its webhook URL

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Papertrail**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Save the search you want to be paged for

In Papertrail, run the search in the event viewer, check that it matches what you expect and nothing else, then click **Save Search** and give it a name. That name becomes the first half of every incident title, so write it the way you want to hear it on a phone call at 3am: `5xx from checkout` rather than `search 4`.

Narrow searches make good alerts. A search that matches a few hundred lines an hour will page you every period, which is noise rather than an incident.

## Step 3 — Add the webhook alert

1. Open the saved search and click **Alerts → Create Alert**, or go to **Dashboard → Alerts → Add new alert** and pick the saved search.
2. Choose **Webhook** as the alert type.
3. Paste the Spike webhook URL from Step 1 into the **URL** field.
4. Pick a frequency, see the table below.
5. Optionally set a minimum count so short bursts do not page anyone. Papertrail only sends the alert when the period has at least that many matches.
6. Save the alert.

Papertrail sends a POST at the end of each period that had new matches, and sends nothing for periods that had none, so a quiet system produces no traffic at all.

### Choosing a frequency

| Frequency | Use it for | What to expect |
| --- | --- | --- |
| Every minute | Production errors you want to be paged for immediately | Up to one callback a minute while the errors keep coming. The first one pages, the rest are added to the open incident |
| Every 10 minutes | Most alerts. A good default | You hear about a problem within 10 minutes and the incident collects the periods that follow |
| Every hour | Slow-burning problems, background jobs, deprecation warnings | Only sensible when a one hour delay is acceptable |
| Every day | Digests and audit-style searches | Usually better as an email than as an incident |

{% hint style="warning" %}
A minute frequency on a broad search is the fastest way to make on-call hate an integration. Narrow the search or raise the minimum count rather than the frequency.
{% endhint %}

## Step 4 — Set a resolve timer

Papertrail never tells Spike the matches have stopped, so nothing in the payload can close the incident. Give the integration a [resolve timer](../incidents/resolve-timer.md) so incidents do not sit open forever:

1. Edit the Papertrail integration in Spike.
2. Scroll to **Advanced Configuration** and turn on **Resolve by Timer**.
3. Set a duration comfortably longer than your alert frequency, so a problem that is still firing is not resolved out from under the person looking at it.

| Alert frequency | Suggested resolve timer |
| --- | --- |
| Every minute | 30 minutes |
| Every 10 minutes | 1 hour |
| Every hour | 4 hours |
| Every day | 1 day |

Each new callback is added to the open incident, but it does not restart the timer. If the timer fires while the matches are still coming in, the next callback opens a fresh incident and pages again, which is the behaviour you want for a problem nobody picked up.

{% hint style="info" %}
Resolving by hand works just as well. Use the timer as a backstop so a search that fires once at 2am does not leave an incident open all week.
{% endhint %}

## Count-only alerts

Papertrail can send counts instead of the matching log lines. Turn on the count-only option on the alert when the volume matters more than the individual lines, or when the search matches sensitive content and you would rather no log line left Papertrail, or appeared in an incident title.

Spike handles those the same way. The payload carries a `counts` array with one entry per sender instead of `events`, and with no log lines to quote the title breaks the period down by sender, busiest first:

```
Payments 5xx: 4 matches from web-01, 1 from web-02
```

Everything else, the grouping on the saved search, the escalation and the resolve timer, is unchanged. A count-only callback and an events-mode callback for the same saved search land on the same incident, so you can switch a search between the two modes without splitting its history.

## Payload reference

Papertrail posts `application/x-www-form-urlencoded` with a single `payload` field holding the JSON below. Spike unwraps that field for you, so nothing needs configuring, but it is worth knowing if you replay a callback with `curl`:

```bash
curl --request POST \
  --data-urlencode 'payload={"events":[{"message":"status=502 upstream=checkout","severity":"Error"}],"saved_search":{"id":42,"name":"Payments 5xx"}}' \
  "https://hooks.spike.sh/<your-token>/push-events"
```

An events-mode alert looks like this:

```json
{
  "events": [
    {
      "id": 7711561783320576,
      "source_ip": "208.75.57.121",
      "source_id": 2,
      "source_name": "web-01",
      "hostname": "web-01",
      "program": "payments-api",
      "severity": "Error",
      "facility": "Local0",
      "message": "status=502 upstream=checkout latency=1204ms",
      "received_at": "2026-09-18T11:05:02-07:00",
      "generated_at": "2026-09-18T11:05:02-07:00",
      "display_received_at": "Sep 18 11:05:02"
    }
  ],
  "saved_search": {
    "id": 42,
    "name": "Payments 5xx",
    "query": "program:payments-api (status=502 OR status=503)",
    "html_search_url": "https://papertrailapp.com/searches/42",
    "html_edit_url": "https://papertrailapp.com/searches/42/edit"
  },
  "max_id": "7711561783320578",
  "min_id": "7711561783320576",
  "reached_record_limit": false,
  "reached_time_limit": false,
  "frequency": 600
}
```

| Field | What Spike does with it |
| --- | --- |
| `saved_search.id` | Groups callbacks. One open incident per saved search |
| `saved_search.name` | The first half of the incident title |
| `saved_search.query`, `saved_search.html_search_url` | Shown on the incident, so you can open the search in Papertrail |
| `events[]` | The worst line by `severity` is quoted in the title, with `(+N more)` for the rest. Every line, with its hostname, program and severity, is on the incident |
| `counts[]` | Used instead of `events` on count-only alerts. Becomes the per-sender breakdown in the title |
| `max_id`, `min_id` | Recorded per callback, so you can tell the periods apart on a long-running incident |
| `reached_record_limit` | Noted on the incident when Papertrail truncated the batch at 25,000 events |
| `frequency` | The alert window in seconds. `60` is the every minute setting, `600` every 10 minutes |

A count-only alert replaces `events` with `counts`:

```json
{
  "counts": [
    {
      "source_name": "web-01",
      "source_id": 2,
      "timeseries": { "1789000020": 4, "1789000080": 6 }
    },
    {
      "source_name": "web-02",
      "source_id": 3,
      "timeseries": { "1789000020": 1, "1789000080": 2 }
    }
  ],
  "saved_search": {
    "id": 42,
    "name": "Payments 5xx",
    "query": "program:payments-api (status=502 OR status=503)"
  },
  "max_id": "7711561783320578",
  "min_id": "7711561783320576",
  "frequency": 3600
}
```

### Title Remapper sample

A [Title Remapper](../alerts/title-remapper.md) on the Papertrail integration replaces the default title with one you write against the payload. It is the way to keep raw log content out of your alerts while still saying more than the search name:

```handlebars
{{data.saved_search.name}} on {{data.events.[0].hostname}} ({{data.events.[0].severity}})
```

Output: `Payments 5xx on web-01 (Error)`

A remapper replaces the title on every callback, including the choice of which line to quote, so write it against fields that are always there. Count-only alerts carry no `events` at all, so keep a remapper like the one above for searches you run in events mode.

## Things worth knowing

* **There is no recovery event.** Papertrail alerts fire on new matches and stay silent otherwise, so nothing can tell Spike the problem is over. The resolve timer in Step 4 is the answer.
* **One incident per saved search, not per log line.** A period with 4,000 matching lines is one incident carrying 4,000 events, not 4,000 incidents.
* **Batches stop at 25,000 events.** Papertrail sets `reached_record_limit` when it truncated, and Spike notes that on the incident. The `(+N more)` in the title counts the lines in the batch, not the true number of matches for the period.
* **The URL is the credential.** Papertrail sends no signature and no authentication header, so treat the webhook URL as a secret. If it leaks, archive the integration in Spike and create a new one, then update the URL on every alert pointing at it.
* **Timestamps are Papertrail's.** `received_at` uses the time zone on your Papertrail profile. Incident times in Spike are shown in your own time zone, so the two can look a few hours apart on the same event.
* **Alerts are per saved search, not per Spike integration.** One Papertrail integration in Spike can receive alerts from as many saved searches as you like, and each one gets its own incident. Use separate integrations when different searches should page different teams, or keep one and split with [alert rules](../alerts/alert-rules.md).

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Check the alert in Papertrail first. Alerts only fire for periods with new matches, so a search that matches nothing sends nothing, which looks identical to a broken webhook.

Run the saved search in the Papertrail event viewer over the last hour. If it has matches and no incident appeared, open the alert and confirm the URL is the full Spike webhook including `/push-events`, and that the minimum count is not higher than the number of matches in a single period.

</details>

<details>

<summary>Every alert opens a new incident</summary>

The previous incident was already resolved, either by hand or by the resolve timer. Spike only appends to an incident that is still open. If that happens constantly, your resolve timer is shorter than the gap between callbacks, so raise it using the table in Step 4.

The title reading differently on each callback is never the cause. Grouping is on `saved_search.id`, which Papertrail sends unchanged for the life of the saved search.

</details>

<details>

<summary>Incidents never close</summary>

Expected without a resolve timer, since Papertrail has no recovery event. Turn on **Resolve by Timer** on the integration, or add a **Resolve After** action on an [alert rule](../alerts/alert-rules.md) if you only want it for some searches.

</details>

<details>

<summary>The title is just the saved search name</summary>

The callback carried nothing to quote. In events mode that means an empty `events` array, which Papertrail sends if the alert fired on a period whose matches had already aged out; in count-only mode it means every sender reported zero, which happens when the minimum count on the alert is `0`. Set a minimum count of at least `1`.

</details>

<details>

<summary>On-call is being paged too often</summary>

One page per period is the design, but the first page is the only one per incident. If the team is being woken repeatedly, the incidents are being resolved between callbacks. Lengthen the resolve timer, lower the alert frequency, or narrow the saved search.

</details>
