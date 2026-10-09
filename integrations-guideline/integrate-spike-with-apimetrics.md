---
description: "Send APImetrics API call alerts to Spike so a failing, slow or warning API call pages your on-call rotation by phone, SMS, Slack or Teams, and resolves when the call passes again."
---

# Integrate Spike with APImetrics

[APImetrics](https://apimetrics.io) monitors your APIs by calling them on a schedule from locations around the world. When a call fails, runs slow or breaks a warning threshold, APImetrics can send a webhook. Point that webhook at a Spike integration URL and the failing call pages your on-call rotation, repeat failures of the same call land on the incident already open, and the incident resolves itself when the call passes again.

## Prerequisites

* An APImetrics account that can create alert actions
* An APImetrics integration in Spike and its webhook URL

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → APImetrics**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Add a webhook alert action in APImetrics

1. Sign in to APImetrics and open the **Alerts** area of the dashboard.
2. Create a new **alert action** and choose the **Webhook** type.
3. Paste the Spike webhook URL from Step 1 into the **URL** field and save.
4. Attach the action to the alert that watches your API calls (for example **All Failures**), and choose the results that should trigger it: **Fail**, **Warning**, **Slow** and **Pass**. Pass is what resolves the incident, so keep it selected.

The menu names in APImetrics change from time to time; look for the alert action or webhook option on the Alerts screens.

## What APImetrics sends

APImetrics posts this JSON body when an API call fails. Spike reads `call_id`, `result_class`, `result` and `context._notification`; the other fields are kept on the incident.

```json
{
  "response_size": 0,
  "location_id": "public_googleuscentral1",
  "result_class": "FAIL",
  "call_id": "agpzfmFwaW1ldHJpY3NyFwsSClRlc3RTZXR1cDIYgICgyOqJ2QoM",
  "result_url": "http://client.apimetrics.io/tests/result/agpzfmFwaW1ldHJpY3NyGAsSC1Rlc3RSZXN1bHQzGICA0K_k-bsKDA/",
  "result": "DOWNLOAD_ERROR",
  "context": {
    "_result_category": "FAIL",
    "_result_streak": 3,
    "_notification": {
      "category": "FAIL",
      "owners": [
        "agpzfmFwaW1ldHJpY3NyEQsSBFVzZXIYgICg5MuP0goM"
      ],
      "viewed_by": [],
      "title": "[FAIL]: APImetrics: All Failures: Checkout - Create order",
      "created": "2026-10-09T03:12:41.204518Z",
      "last_update": "2026-10-09T03:12:41.311902Z",
      "references": [
        "agpzfmFwaW1ldHJpY3NyFwsSClRlc3RTZXR1cDIYgICgyOqJ2QoM",
        "agpzfmFwaW1ldHJpY3NyGAsSC1Rlc3RSZXN1bHQzGICA0K_k-bsKDA"
      ],
      "description": "\n<p>\nAPI Call \"<a href=\"http://client.apimetrics.io/tests/test/agpzfmFwaW1ldHJpY3NyFwsSClRlc3RTZXR1cDIYgICgyOqJ2QoM/\">Checkout - Create order</a>\" has failed :\n<ul>\n<li><b>We could not connect to the API.</b></li>\n<li>Calling POST https://api.acme-shop.com/v2/orders</li>\n<li>Checking for connection issue...</li>\n<li>... no problem found.</li>\n<li>Couldn&#39;t resolve host. The given remote host was not resolved.</li>\n<li>We could not connect to the API.</li>\n<li>Couldn&#39;t resolve host &#39;api.acme-shop.com&#39;</li>\n</ul>\n</p>\n<p>View details here: <a href=\"http://client.apimetrics.io/tests/result/agpzfmFwaW1ldHJpY3NyGAsSC1Rlc3RSZXN1bHQzGICA0K_k-bsKDA/\">http://client.apimetrics.io/tests/result/agpzfmFwaW1ldHJpY3NyGAsSC1Rlc3RSZXN1bHQzGICA0K_k-bsKDA/</a></p>\n<p>Sincerely,<br>APImetrics Team</p>\n"
    }
  },
  "result_id": "agpzfmFwaW1ldHJpY3NyGAsSC1Rlc3RSZXN1bHQzGICA0K_k-bsKDA",
  "call_url": "http://client.apimetrics.io/tests/test/agpzfmFwaW1ldHJpY3NyFwsSClRlc3RTZXR1cDIYgICgyOqJ2QoM/",
  "response_time": 0
}
```

### Required and optional fields

| Field | Required | Used for |
| --- | --- | --- |
| `call_id` | Yes | Identifies the monitored API call. It is the same on every run, so repeat failures join one incident and a pass resolves it |
| `result_class` | Yes | `FAIL`, `WARNING` and `SLOW` open or update an incident. `PASS` resolves it. The class is added to the title for slow and warning results |
| `context._notification.description` | Recommended | APImetrics' own sentence about what is wrong. It becomes the incident title |
| `context._notification.title` | Recommended | The fallback title, and the source of the call name when the description has none |
| `result` | Optional | A machine code such as `DOWNLOAD_ERROR`, used in the title only when the description has no text |

Every other field (`result_id`, `location_id`, `result_url`, `call_url`, `response_time`, `response_size`, `context._result_category`, `context._result_streak`) is stored with the incident and not read for the title.

### Recovery

When the call passes, APImetrics sends the same shape with `result_class` set to `PASS`. It may arrive without `context._notification`:

```json
{
  "response_size": 1532,
  "location_id": "public_googleuscentral1",
  "result_class": "PASS",
  "call_id": "agpzfmFwaW1ldHJpY3NyFwsSClRlc3RTZXR1cDIYgICgyOqJ2QoM",
  "result_url": "http://client.apimetrics.io/tests/result/agpzfmFwaW1ldHJpY3NyGAsSC1Rlc3RSZXN1bHQzGICAwM2Q-7sKDA/",
  "result": "OK",
  "context": {
    "_result_category": "PASS",
    "_result_streak": 1
  },
  "result_id": "agpzfmFwaW1ldHJpY3NyGAsSC1Rlc3RSZXN1bHQzGICAwM2Q-7sKDA",
  "call_url": "http://client.apimetrics.io/tests/test/agpzfmFwaW1ldHJpY3NyFwsSClRlc3RTZXR1cDIYgICgyOqJ2QoM/",
  "response_time": 412
}
```

## Incident title

The title is APImetrics' own sentence about the fault. A failure reads as APImetrics wrote it, and a slow or warning result carries its class at the end:

```
API Call "Checkout - Create order" has failed: Couldn't resolve host 'api.acme-shop.com'
API Call "Checkout - Create order" was slow: The API responded in 5.3 seconds (SLOW)
```

It is built from the lead line of `context._notification.description`, then its findings, with HTML, links and the "View details here" sign-off removed. Titles are capped at 200 characters. If the description has no text, the title falls back to the result code and call name, for example `DOWNLOAD_ERROR on API Call "Checkout - Create order" (FAIL)`. If `call_id` is missing, the title is the plain notification title, for example `APImetrics: All Failures: Checkout - Create order`, and Spike matches repeats and recoveries by that title. A pass is titled `API Call "Checkout - Create order" is passing again`.

Use a [Title Remapper](../alerts/title-remapper.md) if you prefer a different format.

## Auto resolve

An incident is matched by `call_id`. Repeat failures of the same call join the open incident instead of paging again, and a `PASS` for that `call_id` resolves it. A pass with no matching open incident is dropped.

{% hint style="warning" %}
A call runs from several APImetrics locations, but the incident is identified by the call alone. A pass from one location can resolve an incident that is still failing from another, and the next failure opens it again.
{% endhint %}

{% hint style="success" %}
This integration auto resolves
{% endhint %}
