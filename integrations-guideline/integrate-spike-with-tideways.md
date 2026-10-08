---
description: >-
  Send Tideways notifications to Spike so a response-time breach, a PHP exception or a slow SQL query pages your on-call rotation by phone, SMS, Slack or Teams, and resolves its incident when Tideways says the problem is over.
---

# Integrate Spike with Tideways

[Tideways](https://tideways.com) is application monitoring for PHP. It profiles every request, groups the exceptions and the slow SQL queries your code produces, and raises an alert when a project or a single transaction crosses a threshold you configured.

Tideways posts each of those alerts as JSON to a webhook integration. Point it at a Spike integration URL and a response-time breach pages your on-call rotation the moment Tideways opens it, the re-notifications Tideways sends while the breach lasts land on the incident already open instead of paging again, and the incident resolves itself when Tideways says the alert is fixed.

Nothing new is installed on your servers. One webhook integration on the organisation, and one set of notification tickboxes per project, cover every check Tideways runs.

## What Spike does with each notification

Every notification Tideways sends arrives on the same webhook, and the top-level `type` is what tells them apart. Ten types are acted on by name.

### Threshold breaches

| `type` | The check in Tideways | What happens in Spike |
| --- | --- | --- |
| `response_time` | The project's response time crossed its threshold | Opens an incident and pages your escalation policy |
| `transaction-response-time` | One transaction's response time crossed its threshold | Opens an incident and pages your escalation policy |
| `error_rate` | The project's error rate crossed its threshold | Opens an incident and pages your escalation policy |
| `transaction-failure-rate` | One transaction's failure rate crossed its threshold | Opens an incident and pages your escalation policy |

All four carry a lifecycle in `notification.status`, and all three of its values are handled on purpose:

| `notification.status` | What it means in Tideways | What happens in Spike |
| --- | --- | --- |
| `opened` | The breach was just raised | Opens an incident and pages your escalation policy |
| `ongoing` | Tideways is re-notifying because the breach is still going | Lands on the incident already open and never pages again. If nothing is open — because the `opened` notification was never delivered — it opens one, since a breach nobody has been told about is a breach somebody should be paged for |
| `closed` | Tideways closed the alert because the reading came back under the threshold | Auto-resolves the open incident. Dropped when nothing is open |

### Exceptions and slow SQL queries

| `type` | The check in Tideways | What happens in Spike |
| --- | --- | --- |
| `exception` | A new, or newly reappearing, PHP error group | Opens an incident and pages your escalation policy |
| `slow-sql` | A new slow SQL query group | Opens an incident and pages your escalation policy |

An error group has no `notification.status` — it has a state of its own in `notification.error_group.status`, which is what Tideways moves when somebody deals with the group:

| `notification.error_group.status` | What happens in Spike |
| --- | --- |
| `new`, `open` | Still firing. Opens an incident, or lands on the one already open for that group |
| `resolved`, `not_error`, `ignored` | Auto-resolves the open incident. Dropped when nothing is open |

Anything Tideways sends here that is not one of those five is treated as still firing. An extra incident costs a click; a swallowed alert costs an outage.

### Everything else

| `type` | The notification in Tideways | What happens in Spike |
| --- | --- | --- |
| `missing-data` | A service stopped sending data | Opens an incident and pages your escalation policy. A repeat of the same condition lands on it |
| `release` | A release was deployed | Opens an incident. Informational — see the hint below |
| `compare_release` | Tideways compared a release with the one before it | Opens an incident. Informational — see the hint below |
| `weekly_report` | The week's digest | Opens an incident. Informational — see the hint below |

A `type` Spike has never seen — Tideways adds checks, and you can tick one the day it ships — still opens an incident, titled with the name of the check and your project, for example `Uptime monitor alert on storefront`. Spike would rather page you about a check it does not know than drop it.

{% hint style="warning" %}
**Leave Weekly report, Release and Release comparison unticked** unless you genuinely want to be paged for them. They are informational: nothing is wrong, and nothing ever arrives to resolve them, so each one opens an incident somebody has to acknowledge and resolve by hand. If you do want them in Spike, point them at a separate Spike integration on a service with no escalation policy, or set a [resolve timer](../incidents/resolve-timer.md) on the integration.

`missing-data` is a real alert and worth ticking, but Tideways documents no "data is flowing again" notification, so those incidents do not auto-resolve either. A [resolve timer](../incidents/resolve-timer.md) is the backstop.
{% endhint %}

## Incident identity

Which notifications land on one incident is decided by the id Tideways repeats across them, never by the title.

* **Threshold breaches** are identified by `notification.incident_id`. Tideways sends the same number on the `opened`, on every `ongoing` and on the `closed`, so one breach is one incident: it pages once, the re-notifications land on it, and the `closed` resolves it. Older Tideways installs send that id only under the vendor's own misspelled `notification.incidient_id`; Spike reads both spellings, so an older install groups just as well.
* **Exceptions and slow SQL queries** are identified by `notification.error_group.id`. Every later occurrence of the same group, and the notification that says somebody resolved it, carries that id, so a group that fires fifty times is one incident.
* **`missing-data`, `release`, `compare_release`, `weekly_report`** and any unrecognised `type` carry no id at all. Spike groups those on the title instead, which is why their titles deliberately hold nothing that moves between two deliveries — no reading, no timestamp, no week's numbers. A `missing-data` notification repeated an hour later reads identically and lands on the incident it already opened.

Identity is the alert, not the check. Two transactions breaching their own response-time thresholds are two `notification.incident_id`s, so they are two incidents.

## Incident title

Tideways writes its own sentence about a PHP fault, so for an exception that sentence is the start of the title, followed by the method it fired in and the project:

```
Allowed memory size of 134217728 bytes exhausted (tried to allocate 32768 bytes) in web_profiler.controller.profiler:panelAction on storefront
```

A slow SQL query has no such sentence — Tideways sends `notification.error_group.lastMessage` as `null` — so the readable description it does send is used, with the repository method and the project after it. A fully qualified PHP name is written as the leaf, because a backslash reads as an escape sequence in a phone notification rather than as a separator:

```
New slow SELECT query on orders in OrderRepository::findOpenOrders on storefront
```

A threshold breach carries no sentence at all, so the title is built from the check, how far past the threshold the reading went, and where:

```
Response time up 23% (1,234 vs 1,000 threshold) on storefront
Error rate up 150% (12.5% vs 5% threshold) on storefront
Transaction response time up 64% (1,230 vs 750 threshold) on checkout::confirmAction [web/production]
Failure rate 12.5 % vs 5 % threshold on checkout::confirmAction [web/production]
```

The percentage is Spike's own arithmetic on `notification.value` against `notification.criticalThreshold`, printed only when both read as numbers and the difference is at least 1%. The readings themselves are printed as Tideways sent them, so a title read beside Tideways' own screen shows the same numbers that screen does. The last line above is the one payload type that sends no `criticalThreshold`: Tideways' own `notification.formatted_value` and `notification.formatted_threshold` are echoed verbatim, spacing included, and nothing is computed. A breach whose readings did not arrive at all degrades to `Response time threshold breached on storefront` rather than guessing.

The two recoveries read as recoveries, each in Tideways' own words:

```
Response time back to normal on storefront
[RESOLVED] Allowed memory size of 134217728 bytes exhausted (tried to allocate 32768 bytes) in web_profiler.controller.profiler:panelAction on storefront
```

An error group's state leads the title, because a phone notification, an email subject and a Slack line all cut a long title from the end — and it is Tideways' own state, so a group moved to `ignored` or `not_error` reads `[IGNORED]` or `[NOT AN ERROR]` rather than claiming somebody fixed it.

And the notifications with no id are titled so that a repeat reads identically:

```
No data from web (production) on storefront for at least 24h
Release 2026.10.08-1 on storefront
Release comparison for 2026.10.08-2 on storefront
Weekly report for storefront
```

Titles are capped at 200 characters and carry no ids, hashes, `link` URLs or timestamps. Those are all on the incident page.

{% hint style="info" %}
A recovery reads differently from the notification that opened the incident, and so does an `ongoing` whose reading has got worse. That is on purpose, and it does not break the grouping: threshold breaches are matched on `notification.incident_id` and error groups on `notification.error_group.id`, never on the title.
{% endhint %}

Use a [Title Remapper](../alerts/title-remapper.md) if your team reads these by transaction and environment rather than by check:

```handlebars
{{data.body.notification.transaction}} on {{data.body.application}} ({{data.body.notification.environment}})
```

## Severity

Spike does not read a severity from the Tideways payload, because Tideways does not send one — a notification is sent at all only because the check you configured said it was worth sending. Incidents open at your integration's default.

If you want different levels on the badge, write an [alert rule](../alerts/alert-rules.md) on `type`, on `notification.status` or on `notification.value`. Alert rules can also route an incident to another service or escalation policy, or suppress it entirely. Read more about [priority and severity](../incidents/priority-and-severity.md).

## Prerequisites

* A Tideways account with permission to manage the organisation's integrations and the project's settings
* A Tideways integration in Spike and its webhook URL
* Nothing to open on your own network. Tideways calls out to Spike

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Tideways**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Add Spike as a webhook integration in Tideways

A webhook lives on the Tideways organisation, and projects then point their notifications at it.

1. **Sign in to Tideways** at [https://app.tideways.io](https://app.tideways.io) and open **Organizations** from the top navigation. Pick the organisation your project belongs to.

2. **Open the Integrations tab** and select **Add New Integration**.

3. **Choose Webhook** as the integration type.

4. **Fill in the integration.** Both fields are required:
   * **Name** — something your team will recognise in the notification tickboxes later, for example `Spike`. Tideways shows this name wherever the integration appears, so name it after Spike rather than after the project
   * **URL** — the webhook URL from Step 1. Tideways accepts `https://` only, which is what Spike gives you. Paste it whole, with nothing appended

5. **Save the integration.**

{% hint style="warning" %}
Treat the webhook URL like a password — the token in it is the only credential, which is why Tideways asks for no other. If it leaks, archive the integration in Spike, create a new one, and update the URL in Tideways.
{% endhint %}

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

## Step 3 — Tick the notifications that feed it

The webhook receives nothing until a project asks it to. This is the step that decides which Tideways checks reach Spike, and it is done per project.

1. Open the project in Tideways and go to **Project Settings → Notifications**.
2. For each notification you want in Spike — **Response Time**, **Error Rate**, **Transaction Response Time**, **Transaction Failure Rate**, **Exceptions**, **Slow SQL**, **Missing Data** — **tick the Spike webhook integration** you created in Step 2.
3. For each of those, also tick **"and when the alert is fixed"**. This one is required; see below.
4. **Save.**
5. Repeat for every project you want paging your rotation. A webhook integration is shared across the organisation, but the tickboxes are per project.

{% hint style="danger" %}
**"and when the alert is fixed" is not optional.** It is what makes Tideways send the `closed` notification, and the `closed` notification is the only thing that resolves a Spike incident for a threshold breach. Without it, Tideways tells Spike the response time went bad and never tells it the response time came back: the incident pages your rotation and then stays open until somebody resolves it by hand.

Tick it on the same line as every threshold notification you tick, and check it after the fact — it is not on by default.
{% endhint %}

{% hint style="info" %}
Leave **Weekly Report**, **Release** and **Release Comparison** unticked unless you want to be paged about them. Nothing is wrong when they arrive and nothing arrives to resolve them.
{% endhint %}

## Step 4 — Confirm it end to end

Tideways has no "send me a test notification" button for a webhook, so the first real alert is the test. Watch for all three moments:

1. A check crosses its threshold and an incident opens in Spike, titled with the check, the reading and your project, on the service you attached, escalating through your policy.
2. Tideways re-notifies while the breach lasts, and that lands on the same incident — a second event on it, not a second page.
3. The reading comes back under the threshold and the incident resolves itself, with `back to normal` on the event list.

If the first step works and the third does not, step 3's **"and when the alert is fixed"** is the thing to check. If the first step works and the second opens a second incident, compare the two payloads on the incident pages: `notification.incident_id` should be the same number on both.

## Payload reference

Tideways sends its own payload and there is no template to edit, so this section is a reference for what lands on the incident page and for what [alert rules](../alerts/alert-rules.md) and the [Title Remapper](../alerts/title-remapper.md) can read as `data.body.<field>`.

Every notification has the same envelope — `type`, `link`, `organization`, `application`, `date` and `notification` — and everything specific to the check is inside `notification`.

A `response_time` breach, which opens the incident:

```json
{
  "type": "response_time",
  "link": "https://app.tideways.io/o/acme/storefront/issues/incident?error=0&env=production&s=web&source=webhook&status=0",
  "organization": "acme",
  "application": "storefront",
  "date": "2026-10-08 09:41",
  "notification": {
    "incidient_id": 1760000460,
    "incident_id": 1760000460,
    "status": "opened",
    "value": 1234,
    "criticalThreshold": 1000
  }
}
```

It opens an incident titled:

```
Response time up 23% (1,234 vs 1,000 threshold) on storefront
```

The `closed` notification for the same breach, which resolves it. Note that `notification.incident_id` is the number the `opened` carried — that is what joins the two, and it is why the recovery is allowed to read differently:

```json
{
  "type": "response_time",
  "link": "https://app.tideways.io/o/acme/storefront/issues/incident?error=0&env=production&s=web&source=webhook&status=0",
  "organization": "acme",
  "application": "storefront",
  "date": "2026-10-08 10:02",
  "notification": {
    "incidient_id": 1760000460,
    "incident_id": 1760000460,
    "status": "closed",
    "value": 412,
    "criticalThreshold": 1000
  }
}
```

It resolves the incident, and the event reads:

```
Response time back to normal on storefront
```

An `exception`, which carries `notification.error_group` instead of an incident id, and PHP's own sentence about the fault in `lastMessage`:

```json
{
  "type": "exception",
  "link": "https://app.tideways.io/o/acme/storefront/monitoring/error-group/1-cff6f577ede14445c911c558e3d07b68",
  "organization": "acme",
  "application": "storefront",
  "date": "2026-10-08 09:41",
  "notification": {
    "error_group": {
      "id": "1-cff6f577ede14445c911c558e3d07b68",
      "type": "PhpAllowedMemorySizeReachedError",
      "exceptionType": "PhpAllowedMemorySizeReachedError",
      "lastMessage": "Allowed memory size of 134217728 bytes exhausted (tried to allocate 32768 bytes)",
      "source": "web_profiler.controller.profiler:panelAction",
      "status": "open"
    }
  }
}
```

```
Allowed memory size of 134217728 bytes exhausted (tried to allocate 32768 bytes) in web_profiler.controller.profiler:panelAction on storefront
```

The same group once somebody moves it on in Tideways. `error_group.status` is the only field that changed, and it is what resolves the incident:

```json
{
  "type": "exception",
  "link": "https://app.tideways.io/o/acme/storefront/monitoring/error-group/1-cff6f577ede14445c911c558e3d07b68",
  "organization": "acme",
  "application": "storefront",
  "date": "2026-10-08 11:05",
  "notification": {
    "error_group": {
      "id": "1-cff6f577ede14445c911c558e3d07b68",
      "type": "PhpAllowedMemorySizeReachedError",
      "exceptionType": "PhpAllowedMemorySizeReachedError",
      "lastMessage": "Allowed memory size of 134217728 bytes exhausted (tried to allocate 32768 bytes)",
      "source": "web_profiler.controller.profiler:panelAction",
      "status": "resolved"
    }
  }
}
```

```
[RESOLVED] Allowed memory size of 134217728 bytes exhausted (tried to allocate 32768 bytes) in web_profiler.controller.profiler:panelAction on storefront
```

A `transaction-failure-rate`, the one payload type that sends Tideways' own formatted numbers and no `criticalThreshold`, plus the three fields that say where:

```json
{
  "type": "transaction-failure-rate",
  "link": "https://app.tideways.io/o/acme/storefront/performance/transactions?env=production&s=web",
  "organization": "acme",
  "application": "storefront",
  "date": "2026-10-08 09:44",
  "notification": {
    "incidient_id": 1760000520,
    "incident_id": 1760000520,
    "status": "opened",
    "transaction": "checkout::confirmAction",
    "service": "web",
    "environment": "production",
    "value": 12.5,
    "formatted_value": "12.5 %",
    "formatted_threshold": "5 %"
  }
}
```

```
Failure rate 12.5 % vs 5 % threshold on checkout::confirmAction [web/production]
```

A `missing-data`, which carries no id. `since_at_least_hours` is the threshold you configured, so it is the same on every repeat and safe in a title Spike matches on; `last_data_transmitted_at` moves, so it is kept on the incident and deliberately never read into the title:

```json
{
  "type": "missing-data",
  "link": "https://app.tideways.io/o/acme/storefront/performance/transactions?env=production&s=web",
  "organization": "acme",
  "application": "storefront",
  "date": "2026-10-08 09:41",
  "notification": {
    "transaction": "checkout::confirmAction",
    "service": "web",
    "environment": "production",
    "since_at_least_hours": 24,
    "last_data_transmitted_at": "2026-10-07 09:30"
  }
}
```

```
No data from web (production) on storefront for at least 24h
```

Spike keeps the whole body on the incident, so every field above — and anything Tideways adds to a notification later — is available to alert rules and the Title Remapper.

## Things worth knowing

* **One webhook covers every check.** There is no separate webhook per check or per project. Add the integration once on the organisation and tick it in as many projects as you like.
* **Several Spike integrations are fine.** If different teams own different projects, create one Spike integration per team and one Tideways webhook integration per Spike integration, then tick the right one in each project.
* **Resolving in Spike does not touch Tideways.** The alert stays open in Tideways until the reading recovers, and an error group stays open until somebody moves it on there.
* **`ignored` and `not_error` resolve the incident too.** Tideways is finished with the group either way, so Spike is as well — and the title says which of the three it was, so the responder can see that nobody actually fixed anything.
* **The readings are printed, not interpreted.** Tideways' webhook page does not state the unit of `value` and `criticalThreshold` on the response-time checks, so Spike prints the numbers bare rather than appending `ms` to something that might not be milliseconds.
* **Tideways' other notification channels are separate.** The email and Slack notifications you have already ticked keep working; the webhook is additional, not a replacement.

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Check three things in order. First, that the webhook integration's URL is the full `https://hooks.spike.sh/<your-token>/push-events` with nothing appended, and that the integration has not been archived in Spike.

Second, that at least one project has ticked the Spike webhook integration under **Project Settings → Notifications**. The organisation-level webhook receives nothing until a project points a notification at it, and this is the step most often missed.

Third, that the check you are expecting is one of the ones you ticked in that project. Tideways sends only what its notification settings ask for.

</details>

<details>

<summary>Incidents never resolve</summary>

For a threshold breach this is almost always the **"and when the alert is fixed"** option in **Project Settings → Notifications**. Without it Tideways never sends the `closed` notification, so there is nothing for Spike to resolve on. Tick it beside every threshold notification you have ticked.

For an exception or a slow SQL query there is no such option: the incident resolves when somebody moves the group to **Resolved**, **Not an error** or **Ignored** in Tideways.

For `missing-data`, `release`, `compare_release` and `weekly_report`, Tideways documents no recovery notification at all, so those incidents do not auto-resolve. Use a [resolve timer](../incidents/resolve-timer.md) or resolve them by hand.

</details>

<details>

<summary>Every re-notification opens its own incident</summary>

Open two of the incidents in Spike and compare the payloads on the incident pages. For a threshold breach, `notification.incident_id` should be the same number on both; for an exception or a slow SQL query, `notification.error_group.id` should be the same string. If they differ, Tideways raised separate alerts, and separate alerts are separate incidents by design — two transactions breaching their own thresholds are two incidents.

If the ids match and the incidents still pile up, check that the notification that opened the incident was delivered at all. An `ongoing` that arrives with nothing open has nothing to join, so Spike opens an incident for it rather than dropping a breach.

</details>

<details>

<summary>We get paged about the weekly report and about deploys</summary>

Untick **Weekly Report**, **Release** and **Release Comparison** for the Spike webhook integration in **Project Settings → Notifications**. They are informational, nothing arrives to resolve them, and each one leaves an incident to acknowledge by hand. If you want them in Spike anyway, send them to a second Spike integration on a service with no escalation policy.

</details>

<details>

<summary>The title does not match between the alert and its recovery</summary>

Expected, and harmless. A recovery reads `Response time back to normal on storefront` while the alert read `Response time up 23% (1,234 vs 1,000 threshold) on storefront`, because the person scanning an event list needs to know which open incident went away. Grouping and resolution are done on `notification.incident_id`, or on `notification.error_group.id` for a group — never on the title.

</details>

<details>

<summary>An incident titled "Tideways alert with no details" opened</summary>

Spike could not read anything at all from the delivery — an empty body, or a body that is not the Tideways envelope. Spike opens an incident for an unreadable delivery rather than dropping something that might be a real alert. Acknowledge it, resolve it, and send the payload on the incident page to Spike support if it keeps happening.

A delivery titled after a check you do not recognise, such as `Uptime monitor alert on storefront`, is a different thing: that is a Tideways check Spike has no special handling for yet, and the incident is real.

</details>

<details>

<summary>The severity badge is always the same</summary>

Expected. Tideways sends no severity, so incidents open at your integration's default. An [alert rule](../alerts/alert-rules.md) on `type`, `notification.status` or `notification.value` can set whatever severity you want, and can also route or suppress the incident.

</details>

Disclaimer: These integration instructions are offered independently by Spike.sh, and Spike.sh is not affiliated with nor a partner of Tideways GmbH.
