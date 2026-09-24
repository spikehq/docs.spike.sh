---
description: >-
  Send Atatus alerts and error notifications to Spike so APM, RUM, synthetics,
  log and infrastructure alerts page your on-call team by phone, SMS, Slack or
  Teams, and an alert Atatus closes resolves the incident.
---

# Integrate Spike with Atatus

[Atatus](https://www.atatus.com) watches your applications with APM, error tracking, real user monitoring, synthetics, logs and infrastructure monitoring. It can POST an alert to a URL you choose, so Spike can page whoever is on call the moment an alert policy fires and close the incident again when Atatus closes the alert.

Nothing is installed anywhere. You point an Atatus webhook at a Spike integration URL and the two stay in sync from there.

## The two webhooks Atatus has

Atatus sends webhooks from two different places in its UI, and they are not the same feature. Set up whichever one matches what you want to be paged for, or both.

| Webhook | Where you set it up | What it sends |
| --- | --- | --- |
| **Alert policy webhook** | **Alerting → Notification Channels**, then attach the channel to your alert policies | The alert when it opens, and the same alert again when Atatus closes it |
| **Error notification webhook** | **Project Settings → Team Notifications** on a single project | A notification when a new error is captured in that project. There is no closing event |

Both can point at the same Spike integration, which is the simplest setup and gives you one Atatus service in Spike. Use two integrations when alert policies and new errors should page different teams or route through different escalation policies.

## What Spike does with each webhook

| Webhook | What happens in Spike |
| --- | --- |
| An alert opens (`status: Opened`) | Opens an incident for that alert and pages your escalation policy |
| The same alert closes (`status: Closed`) | Resolves the open incident. Dropped when nothing is open for it |
| The same alert opens again while the incident is open | Added to the incident already open as **Repeated**. It never pages twice |
| A new error notification | Opens an incident for that error. Nothing arrives later to close it, see Step 6 below |

There is one incident per alert, so an alert policy that flaps open and closed all afternoon pages once, resolves, and pages again on the next open, rather than piling up a new incident per delivery.

{% hint style="info" %}
Resolving an incident in Spike does not close the alert in Atatus, and a `Closed` delivery that arrives once the incident is already resolved has nothing left to act on and is dropped. Let Atatus close its own alerts and let the webhook resolve the Spike incident, and the two sides stay in step.
{% endhint %}

## Incident titles

Titles are built from the alert itself, so they stay readable when Spike reads one out on a phone call at 3am:

* An alert policy firing reads as the alert and the app it fired for, `Apdex below 0.85 on checkout-api`
* A new error reads as the error, `TypeError: Cannot read property id of undefined in checkout-api`
* An alert that carries nothing to build a title from falls back to `Atatus alert`, and an error notification with nothing usable to `Atatus error notification`

The `Opened` and `Closed` deliveries for one alert produce the same title on purpose. That is what lets the close find the incident the open created, and what keeps repeats [grouped](../incidents/grouping-incidents.md) on the incident already open instead of opening a second one.

{% hint style="warning" %}
Because the title is part of how Spike ties an alert together, renaming an alert policy in Atatus while one of its incidents is open can leave that incident without a close. Rename policies when nothing is firing, or resolve the open incident by hand afterwards.
{% endhint %}

Everything Atatus sends — the app, the environment, the metric and its threshold, the host, the alert link back into Atatus, the timestamps — is on the incident page whether or not it is in the title. Use a [Title Remapper](../alerts/title-remapper.md) if you would rather see the app or the environment first.

## Severity

Atatus alerts carry no severity Spike can map, so incidents come in at your integration's default. Set severity per alert with [alert rules](../alerts/alert-rules.md), which can also route the incident to another escalation policy or suppress it entirely. That is how you keep a staging app's alerts off the pager while production alerts still wake someone up.

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
   In Atatus, click **Alerting** in the top navigation, then **Notification Channels**.

2. **Create the channel:**
   Click **Create new notification channel** and pick **Webhook** as the channel type.

3. **Name it and point it at Spike:**
   Name the channel something a teammate will recognise later, `Spike — payments on-call` rather than `webhook 2`, and paste the webhook URL from Step 1 as the URL.

4. **Save the channel.**
{% endtab %}
{% endtabs %}

A notification channel on its own sends nothing. It only fires for the alert policies you attach it to, which is the next step.

## Step 3 — Attach the channel to your alert policies

Open **Alerting → Alert Policies**, edit each policy that should page on-call, and add the Spike channel to its notification channels. Save the policy.

Attach the channel to the policies a human should be woken up for and leave it off the rest. The channel is the only filter between an Atatus alert and your phone, so an alert policy on a noisy non-production app is better left on email.

## Step 4 — Check that deliveries reach Spike

Use the test action on the notification channel if Atatus offers one for webhook channels in your account. It sends a test payload straight away, an incident shows up in Spike within a few seconds titled from whatever that payload carries, and you resolve it and are done.

If your account has no test action on the channel, make an alert fire on purpose instead. Create a throwaway alert policy on a non-production app with a threshold the app will breach immediately — a response time threshold of a few milliseconds, or an error rate above zero — attach the Spike channel to it, wait for the alert, then delete the policy.

{% hint style="info" %}
A test delivery is a real incident, so it pages your escalation policy like any other. Warn the team first, or run the test while you are the one on call, and resolve the incident afterwards.
{% endhint %}

{% hint style="warning" %}
Atatus's public REST API is in beta and covers browser monitoring only, so there is no supported API call you can use to fire a test notification. Use the channel's own test action or a throwaway alert policy.
{% endhint %}

## Step 5 — Add the error notification webhook

Skip this step if you only want alert policies.

Error notifications are per project and live somewhere else in Atatus. Open the project and go to **Settings → Team Notifications → Webhook**, paste the same Spike webhook URL from Step 1 into the **URL** box — or the URL of a second Spike integration, if new errors should page a different team — and click **Save**.

From then on a new error captured in that project opens an incident in Spike. One error group is one incident, so a single bad deploy throwing the same exception ten thousand times is one incident carrying the repeats, not ten thousand pages.

## Step 6 — Set a resolve timer for error notifications

Error notifications have no closing event — Atatus never tells Spike an error stopped happening — so nothing in the payload can resolve those incidents. Give the integration a [resolve timer](../incidents/resolve-timer.md) so they do not sit open forever:

1. Edit the Atatus integration in Spike.
2. Scroll to **Advanced Configuration** and turn on **Resolve by Timer**.
3. Pick a duration your team is comfortable with. A few hours suits error notifications.

{% hint style="warning" %}
A resolve timer applies to every incident on the integration, including the ones an alert policy opened and would have closed by itself. If you want alert policy incidents to resolve only when Atatus closes the alert, keep the two routes on two Spike integrations and put the timer on the error notification one, or set **Resolve After** on an [alert rule](../alerts/alert-rules.md) that matches only error incidents.
{% endhint %}

## What Spike reads from the payload

Atatus does not publish the schema of its webhook body. Its own webhook documentation recommends troubleshooting with a tool like [RequestBin](https://requestbin.com) rather than documenting the body, and the two routes above do not have to agree with each other. Spike therefore reads the payload by what each field means rather than by insisting on one exact layout:

| What Spike looks for | What it does with it |
| --- | --- |
| The alert status, `Opened` or `Closed` | Decides whether to open an incident or resolve the one that is open. Anything Spike does not recognise is treated as an open |
| The alert or error identifier, when the payload carries one | Ties the `Closed` delivery and any repeats to the incident the `Opened` delivery created |
| The alert name, or the error message | The incident title, with the app or project it belongs to |
| The app or project name, and the environment | Shown on the incident, and used in the title where the alert name alone would be ambiguous |
| The link back into Atatus | Shown on the incident so you can open the alert or the error in Atatus in one click |
| Everything else | Kept and shown in full on the incident page. Metric values, thresholds, hosts and timestamps are all there even though they are deliberately kept out of the title |

### Seeing the body for yourself

If you want to know exactly what your Atatus account sends, point a second notification channel — or a second Team Notifications webhook — at a [RequestBin](https://requestbin.com) URL and let the next alert hit both. That is what Atatus's own documentation recommends. Once the integration is live the incident page in Spike shows the same body for every delivery that reached Spike, which is usually the faster place to look.

{% hint style="info" %}
Atatus sends no signature and no authentication header with its webhooks, so the webhook URL is the credential. If it leaks, archive the integration in Spike and create a new one, then update the URL on the Atatus channel.
{% endhint %}

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

### Title Remapper sample

A [Title Remapper](../alerts/title-remapper.md) replaces the default title with one you write against the payload, which is how you fold an app name, an environment or a team into every title:

```handlebars
[{{data.app_name}}] {{data.alert_name}}
```

Write the remapper against fields that are the same on the `Opened` and the `Closed` delivery for one alert. A title built on a value that changes per delivery, a metric reading or a timestamp, stops the close from finding the incident the open created and stops repeats grouping on it.

## Things worth knowing

* **The notification channel is the filter.** Atatus sends to a channel only for the alert policies it is attached to. Adding the Spike channel to every policy is the usual cause of a noisy integration.
* **Alert policies close, new errors do not.** Alert policy incidents resolve themselves when Atatus closes the alert. Error notification incidents need the resolve timer from Step 6 or a human.
* **One incident per alert, not per delivery.** An alert that opens, repeats and closes is one incident with its history on it.
* **Test deliveries page people.** The test notification is indistinguishable from a real alert as far as Spike is concerned, which is the point of testing it.
* **Timestamps are Atatus's.** Times in the payload are in the time zone of your Atatus account, and Spike shows incident times in your own, so the same event can read a few hours apart on the two sides.
* **One Spike integration can take webhooks from as many Atatus projects and policies as you like.** Use separate integrations when different projects should page different teams, or keep one and split with [alert rules](../alerts/alert-rules.md).

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Check the notification channel is actually attached to an alert policy. A channel that belongs to no policy is valid, saves cleanly and sends nothing, which looks exactly like a broken webhook.

Then fire the test notification from Step 4. If the test arrives and real alerts do not, the URL is fine and the problem is which policies the channel is on, or that no policy has fired since you attached it. If even the test does not arrive, re-copy the URL from the Spike integration and check it ends in `/push-events` with nothing after it.

</details>

<details>

<summary>Incidents open but never resolve</summary>

Only the alert policy route closes incidents, and only when Atatus sends the closing delivery for the same alert. Two things commonly break that: the alert policy was renamed while the incident was open, and the incident was already resolved by hand or by a resolve timer before the close arrived.

Error notification incidents never resolve themselves. That is Atatus's behaviour, not a misconfiguration — see Step 6.

</details>

<details>

<summary>One alert opened several incidents</summary>

Usually the alert really did open several times with the previous incident resolved in between, which is one incident per open by design. It can also mean two Atatus alert policies are watching the same symptom on the same app and both fired, each of which is its own alert and its own incident.

Repeats of the same alert while the incident is open are [grouped](../incidents/grouping-incidents.md) on it and do not page again.

</details>

<details>

<summary>A closed alert resolved the wrong incident, or none</summary>

The close is tied to the open by the alert Atatus identifies it with, falling back to the title when the payload carries no identifier. A [Title Remapper](../alerts/title-remapper.md) built on a value that changes between the open and the close — a metric reading, a timestamp, a count — breaks that link. Remap on the alert name and the app instead.

</details>

<details>

<summary>Titles read as "Atatus alert"</summary>

That is the fallback for a delivery Spike could not find an alert name or an error message in. Report it from the incident, which sends us the payload that produced it, and check that the alert policy in Atatus has a name.

</details>

<details>

<summary>Severity is never set</summary>

Expected. Atatus sends nothing Spike can map to a severity, so incidents arrive at the integration's default. Set it with [alert rules](../alerts/alert-rules.md), which get it onto the incident from the first page.

</details>
