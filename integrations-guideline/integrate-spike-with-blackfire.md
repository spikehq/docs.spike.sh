---
description: >-
  Send Blackfire.io monitoring alerts to Spike over email so a warning or alarm threshold on response time, memory or throughput pages your on-call team by phone, SMS, Slack or Teams.
---

# Integrate Spike with Blackfire.io

[Blackfire.io](https://blackfire.io/) profiles PHP and Python applications and monitors them in production. Its Alerting dashboard watches a metric such as response time, memory or throughput and fires when that metric crosses a warning or an alarm threshold you set.

Blackfire has no generic webhook for monitoring alerts. The notification channels it offers are Email, Slack, PagerDuty, Opsgenie and Microsoft Teams, so the way into Spike is email: you add an Email notification channel in Blackfire whose recipient is the address on your Spike Blackfire.io integration. Every alert Blackfire emails to that address opens an incident and pages your escalation policy.

{% hint style="warning" %}
**Notification channels need Blackfire's Production plan.** Blackfire lists every notification channel, email included, under a Production requirement. On a lower plan you can create alerts and watch them in the Alerting dashboard, but nothing is sent anywhere, so there is nothing for Spike to receive. Check your plan before setting any of this up.
{% endhint %}

Nothing is installed anywhere and no code is involved. You create the integration in Spike, paste its address into Blackfire as a notification channel, and point your alerts at that channel.

## What Spike does with each email

| Email from Blackfire | What happens in Spike |
| --- | --- |
| First alert email with a given subject | Opens an incident titled with that subject and pages your escalation policy |
| A later email with the same subject, while the incident is open | Added to the incident already open as a repeat. It never pages again |
| A later email with a different subject | A different incident. A warning and an alarm on the same alert rule read differently, so expect two |
| A recovery, "back to normal", email | Its own incident, unless you ignore it with an [alert rule](../alerts/alert-rules.md). It does not resolve anything, see Step 5 below |

The subject line is the whole of the matching key. Two emails group onto one incident when their subjects are identical and drift into separate incidents when they are not, and the body of the email goes into the incident details.

## How incidents are titled

The subject line of the email becomes the incident title, unchanged. Spike does not parse a Blackfire email, because Blackfire publishes no payload for it, so whatever Blackfire writes in the subject is what on-call hears read out on a phone call or sees on a lock screen.

That makes the alert's **name** in Blackfire the one thing worth getting right. Blackfire builds the subject around the rule that fired, so a rule named `Checkout p95 response time` reads back usefully at 3am and a rule named `alert 4` does not. Name rules the way you want to hear them.

{% hint style="info" %}
Send one test alert through before you build anything on top of the subject. The exact wording Blackfire puts in the subject is Blackfire's, it is not documented publicly, and it is the string your [alert rules](../alerts/alert-rules.md) and [Title Remapper](../alerts/title-remapper.md) have to match. Read it once from a real email rather than guessing at it.
{% endhint %}

Blackfire alerts carry no severity that survives the trip through email, so incidents come in at your integration's default. Set severity per alert with [alert rules](../alerts/alert-rules.md) matching on the title, which can also route the incident to another escalation policy or suppress it entirely.

## Prerequisites

* A Blackfire environment on the Production plan, with permission to manage alerts and notification channels
* Blackfire monitoring already collecting data for the environment you want alerts on
* A Blackfire.io integration in Spike and its email address

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Blackfire.io**, attach it to a service and an escalation policy, and copy the email address shown on the integration page. That address is unique to this integration and it is the only credential involved, so treat it the way you would treat a webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Add the Spike address as a notification channel in Blackfire

{% tabs %}
{% tab title="Setup on Blackfire" %}
1. **Open the Alerting dashboard:**
   In Blackfire, select the environment you want to alert on and open its **Alerting** dashboard.

2. **Create the channel:**
   Add a notification channel of type **Email**. You can also create it inline while editing an alert, from the notification channels field.

3. **Point it at Spike:**
   Paste the address from Step 1 as the recipient, and give the channel a name that says where it goes, `Spike — perf-ops`, so nobody later wonders who is behind it.

4. **Save the channel.**
   It is now available to every alert rule in that environment.
{% endtab %}
{% endtabs %}

{% hint style="info" %}
Blackfire's default channels email you and email everyone in the environment. Leave those alone if your team wants to keep receiving the alerts themselves. Adding the Spike channel does not replace them, and an alert can notify several channels at once.
{% endhint %}

## Step 3 — Create the alert

1. On the **Alerting** dashboard, click **Add Alert**, or the arrow next to it to start from one of Blackfire's templates.
2. Give the rule a **name**. This is what on-call will read, see [How incidents are titled](#how-incidents-are-titled).
3. Pick the **metric**, response time, memory, CPU, SQL time or throughput, and its value type, average, maximum or a percentile such as p95. Throughput has no value type.
4. Set the **thresholds**: a condition (`is above`, `is below or equal`, `is different than`), a value, and how long the condition has to hold before the alert fires. A duration of a few minutes keeps a single slow request from paging anyone.
5. Optionally narrow the **context** with Blackfire's expression filters, `transaction != "health_check"`, `code in 200..399`, `method == "GET"`, so the alert covers the traffic you actually care about.
6. Select the **Spike Email channel** from Step 2, alongside any others you want.
7. Save the alert.

### Warning and alarm

Blackfire has two threshold levels on the same rule and they behave differently from what you may expect:

> The alarm threshold always takes precedence. With a warning at 90 ms and an alarm at 100 ms, a response time of 120 ms triggers only the alarm, not the warning.

So one breach produces one email, not two. Because the level is part of what Blackfire writes in the subject, a warning and an alarm on the same rule arrive as two different subjects and therefore two separate incidents in Spike. That is usually what you want, since they deserve different responses, but it is worth knowing before you go looking for one incident that changed severity.

If you only want to be paged on the serious breach, set the alarm threshold and leave the warning empty, or send the warning to a quieter channel in Blackfire and keep the Spike channel on the alarm.

## Step 4 — Set a resolve timer

Spike's email integration never auto-resolves an incident, so a Blackfire incident stays open until somebody resolves it or a timer does. Give the integration a [resolve timer](../incidents/resolve-timer.md) so an alert that fires once overnight does not leave an incident open all week:

1. Edit the Blackfire.io integration in Spike.
2. Scroll to **Advanced Configuration** and turn on **Resolve by Timer**.
3. Set a duration comfortably longer than the window your alerts evaluate over, so a problem that is still firing is not resolved out from under the person looking at it.

| Alert duration in Blackfire | Suggested resolve timer |
| --- | --- |
| 1–5 minutes | 30 minutes |
| 10–15 minutes | 1 hour |
| An hour or more | 4 hours |

A repeat of the same alert is added to the open incident but does not restart the timer. If the timer fires while the metric is still over the threshold, the next email opens a fresh incident and pages again, which is the behaviour you want for a problem nobody picked up.

## Step 5 — Decide what happens to the recovery email

Blackfire notifies on every change of alert state, which includes the return to normal, and its alert history records both when an alert triggered and when it recovered. That recovery notification is useful in a mailbox and awkward in an incident tool:

* It **does not resolve** the Spike incident. Spike's email integration matches on the subject line and has no way to read a recovery out of an email body, so the resolve timer in Step 4 is the mechanism, not the recovery email.
* It **describes a different state**, so unless Blackfire repeats the trigger subject verbatim, the subject differs and Spike treats the email as a new alert and opens a second incident.

Confirm what your own recovery email looks like, then pick one of these:

| What you want | How |
| --- | --- |
| No recovery incident at all | An [alert rule](../alerts/alert-rules.md) on the Blackfire.io integration: **Incident title contains** the wording Blackfire uses for a recovery → action **Ignore incident** |
| The recovery visible, but silent | The same rule with action **Resolve incident**, so it lands as a resolved incident nobody is paged for |
| Recoveries kept out of Spike entirely | Use a separate Blackfire notification channel for recoveries if your alert lets you split them, and leave the Spike channel on the trigger |

{% hint style="warning" %}
Write that alert rule against a real recovery email, not against a guess. If the text you match on is wrong, the rule silently does nothing and you get a second incident every time something recovers.
{% endhint %}

## Escalations on Blackfire's side

Blackfire can send an additional notification when an alert stays in the same state for a period you set. Those escalations are independent of Spike's [escalation policies](../escalations/introduction-to-escalations.md) and they arrive as more email on the same address.

Pick one side to escalate on. Spike's escalation policy already moves an unacknowledged incident up your rotation, so a Blackfire escalation on top of it usually means the same problem paging twice through two different ladders. Leave Blackfire's escalations off when Spike is the pager, and use them only for people who are not in Spike at all.

## Things worth knowing

* **The address is the credential.** Anything that can email it can open an incident in your account. Keep it out of shared inboxes, tickets and screenshots. If it leaks, archive the integration and create a new one, then update the notification channel in Blackfire.
* **The subject is everything.** It is the title, and it is the only thing Spike groups repeats on. An alert whose subject carries a timestamp or a measured value changes on every send and lands as a string of separate incidents rather than one incident that repeated.
* **There is a 30 MB limit** on an inbound email, the same as the generic [email integration](integrate-spike-with-email.md).
* **One integration can take many alerts.** Every alert in the environment can use the same Spike channel, and each distinct subject gets its own incident. Use separate Spike integrations when different alerts should page different teams, or keep one and split with [alert rules](../alerts/alert-rules.md).
* **Blackfire's old build webhook is not an option.** The generic webhook that posted `state`, `description`, `external_id` and `report_web_url` belonged to hosted Synthetic Monitoring, which Blackfire removed on 30 May 2026. Monitoring alerts never used it, and there is nothing to point at Spike.

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

## Troubleshooting

<details>

<summary>No incidents show up in Spike</summary>

Check the plan first. Notification channels require Blackfire's Production plan, and on a lower plan an alert can fire and show in the Alerting dashboard while nothing is sent to anyone.

After that, work backwards: confirm the alert actually fired in the Blackfire alert history, that the Spike Email channel is selected on that alert and not only created, and that the recipient address matches the one on the Spike integration page character for character. A typo in the address fails silently, since there is no inbox behind these addresses to bounce into.

</details>

<details>

<summary>The alert fires in Blackfire but only sometimes reaches Spike</summary>

Usually the threshold duration. Blackfire only notifies once the condition has held for the duration you set, so a metric flapping either side of the threshold can show up on the dashboard without ever holding long enough to send. Lower the duration if you want those, or raise it if the alert is noisy.

Also check that the alert is not resolving and re-triggering faster than your resolve timer, which makes the second breach join the first incident rather than page again.

</details>

<details>

<summary>One alert opened several incidents</summary>

The subjects differed. The common causes are a warning and an alarm on the same rule, which read differently, and a recovery email, which is a state change of its own, see Step 5.

If the subjects of repeated *trigger* emails also differ from each other, Blackfire is putting something variable in the subject. Match the stable part of it with an alert rule, or use a [Title Remapper](../alerts/title-remapper.md) on the integration to normalise the title so repeats group.

</details>

<details>

<summary>Incidents never close</summary>

Expected without a resolve timer. Spike's email integration does not auto-resolve, and Blackfire's recovery email cannot close an incident. Turn on **Resolve by Timer** on the integration as in Step 4, or add a **Resolve by Timer** action on an [alert rule](../alerts/alert-rules.md) if you only want it for some alerts.

</details>

<details>

<summary>On-call is being paged twice for the same problem</summary>

Two likely causes. Either Blackfire's own escalation is running alongside Spike's escalation policy, in which case turn Blackfire's off, or the warning and the alarm on one rule are both pointed at the Spike channel and both fired as the metric climbed. Send the warning somewhere quieter and keep Spike on the alarm.

</details>

<details>

<summary>The incident title is unreadable</summary>

The title is Blackfire's subject line, so it is fixed by how the alert is named in Blackfire. Rename the alert to something a person can act on, `Checkout p95 response time` rather than `alert 4`, and new incidents pick it up. A [Title Remapper](../alerts/title-remapper.md) on the integration rewrites titles without touching Blackfire, but keep the rewritten title stable or repeats stop grouping.

</details>
