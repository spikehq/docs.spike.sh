---
description: >-
  Send CloudQA test failures and TruMonitor performance alerts to Spike over email, so a failing test case or a breached threshold pages your on-call team by phone, SMS, Slack or Teams.
---

# Integrate Spike with CloudQA

[CloudQA](https://cloudqa.io) is a codeless web test automation suite — TruRT for regression runs, [TruMonitor](https://doc.cloudqa.io/tru-monitor/) for synthetic monitoring of the same recorded test cases, plus TruLoad and TruAPI. CloudQA notifies over named channels and email, and publishes no generic webhook, so the Spike CloudQA integration is an email integration: CloudQA emails the integration's own address, and every notification that arrives opens or joins an incident that escalates through your on-call policy.

Nothing is installed anywhere and no webhook is configured on either side. You create the integration in Spike, copy its email address, and add that address as a notification recipient in CloudQA.

{% hint style="warning" %}
CloudQA documents no recovery notification — neither a monitored test case going green again nor a performance metric dropping back under its threshold sends anything. Nothing CloudQA emails will resolve a Spike incident, so give the integration a [resolve timer](../incidents/resolve-timer.md), as described in Step 5.
{% endhint %}

## What reaches Spike

Spike pages on every email the integration receives. It reads no test name, priority or status out of it — there is no structured payload on an email, only a subject and a body:

| CloudQA notification | What happens in Spike |
| --- | --- |
| TruMonitor **functional alert** — a monitored test case failed | Opens an incident titled after the email's subject and pages the escalation policy |
| TruMonitor **performance alert** — a test case action crossed its threshold value | Opens an incident and pages the escalation policy |
| A repeat email for the same test case, if the subject is identical | Added as a repeat on the incident already open. It never pages again |
| A repeat email whose subject differs — a run number, a timestamp or a changed status in the subject | Opens a second incident, because the subject is all Spike has to match on |
| TruRT **TestSuite Fails** report | Opens an incident for the failed suite run |
| TruRT **TestSuite Pass** report, or the **Always** condition | Opens an incident for a green run too. Don't send these to Spike — see Step 3 |
| Test case recovers, threshold clears | Nothing. CloudQA sends no recovery email, so the incident stays open until the resolve timer closes it |

What reaches Spike at all is decided entirely in CloudQA's notification conditions (Step 3 and Step 4). Spike does no filtering of its own, so CloudQA's **Priority** and **Consecutive failure** settings are the volume control.

## The subject line is the title, and it is also the matching key

{% hint style="info" %}
The subject line becomes the incident title verbatim, and the body of the email goes into incident details. That is the same behaviour as Spike's generic [Email](integrate-spike-with-email.md) integration, which this integration shares.
{% endhint %}

Spike groups email incidents by exact title. Two emails with byte-identical subjects land on one incident as a [repeat](../incidents/grouping-incidents.md); any difference at all opens a new one. So whether a test case that fails on every monitoring cycle shows up as one Spike incident with a repeat count or as a fresh incident each cycle depends on CloudQA's email template, not on anything you can configure in Spike.

CloudQA does not publish the subject line its alert emails use, so check it once on your own account before you rely on the grouping:

1. Let one monitored test case fail twice in a row — or send yourself the same alert at your own address alongside Spike's.
2. Compare the two subjects character for character.
3. If they are identical, every later failure of that test case joins the one incident, and you will see a repeat count rise instead of a second incident. This is the behaviour you want.
4. If the subject carries a run number, a timestamp or an execution id, each failure opens its own incident. Raise the **Consecutive failure** count (Step 4) so fewer of them are sent, keep the resolve timer short enough that they don't pile up, and consider a [Title Remapper](../alerts/title-remapper.md) on the integration to rewrite the varying part out of the title so repeats group again.

Incident titles come straight from that subject, so a responder reads CloudQA's own wording — the test case name and what failed — on a phone call or a lock screen, without opening CloudQA first. A [Title Remapper](../alerts/title-remapper.md) rewrites the title if you would rather see a team, an application or an environment in it.

## Step 1 — Create the CloudQA integration in Spike

In Spike, go to **Integrations → Add integration → CloudQA**, attach it to a service and an escalation policy, and copy the email address from the integration page. A CloudQA integration shows an email address instead of a webhook URL. The address is unique to this integration, emails sent to it are processed by Spike, and there is no inbox to read.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

Use one integration per team or per application, the same way you would use one webhook per service. Each gets its own address, service, escalation policy and alert rules.

## Step 2 — Add that address as a contact in CloudQA

CloudQA's notification screen picks recipients from an autosuggest list rather than a free-text field, and that list is built from your registered users and from the contacts on the **Integration** tab. An address CloudQA has never seen will not autosuggest.

So add Spike first: in CloudQA go to **Settings → Integration** and add the Spike integration's address as an email contact. Paste it exactly as it appears on the Spike integration page, with no trailing characters.

## Step 3 — Add the notification

Notifications live on one screen in CloudQA, with the conditions differing by what you are alerting on.

{% tabs %}
{% tab title="TruMonitor alerts" %}
1. **Open the screen:**
   Go to **Settings → Notifications** and click **Add Notification**.

2. **Pick the channel:**
   Choose **Email** as the notification type. TruMonitor alerts go to Email and Slack.

3. **Set the conditions:**
   Choose the **Priority** of the test cases that should alert, and a **Consecutive failure** count. Both are covered in Step 4.

4. **Turn on performance alerts if you want them:**
   Enable **Performance Alerts** to be notified when a test case action crosses its threshold value. Thresholds are set on the test case actions themselves, not here, so nothing fires until at least one is configured.

5. **Choose the recipient:**
   Start typing the Spike address you added in Step 2 and pick it from the autosuggest list.

6. **Save.**
{% endtab %}

{% tab title="TruRT test suite reports" %}
1. **Open the screen:**
   Go to **Settings → Notifications** and click **Add Notification**, then choose **Email**.

2. **Set the condition to failures only:**
   CloudQA offers **TestSuite Pass**, **TestSuite Fails** and **Always**. Pick **TestSuite Fails** for the Spike recipient. Spike opens an incident for every email it receives, so **TestSuite Pass** and **Always** page your on-call rotation for green runs.

3. **Scope it:**
   Choose **All Test Suites**, or **Select Test Suites** and pick the suites worth paging someone about. A suite that runs on every commit usually is not one.

4. **Choose the recipient:**
   Pick the Spike address from the autosuggest list and save.
{% endtab %}
{% endtabs %}

{% hint style="info" %}
Keep the Spike recipient on its own notification rather than adding it alongside a team distribution list. The conditions are per notification, so a separate one lets you page on **TestSuite Fails** only while your team keeps whatever reporting it already has.
{% endhint %}

## Step 4 — Tune the noise on CloudQA's side

Spike filters nothing, so the two TruMonitor conditions are where you decide what actually wakes somebody:

| Condition | What it does | Suggested setting |
| --- | --- | --- |
| **Priority** | Alerts only on test cases carrying the priority you select. Priority is a property of the test case, set in test case management | Restrict the paging notification to your highest priority. Route the rest to a mailbox, or to a second Spike integration on a quieter escalation policy |
| **Consecutive failure** | Waits for N consecutive failed monitoring cycles before emailing. This is CloudQA's own flap filter | 2 or 3 for anything that runs frequently. 1 only for a journey where a single failure is worth a phone call |

{% hint style="info" %}
**Consecutive failure** is the right place to absorb a flapping check. Spike has no equivalent setting for email integrations, because an email that CloudQA never sends is the cheapest alert to suppress. Set it high enough that a single blip from a slow page load doesn't page anyone, and low enough that a real outage is not waited out for half an hour — multiply the count by the monitoring frequency you set on the test case to see how long that is.
{% endhint %}

## Step 5 — Set a resolve timer

Nothing CloudQA sends resolves a Spike incident, so give the integration a [resolve timer](../incidents/resolve-timer.md) and stale incidents stop piling up:

1. Edit the CloudQA integration in Spike.
2. Scroll to **Advanced Configuration** and turn on the **Resolve Timer**.
3. Set a duration comfortably longer than the monitoring frequency of the test cases that page, so an incident is not resolved out from under the person looking at it while the test case is still failing.

| TruMonitor frequency | Suggested resolve timer |
| --- | --- |
| 5 minutes | 1 hour |
| 30 minutes | 4 hours |
| Hourly or daily | 1 day |

A test case that is still failing keeps emailing, so an incident closed early by the timer is reopened — or repeated — by the next alert. The timer is a cleanup mechanism, not a health check.

## Severity and routing

Set severity on a CloudQA incident with [alert rules](../alerts/alert-rules.md). The same rules route the incident to another escalation policy, or drop it with the **Ignore incident** action, which is how a failing test case on a staging application goes somewhere quieter than the pager.

{% hint style="warning" %}
CloudQA's test case **Priority** does not become a Spike severity automatically. An alert email carries no structured payload for Spike to lift a priority out of — there is only the subject and the body text. Either write an alert rule matching CloudQA's wording in the title or body, or split your notifications by priority in CloudQA (Step 4) and point each one at its own Spike integration.
{% endhint %}

Read more about [priority and severity](../incidents/priority-and-severity.md).

## Nothing auto-resolves

CloudQA documents no recovery notification for either a functional failure or a performance threshold breach: the next monitoring cycle passing quietly is the only signal that the problem is gone, and that signal never leaves CloudQA. Spike therefore has nothing to resolve an incident with, and the practical options are:

* Use the [resolve timer](../incidents/resolve-timer.md) from Step 5, which is what we recommend.
* Resolve incidents by hand once your team confirms the test case is green again in CloudQA.

{% hint style="info" %}
Two different test cases whose alert subjects happen to render identically would join into one incident. Whether that can happen depends on whether CloudQA puts the test case name in the subject — the check in [The subject line is the title](#the-subject-line-is-the-title-and-it-is-also-the-matching-key) answers this at the same time.
{% endhint %}

## Troubleshooting

<details>

<summary>No incidents show up in Spike</summary>

Work down the chain. The Spike address must exist as a contact under **Settings → Integration**, it must be selected on a saved notification, and that notification's conditions must match what happened — a **Consecutive failure** count of 3 sends nothing until the third failure in a row, and a **Priority** condition sends nothing for test cases outside it. Then check that a monitored test case actually failed in the window you are looking at, and that the address matches the one on the Spike integration page exactly.

</details>

<details>

<summary>One failing test case opened a new incident on every cycle</summary>

CloudQA's subject line for that alert is not constant — it most likely carries a run number, an execution id or a timestamp. Spike matches email incidents on the title, so anything varying in the subject makes a new incident. Compare two of the emails character for character to confirm, then raise **Consecutive failure** to cut the volume and add a [Title Remapper](../alerts/title-remapper.md) to rewrite the varying part out of the title.

</details>

<details>

<summary>Incidents open but never resolve</summary>

That is expected. CloudQA sends nothing when a test case recovers, so no email ever arrives to close the incident. Turn on the resolve timer from Step 5.

</details>

<details>

<summary>On-call is paged for passing test runs</summary>

The TruRT notification carrying the Spike address is set to **TestSuite Pass** or **Always**. Spike opens an incident for every email it receives, including a report saying everything is fine. Change the condition to **TestSuite Fails**, or keep pass reports on a separate notification that goes to people rather than to Spike.

</details>

<details>

<summary>The Spike address does not appear in the recipients dropdown</summary>

CloudQA builds that list from registered users and from the contacts on the **Integration** tab, so an address it has never seen will not autosuggest. Add the Spike address as an email contact under **Settings → Integration** first (Step 2), then reopen the notification screen.

</details>

<details>

<summary>An email never arrived and the incident is missing details</summary>

Spike's email integrations have a 30 MB payload limit. CloudQA's alert emails sit far below it, but a notification carrying screenshots or an attached run report is the one to check first if an alert vanished.

</details>
