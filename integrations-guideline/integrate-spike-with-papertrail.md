---
description: >-
  Send Papertrail saved-search alerts to Spike so new matching log lines open an incident and page your on-call team by phone, SMS, Slack or Teams.
---

# Integrate Spike with Papertrail

[Papertrail](https://www.papertrail.com/) watches your logs and can alert on a saved search. Point that alert at a Spike webhook and every period with new matching log lines opens an incident that escalates through your on-call policy, with the first few matching messages and a link back to the search on the incident.

Papertrail sends nothing when the matches stop, so there is no recovery event to close the incident with. Use a [resolve timer](../incidents/resolve-timer.md) or resolve by hand, as described in Step 4 below.

## What Spike does with each alert

| Papertrail alert | What happens in Spike |
| --- | --- |
| First period with new matches | Opens an incident for that saved search and pages your escalation policy |
| Every later period with new matches | Added as an event to the incident already open. It never pages again |
| A period with no matches | Papertrail sends nothing at all, so Spike sees nothing |

There is one incident per saved search. Spike groups on `saved_search.id`, so renaming a search or editing its query keeps the incidents together, and two searches that match the same log line stay two separate incidents.

Incident titles read the same on every repeat, which keeps them short when Spike reads them out on a phone call:

```
5xx from checkout: 12 new matches
```

`{saved_search.name}` is the name you gave the search in Papertrail, and the count is how many events the alert carried. The first three messages, the hostnames, the programs and the link to the search in Papertrail are on the incident page rather than in the title.

{% hint style="info" %}
Papertrail alerts carry no severity of their own, so incidents come in at your integration's default. Set severity per saved search with [alert rules](../alerts/alert-rules.md), which can also route the incident to another escalation policy or suppress it entirely.
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

Papertrail can send counts instead of the matching log lines. Turn on the count-only option on the alert when the volume matters more than the individual lines, or when you do not want log contents leaving Papertrail.

Spike handles those the same way. The payload carries a `counts` array with one entry per sender instead of `events`, and the incident title uses the total across every sender:

```
Payment timeouts: 340 new matches
```

The per-sender breakdown is on the incident page. Everything else, the grouping on the saved search, the escalation and the resolve timer, is unchanged.

## Payload reference

Papertrail posts `application/x-www-form-urlencoded` with a single `payload` field holding the JSON below. Spike unwraps that field for you, so nothing needs configuring, but it is worth knowing if you replay a callback with `curl`:

```bash
curl --request POST \
  --data-urlencode 'payload={"events":[],"saved_search":{"id":42,"name":"Spike test"}}' \
  "https://hooks.spike.sh/<your-token>/push-events"
```

An events-mode alert looks like this:

```json
{
  "events": [
    {
      "id": 7711561783320576,
      "received_at": "2026-09-21T14:05:02-07:00",
      "hostname": "web-01",
      "program": "checkout",
      "severity": "Error",
      "facility": "Local0",
      "message": "500 POST /orders upstream timed out"
    }
  ],
  "saved_search": {
    "id": 42,
    "name": "5xx from checkout",
    "query": "program:checkout 500",
    "html_search_url": "https://my.papertrailapp.com/searches/42"
  },
  "max_id": "7711561783320576",
  "min_id": "7711559669468096",
  "reached_record_limit": false,
  "frequency": 600
}
```

| Field | What Spike does with it |
| --- | --- |
| `saved_search.id` | Groups callbacks. One open incident per saved search |
| `saved_search.name` | The first half of the incident title |
| `saved_search.query`, `saved_search.html_search_url` | Shown on the incident, so you can open the search in Papertrail |
| `events[]` | Counted for the title. The first three messages, with their hostname, program and severity, are shown on the incident |
| `counts[]` | Used instead of `events` on count-only alerts. Summed for the title |
| `max_id`, `min_id` | Recorded per callback, so you can tell the periods apart on a long-running incident |
| `reached_record_limit` | Noted on the incident when Papertrail truncated the batch at 25,000 events |
| `frequency` | The alert window in seconds. `600` is the every 10 minutes setting |

A count-only alert replaces `events` with `counts`:

```json
{
  "counts": [
    {
      "source_name": "web-01",
      "source_id": 2,
      "timeseries": { "1758488400": 180, "1758488460": 90 }
    },
    {
      "source_name": "web-02",
      "source_id": 3,
      "timeseries": { "1758488400": 70 }
    }
  ],
  "saved_search": {
    "id": 51,
    "name": "Payment timeouts",
    "query": "payment timeout",
    "html_search_url": "https://my.papertrailapp.com/searches/51"
  },
  "frequency": 600
}
```

### Title Remapper sample

The default title is `{saved_search.name}: {n} new matches`. If you would rather lead with the host that produced the first matching line, add a [Title Remapper](../alerts/title-remapper.md) on the Papertrail integration:

```handlebars
{{data.saved_search.name}} on {{data.events.[0].hostname}}
```

Output: `5xx from checkout on web-01`

Count-only alerts carry no `events`, so keep a remapper like that on searches you run in events mode.

## Things worth knowing

* **There is no recovery event.** Papertrail alerts fire on new matches and stay silent otherwise, so nothing can tell Spike the problem is over. The resolve timer in Step 4 is the answer.
* **One incident per saved search, not per log line.** A period with 4,000 matching lines is one incident carrying 4,000 events, not 4,000 incidents.
* **Batches stop at 25,000 events.** Papertrail sets `reached_record_limit` when it truncated, and Spike notes that on the incident. The count in the title is the number of events in the batch, not the true number of matches for the period.
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

</details>

<details>

<summary>Incidents never close</summary>

Expected without a resolve timer, since Papertrail has no recovery event. Turn on **Resolve by Timer** on the integration, or add a **Resolve After** action on an [alert rule](../alerts/alert-rules.md) if you only want it for some searches.

</details>

<details>

<summary>The incident title says 0 new matches</summary>

The alert was sent in count-only mode and every sender reported zero, which happens when a minimum count is set to `0`. Set a minimum count of at least `1` on the alert.

</details>

<details>

<summary>On-call is being paged too often</summary>

One page per period is the design, but the first page is the only one per incident. If the team is being woken repeatedly, the incidents are being resolved between callbacks. Lengthen the resolve timer, lower the alert frequency, or narrow the saved search.

</details>
