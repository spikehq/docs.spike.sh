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

The incident title is the sentence BitBar writes about the run, taken from the plain-text body of the email (or the HTML body converted to text when there is no plain-text part). Spike removes links, along with a line such as `View results:` that only introduced one, collapses whitespace and cuts the title at a word boundary to at most 200 characters. For example:

`Test run Nightly regression #412 in project ShopApp Android failed: 3 of 48 tests failed on 2 of 10 devices (Samsung Galaxy S23, Google Pixel 8).`

The counts in the title differ from run to run, but they never split an incident: Spike groups emails by the test run, as described below, not by title.

If the email has no body, the subject is used. If it has neither, the title is `BitBar alert with no details`.

## One incident per test run

Spike builds an identity for the run from the email subject: lowercased, with outcome words, `#` and numbers removed. `Test run Nightly regression #412 in project ShopApp Android failed` and `Test run Nightly regression #413 in project ShopApp Android succeeded` therefore share the identity `test run nightly regression in project shopapp android`. The failure opens the incident and the later success resolves it.

An email whose subject is empty, or holds nothing but a run number and an outcome word, has no identity. It gets the fixed title `BitBar test run failed`, is matched by that title, and does not auto-resolve.

## Set up the integration

### Step 1: Create the Spike integration

From the header, click [Add integration](https://app.spike.sh/integrations/new), select **BitBar**, name the integration and create it. Copy the email address shown on the integration page. It looks like `3f9c1e7a2b8d4c6e9a10@email-hooks.spike.sh`.

### Step 2: Turn on email notifications in BitBar

BitBar's documentation says only that email notifications are turned on and off from your user settings in BitBar Cloud. Turn them on there for test runs. BitBar's notification scopes, as its public API names them, include every test run (`TEST_RUN`) and failed test runs only (`TEST_RUN_FAILURE`):

* Notify on **every test run** (failures and successes). Spike opens an incident on a failure and resolves it on the next success of the same run, so this is the setting to choose.
* Notify on **failed test runs only**. Incidents then never auto-resolve, so set a [resolve timer](../incidents/resolve-timer.md).

### Step 3: Get BitBar's emails to the Spike address

If BitBar lets you enter the recipient address, enter the Spike integration address from Step 1. Otherwise BitBar emails the address of your BitBar account; create a rule in your mail provider that forwards BitBar's notification emails (from BitBar's sender address) to the Spike integration address. Forwarding keeps the subject and body, which is all Spike reads.

### Step 4: Test it

Run a test that fails in BitBar, or forward an earlier BitBar failure email to your Spike address. An incident should appear within a minute.

## What Spike reads from the email

Spike receives each email as the following fields. You do not need to build this yourself; BitBar's email produces it. It is shown so you can check what arrives. Spike stores these fields, with the title and the run's identity and outcome, in the incident's details.

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
