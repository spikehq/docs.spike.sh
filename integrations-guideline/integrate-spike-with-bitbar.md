---
description: >-
  Send BitBar test run notification emails to your Spike integration address so a failed test run opens an incident, and a success email for the same run resolves it.
---

# Integrate Spike with BitBar

[BitBar](https://bitbar.com/) (SmartBear BitBar) is a cloud testing service that runs your automated tests on real mobile devices and browsers. It can email you when a test run finishes. Spike gives your integration a dedicated email address, so a BitBar email about a failed test run opens an incident and pages whoever is on call.

{% hint style="warning" %}
**This guide is based on illustrated emails, not captures.** BitBar does not publish the exact wording of its notification emails. Spike reads them defensively, but check the first real email against the table below. If the subject does not contain an outcome word such as `failed` or `succeeded`, the incident cannot auto-resolve.
{% endhint %}

## What Spike does with each email

| BitBar email | What happens in Spike |
| --- | --- |
| A failed, aborted, timed out or errored test run | Opens an incident and pages your escalation policy |
| Another failure for the same test run and project | Added as an event to the incident already open |
| A success email for the same test run and project | Resolves the open incident. It never opens one |
| A failure for a different test run or project | A separate incident |
| An email with no recognisable outcome word | Treated as a failure, so a failure is never missed |

## How incidents are titled

The incident title is the sentence BitBar writes about the run, taken from the plain-text body of the email. Spike collapses whitespace, removes links and shortens the title at the first colon, so it names the run, the project and the outcome without the counts. For example:

`Test run Nightly regression #412 in project ShopApp Android failed`

If the email has no body, the subject is used. If it has neither, the title is `BitBar alert with no details`.

## One incident per test run

Spike builds an identity for the run from the email subject: lowercased, with outcome words, `#` and numbers removed. `Test run Nightly regression #412 in project ShopApp Android failed` and `Test run Nightly regression #413 in project ShopApp Android succeeded` therefore share the identity `test run nightly regression in project shopapp android`. The failure opens the incident and the later success resolves it.

An email with an empty subject has no identity. It is matched by its fixed title `BitBar test run failed` and does not auto-resolve.

## Set up the integration

### Step 1: Create the Spike integration

From the header, click [Add integration](https://app.spike.sh/integrations/new), select **BitBar**, name the integration and create it. Copy the email address shown on the integration page. It looks like `3f9c1e7a2b8d4c6e9a10@email-hooks.spike.sh`.

### Step 2: Turn on email notifications in BitBar

In BitBar Cloud, open the notification settings for your account or project and add a notification of type **EMAIL** with the Spike address as the recipient. Choose the scope **TEST_RUN** to get both failure and success emails, so incidents auto-resolve. Choose **TEST_RUN_FAILURE** to get failure emails only; in that case set a resolve timer.

BitBar does not document where this setting lives in its interface, so look under your account's integrations or the project settings.

{% hint style="info" %}
With **TEST_RUN_FAILURE** no success emails arrive, so incidents never auto-resolve. Use a [resolve timer](../incidents/resolve-timer.md) in that case.
{% endhint %}

### Step 3: Test it

Run a test that fails, or send the example below to your Spike address. An incident should appear within a minute.

## What Spike reads from the email

Spike receives each email as the following fields. You do not need to build this yourself; BitBar's email produces it. It is shown so you can check what arrives.

| Field | Required | Used for |
| --- | --- | --- |
| `to` | Yes | Routes the email to your integration. It must contain your integration address |
| `subject` | Recommended | Title fallback and the test run identity and outcome. Without it the email cannot auto-resolve |
| `text` | Recommended | The incident title. If empty, the `html` body is used |
| `html` | No | Used in place of `text` only when `text` is empty |
| `from` | No | Shown in the incident details. Never used for matching |
| `envelope` | No | Also used to route forwarded mail |

### Example: a failed test run

```json
{
  "to": "3f9c1e7a2b8d4c6e9a10@email-hooks.spike.sh",
  "from": "BitBar Testing <noreply@bitbar.com>",
  "subject": "Test run Nightly regression #412 in project ShopApp Android failed",
  "text": "Test run Nightly regression #412 in project ShopApp Android failed: 3 of 48 tests failed on 2 of 10 devices (Samsung Galaxy S23, Google Pixel 8).\n\nView results: https://cloud.bitbar.com/#testing/test-run/284731/412",
  "envelope": "{\"to\":[\"3f9c1e7a2b8d4c6e9a10@email-hooks.spike.sh\"],\"from\":\"noreply@bitbar.com\"}"
}
```

### Example: the run succeeds

```json
{
  "to": "3f9c1e7a2b8d4c6e9a10@email-hooks.spike.sh",
  "from": "BitBar Testing <noreply@bitbar.com>",
  "subject": "Test run Nightly regression #413 in project ShopApp Android succeeded",
  "text": "Test run Nightly regression #413 in project ShopApp Android succeeded: all 48 tests passed on 10 devices.\n\nView results: https://cloud.bitbar.com/#testing/test-run/284731/413",
  "envelope": "{\"to\":[\"3f9c1e7a2b8d4c6e9a10@email-hooks.spike.sh\"],\"from\":\"noreply@bitbar.com\"}"
}
```

## Limits

* If the subject carries per-run text other than the run number, a success email will not match the failure and the incident stays open until the resolve timer.
* There is a 30 MB payload limit on emails.
