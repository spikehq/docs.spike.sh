---
description: >-
  Send Keysight Hawkeye test alarms to Spike over email, so a failed synthetic network test pages your network on-call rotation by phone, SMS, Slack or Microsoft Teams.
---

# Integrate Spike with Keysight Hawkeye

[Keysight Hawkeye](https://www.keysight.com/us/en/products/network-visibility/hawkeye-software-suite.html) (formerly Ixia Hawkeye) runs active, synthetic tests between hardware and software probes to measure end-to-end network performance. When a test fails, errors or changes result, Hawkeye raises an alarm and emails it to whoever is listed on the test.

Spike gives every integration its own inbound email address, so adding that address as an alarm recipient in Hawkeye is the whole setup. A failed test becomes an incident that escalates through your on-call policy. Nothing is installed, and there is no webhook to configure on either side.

{% hint style="warning" %}
Hawkeye alarms reach Spike as email, and an email can only ever open an incident, never close one. Nothing here auto-resolves. Turn on [Resolve by Timer](../incidents/resolve-timer.md) on this integration, or resolve incidents in Spike by hand. Step 4 below covers it.
{% endhint %}

## What Spike does with each alarm email

| Hawkeye sends | What happens in Spike |
| --- | --- |
| An alarm email to the integration's address | Opens an incident and pages the escalation policy |
| Another alarm email with the same subject, while that incident is open | [Grouped](../incidents/grouping-incidents.md) as a repeat of the open incident |
| Another alarm email with a different subject | Opens a separate incident |
| Anything else (a test recovering, an alarm clearing in Hawkeye) | Nothing. Hawkeye's only channel here is email, and email never resolves an incident |

The email's subject line becomes the incident title, and its body becomes the incident details, exactly as with Spike's generic [email integration](integrate-spike-with-email.md).

### Incident identity and titles

For an email integration the subject line is both the title and the entire matching key. Spike looks for an open incident on this integration whose title is the same string; it groups the new alarm onto that incident when it finds one, and opens a new incident when it does not.

Hawkeye's alarm email has a fixed, vendor-defined title and results format that cannot be customised, which works in your favour here: repeated failures of the same test tend to arrive under the same subject and collapse into one incident with a repeat count. If your Hawkeye release puts a timestamp, a run number or the measured result into the subject, those repeats will each open their own incident instead. Check what your install actually sends under **Alarms → Generated Alarms List**, and against the first incidents Spike opens.

Use a [Title Remapper](../alerts/title-remapper.md) if you would rather see something else in the title. Select the Keysight Hawkeye integration in the remapper and the preview shows the payload Spike received for it — the subject, the plain text and HTML bodies, and the sender — so you can build the template against the real fields rather than guessing at them.

### Severity

Hawkeye alarm emails carry no severity that Spike can read, so incidents arrive with severity unset. Set it with [alert rules](../alerts/alert-rules.md), which can also route an alarm to a different escalation policy or suppress it — that is how you keep lab probes off the pager while production tests still wake someone. Read more about [priority and severity](../incidents/priority-and-severity.md).

## Which alarm conditions to select

Hawkeye offers three conditions on a test: **Status Change**, **Failed** and **Error**.

| Condition | Fires when | Worth sending to Spike? |
| --- | --- | --- |
| **Failed** | The test ran and did not meet its thresholds | Yes. This is the alarm you want to be paged on |
| **Error** | The test could not run at all | Yes. A test that stops running stops protecting you |
| **Status Change** | The result differs from the previous run | Only if you want to hear about recoveries too |

**Status Change** fires in both directions, including when a failing test starts passing again. That recovery email does not close anything in Spike: it is another alarm email, so it either groups onto the open incident or opens a second one, depending on whether its subject matches the failure's. If you select it, expect a page when a test comes back. Most teams select **Failed** and **Error**, and let the resolve timer close the incident.

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Keysight Hawkeye**, attach it to a service and an escalation policy, and copy the inbound email address from the integration page. It looks like `<your-token>@email-hooks.spike.sh`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

That address is the credential for this integration. Anyone who can email it can open incidents on your service, so treat it like the webhook URL of any other integration. If it leaks, archive the integration and create a new one.

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

## Step 2 — Let Hawkeye send email

{% tabs %}
{% tab title="Setup on Hawkeye" %}
1. **Configure SMTP:**
   Go to **Administration → Preferences** and open the **Email** tab. Fill in your SMTP server, port, credentials and the from-address Hawkeye should send as, then click **Save**. Hawkeye sends alarm emails through your own mail server, so nothing reaches Spike until this is set.

2. **Check the retry setting:**
   **Max Email Attempts** on the same page decides how many times Hawkeye retries a failed send. Hawkeye gives up after that and does not queue the alarm for later, so leave it at a value your mail server can live with.
{% endtab %}
{% endtabs %}

## Step 3 — Add Spike as an alarm recipient

Do this on a single test while it is being configured, or on a test template so every test built from it alarms the same way.

{% tabs %}
{% tab title="On one test" %}
1. Go to **Test Execution** and configure the test as usual.

2. Click **Show Alarm Options**.

3. Select the alarm conditions you want — **Failed** and **Error**, plus **Status Change** if you want recoveries too, as described above.

4. Under **Alarm Types**, select **Email** and paste the Spike address from Step 1 into the recipient field.

5. Click **Start Test**.
{% endtab %}

{% tab title="On a test template" %}
1. Go to **Probe Management → Test Templates** and open the template.

2. Open the **Alarms** tab.

3. Select the alarm conditions you want — **Failed** and **Error**, plus **Status Change** if you want recoveries too.

4. Select **Email** and paste the Spike address from Step 1 into the recipient field.

5. Click **Save**. Every test run from this template now alarms to Spike.
{% endtab %}
{% endtabs %}

## Step 4 — Set a resolve timer

Hawkeye has no way to tell Spike a test is healthy again, because email only ever opens incidents. Give the integration a [resolve timer](../incidents/resolve-timer.md) so incidents do not sit open forever:

1. Edit the Keysight Hawkeye integration in Spike.
2. Scroll to **Advanced Configuration** and turn on **Resolve by Timer**.
3. Set a duration comfortably longer than the test's interval, so a test that is still failing repeats onto the incident before the timer can close it.

| Test interval | Suggested resolve timer |
| --- | --- |
| Every 5 minutes | 30 minutes |
| Every 15 minutes | 1 hour |
| Hourly | 4 hours |
| Daily | 2 days |

A test that is still failing keeps emailing, and each repeat lands on the open incident, which is your signal that the problem has not gone away.

## Step 5 — Check that the alarm was sent

Hawkeye records every alarm it raises under **Alarms → Generated Alarms List**. A `yes` in the **Alarm Sent** column means the email left Hawkeye. If it says yes and no incident appeared in Spike, the problem is between your mail server and Spike rather than in the test configuration.

## Troubleshooting

<details>

<summary>No incidents show up in Spike</summary>

Work backwards from Hawkeye. Check **Alarms → Generated Alarms List** for the test: no row means the alarm conditions never matched, and a row with **Alarm Sent** = `no` means the email never left, which is almost always the SMTP settings in **Administration → Preferences → Email** or a mail server rejecting the from-address.

If the alarm was sent, check that the recipient on the test is the integration's full address, with no trailing characters, and that the integration has not been archived. Emails larger than 30 MB are rejected.

</details>

<details>

<summary>Every failure opens its own incident instead of grouping</summary>

Spike groups on the subject line, so this means Hawkeye's subject differs between runs — usually a timestamp, a run number or the measured result embedded in it. Compare two subjects side by side in **Generated Alarms List**. Hawkeye does not let you edit the subject, so the fix on the Spike side is [rate limiting on duplicate incidents](../incidents/rate-limiting-on-duplicate-incidents.md) to keep the pager quiet, or an [alert rule](../alerts/alert-rules.md) that routes the noisier tests somewhere other than the phone.

</details>

<details>

<summary>Incidents never close on their own</summary>

That is expected, permanently, not a setup mistake. Hawkeye alarms arrive as email and no email can resolve a Spike incident, so the resolve timer in Step 4 or a manual resolve is the only close path. PagerDuty's own Hawkeye guide takes the same line, treating every Hawkeye email as a new alert.

</details>

<details>

<summary>A recovering test paged us</summary>

The **Status Change** condition is selected on that test. It fires whenever a run's result differs from the previous one, which includes a failing test going back to passing, and Spike treats the resulting email like any other alarm. Deselect **Status Change** on the test or its template and keep **Failed** and **Error** if you only want to hear about problems.

</details>

<details>

<summary>The title is hard to read at 3am</summary>

The title is Hawkeye's subject verbatim, and Hawkeye does not let you customise it. Rewrite it in Spike with a [Title Remapper](../alerts/title-remapper.md) linked to this integration — the preview shows the exact fields the email arrived with, so you can pull the part of the subject or body that identifies the test and drop the rest.

</details>
