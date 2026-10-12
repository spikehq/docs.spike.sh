---
description: >-
  Send DBmarlin database alerts to Spike so a breached rule on a database instance or host pages your on-call rotation by phone, SMS, Slack or Teams, and closes its incident when DBmarlin reports the alert has ended.
---

# Integrate Spike with DBmarlin

[DBmarlin](https://www.dbmarlin.com) monitors database performance across instances and the hosts they run on. When a metric breaks an alert rule, DBmarlin sends a notification when the alert **starts** and another when it **ends**.

DBmarlin's **Webhook** integration posts both as JSON. Point it at a Spike integration URL and a breached rule pages your on-call rotation, a repeat of the same alert lands on the incident already open, and the incident resolves itself when DBmarlin reports the end.

## Before you start

* DBmarlin **5.11 or later**.
* DBmarlin allows **one Webhook integration** ("you can only have one Webhook integration defined"). Every alert it sends goes to the same Spike integration, so create one Spike integration for the whole DBmarlin server rather than one per rule.

## Set up instructions

**Step 1:** Create a DBmarlin integration in the Spike dashboard and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

**Step 2:** Set up the webhook in DBmarlin.

1. In DBmarlin, open **Settings → Integrations** and click **Edit** on the **Webhook** integration.
2. Fill in the form:

| Field | Value |
| --- | --- |
| **Webhook URL** | The Spike webhook URL copied in Step 1 |
| **DBmarlin URL** | The address you use to open DBmarlin, so the links in each alert point back to it |
| **Headers** | `Content-Type: application/json` |
| **Content Template** | The instance template below |
| **Host Content Template** | The host template below |

3. Enable the integration and save.

DBmarlin uses the **Content Template** for alerts on database instances and the **Host Content Template** for alerts on hosts, so fill in both, even if you only alert on one of them today.

### Content Template (database instances)

Paste this into **Content Template**. The incident is reported against the instance name.

```json
{
  "body": {
    "instance": "<datasourcename>",
    "ruleid": "<ruleid>",
    "rulename": "<rulename>",
    "statistic": "<statistic>",
    "startedended": "<startedended>",
    "oldvalue": "<oldvalue>",
    "newvalue": "<newvalue>",
    "threshold": "<threshold>",
    "units": "<units>",
    "from": "<from>",
    "to": "<to>",
    "tz": "<tz>",
    "url": "<url>",
    "urlfrom": "<urlfrom>",
    "urlto": "<urlto>",
    "urltz": "<urltz>",
    "interval": "<interval>"
  }
}
```

### Host Content Template (hosts)

Paste this into **Host Content Template**. It is identical except that `instance` is replaced by `node`, and the incident is reported against the host name.

```json
{
  "body": {
    "node": "<hostname>",
    "ruleid": "<ruleid>",
    "rulename": "<rulename>",
    "statistic": "<statistic>",
    "startedended": "<startedended>",
    "oldvalue": "<oldvalue>",
    "newvalue": "<newvalue>",
    "threshold": "<threshold>",
    "units": "<units>",
    "from": "<from>",
    "to": "<to>",
    "tz": "<tz>",
    "url": "<url>",
    "urlfrom": "<urlfrom>",
    "urlto": "<urlto>",
    "urltz": "<urltz>",
    "interval": "<interval>"
  }
}
```

{% hint style="warning" %}
Paste the templates as they are. Spike reads `ruleid` together with `instance` or `node` to match an end notification to the incident it closes, and `startedended` to tell a start from an end. Do not remove `<ruleid>` or the instance or host line: without both, Spike can only match alerts by their title, which then carries no readings.
{% endhint %}

**Step 3:** Test it. DBmarlin has no test button; once the webhook is saved, new alerts arrive at Spike. Trigger an alert rule (for example by temporarily lowering its threshold) and check that an incident appears in Spike, then restore the threshold and check that the incident resolves when the alert ends.

## Fields Spike reads

| Field | Required | Used for |
| --- | --- | --- |
| `instance` or `node` | One of the two | Where the problem is, and half of the incident identity |
| `ruleid` | Strongly recommended | The other half of the incident identity |
| `startedended` | Yes | Tells a start from an end |
| `statistic` | Yes | The metric, first in the incident title |
| `rulename` | No | Used as the metric in the title only when `statistic` is empty |
| `newvalue`, `oldvalue`, `threshold`, `units` | No | The readings in the incident title |
| `from`, `to`, `tz`, `url`, `urlfrom`, `urlto`, `urltz`, `interval` | No | Shown on the incident; never part of the title |

## Example payloads

When an alert starts, DBmarlin sends:

```json
{
  "body": {
    "instance": "orders-pg-prod-01",
    "ruleid": "17",
    "rulename": "Database time above 60s",
    "statistic": "dbtime",
    "startedended": "STARTED",
    "oldvalue": "38",
    "newvalue": "214",
    "threshold": "60",
    "units": "s",
    "from": "2026-10-07 02:41:00",
    "to": "2026-10-07 02:44:00",
    "tz": "Europe/London",
    "url": "https://dbmarlin.acme.internal/instances/4?fm=2026-10-07+02%3A41%3A00&to=2026-10-07+02%3A44%3A00&tz=Europe/London&interval=1000",
    "urlfrom": "2026-10-07 02:41:00",
    "urlto": "2026-10-07 02:44:00",
    "urltz": "Europe/London",
    "interval": "1"
  }
}
```

When the alert ends, DBmarlin sends the same payload with the end state:

```json
{
  "body": {
    "instance": "orders-pg-prod-01",
    "ruleid": "17",
    "rulename": "Database time above 60s",
    "statistic": "dbtime",
    "startedended": "ENDED",
    "oldvalue": "214",
    "newvalue": "41",
    "threshold": "60",
    "units": "s",
    "from": "2026-10-07 03:05:00",
    "to": "2026-10-07 03:08:00",
    "tz": "Europe/London",
    "url": "https://dbmarlin.acme.internal/instances/4?fm=2026-10-07+03%3A05%3A00&to=2026-10-07+03%3A08%3A00&tz=Europe/London&interval=1000",
    "urlfrom": "2026-10-07 03:05:00",
    "urlto": "2026-10-07 03:08:00",
    "urltz": "Europe/London",
    "interval": "1"
  }
}
```

## What Spike does with each notification

Any `startedended` value that begins with `end` (in any letter case) is an end. Everything else is a start.

| `startedended` | What happens in Spike |
| --- | --- |
| `STARTED` | Opens an incident and pages your escalation policy. A repeat of the same alert is grouped onto the incident already open |
| `ENDED` | Auto-resolves the open incident for the same rule and instance or host. It never opens a new incident |

### Incident identity

Spike identifies an incident by `ruleid` **together with** `instance` (or `node`). A DBmarlin rule can be defined once and applied to every instance, so the rule id alone is not unique: the same rule breaking on `orders-pg-prod-01` and `orders-pg-prod-02` is two incidents, and each one resolves on its own end notification.

If `ruleid` or the instance or host is missing from a notification, Spike falls back to matching by incident title, which is then only the metric and the instance or host, with no readings. An end notification resolves such an incident only when neither notification carried a `ruleid`.

## Incident title

The title is built from the payload, because DBmarlin sends no sentence describing the fault:

```
dbtime up 463% (214s vs 38s, threshold 60s) on orders-pg-prod-01
```

It reads as the metric, the direction and size of the change, the readings, and where it happened. The percentage is calculated by Spike from `oldvalue` and `newvalue`. The title simplifies when the data is thin:

| Payload | Title |
| --- | --- |
| Readings change by 1% or more | `dbtime up 463% (214s vs 38s, threshold 60s) on orders-pg-prod-01` |
| No usable `oldvalue`, or under a 1% change | `executions 12,480 (threshold 10,000) on orders-mysql-prod-04` |
| No `ruleid`, or no instance or host | `dbtime on orders-pg-staging-02` |
| End notification | `dbtime back to normal on orders-pg-prod-01` |
| No `statistic` | `rulename` is used in its place |
| No `statistic` or `rulename` | `DBmarlin alert on orders-pg-prod-01` |
| No `statistic`, `rulename` or target | `DBmarlin alert with no details` |

Readings are written as whole numbers from 10 up, with two significant digits below 10. Titles are at most 200 characters; the readings are dropped before the instance or host is ever cut.

## Severity

The payload carries no severity. Use [alert rules](https://docs.spike.sh/alerts/alert-rules) to set the severity of DBmarlin incidents, for example by matching on `statistic`, `rulename` or the instance name.

## Limits to know about

* DBmarlin's documentation lists the `<startedended>` placeholder but not the values it renders. Spike treats a value beginning with `end` as an end, so the exact casing does not matter.
* DBmarlin's documentation does not state that every rule sends an end notification. If a rule never ends, its incident is closed by Spike's auto-resolve timer or by hand.
* An end notification that arrives with no matching open incident is dropped, not turned into a new incident.
