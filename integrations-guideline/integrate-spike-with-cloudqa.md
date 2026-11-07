---
description: >-
  Send CloudQA failure notification emails to Spike so a failing test case or monitor opens an incident and pages your on-call team by phone, SMS, Slack or Teams.
---

# Integrate Spike with CloudQA

[CloudQA](https://cloudqa.io) is codeless web test automation. Its TruMonitor monitors and TruRT test suites run your test cases on a schedule and email you when one fails. CloudQA notifies by email only, so Spike gives the CloudQA integration its own email address. Add that address as a recipient of CloudQA's notifications and a failure becomes an incident that pages your on-call rotation.

Nothing is installed anywhere. There is no inbox: Spike reads each email as it arrives.

{% hint style="warning" %}
**CloudQA sends no recovery email that Spike can recognise.** Incidents from this integration do not auto-resolve. Set a [resolve timer](../incidents/resolve-timer.md) on the integration, or resolve incidents by hand.
{% endhint %}

## What Spike does with each email

| Email from CloudQA | What happens in Spike |
| --- | --- |
| The first email with a given subject | Opens an incident and pages your escalation policy |
| Another email with the same subject while that incident is open | Added as an event to the open incident. It does not page again |
| An email with a different subject | A separate incident, paged on its own |
| A "passed" or recovery style email | Treated like any other email: a new incident, not a resolution |

Spike identifies one CloudQA alert by the email **subject**, exactly as it arrives. If CloudQA puts a timestamp, run id or counter in the subject, every email has a different subject and opens its own incident. An email with no subject is grouped by its title instead.

## How incidents are titled

The title is CloudQA's own sentence about the failure: the first line of the email body that is not a greeting (`Hi`, `Hello …,`, `Dear …`). Links are removed, spaces are collapsed and the title is cut at a word boundary at 200 characters.

| Email body starts with | Incident title |
| --- | --- |
| `Test case "Checkout - Place order" failed: the "Place order" button was not found within 30 seconds.` | `Test case "Checkout - Place order" failed: the "Place order" button was not found within 30 seconds.` |
| `Hi team,` then `Test case "Checkout - Place order" failed.` | `Test case "Checkout - Place order" failed.` |
| Nothing readable | The email subject, for example `TruMonitor Alert: Checkout - Place order failed` |
| No subject and no body | `CloudQA alert with no details` |

If the email has only an HTML part, Spike converts it to text first. Links are removed from the line; a line that only pointed at a link, such as `See <link> for details.` or `Details: <link>`, is skipped and the next line is used.

The full body, with its suite, priority, browser and location lines, is shown on the incident, and the HTML version is rendered as an email preview.

## Prerequisites

* A CloudQA account with a TruMonitor monitor or a TruRT test suite that sends email notifications
* A CloudQA integration in Spike

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → CloudQA**, attach it to a service and an escalation policy, and create it. Copy the integration's email address. It looks like `c5e2be802c2b206573a8@email-hooks.spike.sh`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Add the Spike address to CloudQA

CloudQA only offers recipients it already knows, so add the address first.

1. In CloudQA, open **Settings** and the **Integration** tab, and add the Spike email address from Step 1 as an email integration. The recipient autosuggest in the next step only offers addresses listed here.

## Step 3 — Add an Email notification

1. In **Settings**, open the **Notifications** tab and click **Add Notification**. Select the type **Email**.
2. For **TruMonitor** alerts, choose the **Priority** that matches your test cases and the **Consecutive failure** count that should trigger an email.
3. For **TruRT** test suite reports, set **Notify on** to **TestSuite Fails**, and under **TestSuite To Notify** choose **All Test Suites** or **Select Test Suites**.
4. In the recipients, type the Spike address, select it from the autosuggest, and save the notification.

{% hint style="warning" %}
Do not choose **Always** or **TestSuite Pass** under **Notify on**. Spike cannot tell a passing report from a failing one, so every passing run would open an incident.
{% endhint %}

## Step 4 — Test it

Trigger a failing run in CloudQA, or forward an earlier CloudQA failure email to the Spike address. An incident should appear within a minute.

## Fields Spike reads

You do not send these yourself when CloudQA emails Spike. They are the fields of the email as Spike receives it, and the example below is what a CloudQA failure email looks like on arrival.

| Field | Required | What Spike does with it |
| --- | --- | --- |
| `to` | Yes | The recipient. The part before `@email-hooks.spike.sh` finds your integration |
| `envelope` | No | A JSON string with the real recipients. Spike also routes on `envelope.to`, so forwarded mail still arrives |
| `from` | No | The sender, shown on the incident. Not used for matching |
| `subject` | No | Identifies one alert across repeats, and is the title when the body has nothing usable |
| `text` | One of `text` or `html` | The plain-text body. Its first non-greeting line is the title |
| `html` | One of `text` or `html` | The HTML body. Converted to text when `text` is missing, and rendered as the email preview |

## Example

```json
{
  "to": "c5e2be802c2b206573a8@email-hooks.spike.sh",
  "from": "CloudQA <noreply@cloudqa.io>",
  "subject": "TruMonitor Alert: Checkout - Place order failed",
  "text": "Test case \"Checkout - Place order\" failed: the \"Place order\" button was not found within 30 seconds.\n\nTest suite: Production smoke tests\nPriority: High\nConsecutive failures: 2\nBrowser: Chrome\nLocation: US East\n",
  "html": "<p>Test case &quot;Checkout - Place order&quot; failed: the &quot;Place order&quot; button was not found within 30 seconds.</p><p>Test suite: Production smoke tests<br>Priority: High<br>Consecutive failures: 2<br>Browser: Chrome<br>Location: US East</p>",
  "envelope": "{\"to\":[\"c5e2be802c2b206573a8@email-hooks.spike.sh\"],\"from\":\"noreply@cloudqa.io\"}"
}
```

This opens an incident titled `Test case "Checkout - Place order" failed: the "Place order" button was not found within 30 seconds.`

{% hint style="warning" %}
Email integrations have a 30 MB payload limit.
{% endhint %}
