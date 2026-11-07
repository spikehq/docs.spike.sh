---
description: "Create incidents in Spike from Assertible test run alerts, and resolve them when the tests pass again, by email."
---

# Integrate Spike with Assertible

[Assertible](https://assertible.com) runs automated tests against your web services and APIs. Assertible sends alerts through an email hook, so the Spike Assertible integration has an email address instead of a webhook URL.

## How does the Assertible integration work?

* When an Assertible email says a test run **failed**, Spike creates an incident.
* The incident title is the first line of the email's plain-text body, which is Assertible's own sentence about what failed.
* When an email says the tests **passed** for the same alert, Spike resolves the incident. Spike matches the two emails by their subject with the words failed/failing/passed/passing removed. A passing email with no incident open for it is dropped.
* An email that says neither is treated as a failure and opens an incident.
* An email without a usable subject is matched on its title instead, and never resolves itself.

{% hint style="info" %}
The Assertible subject and body wording has not been verified against a real capture. If Assertible does not send an email when tests pass again, the incident has to be resolved manually in Spike.
{% endhint %}

## Setup

### Step 1: Create the integration in Spike

From the header > click [Add integration](https://app.spike.sh/integrations/new), select **Assertible**, give it a name and create the integration.

### Step 2: Copy the email address

Copy the email address from the integration page. It looks like `9f3c2a7e41b8d05c6e12@email-hooks.spike.sh`.

### Step 3: Add an email hook in Assertible

1. Open your web service in Assertible and go to its **Settings**, then the **Hooks & Alerts** tab.
2. Add an **Email** hook and paste the Spike email address into **Send email to**.
3. Under **Send email when**, pick **On test run complete** if you want incidents to resolve themselves: it emails every run, passing ones included. **On test run failure** emails only failing runs, so you resolve those incidents by hand in Spike.
4. Optionally limit **When tests are run via** (Deployments, Schedules, Trigger URL, Dashboard).
5. Enable the tests that should alert on the hook. Assertible does not enable new tests on existing hooks by default.
6. Save.

Required: the Spike email address. Spike does not filter on the sender address.

### Step 4: Test it

Trigger a test run in Assertible, or send a test email to the Spike address, and check that an incident is created.

## Example email

Spike receives each email as the following fields. A failing run:

```json
{
  "to": "9f3c2a7e41b8d05c6e12@email-hooks.spike.sh",
  "from": "Assertible <notifications@assertible.com>",
  "subject": "[Assertible] Test run failed: Orders API (production)",
  "text": "1 of 4 tests failed for Orders API in production.\n\nFAILED  GET /v1/orders - status code: expected 200, got 503\nPASSED  GET /v1/health\nPASSED  POST /v1/orders\nPASSED  GET /v1/orders/{id}\n\nView the test run in Assertible.",
  "html": "<p>1 of 4 tests failed for Orders API in production.</p><ul><li><b>FAILED</b> GET /v1/orders - status code: expected 200, got 503</li><li>PASSED GET /v1/health</li><li>PASSED POST /v1/orders</li><li>PASSED GET /v1/orders/{id}</li></ul><p>View the test run in Assertible.</p>",
  "envelope": "{\"to\":[\"9f3c2a7e41b8d05c6e12@email-hooks.spike.sh\"],\"from\":\"notifications@assertible.com\"}"
}
```

A passing run, which resolves the incident:

```json
{
  "to": "9f3c2a7e41b8d05c6e12@email-hooks.spike.sh",
  "from": "Assertible <notifications@assertible.com>",
  "subject": "[Assertible] Test run passed: Orders API (production)",
  "text": "All 4 tests passed for Orders API in production.\n\nPASSED  GET /v1/orders\nPASSED  GET /v1/health\nPASSED  POST /v1/orders\nPASSED  GET /v1/orders/{id}\n\nView the test run in Assertible.",
  "html": "<p>All 4 tests passed for Orders API in production.</p><ul><li>PASSED GET /v1/orders</li><li>PASSED GET /v1/health</li><li>PASSED POST /v1/orders</li><li>PASSED GET /v1/orders/{id}</li></ul><p>View the test run in Assertible.</p>",
  "envelope": "{\"to\":[\"9f3c2a7e41b8d05c6e12@email-hooks.spike.sh\"],\"from\":\"notifications@assertible.com\"}"
}
```

| Field | Required | Used for |
| --- | --- | --- |
| `to` | Yes | Routes the email to your integration through the address token |
| `subject` | Yes | Failed or passed status, and matching a recovery to its incident |
| `text` | Yes | Incident title and body (built from `html` if empty) |
| `html` | No | Rich display in the incident |
| `from` | No | Shown in incident details only |
| `envelope` | No | Extra recipients for forwarded mail |

{% hint style="warning" %}
For recovery to work, the failing and passing emails for the same service and environment must have the same subject apart from the word failed/passed. There is a 30 MB payload limit.
{% endhint %}
