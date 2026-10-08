---
description: >-
  Send Keysight Hawkeye alarm emails to Spike so a failed network test pages your on-call rotation, and the incident resolves when the test passes again.
---

# Integrate Spike with Keysight Hawkeye

[Keysight Hawkeye](https://www.keysight.com) is an active network monitoring platform. Hawkeye agents run tests between endpoints, such as VoIP quality, packet loss or web page load, and raise an alarm when a result crosses a threshold.

Hawkeye sends its alarms by email through the SMTP server configured in its preferences. Spike gives every email integration its own address, so you point Hawkeye's alarm emails at that address and a failed test becomes an incident. There is no inbox: Spike reads the mail and discards it.

{% hint style="warning" %}
We could not find a real Hawkeye alarm email to build this against. The subject and body wording below follows Hawkeye's documented behaviour (a predefined title and test-results layout that cannot be customised) but is illustrative. If your alarms look different, send us one at support@spike.sh.
{% endhint %}

## Step 1: Create the integration in Spike

1. From the header, click [Add integration](https://app.spike.sh/integrations/new).
2. Select **Keysight Hawkeye** and give the integration a name.
3. Click create, then copy the email address shown on the integration page. It looks like `9f3c2a7b51d04e8a6c1f@email-hooks.spike.sh`.

## Step 2: Point Hawkeye's alarm emails at Spike

1. In Hawkeye, open **Preferences** and make sure the **SMTP** settings are filled in, so Hawkeye can send mail. The sender address you set here is stored on the incident for display.
2. Open the test you want to be paged for and go to its **Alarms** settings.
3. Add the Spike email address as an **Email** recipient of the alarm. Required: the Spike address is the only recipient field that matters.
4. Choose when the alarm fires. Enable the **Status Change** option (alarm when a result differs from the previous run) if you want Spike to resolve the incident when the test passes again.
5. Save the test.

## What Hawkeye sends, and what Spike reads

Spike reads these parts of the email:

| Field | Required | What Spike does with it |
| --- | --- | --- |
| `to` | Yes | Carries the integration token in the `<token>@email-hooks.spike.sh` address. |
| `subject` | Yes | Hawkeye's predefined alarm title, one per test. It identifies the alarm, so a repeat joins the open incident and the recovery resolves it. |
| `text` | Yes | The test-results body. Its first non-empty line becomes the incident title, and its `Status:` line decides whether the alarm is firing or recovered. |
| `html` | No | Used only when `text` is empty; Spike converts it to text. |
| `envelope` | No | Its recipients are also checked for the token when the mail was forwarded. |
| `from` | No | The sender address, shown in the incident details. |

A firing alarm looks like this:

```json
{
  "to": "9f3c2a7b51d04e8a6c1f@email-hooks.spike.sh",
  "from": "Hawkeye <hawkeye-alarms@netops.example.com>",
  "subject": "Hawkeye Alarm: Branch-NYC to DC1 VoIP MOS",
  "text": "Test Branch-NYC to DC1 VoIP MOS failed: MOS 3.1 is below the threshold of 4.0 between nyc-branch-01 and dc1-core-02.\n\nTest name: Branch-NYC to DC1 VoIP MOS\nStatus: Failed\nSource endpoint: nyc-branch-01\nDestination endpoint: dc1-core-02\nKPI: MOS 3.1 (threshold 4.0)\nRun time: 2026-10-08 03:12:44 UTC",
  "envelope": "{\"to\":[\"9f3c2a7b51d04e8a6c1f@email-hooks.spike.sh\"],\"from\":\"hawkeye-alarms@netops.example.com\"}"
}
```

The recovery for the same test:

```json
{
  "to": "9f3c2a7b51d04e8a6c1f@email-hooks.spike.sh",
  "from": "Hawkeye <hawkeye-alarms@netops.example.com>",
  "subject": "Hawkeye Alarm: Branch-NYC to DC1 VoIP MOS",
  "text": "Test Branch-NYC to DC1 VoIP MOS passed: MOS is back within threshold between nyc-branch-01 and dc1-core-02.\n\nTest name: Branch-NYC to DC1 VoIP MOS\nStatus: Passed\nSource endpoint: nyc-branch-01\nDestination endpoint: dc1-core-02\nKPI: MOS 4.3 (threshold 4.0)\nRun time: 2026-10-08 03:27:44 UTC",
  "envelope": "{\"to\":[\"9f3c2a7b51d04e8a6c1f@email-hooks.spike.sh\"],\"from\":\"hawkeye-alarms@netops.example.com\"}"
}
```

## Step 3: Test it

Send a mail with the firing body above to your Spike address, or use a test whose threshold you can trip on purpose. An incident should appear. Then send the recovery body (same `subject`) and the incident resolves.

## Incident identity

Spike identifies the incident by the email **subject**. Hawkeye uses one predefined subject per test, so every alarm for that test lands on the same incident, and the recovery email resolves it. If Hawkeye put the status in the subject, a recovery would not match and the incident would only close with its resolve timer.

If a mail has no subject, Spike matches by title instead, and uses the constant title `Keysight Hawkeye alarm with no subject`.

## Incident title

The title is Hawkeye's own sentence about the fault: the first non-empty line of the body, whitespace collapsed and capped at 200 characters. Spike's parser can shorten it so readings that change between runs do not end up in the title, for example `Branch-NYC to DC1 VoIP MOS failed between nyc-branch-01 and dc1-core-02`. When the body is empty the title is the subject, and when both are empty it is `Keysight Hawkeye alert with no details`.

## What resolves an incident

Spike reads the `Status:` line in the body:

| `Status` | Meaning | Result |
| --- | --- | --- |
| `Failed` | The test failed. | Opens or updates an incident and pages. |
| `Error` | The test could not run. | Opens or updates an incident and pages. |
| `Passed` | The test is back to passing. | Resolves the incident. |

Only the exact value `Passed` resolves. Any other value, or a missing `Status:` line, leaves the incident open. Resolving in Spike does not change anything in Hawkeye.

{% hint style="warning" %}
Auto-resolve depends on Hawkeye sending a recovery email, which happens with the **Status Change** alarm option, and on the subject being the same in the failure and the recovery email. There is a 30 MB payload limit.
{% endhint %}
