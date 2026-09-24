---
description: >-
  Send Assertible test run failures to Spike over email so a failing API test pages your on-call team by phone, SMS, Slack or Teams instead of landing in an inbox.
---

# Integrate Spike with Assertible

[Assertible](https://assertible.com/) runs your API tests on a schedule, on every deployment and on demand. It alerts through **Hooks & Alerts** on each web service — email, Slack, Zapier and GitHub status checks — and has no generic webhook, so the Spike Assertible integration is an **email integration**: Assertible emails the integration's own address, and every failing test run opens or joins an incident that escalates through your on-call policy.

Nothing is installed anywhere and no webhook is configured on either side. You create the integration in Spike, copy its email address, and paste that address into an email hook on the Assertible web service you want to be paged for.

{% hint style="warning" %}
Assertible's email hooks fire on failures only. **There is no recovery email**, so nothing closes the incident when your tests go green again. Assertible's Slack hook does report a failing test becoming healthy, but that transition is not sent over email and Spike cannot see it. Give the integration a [resolve timer](../incidents/resolve-timer.md), as described in Step 5.
{% endhint %}

## What Spike does with each email

| Assertible email | What happens in Spike |
| --- | --- |
| The first email for a failing test run | Opens an incident titled with the email's subject and pages your escalation policy |
| A later email whose subject is identical | Added as an event to the incident already open. It never pages again |
| A later email whose subject differs | Opens a second incident, because the subject is all Spike has to match on |
| Tests pass again | Assertible sends nothing at all, so Spike sees nothing. See [Nothing auto-resolves](#nothing-auto-resolves) |

Assertible sends **one email per test run, not one per test**. A run where nine tests fail is one email listing all nine, so it is one incident and one page rather than nine. Which tests can put an email in that run is decided per hook in Assertible (Step 4), and which runs are allowed to send at all is decided by the hook's **When tests are run via** setting (Step 3).

## The subject line is the title, and it is also the matching key

{% hint style="info" %}
The subject line becomes the incident title verbatim, and the body of the email goes into incident details. That is the same behaviour as Spike's generic [Email](integrate-spike-with-email.md) integration, which this integration shares.
{% endhint %}

Spike groups email incidents by exact subject. Two emails with byte-identical subjects land on one incident; any difference at all opens a new one. Assertible does not publish the subject line its test run alerts use, and it is not something you can edit on the hook, so how a repeatedly failing test shows up in Spike depends on Assertible's own template rather than on anything you can configure on either side.

Send one real alert through before you rely on the grouping, and read the subject of the email that arrives:

| What the subject looks like | What you get in Spike |
| --- | --- |
| The same string every time, for example the web service and environment name | One incident per failing service. The first failing run pages, later runs are added to it as events |
| A run id, a timestamp, a failure count or the failing test's name | A new incident, and a new page, for every failing run |

{% hint style="warning" %}
If the subject moves on every run, don't leave it to the resolve timer to absorb the repeats. Lower the volume at the source — run the schedule less often, or split the noisy tests onto their own hook and their own Spike integration — and use [alert rules](../alerts/alert-rules.md) to route or suppress what is left. A [Title Remapper](../alerts/title-remapper.md) on the integration also rewrites the title if you would rather see a team or an environment in it.
{% endhint %}

Incident titles come straight from that subject, so a responder reads Assertible's own wording on a phone call or a lock screen.

## Prerequisites

* An Assertible account with permission to edit a web service's settings
* At least one test on that web service
* An Assertible integration in Spike and its email address

## Step 1 — Create the Assertible integration in Spike

In Spike, go to **Integrations → Add integration → Assertible**, attach it to a service and an escalation policy, and copy the email address from the integration page. An Assertible integration shows an email address instead of a webhook URL. The address is unique to this integration, emails sent to it are processed by Spike, and there is no inbox to read.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

The address is what authenticates the alerts, so treat it like a secret. Use one integration per team or per web service, the same way you would use one webhook per service. Each gets its own address, service, escalation policy and alert rules.

## Step 2 — Add the email hook in Assertible

{% tabs %}
{% tab title="Setup on Assertible" %}
1. **Open the web service:**
   Pick the web service whose tests should page, open its **Settings** tab and go to **Hooks & Alerts**.

2. **Add an email hook:**
   In the email hooks section, create a new hook.

3. **Send email when:**
   Choose **On test run failure**. The other option, **On test run complete**, emails after every run, passing or failing, which would open an incident for a green test run.

4. **Send email to:**
   Paste the Spike integration's email address from Step 1.

5. **Save the hook.**
{% endtab %}
{% endtabs %}

{% hint style="danger" %}
**On test run complete** pages your on-call team for successful runs. On a test that runs every 5 minutes that is a page every 5 minutes, day and night. Always choose **On test run failure** for a hook pointed at Spike.
{% endhint %}

## Step 3 — Choose which runs are allowed to page

The hook's **When tests are run via** setting decides which kinds of test run can send that email at all. Assertible's options are **Deployments**, **Schedules**, **Trigger URL** and **Dashboard**:

| Run via | Include it? | Why |
| --- | --- | --- |
| **Schedules** | Yes | Your monitoring. A scheduled run failing is a real problem with a running service |
| **Deployments** | Usually | A deployment that breaks the API is worth waking somebody for. Leave it off if your pipeline already blocks on the [GitHub status check](https://assertible.com/docs/guide/automation) and nobody needs a page as well |
| **Trigger URL** | Per team | Only if the thing calling the trigger URL is production-like. A CI job running the same tests on every branch is not |
| **Dashboard** | No | A failing run you started yourself, watching the screen. Assertible leaves this off by default and so should you |

This is the only volume control that stops an email being sent in the first place, so set it before you worry about filtering inside Spike.

## Step 4 — Enable the right tests on the hook

Hooks in Assertible apply to a chosen set of tests, not to every test on the web service.

{% hint style="warning" %}
Assertible's own note: **new tests are not enabled on existing hooks by default.** A test added after you set this up sends nothing to Spike until you enable it, on either the hook's page or the test's settings page. It is worth re-checking the hook whenever someone adds a test you would want to be paged for.
{% endhint %}

Enable the tests a human should be woken up for, and leave the rest — the flaky ones, the ones covering a staging environment, the ones nobody can act on at 3am — off the hook or on a second hook pointed at a quieter Spike integration.

## Step 5 — Set a resolve timer

Nothing Assertible emails resolves a Spike incident, so give the integration a [resolve timer](../incidents/resolve-timer.md) and stale incidents stop piling up:

1. Edit the Assertible integration in Spike.
2. Scroll to **Advanced Configuration** and turn on **Resolve by Timer**.
3. Set a duration comfortably longer than the schedule the tests run on, so a test that is still failing is not resolved out from under the person looking at it.

| Assertible schedule | Suggested resolve timer |
| --- | --- |
| Every 5 minutes | 30 minutes |
| Every 15 minutes | 1 hour |
| Hourly | 4 hours |
| Daily | 1 day |

Each new failure email is added to the open incident, but it does not restart the timer. If the timer fires while tests are still failing, the next email opens a fresh incident and pages again, which is the behaviour you want for a problem nobody picked up.

{% hint style="info" %}
Resolving by hand works just as well, and it is the honest close for this integration: you know the tests are green again because you fixed them. Use the timer as a backstop so a test that fails once overnight does not leave an incident open all week.
{% endhint %}

## Severity and routing

Assertible alerts carry no severity Spike can read — an email has a subject and a body, not a structured payload — so incidents come in at your integration's default. Set severity with [alert rules](../alerts/alert-rules.md) matching Assertible's wording in the title or body. The same rules route an incident to another escalation policy, or drop it with the **Ignore incident** action, which is how a failing staging test goes somewhere quieter than the pager.

Read more about [priority and severity](../incidents/priority-and-severity.md).

## Nothing auto-resolves

Assertible knows when a failing test becomes healthy again — its Slack hook says so, and it also alerts on every 10th consecutive failure — but none of that is sent over the email hook, which fires on failing runs only. Spike therefore has nothing to resolve an incident with. The practical options are:

* Use the [resolve timer](../incidents/resolve-timer.md) from Step 5, which is what we recommend.
* Resolve incidents by hand as your team fixes the failing test.

{% hint style="info" %}
Two different web services whose alert emails render the same subject would join into one incident. Give each web service its own Spike integration if you need their incidents kept apart, which is the right shape anyway when different services page different teams.
{% endhint %}

## Why not the Zapier hook?

Assertible's Zapier hook asks for a **Webhook URL** and fires on **On Test Complete** or **On Test Fail**, which looks like a webhook path into Spike. It is not one today: the body it sends is shaped for Zapier's Assertible app, Spike has no parser for it, and pointing that field at a Spike webhook URL would produce incidents with nothing useful in them. Use the email hook.

If a real JSON webhook from Assertible would help your team, tell us — a parser is a small piece of work once we have a captured payload to build it from, and it would bring the failing→healthy transition with it.

## Troubleshooting

<details>

<summary>No incidents show up in Spike</summary>

Work down the chain in Assertible first. The hook must exist on the right web service, **Send email to** must hold the Spike address exactly with no trailing characters, the test that failed must be enabled on that hook, and the way the run was started must be one of the ticked **When tests are run via** options — a run you started from the dashboard sends nothing if **Dashboard** is off.

Then check that a run actually failed during the window you are looking at. **On test run failure** sends nothing for a passing run, which looks identical to a broken hook.

</details>

<details>

<summary>A test I just added never pages</summary>

New tests are not enabled on existing hooks by default. Open the hook, or the test's settings page, and enable it there.

</details>

<details>

<summary>Every failing run opens a new incident</summary>

Assertible's subject line is carrying something that changes between runs, such as a run id, a timestamp or a failure count, and Spike matches email incidents on the subject. Compare the subjects of two of those emails to confirm.

This is a limitation of the email route rather than a misconfiguration. Reduce the run frequency or split the noisy tests onto their own hook, and use [alert rules](../alerts/alert-rules.md) to route or ignore what still gets through.

</details>

<details>

<summary>Incidents open but never resolve</summary>

Expected. Assertible's email hooks fire on failures only and there is no recovery email, so nothing in Spike's inbox can close an incident. Turn on **Resolve by Timer** from Step 5.

</details>

<details>

<summary>On-call is paged for passing test runs</summary>

The hook is set to **On test run complete**, which emails after every run. Change it to **On test run failure**.

</details>

<details>

<summary>Nine failing tests produced one incident</summary>

That is by design on both sides. Assertible sends one email per test run listing every test that failed in it, and Spike turns that one email into one incident carrying all of them. It is one page for one bad deploy rather than nine.

</details>

<details>

<summary>Severity is never set on the incident</summary>

There is no structured payload on an email for Spike to read a severity from. Set it with [alert rules](../alerts/alert-rules.md) matching Assertible's wording in the subject or the body.

</details>
