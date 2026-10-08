---
description: >-
  Send TestMu AI (formerly LambdaTest) test results to Spike so a failed or errored test pages your on-call rotation by phone, SMS, Slack or Teams, and resolves its incident when the same test passes again.
---

# Integrate Spike with TestMu AI

[TestMu AI](https://www.testmuai.com) (formerly LambdaTest) runs your automated and manual tests across real browsers, operating systems and real mobile devices. It can post a webhook notification when a test finishes.

With Spike's integration, a test that finishes as `failed` or `error` opens an incident and pages your on-call rotation. When the same test later finishes as `passed` on the same browser and platform (or device), Spike resolves that incident.

{% hint style="warning" %}
TestMu AI documents its webhook but does not publish a payload. The fields below follow the fields of its test session object. If your notification looks different, [contact Spike support](../administration/contact-the-support-team.md) and we will adjust.
{% endhint %}

## How Spike reads a test result

| Field | Required | What Spike does with it |
| --- | --- | --- |
| `status_ind` | Yes | `failed` and `error` open or join an incident. `passed` resolves the open incident for the same test. `skipped`, `ignored` and `unknown` neither open nor resolve. |
| `name` | Recommended | The test name, set with the `name` capability in your test. Together with the browser and the platform or device, it identifies one test across runs. |
| `remark` | No | The sentence your test sets with `setTestStatus`. When it reads as a sentence, it leads the incident title. The default `completed` is ignored. |
| `browser` | Recommended | Part of the test's identity, and shown in the title. |
| `browser_version` | No | Shown in the title only. It is never part of the identity, because `latest` changes between runs. |
| `platform` | Recommended | Operating system, such as `win11`. Part of the identity. |
| `device` | No | Real device name for app and mobile tests, such as `Galaxy S23`. When it is not empty it is used instead of `platform`. |

All other fields are kept on the incident for reference.

{% hint style="info" %}
Set the `name` capability on every test. Without a name, Spike can only match repeats by the incident title, which is the same for every failing test on that browser and platform, so unrelated tests share one incident and auto-resolution is limited to a nameless pass on the same browser and platform. Avoid putting build or run numbers in the test name, or each run will look like a different test.
{% endhint %}

Spike groups repeated failures into the open incident and suppresses alerts while it is open. You can set up [alert rules](https://docs.spike.sh/alerts/alert-rules) to determine incident severity and take actions accordingly.

## Set up instructions

**Step 1:** Create a TestMu AI integration in the Spike dashboard and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

**Step 2:**

{% tabs %}
{% tab title="Setup on TestMu AI" %}
* Log in to your TestMu AI account and open **Settings**, then **Integrations**.
* Open the **Webhook** integration.
* Paste the **webhook URL** from Spike into the URL field.
* Choose the test notifications to send, so that both failed and passed tests reach Spike. Passed results are what resolve incidents.
* Save the settings.
{% endtab %}
{% endtabs %}

**Step 3:** Run a test and check the incident. A failing test sends a body like this:

```json
{
  "test_id": "Z17EF-OPUKH-BDAE8-YEPXU",
  "session_id": "bc02fd99593f14e37850745d66197f89",
  "build_id": 1843027,
  "build_name": "checkout-regression #482",
  "name": "Checkout - apply discount code",
  "user_id": 250563,
  "username": "acme-qa",
  "platform": "win11",
  "browser": "chrome",
  "browser_version": "128.0",
  "device": "",
  "status_ind": "failed",
  "remark": "Discount code SAVE10 was not applied: cart total stayed at $42.00",
  "duration": 74,
  "create_timestamp": "2026-10-08 03:12:05",
  "start_timestamp": "2026-10-08 03:12:09",
  "end_timestamp": "2026-10-08 03:13:23"
}
```

Spike opens the incident **Discount code SAVE10 was not applied: cart total stayed at $42.00 — Checkout - apply discount code on chrome 128.0, win11**.

When the same test passes, the notification has `"status_ind": "passed"` and `"remark": "completed"`. Spike resolves the incident titled **Checkout - apply discount code passed on chrome, win11**.

You can also test the integration by posting the body above to your webhook URL with `Content-Type: application/json`.
