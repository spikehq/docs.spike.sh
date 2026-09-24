---
description: >-
  Send Atatus alerts and error notifications to Spike so APM, browser,
  infrastructure, Kubernetes and log alerts page your on-call team by phone,
  SMS, Slack or Teams, and an alert Atatus closes resolves the incident.
---

# Integrate Spike with Atatus

[Atatus](https://www.atatus.com) watches your applications with APM, browser monitoring, infrastructure and Kubernetes monitoring, logs, analytics and error tracking. Its alerting can POST to a URL of your choice, so Spike can page whoever is on call the moment an alert policy opens an incident in Atatus, and resolve the Spike incident again when Atatus closes its own.

Nothing is installed anywhere. You point an Atatus webhook at a Spike integration URL and the two stay in sync from there.

## The two webhooks Atatus has

Atatus sends webhooks from two different places, and they are not the same feature. Set up whichever matches what you want to be paged for, or both.

| Webhook | Where you set it up | What it sends |
| --- | --- | --- |
| **Alert policy webhook** | **Alerting → Notification Channels**, then attach the channel to your alert policies | The alert when Atatus opens an incident for it, and the same alert again when Atatus closes it |
| **Error notification webhook** | **Settings → Team Notifications → Webhook** inside a single project | A notification when an error is captured in that project. Atatus documents no closing event for this route |

Alert policies cover every product Atatus alerts on — APM, browser, infrastructure, Kubernetes, logs, analytics, baseline and SLO alerts. The Team Notifications webhook is per project and is about errors rather than thresholds.

Both can point at the same Spike integration, which is the simplest setup and gives you one Atatus service in Spike. Use two integrations when alert policies and errors should page different teams or route through different escalation policies.

## What Spike does with each webhook

| Webhook | What happens in Spike |
| --- | --- |
| An alert opens (`status: Opened`) | Opens an incident and pages your escalation policy |
| The same alert closes (`status: Closed`) | Resolves the open incident. Dropped when nothing is open for it |
| A repeat notification for an alert that is already open in Spike | Added to the incident already open as **Repeated**. It never pages twice |
| An error notification | Opens an incident for that error. Nothing arrives later to close it, see Step 6 below |

Atatus closes an incident by itself once the metric it alerted on has been back to normal for the evaluation window, and that close is what resolves the Spike incident. An alert policy that flaps therefore pages, resolves, and pages again on the next open, rather than piling up incidents.

{% hint style="info" %}
Resolving an incident in Spike does not close the alert in Atatus, and a `Closed` delivery that arrives once the Spike incident is already resolved has nothing left to act on and is dropped. Let Atatus close its own incidents and let the webhook resolve the Spike incident, and the two sides stay in step.
{% endhint %}

Acknowledging is separate on each side. Acknowledging an Atatus incident stops Atatus notifying about it again, but it does not acknowledge the Spike incident or stop your escalation policy, and acknowledging in Spike does not touch Atatus.

## How many incidents you get

Spike opens one incident per Atatus incident, so how many you get is decided in Atatus by the **incident preference** on the alert policy. Atatus only notifies when it *creates* an incident, not every time it adds another violation to one that is already open, so a preference that groups aggressively means fewer pages and less detail:

| Incident preference in Atatus | What Spike sees |
| --- | --- |
| **By Policy** | One incident for the whole policy. A second rule firing, or the same rule firing on another app, is added to the Atatus incident and sends no notification, so Spike never hears about it |
| **By Rule** | One incident per rule. Three hosts breaching one CPU rule are one page |
| **By Rule and Target** | One incident per rule and per target. Three hosts breaching one CPU rule are three incidents in Spike, each with its own open and close |

**By Rule and Target** is the preference that matches Spike's model most closely and the one to pick when different people own different services. **By Policy** is the one that surprises people, because the alerts it swallows never reach the pager at all.

## Incident titles

Titles are built from the alert itself, so they stay readable when Spike reads one out on a phone call at 3am. Atatus describes a violation as the metric, the comparison and the target, and that is what the title reads as:

```
Web Response Time exceeded 2s on checkout-service
```

An error notification reads as the error and the project it came from:

```
TypeError: Cannot read property id of undefined in checkout-api
```

An alert that carries nothing to build a title from falls back to `Atatus alert`, and an error notification with nothing usable to `Atatus error notification`.

The `Opened` and `Closed` deliveries for one alert produce the same title on purpose. That is what lets the close find the incident the open created, and what keeps repeats [grouped](../incidents/grouping-incidents.md) on the incident already open instead of opening a second one.

{% hint style="warning" %}
Renaming an alert policy or a rule in Atatus while one of its incidents is open can leave that incident without a close. Rename when nothing is firing, or resolve the leftover incident by hand.
{% endhint %}

Everything Atatus sends — the policy, the rule, the target, the metric and its threshold, the link back into Atatus, the timestamps — is on the incident page whether or not it is in the title. Use a [Title Remapper](../alerts/title-remapper.md) if you would rather see the app or the environment first.

## Severity

Atatus grades a violation itself: each alert rule can have a **Critical threshold** and an optional **Warning threshold**, and the violation takes the severity of the tier it breached. Spike does not map that grade onto its own severity today, so incidents arrive at your integration's default.

Set severity per alert with [alert rules](../alerts/alert-rules.md) in Spike, which can also route the incident to another escalation policy or suppress it entirely. A common setup is to send Atatus's Critical thresholds to a policy that phones someone and leave Warning thresholds on an email or Slack channel in Atatus, so only the Critical tier ever reaches the pager.

Read more about [priority and severity](../incidents/priority-and-severity.md).

## Prerequisites

* An Atatus account with permission to create notification channels and edit alert policies
* An Atatus integration in Spike and its webhook URL

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Atatus**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Create the Webhook notification channel in Atatus

{% tabs %}
{% tab title="Setup on Atatus" %}
1. **Open notification channels:**
   In Atatus, go to **Alerting → Notification Channels**.

2. **Create the channel:**
   Click **Create new notification channel** and pick **Webhook** as the channel type.

3. **Name it and point it at Spike:**
   Name the channel something a teammate will recognise later, `Spike — payments on-call` rather than `webhook 2`, and paste the webhook URL from Step 1 into the **URL** field. A webhook channel needs nothing else, no key and no secret.

4. **Save the channel.**
{% endtab %}
{% endtabs %}

A notification channel on its own sends nothing. It only fires for the alert policies it is attached to, which is the next step.

## Step 3 — Attach the channel to your alert policies

Go to **Alerting → Alert Policies**, open each policy that should page on-call, add the Spike channel to its notification channels, and save. You can also add the channel while creating a new policy.

Attach the channel to the policies a human should be woken up for and leave it off the rest. The channel is the only filter between an Atatus alert and someone's phone, so a policy watching a non-production app is usually better left on email. While you are in the policy, check its **incident preference** against the table above.

## Step 4 — Send a test notification

Atatus can deliver a test payload without waiting for a real alert. Go to **Alerting → Notification Channels**, select the Spike channel, and click the test button. An incident shows up in Spike within a few seconds, titled from whatever the test payload carries. Resolve it and you are done.

{% hint style="info" %}
Atatus also mentions an API endpoint, `POST /channels/testmessage`, for testing a channel programmatically, but publishes no request details for it. The button in the UI does the same job.
{% endhint %}

{% hint style="warning" %}
A test delivery is a real incident in Spike, so it pages your escalation policy like any other. Warn the team first, or run the test while you are the one on call, and resolve the incident afterwards.
{% endhint %}

If the test arrives and real alerts never do, the URL is fine and the problem is which policies the channel is attached to.

## Step 5 — Add the error notification webhook

Skip this step if you only want alert policies.

Error notifications are per project and live somewhere else in Atatus. Open the project, go to **Settings → Team Notifications → Webhook**, paste the Spike webhook URL from Step 1 into the **URL** text box — or the URL of a second Spike integration, if errors should page a different team — and click **Save**.

From then on an error captured in that project opens an incident in Spike. Repeats of the same error land on the incident already open, so a bad deploy throwing the same exception ten thousand times is one incident carrying the repeats rather than ten thousand pages.

## Step 6 — Set a resolve timer for error notifications

Atatus documents no closing event on the Team Notifications route, so nothing arrives to resolve those incidents. Give the integration a [resolve timer](../incidents/resolve-timer.md) so they do not sit open forever:

1. Edit the Atatus integration in Spike.
2. Scroll to **Advanced Configuration** and turn on **Resolve by Timer**.
3. Pick a duration your team is comfortable with. A few hours suits error notifications.

{% hint style="warning" %}
A resolve timer applies to every incident on the integration, including the ones an alert policy opened and would have closed by itself. If you want alert policy incidents to resolve only when Atatus closes the alert, keep the two routes on two Spike integrations and put the timer on the error notification one, or set **Resolve After** on an [alert rule](../alerts/alert-rules.md) that matches only error incidents.
{% endhint %}

## What Spike reads from the payload

Atatus does not publish the schema of its webhook body. Its own webhook page recommends troubleshooting with a tool like [RequestBin](https://requestbin.com) rather than documenting the body, the only field Atatus's own integration partners describe is the alert `status`, and the two routes above do not have to agree with each other. Spike therefore reads the payload by what each field means rather than by insisting on one exact layout:

| What Spike looks for | What it does with it |
| --- | --- |
| The alert status, `Opened` or `Closed` | Decides whether to open an incident or resolve the one that is open. Anything else is treated as an open |
| The identifier Atatus gives the alert or the error, when the payload carries one | Ties the `Closed` delivery and any repeats to the incident the `Opened` delivery created |
| The alert description, or the error message | The incident title, with the target or project it belongs to |
| The policy, rule, target and environment | Shown on the incident, and used in the title where the description alone would be ambiguous |
| The link back into Atatus | Shown on the incident so you can open the alert in Atatus in one click |
| Everything else | Kept and shown in full on the incident page. Metric values, thresholds, hosts and timestamps are all there even though they are deliberately kept out of the title |

### Seeing the body for yourself

The incident page in Spike shows the full body of every delivery that reached it, which is the quickest way to find out exactly what your Atatus account sends. Before the integration is live you can do the same from Atatus's side by pointing a second notification channel — or a second Team Notifications webhook — at a [RequestBin](https://requestbin.com) URL and firing the test notification from Step 4 at it. That is what Atatus's own documentation recommends.

{% hint style="info" %}
Atatus sends no signature and no authentication header with its webhooks, and a webhook channel has no secret to configure, so the webhook URL is the credential. If it leaks, archive the integration in Spike and create a new one, then update the URL on the Atatus channel.
{% endhint %}

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

### Title Remapper sample

A [Title Remapper](../alerts/title-remapper.md) replaces the default title with one you write against the payload, which is how you fold a team name or an environment into every title:

```handlebars
Production: {{data.body.status}} — {{data.body.description}}
```

Fields from the Atatus payload live under `data.body`, and `{{data.message}}` is the title Spike built. Because Atatus publishes no schema, check the field names against a real delivery on one of your own incidents before you rely on them — the payload your account sends is the only authority on what they are called. `status` is the one field Atatus's integration partners consistently document.

Write the remapper against fields that are the same on the `Opened` and the `Closed` delivery for one alert. A title built on something that changes per delivery, a metric reading or a timestamp, stops the close from finding the incident the open created and stops repeats grouping on it.

## Things worth knowing

* **The notification channel is the filter.** Atatus sends to a channel only for the alert policies it is attached to. Adding the Spike channel to every policy is the usual cause of a noisy integration.
* **The incident preference decides how much you hear about.** Atatus notifies when it creates an incident, not when it adds another violation to one that is open, so **By Policy** quietly swallows everything after the first alert in that policy.
* **Alert policies close, errors do not.** Alert policy incidents resolve themselves when Atatus closes its incident. Error notification incidents need the resolve timer from Step 6 or a human.
* **Acknowledging is not shared.** Acknowledging in Atatus stops Atatus re-notifying; it does not stop a Spike escalation. Acknowledge in Spike to stop the pager.
* **Warning and Critical are Atatus's grades, not Spike's.** Spike takes the incident at the integration's default severity. Use [alert rules](../alerts/alert-rules.md) to set it.
* **Test deliveries page people.** A test notification is indistinguishable from a real alert as far as Spike is concerned, which is the point of testing it.
* **Timestamps are Atatus's.** Times in the payload are in the time zone of your Atatus account and Spike shows incident times in yours, so the same event can read a few hours apart on the two sides.
* **One Spike integration can take webhooks from as many Atatus projects and policies as you like.** Use separate integrations when different projects should page different teams, or keep one and split with [alert rules](../alerts/alert-rules.md).

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Check the notification channel is actually attached to an alert policy. A channel that belongs to no policy is valid, saves cleanly and sends nothing, which looks exactly like a broken webhook.

Then send the test notification from Step 4. If the test arrives and real alerts do not, the URL is fine: look at which policies the channel is on, whether the policy is enabled, and whether any rule in it has fired since you attached the channel. If even the test does not arrive, re-copy the URL from the Spike integration and check it ends in `/push-events` with nothing after it.

</details>

<details>

<summary>Some alerts page and others do not</summary>

Look at the policy's incident preference. On **By Policy**, once one incident is open for that policy every later violation is added to it and Atatus sends no notification, so nothing reaches Spike until that incident is closed. **By Rule and Target** gives you a notification per rule and target. A maintenance window in Atatus also suppresses notifications entirely.

</details>

<details>

<summary>Incidents open but never resolve</summary>

Only the alert policy route closes incidents, and only when Atatus sends the closing delivery for the same alert. Atatus closes its own incident once the metric has been back to normal for the evaluation window, so an alert on a metric that never recovers stays open on both sides, which is usually correct. Two things commonly break the link: the policy or rule was renamed while the incident was open, and the Spike incident was already resolved by hand or by a resolve timer before the close arrived.

Error notification incidents never resolve themselves. That is the route's behaviour, not a misconfiguration — see Step 6.

</details>

<details>

<summary>One alert opened several incidents in Spike</summary>

With **By Rule and Target**, one rule breaching on three hosts is three Atatus incidents and therefore three Spike incidents, by design. It can also mean the alert genuinely opened and closed several times, or that two policies watch the same symptom and both fired.

Repeats of an alert that is already open in Spike are [grouped](../incidents/grouping-incidents.md) on the incident and do not page again.

</details>

<details>

<summary>A closed alert resolved the wrong incident, or none</summary>

The close is tied to the open by the identifier Atatus sends, falling back to the title when the payload carries none. A [Title Remapper](../alerts/title-remapper.md) built on a value that changes between the open and the close — a metric reading, a timestamp, a count — breaks that link. Remap on the description and the target instead.

</details>

<details>

<summary>Titles read as "Atatus alert"</summary>

That is the fallback for a delivery Spike could not find a description or an error message in. Report it from the incident, which sends us the payload that produced it, and check that the alert rule in Atatus has a name.

</details>

<details>

<summary>Severity is never set</summary>

Expected. Atatus grades its own violations Critical or Warning, but Spike does not map that onto its severities, so incidents arrive at the integration's default. Set severity with [alert rules](../alerts/alert-rules.md), which get it onto the incident from the first page.

</details>
