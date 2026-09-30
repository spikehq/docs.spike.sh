---
description: >-
  Send Honeybadger errors, uptime checks and cron check-ins to Spike so a fault pages your on-call rotation by phone, SMS, Slack or Teams, and the incident closes itself when Honeybadger reports the fault resolved, the site back up or the check-in reporting again.
---

# Integrate Spike with Honeybadger

[Honeybadger](https://www.honeybadger.io/) watches three things for an application: the exceptions it raises, the uptime of the sites it serves, and the cron jobs that are supposed to check in. When any of them needs attention, Honeybadger posts a notification to every integration on the project.

Its **WebHook** integration posts those notifications as JSON. Point it at a Spike integration URL and a new error pages your on-call rotation, the same error firing again lands on the incident already open instead of paging a second time, and the incident resolves itself when somebody marks the fault resolved in Honeybadger, when the site comes back up, or when the check-in reports in.

Nothing is installed anywhere. One webhook per Honeybadger project covers errors, uptime and check-ins together.

## One webhook, thirteen events

Every Honeybadger notification arrives at the same URL and says which kind it is in a top-level `event` field. All thirteen are handled on purpose:

| `event` | What it means in Honeybadger | What happens in Spike |
| --- | --- | --- |
| `occurred` | An error was raised | Opens an incident and pages your escalation policy. The same fault again joins that incident |
| `rate_exceeded` | A fault is firing faster than its threshold | Joins the fault's open incident. Opens one if nothing is open, since a project can have this enabled and `occurred` switched off |
| `unresolved` | A resolved fault came back, or somebody re-opened it | Reopens that fault's resolved incident rather than opening a second one. Opens one if Spike never saw the fault |
| `resolved` | Somebody marked the fault resolved | **Auto-resolves** the fault's incident. Dropped when nothing is open |
| `down` | An uptime check failed | Opens an incident and pages your escalation policy |
| `up` | The site answers again | **Auto-resolves** that site's downtime incident. Dropped when nothing is open |
| `cert_will_expire` | A monitored site's TLS certificate expires soon | Opens its own incident, separate from any downtime incident for the same site. Never auto-resolves, see Step 4 below |
| `check_in_missing` | A cron job did not check in | Opens an incident and pages your escalation policy |
| `check_in_reporting` | The cron job checked in again | **Auto-resolves** that check-in's incident. Dropped when nothing is open |
| `volume_spike` | Errors across the project are above their normal rate | Opens an incident. Never auto-resolves, see Step 4 below |
| `assigned` | A fault was assigned to somebody | Never opens an incident and never pages. Added as an event to that fault's incident if one is open, dropped otherwise |
| `commented` | Somebody commented on a fault | Never opens an incident and never pages. Added as an event to that fault's incident if one is open, dropped otherwise |
| `deployed` | A deploy was reported to Honeybadger | Never opens an incident and never pages. Always dropped |

The three that page nobody are the three that are activity rather than a problem. A deploy, an assignment and a comment all happen while somebody is already working, and none of them is something to wake a person for.

{% hint style="info" %}
Send everything. There is nothing to filter on Spike's side because the events that should not page are already handled, and the recoveries have to arrive for anything to auto-resolve. In particular, switching off `resolved`, `up` or `check_in_reporting` in Honeybadger turns auto-resolve off for that family without changing anything in Spike.
{% endhint %}

## What identifies the same problem

Spike matches every Honeybadger notification to an incident by the id Honeybadger gives the thing the notification is about — never by the words in the notification:

| Family | Identity | Which events share it |
| --- | --- | --- |
| Errors | `fault.id` | `occurred`, `rate_exceeded`, `unresolved`, `resolved`, `assigned`, `commented` |
| Uptime | `site.id`, together with the kind of problem | `down`, `up`, `cert_will_expire` |
| Check-ins | `check_in.id` | `check_in_missing`, `check_in_reporting` |
| Error volume | `project.id`, together with the kind of problem | `volume_spike` |

That is what makes one problem one incident. A fault that fires five hundred times carries one `fault.id` on all five hundred notices, so it pages once and the incident shows the repeats. The `resolved` that ends it carries the same id, so it finds the incident and closes it. Read more about [grouping](../incidents/grouping-incidents.md) and about [suppressing duplicates](../incidents/rate-limiting-on-duplicate-incidents.md) while an incident is open.

Matching on the id rather than the title matters most where Honeybadger's own wording moves. The notification for an error quotes your application's own error text, and that routinely ends in the instant it was raised:

```
[Crywolf/production] RuntimeError: This is a runtime error, generated by the crywolf app at 2015-08-06 15:12:28 -0700
[Crywolf/production] RuntimeError: This is a runtime error, generated by the crywolf app at 2015-08-06 15:22:41 -0700
```

Two notices, ten minutes apart, about one unchanged bug. `fault.id` is `13760144` on both, so they are one incident.

### The same site can hold two incidents

A site can be down and also be serving a certificate that expires next week. Those are two problems, two people's work, and two incidents, so the uptime identity is `site.id` **and** the kind of problem together:

* A `cert_will_expire` for a site that is already down opens its own incident rather than joining the outage.
* The `up` that follows closes only the downtime incident. The certificate warning stays open, because the site answering again says nothing about its certificate.

### When Honeybadger sends no id

Honeybadger's own test deliveries are sparse, and a truncated one can be sparser still. A notification that arrives with no `fault.id`, no `site.id` or no `check_in.id` is matched on its incident title instead, which is built to be the same string for every notification about one problem (see [Incident titles](#incident-titles) below).

A recovery that reaches that fallback finds nothing — an incident titled "Heroku is back up" is not something Spike ever opened — so it is dropped and the incident it was meant to close stays open. That is deliberate. A missed auto-resolve costs somebody a manual close; a wrong one silences the page for a problem that is still happening.

## Incident titles

The title is built from the fields that name the problem, keeping Honeybadger's own `[Project]` or `[Project/environment]` prefix exactly as it sends it:

| `event` | Incident title in Spike |
| --- | --- |
| `occurred` | `[Crywolf/production] RuntimeError in pages#runtime_error` |
| `rate_exceeded` | `[Crywolf/production] RuntimeError in pages#runtime_error is firing repeatedly` |
| `unresolved` | `[Crywolf/production] RuntimeError in pages#caused_exception is back` |
| `resolved` | `[Crywolf/production] RuntimeError in pages#runtime_error resolved` |
| `down` | `[Testy McTestFace] Heroku is down: Connection timed out` |
| `up` | `[Testy McTestFace] Heroku is back up` |
| `cert_will_expire` | `[My Private Project] SSL certificate for gerlach-bergnaum.net expires soon` |
| `check_in_missing` | `[Voyager Test] Check-in Voyager is missing` |
| `check_in_reporting` | `[Voyager Test] Check-in Voyager is reporting again` |
| `volume_spike` | `[Testy McTestFace] Error volume spike` |
| `assigned` | `[Crywolf/production] RuntimeError assigned to Benjamin Curtis` |
| `commented` | `[Crywolf/production] Joshua Wood commented on RuntimeError: Honeybadger *does* care!` |
| `deployed` | `[Crywolf/production] Deployed by josh` |

An error is named the way Honeybadger's own fault page names it: the exception class, then where it was raised. `fault.component` and `fault.action` place it — `RuntimeError in pages#runtime_error` is the controller and action a Rails responder opens first. A fault with neither is named by your application's own error text instead, because the class alone would collapse every `NoMethodError` in one environment into one title:

```
[Crywolf/production] ZeroDivisionError: divided by 0 in the nightly billing run
```

{% hint style="info" %}
Every timestamp is left out of the title, including the one inside your application's error text, along with the notice and comment counts, "has occurred 5 time(s) in the past minute", "back up after 1m 23s", "hasn't checked in for 4 years", the certificate's exact expiry and the volume spike's figures. Those are readings: they move between notifications about one unchanging problem, and a title that moves breaks the things that read it — the **Repeated N times** grouping, duplicate suppression, and any [alert rule](../alerts/alert-rules.md) matching on title text. They are all kept in the payload, which the incident page shows in full.
{% endhint %}

### Title Remapper sample

A [Title Remapper](../alerts/title-remapper.md) replaces the title with one you write against the payload, which is how a team that reads errors by class and environment gets exactly that:

```handlebars
{{data.body.fault.klass}} in {{data.body.fault.environment}} ({{data.body.project.name}})
```

Output: `RuntimeError in production (Crywolf)`

Build a remapper from `fault.klass`, `fault.component`, `fault.action`, `fault.environment`, `site.name` and `check_in.name`. Those do not change over the life of a problem. Avoid the top-level `message`, `fault.message`, `outage.reason` and anything counted or timed: a title built on them moves between notifications, and for a delivery with no id the title is the only thing left to match on.

## Severity and priority

Honeybadger sends no severity and no priority field on any of the thirteen events, so nothing is lifted from the payload into either. Honeybadger incidents carry no severity of their own, and [alert rules](../alerts/alert-rules.md) are how you set one.

The **Incident details** condition reads any key in the payload, including a nested one, which is what makes this useful here:

| What you want | Condition | Action |
| --- | --- | --- |
| Production faults at SEV1 | `fault.environment` equals `production` | Set severity SEV1 |
| Staging faults triaged, not paged | `fault.environment` equals `staging` | Set severity SEV3, or suppress |
| Outages straight to the platform team | `event` equals `down` | Change escalation policy |
| Certificate warnings off the pager | `event` equals `cert_will_expire` | Set severity SEV3 and resolve by timer |

Read more about [priority and severity](../incidents/priority-and-severity.md).

## Prerequisites

* A Honeybadger project, and an account that can edit its alerts and integrations
* A Honeybadger integration in Spike and its webhook URL

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Honeybadger**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Add the webhook in Honeybadger

From the [Honeybadger](https://app.honeybadger.io/) dashboard, select your project, then go to **Settings** and choose **Alerts and Integrations**.

![Select Alerts and Integrations](<../.gitbook/assets/image (25).png>)

Scroll down until you find the **WebHook** option and select it.

![Select WebHook from the list](<../.gitbook/assets/image (26).png>)

Paste the Spike integration URL from Step 1 into the input field and save.

![Paste the Integration URL](<../.gitbook/assets/image (27).png>)

Then choose which events this webhook should send, in the webhook's own settings. Send all of them unless you have a reason not to; the table at the top of this page is what Spike does with each, and the three that are activity rather than a problem already page nobody.

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

## Step 3 — Confirm it end to end

Honeybadger can send a test notification from the project's integration settings, which arrives as an `occurred` and is enough to prove the URL works. Confirm the rest with one real fault, because a test notification is sparse — it carries a placeholder `fault.id` and nothing to resolve:

1. Raise an error in a test environment. An incident opens in Spike, titled with the exception class and where it was raised, on the service you attached and escalating through your policy.
2. Raise the same error again. It joins that incident and pages nobody.
3. Mark the fault resolved in Honeybadger. The incident auto-resolves.
4. If you monitor uptime, pause a monitored site or point a check at something that fails, then restore it. One incident opens on the `down` and closes on the `up`.

If step 1 works and step 3 does not, check that `resolved` is one of the events the webhook sends.

## Step 4 — Set a resolve timer for what never recovers

Two events have no recovery notification anywhere in Honeybadger:

* `cert_will_expire` — Honeybadger sends nothing when a certificate is renewed.
* `volume_spike` — there is no "volume back to normal" notification.

Nothing Honeybadger sends can close those incidents, so a [resolve timer](../incidents/resolve-timer.md) or a human is what does.

{% hint style="warning" %}
Set the timer with an [alert rule](../alerts/alert-rules.md) rather than on the integration. A timer on the integration applies to every Honeybadger incident, including the faults, outages and check-ins that auto-resolve properly — and it would close those on a schedule while they are still broken. An alert rule with the **Incident details** condition on `event` equal to `cert_will_expire`, or to `volume_spike`, and a **Resolve by Timer** action, times out only the two that need it.
{% endhint %}

A day is a reasonable timer for a certificate warning and an hour or two for a volume spike. Both describe a condition somebody reads and acts on during working hours rather than one that needs an open incident overnight.

## The Honeybadger-Token header

Honeybadger sends a `Honeybadger-Token` header on every delivery, and an `Authorization: Bearer <token>` header as well if you configured one on the webhook. Spike does not verify either, so there is nothing to paste anywhere and nothing to configure.

That makes your webhook URL the credential, exactly as it is for every other Spike integration: it carries a token only your integration has. Treat it as a secret, and if it leaks, archive the integration in Spike, create a new one, and paste the new URL into Honeybadger.

## Payload reference

Honeybadger posts `application/json`. Only the fields Spike reads are annotated below; every other field is kept on the incident and is available to [alert rules](../alerts/alert-rules.md) and the [Title Remapper](../alerts/title-remapper.md) as `data.body.<field>`. Some objects are shortened here to the keys worth reading — Honeybadger's own `project` block, and the HTTP response headers it reports on an outage, are longer than this.

An `occurred`, which opens the incident. `fault.id` is the identity, and `fault.klass`, `fault.component` and `fault.action` build the title:

```json
{
  "event": "occurred",
  "message": "[Crywolf/production] RuntimeError: This is a runtime error, generated by the crywolf app at 2015-08-06 15:12:28 -0700",
  "project": { "id": 1717, "name": "Crywolf", "token": "zzz111" },
  "fault": {
    "project_id": 1717,
    "klass": "RuntimeError",
    "component": "pages",
    "action": "runtime_error",
    "environment": "production",
    "resolved": false,
    "ignored": false,
    "created_at": "2015-07-02T18:57:26.757Z",
    "comments_count": 4,
    "message": "This is a runtime error, generated by the crywolf app at 2015-07-16 10:44:13 -0700",
    "notices_count": 4,
    "last_notice_at": "2015-08-06T22:12:28.736Z",
    "tags": [],
    "id": 13760144,
    "assignee": null
  },
  "context": { "user_id": 1, "first_name": "Stella", "last_name": "Kertzmann" }
}
```

Title: `[Crywolf/production] RuntimeError in pages#runtime_error`

The `resolved` for that fault. Its wording has nothing in common with the `occurred` — which is exactly why the match is on `fault.id` and not on words:

```json
{
  "event": "resolved",
  "message": "[Crywolf/production] RuntimeError resolved by Joshua Wood",
  "actor": { "id": 3, "email": "josh@hintmedia.com", "name": "Joshua Wood" },
  "fault": {
    "project_id": 1717,
    "klass": "RuntimeError",
    "component": "pages",
    "action": "runtime_error",
    "environment": "production",
    "resolved": true,
    "ignored": false,
    "notices_count": 3,
    "last_notice_at": "2015-08-06T22:11:43.738Z",
    "tags": [],
    "id": 13760144,
    "assignee": null
  }
}
```

The incident auto-resolves. A `resolved` carrying a different `fault.id` leaves it open.

A `down`, which opens an outage incident. `site.id` is the identity and `outage.reason` is the second half of the title:

```json
{
  "event": "down",
  "message": "[Testy McTestFace] Heroku is down.",
  "project": { "id": 123321, "name": "Testy McTestFace", "token": "zzz111" },
  "site": {
    "id": "c42c4c0a-6e3d-4303-9769-549ed2a5818e",
    "name": "Heroku",
    "url": "https://example.com",
    "frequency": 5,
    "match_type": "success",
    "state": "down",
    "active": true,
    "last_checked_at": "2023-10-30T19:34:08.150725Z",
    "retries": 0,
    "cert_will_expire_at": null,
    "details_url": "https://app.honeybadger.io/projects/123321/sites/c42c4c0a-6e3d-4303-9769-549ed2a5818e"
  },
  "outage": {
    "down_at": "2023-07-17T15:46:52.384701Z",
    "up_at": null,
    "status": null,
    "reason": "Connection timed out",
    "headers": null
  }
}
```

Title: `[Testy McTestFace] Heroku is down: Connection timed out`

The `up` for the same site, which closes it:

```json
{
  "event": "up",
  "message": "[Testy McTestFace] Heroku is back up after 1m 23s.",
  "site": {
    "id": "c42c4c0a-6e3d-4303-9769-549ed2a5818e",
    "name": "Heroku",
    "state": "up",
    "last_checked_at": "2023-10-30T19:35:31.402118Z"
  },
  "outage": {
    "down_at": "2023-07-17T15:46:52.384701Z",
    "up_at": "2023-07-17T15:48:15.771903Z",
    "status": 200,
    "reason": "Connection timed out"
  }
}
```

{% hint style="info" %}
Spike reads `event` and never `site.state` or `outage.up_at`. Honeybadger's own published examples show a `down` whose `outage.up_at` is already filled in and a `cert_will_expire` whose `site.state` is `up`, so neither field can say whether a site is healthy. `event` is the reliable signal, and it is matched without regard to case.
{% endhint %}

The `check_in_reporting` that closes a missing check-in's incident. `check_in.id` is the identity, and note what `state` says:

```json
{
  "event": "check_in_reporting",
  "message": "[Voyager Test] REPORTING: Voyager is reporting again",
  "project": { "id": 67747, "name": "Voyager Test", "token": "abcd1234" },
  "check_in": {
    "state": "missing",
    "schedule_type": "simple",
    "reported_at": "2019-12-23T21:39:37.124397Z",
    "expected_at": "2023-10-30T19:42:28.853152Z",
    "missed_count": 33385,
    "grace_period": "00:00:00",
    "id": "XYZLOL",
    "name": "Voyager",
    "url": "https://api.honeybadger.io/v1/check_in/XYZLOL",
    "report_period": "1 hour"
  }
}
```

`check_in.state` still says `missing` on the event that means the job is reporting again — that is Honeybadger's own published example, not a mistake in this page. Spike keys on `event` and `check_in.id`, so the incident auto-resolves regardless.

A `deployed`, which names no fault, no site and no check-in, and so is dropped rather than attached to anything:

```json
{
  "event": "deployed",
  "message": "[Crywolf/production] josh deployed Crywolf to production",
  "deploy": {
    "environment": "production",
    "revision": "bf84aaf12acd2fb9bc943ec638d8330abae929f8",
    "repository": "git@github.com:honeybadger-io/crywolf.git",
    "local_username": "josh",
    "created_at": "2015-08-06T22:09:44.672Z"
  }
}
```

## Things worth knowing

* **One webhook covers all three families.** Errors, uptime and cron check-ins arrive at the same URL. There is nothing to set up per fault, per site or per check-in.
* **Several Spike integrations are fine.** Create one Spike integration per Honeybadger project when different projects should page different teams, and add one webhook per project pointing at its own URL. A single project cannot split its events across two URLs on Spike's side — use [alert rules](../alerts/alert-rules.md) for that.
* **Resolving in Spike does not touch Honeybadger.** The fault stays unresolved in Honeybadger until somebody resolves it there. Resolve it in Honeybadger and let the `resolved` webhook close the Spike incident to keep the two sides in step.
* **`unresolved` reopens rather than duplicates.** A fault that comes back after being resolved reopens the same Spike incident and pages again.
* **A repeat does not restart a resolve timer.** If you set one, a fault still firing when the timer ends is resolved by timer, and the next notice opens a fresh incident and pages again — which is the behaviour you want for a problem nobody picked up.
* **Nothing changes in your application.** This page is about the webhook Honeybadger sends outwards. The `honeybadger` gem or package in your own code reports errors *to* Honeybadger and needs no change for any of this.

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Check that the URL saved in Honeybadger is the full `https://hooks.spike.sh/<your-token>/push-events`, with nothing appended, and that the integration has not been archived in Spike. Then send a test notification from the project's integration settings in Honeybadger, which arrives as an `occurred` and should open an incident within seconds.

If the test notification arrives but real errors do not, the webhook is not subscribed to `occurred`. Check which events it sends.

</details>

<details>

<summary>A resolved fault leaves the incident open</summary>

Three things to check, in this order.

First, whether Honeybadger sent the `resolved` at all — it is a separate event from `occurred` and a webhook can be subscribed to one without the other.

Second, whether the incident was still open. Spike only resolves an incident that is open; a `resolved` arriving after somebody closed it by hand, or after a resolve timer fired, has nothing to act on and is dropped.

Third, `fault.id`. Open the incident in Spike, look at `fault.id` on the payload, and compare it with the fault you resolved in Honeybadger. Spike closes an incident only on a matching id, on purpose: a recovery it cannot tie to the problem it ends leaves the incident open rather than silencing a page for something still happening.

</details>

<details>

<summary>A recovery opened its own incident saying "resolved" or "back up"</summary>

That was the behaviour before this integration had recovery handling, and it means the delivery carried no id Spike could match on. A `resolved` with no `fault.id`, or an `up` with no `site.id`, falls back to matching on the title and finds nothing — but it is also never allowed to open an incident, so what you are looking at is more likely the older behaviour on an incident opened before the change, or a hand-crafted test delivery.

If a live delivery does this, capture the payload from the incident page and send it to [support@spike.sh](mailto:support@spike.sh).

</details>

<details>

<summary>Every occurrence of one error opens its own incident</summary>

Compare `fault.id` across two of those incidents on the incident page. Different ids mean Honeybadger considers them different faults, which are different incidents by design.

The same id on both means the earlier incident was already resolved when the later notice arrived, by hand or by a resolve timer, because Spike only appends to an incident that is still open. If a resolve timer is doing it, move it off the integration and onto an [alert rule](../alerts/alert-rules.md) scoped to `cert_will_expire` and `volume_spike`, as described in Step 4.

</details>

<details>

<summary>Deploys, comments or assignments are paging the team</summary>

They should not be able to. `assigned`, `commented` and `deployed` can never open an incident, and a `deployed` is dropped outright. What they can do is land on an incident that is already open for the same fault, which shows up as extra events on it rather than as a new page.

If you would rather not see them at all, stop sending those three from the webhook in Honeybadger.

</details>

<details>

<summary>A certificate warning and an outage look like one incident, or one closed the other</summary>

They are separate on purpose. The uptime identity is the site **and** the kind of problem, so a `cert_will_expire` for a site that is down opens its own incident, and the `up` that follows closes only the downtime one. The certificate incident stays open until the timer in Step 4 fires or somebody closes it, because Honeybadger sends nothing when a certificate is renewed.

If a certificate warning did join an outage incident, check whether the two payloads carry the same `site.id` and different `event` values, and send them to [support@spike.sh](mailto:support@spike.sh).

</details>

<details>

<summary>Certificate or volume spike incidents never close</summary>

Expected. Neither has a recovery notification anywhere in Honeybadger, so nothing delivered to Spike can close them. Add the alert rule in Step 4, or close them by hand.

</details>

<details>

<summary>The title is not Honeybadger's own sentence</summary>

Correct, and deliberate. Honeybadger's sentence quotes things that move between notifications about one unchanging problem — the instant the error was raised, the outage's duration, the certificate's expiry to the second, the spike's counters — and a title that moves stops repeats grouping onto one incident. The title is built from the exception class, the component and action, the site name or the check-in name instead, and Honeybadger's full sentence is on the incident page as `message` in the payload.

Use a [Title Remapper](../alerts/title-remapper.md) to write your own, building it only from fields that do not move. See the [Title Remapper sample](#title-remapper-sample) above.

</details>
