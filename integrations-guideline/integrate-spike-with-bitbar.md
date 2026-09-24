---
description: >-
  Send BitBar test run failure emails to Spike so a failed real-device run pages your QA on-call by phone, SMS, Slack or Teams.
---

# Integrate Spike with BitBar

[BitBar](https://bitbar.com/) is SmartBear's real-device cloud for mobile and browser tests. It tells you about test run results by email and by Slack webhook, and has no generic webhook that posts a payload Spike can parse, so the path into Spike is email. The BitBar integration in Spike is an email integration: what you copy out of it is an inbound address rather than a URL, and every failure email BitBar sends to that address opens an incident and pages your escalation policy.

BitBar has no recovery notification. A run that passes after a run that failed sends nothing that says the problem is over, so nothing on the email path can close the incident. Set a [resolve timer](../incidents/resolve-timer.md), as in Step 3 below, and treat it as part of the setup rather than as an option.

## What Spike does with each email

| Email BitBar sends to the address | What happens in Spike |
| --- | --- |
| The first failure email | Opens an incident titled with the subject line and pages the escalation policy |
| A later email with the same subject, while that incident is open | [Grouped](../incidents/grouping-incidents.md) onto the open incident as a repeat. It never pages again |
| A later email with a different subject | A separate incident, paging on its own |
| A run that passes | Nothing at all, as long as the notification in BitBar is scoped to failures |
| Any email that arrives after the incident was resolved | Opens a fresh incident and pages again |

The subject line is the whole of Spike's view of what a BitBar email is about. It is the incident title, and it is what repeats are matched on. The body of the email becomes the incident details.

## How incidents are titled

Spike uses BitBar's subject line as the title, exactly as BitBar wrote it, and does not parse it any further. Whatever BitBar puts in the subject is what on-call reads on a lock screen, or hears when Spike calls them.

Look at one real failure email before you rely on this. Add your own address to the same notification, or forward the first one Spike receives to yourself. What the subject carries decides how incidents group:

| If the subject is | What you get in Spike |
| --- | --- |
| The same text for every failed run of a project | One incident per project. Later failures group onto it while it is open, and the repeat count on the incident tells you how often the suite is failing |
| Carrying the run name, number or a timestamp | One incident per failed run, each paging on its own. Nothing groups, so the resolve timer is what keeps the incident list short |

Neither is wrong, but they page differently, so it is worth knowing which one your account does before the first 3am call.

Since the subject is the title, [alert rules](../alerts/alert-rules.md) that match on the incident title are how you treat some BitBar runs differently from others: route the ones naming your checkout project to a different escalation policy, set a severity, or suppress the ones from a project nobody is on-call for.

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → BitBar**, attach it to a service and an escalation policy, and copy the email address shown on the integration page. It is an inbound address with no inbox behind it. Everything sent to it becomes an incident on this integration.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

{% hint style="warning" %}
That address is the credential. Anyone who can email it can open incidents on your service, so treat it the way you would treat a webhook URL. If it leaks, [archive the integration](archive-an-integration.md), create a new one, and update the notification in BitBar with the new address.
{% endhint %}

## Step 2 — Send BitBar's failed run notifications to it

In BitBar, open **My account** from the top-right corner, which is where BitBar keeps its integrations and notification settings, and add an email notification with:

* **Channel**: email
* **Destination**: the address you copied in Step 1
* **Scope**: failed test runs. BitBar's scopes are per project, for failed runs and for successful runs, or account wide for all events, test runs, system messages and checks. Pick the failed test run scope
* **Project**: the project whose failures should page somebody

Save it, then fail a run on purpose rather than waiting for the suite to fail by itself. The incident shows up in Spike within a few seconds of the run finishing.

{% hint style="warning" %}
BitBar does not document this screen publicly. Its documentation says only that email notifications are turned on and off from user settings, and shows **My account** as the home of its other integrations, so the labels above can read differently in your version of BitBar. Look for the setting whose channel is email, whose destination is an address and whose scope is a failed test run. Those three fields are the ones BitBar's own [API client](https://github.com/bitbar/testdroid-api) uses for a notification, where the failure scope is named `TEST_RUN_FAILURE`, so they are the surest way to recognise the right screen whatever your version calls it.
{% endhint %}

{% hint style="info" %}
Do not point a successful-run notification at the same address. A success email carries a subject of its own, so Spike would open an incident for it and page the on-call with good news. Send failures only.
{% endhint %}

## Step 3 — Set a resolve timer

Nothing BitBar sends over email can close an incident, so without a timer every failed run leaves an incident open until a human resolves it. In Spike, edit the BitBar integration, scroll to **Advanced Configuration**, turn on **Resolve by Timer**, and give it a duration comfortably longer than the gap between runs of the suite:

| How often the suite runs | Suggested resolve timer |
| --- | --- |
| On every commit or pull request | 1 hour |
| Hourly | 4 hours |
| Nightly | 1 day |

A repeat email is added to the open incident but does not restart the timer. If the timer fires while the suite is still failing, the next failure email opens a fresh incident and pages again, which is what you want for a failure nobody picked up.

{% hint style="info" %}
A **Resolve After** action on an [alert rule](../alerts/alert-rules.md) does the same thing for some incidents rather than all of them, which is useful when one BitBar integration carries both a nightly suite and a per-commit one.
{% endhint %}

## Why email and not a webhook

BitBar's outbound channels are email, a Slack incoming webhook URL under **My account**, and a hook URL you can pass when you start a test run from CI. The Slack URL carries Slack's own message format, and the run hook URL is meant for your own CI script to consume. Neither posts a payload Spike parses today, which is why the BitBar integration in Spike is an email integration. If a richer BitBar integration would help your team, tell us at [support@spike.sh](mailto:support@spike.sh).

## Things worth knowing

* **There is no recovery email.** BitBar never says a project is green again, so the resolve timer in Step 3, or a human, is what closes a BitBar incident.
* **Several notifications can share one address.** They all land on the same service and the same escalation policy. Create a second BitBar integration in Spike when a second team should be paged, and scope that team's BitBar notification to their project.
* **Spike never reads BitBar back.** The incident carries the subject and the body of the email and nothing else. Device logs, screenshots and video stay in BitBar, so keep the run's link in the notification if BitBar offers the choice.
* **There is a 30 MB limit on an inbound email**, which is the same limit every [email integration](integrate-spike-with-email.md) has. BitBar's notifications are text, so this only matters if you route something else at the same address.
* **The address is the only authentication.** Email carries no signature Spike can check, so an address that has leaked should be replaced rather than filtered.

## Troubleshooting

<details>

<summary>No incident shows up after a failed run</summary>

Check the Spike side first: send a plain email to the integration's address from your own mail client. If that opens an incident, Spike is working and the notification in BitBar is what needs attention.

Then check, in BitBar, that the notification was saved, that its scope is the failed test run scope rather than a successful one, and that it covers the project whose run you failed. A notification scoped to a different project stays silent no matter how badly the suite fails.

Finally, confirm the address was pasted whole. It is long, and an address that lost its last few characters bounces somewhere you will never see.

</details>

<details>

<summary>Successful runs are opening incidents</summary>

A notification with a success scope is pointed at the address as well. Remove it in BitBar and keep the failure one.

If you need it there for another reason, add an [alert rule](../alerts/alert-rules.md) whose condition is the incident title containing the wording of a success subject, and whose action suppresses the incident.

</details>

<details>

<summary>Every failure opens its own incident instead of grouping</summary>

Then the subject carries something that changes per run, usually a run number or a timestamp, and two emails with different subjects are two different incidents by design. Either accept one incident per failed run, which is often what a QA team wants, or send the notification for a project whose subject stays constant.

The other cause is that the earlier incident was already resolved, by hand or by the resolve timer, when the next email arrived. Spike only groups onto an incident that is still open. If that happens constantly, raise the resolve timer above the gap between runs.

</details>

<details>

<summary>Incidents never close</summary>

Expected without a resolve timer, since BitBar has no recovery email to close them with. Turn on **Resolve by Timer** on the integration as in Step 3, or resolve by hand once the run is green again.

</details>

<details>

<summary>Repeated failures are not paging anyone</summary>

That is grouping doing its job. While an incident is open, a later email with the same subject is recorded on it as a repeat and pages nobody, so a suite that fails every hour wakes the on-call once rather than all night.

If each failed run really must page, shorten the resolve timer so the previous incident closes between runs, or use [acknowledgement timeouts](../incidents/acknowledge-timeout.md) to keep escalating an incident nobody has picked up.

</details>
