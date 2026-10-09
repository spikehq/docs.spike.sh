---
description: >-
  Send NVADR (RedHunt Labs) issues to Spike so an exposed asset or security risk pages your on-call rotation, and resolves its incident when the issue is closed.
---

# Integrate Spike with NVADR (RedHunt Labs)

[NVADR](https://redhuntlabs.com) is RedHunt Labs' attack surface management platform. It watches your internet-facing assets and raises issues in its Issue Tracker for security risks, unknown assets, third-party assets, data leaks and dark web mentions.

Send each NVADR issue to a Spike integration URL and an open issue pages your on-call rotation, while closing the issue resolves the incident.

{% hint style="warning" %}
NVADR does not document a generic outbound webhook. Its notification destinations are Slack, Email, Jira, the Issue Tracker and PagerDuty. To reach Spike you run a small forwarder of your own (a script, a workflow tool or a serverless function) that reads an NVADR issue and POSTs the body below to your Spike URL. The body is defined by Spike, not captured from NVADR, so the field names are ones you map to in your forwarder.
{% endhint %}

## Prerequisites

* An NVADR account with access to the **Issue Tracker**
* An NVADR integration in Spike and its webhook URL
* Something that can make an HTTPS POST when an NVADR issue is opened or closed

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → NVADR (RedHunt Labs)**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Find the issues in NVADR

1. Sign in to NVADR and open **Issue Tracker**.
2. Open an issue. Note its **ID**, **Status**, **Priority** and **Assignee**, and the risk, description and asset it was raised on. Your forwarder reads these.

## Step 3 — Send the issue to Spike

POST JSON to the webhook URL when an issue is opened or its status changes. Send one issue per request.

```json
{
  "id": 48213,
  "status": "OPEN",
  "title": "Exposed Git Repository",
  "description": "The /.git/ directory on staging.acme-corp.com is publicly accessible, exposing source code and commit history.",
  "severity": "HIGH",
  "priority": "P1",
  "category": "Security Risk",
  "asset": "staging.acme-corp.com",
  "assignee": "secops@acme-corp.com"
}
```

When the issue is closed, send the same body with `status` changed:

```json
{
  "id": 48213,
  "status": "CLOSED",
  "title": "Exposed Git Repository",
  "description": "The /.git/ directory on staging.acme-corp.com is publicly accessible, exposing source code and commit history.",
  "severity": "HIGH",
  "priority": "P1",
  "category": "Security Risk",
  "asset": "staging.acme-corp.com",
  "assignee": "secops@acme-corp.com"
}
```

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | Yes | The NVADR Issue Tracker issue id. It is the same on the open and the close, and it is how Spike matches the two. |
| `status` | Yes | `OPEN` or `IN PROGRESS` opens or updates an incident. `CLOSED` or `WON'T FIX` resolves it. Case does not matter. |
| `description` | Recommended | NVADR's sentence about what is wrong. It becomes the incident title. |
| `title` | Recommended | The risk name, such as `Exposed Git Repository`. Used for the title only when `description` is empty. |
| `asset` | Recommended | The host, domain, IP or cloud asset the risk was found on. |
| `category` | Optional | `Security Risk`, `Asset`, `Third Party Asset`, `Data Leak` or `Dark Web`. |
| `severity` | Optional | `CRITICAL`, `HIGH`, `MEDIUM`, `LOW` or `INFO`. Not in the title. Use it in an [alert rule](../alerts/alert-rules.md). |
| `priority` | Optional | NVADR priority, `P0` to `P4`. Not in the title. Use it in an alert rule. |
| `assignee` | Optional | Email of the NVADR user the issue is assigned to. Informational. |

## Incident identity

Spike identifies the incident by `id`. A repeat of the same issue joins the open incident instead of paging again, and a `CLOSED` or `WON'T FIX` status resolves it. A closing status never opens a new incident. A body with no `id` falls back to matching on the title.

## Incident title

The title is the `description` sentence, with whitespace collapsed and capped at 200 characters:

```
The /.git/ directory on staging.acme-corp.com is publicly accessible, exposing source code and commit history.
```

When `description` is empty it falls back to `{title} on {asset}`, then `{title}`, then `{category} on {asset}`, and finally `NVADR alert with no details`. The id, status, severity, priority and assignee are never in the title.

A closed issue reads `[RESOLVED] <title>`. A `WON'T FIX` issue reads `<title> (won't fix)`, because the risk is accepted rather than fixed. Both resolve the incident.

{% hint style="info" %}
`WON'T FIX` resolves the incident in Spike. The exposure may still exist, so the `(won't fix)` wording on the event list is the only trace of that decision.
{% endhint %}

Use a [Title Remapper](../alerts/title-remapper.md) if you would rather read incidents as the risk name and asset.

## Step 4 — Confirm it end to end

1. Send the firing body with a test `id` and check an incident opens on your service with the `description` as its title.
2. Send the same body with `"status": "CLOSED"` and check the incident resolves.
