---
description: >-
  Send NVADR (RedHunt Labs) issues to Spike so an exposed asset or security risk pages your on-call rotation, and resolves its incident when the issue is closed.
---

# Integrate Spike with NVADR (RedHunt Labs)

[NVADR](https://redhuntlabs.com) is RedHunt Labs' attack surface management platform. It watches your internet-facing assets and raises issues in its Issue Tracker for security risks, unknown assets, third-party assets, data leaks and dark web mentions.

Send each NVADR issue to a Spike integration URL and an open issue pages your on-call rotation, while closing the issue, or marking it `WON'T FIX`, resolves the incident.

{% hint style="warning" %}
NVADR does not document a generic outbound webhook. Its notification destinations are Slack, Email, Jira, PagerDuty, [Datadog](https://docs.redhuntlabs.com/docs/integrations/integrating-with-datadog) and its own Issue Tracker. To reach Spike you run a small forwarder of your own (a script, a workflow tool or a serverless function) that reads an NVADR issue and POSTs the body below to your Spike URL. The body is defined by Spike, not captured from NVADR, so the field names are ones you map to in your forwarder.
{% endhint %}

## Prerequisites

* An NVADR account with access to the **Issue Tracker** and to **Settings → Integrations & API**, where your organisation's Public API key lives
* An NVADR integration in Spike and its webhook URL
* A place to run a small forwarder (a script on a schedule, a workflow tool or a serverless function) that can call `https://api.redhuntlabs.com` and POST to `hooks.spike.sh`. NVADR has no trigger that calls a URL when an issue changes, so the forwarder polls for changes

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → NVADR (RedHunt Labs)**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Get your NVADR Public API key

1. Sign in to NVADR, go to **Settings → Integrations & API** and scroll to the **Public API** section.
2. If a key is already shown, copy it and use that one. Click **Generate** only when there is no key yet. Store the key as a secret in your forwarder; it is sent in the `x-api-key` header.
3. Open **Issue Tracker** and look at an issue. Note its **ID**, **Status**, **Priority** and **Assignee**, and the risk, asset, severity and category it was raised on, so you can recognise them in the API response.

{% hint style="warning" %}
NVADR gives each organisation a single API key, shared by everyone in it. **Regenerate** and **Delete** revoke that key, so they break every other script, SIEM or tool that already uses it. Reuse the existing key rather than regenerating it for Spike.
{% endhint %}

## Step 3 — Run a forwarder that sends changes to Spike

NVADR does not push issues anywhere, so your forwarder polls the Issue Tracker API on a schedule, for example every 5 minutes. The API returns at most 100 issues per request. When there are more, the response carries a `next_page` value, and you ask for that page with the `page` parameter:

```bash
curl -s -H "x-api-key: $NVADR_API_KEY" https://api.redhuntlabs.com/api/v1/issue-tracker/
curl -s -H "x-api-key: $NVADR_API_KEY" "https://api.redhuntlabs.com/api/v1/issue-tracker/?page=$NEXT_PAGE"
```

On each run the forwarder should:

1. Fetch every page. Request the first page, then keep requesting `?page=<next_page>` with the value from the last response until a response has no `next_page`. The API is rate-limited and answers `429 Too Many Requests` when it is called too fast (RedHunt does not publish the limits). On a 429, wait and retry the same page with a growing delay (for example 5, 10, then 20 seconds). If it still fails, stop this run without sending or storing anything, and let the next run start again.
2. Compare each issue's `status` with what it stored on the previous run, keyed by the issue `id`. Store these between runs in a file or small database.
3. For every issue that is new or whose status changed, map the response fields onto the body below and POST it to your Spike webhook URL with `Content-Type: application/json`. Send one issue per request.
4. Store the new status only after Spike accepts the POST, so a failed request is retried on the next run.

{% hint style="warning" %}
**Seed the stored state on the first run.** On a first run every issue already in NVADR looks new, so step 3 would page your rotation once for each open issue, all at once. Run the forwarder once in a mode that fetches every page and stores each issue's `id` and `status` without POSTing anything. From then on only issues that are created or change status after setup reach Spike.
{% endhint %}

{% hint style="info" %}
The key names in NVADR's list response are not documented with an example. `id`, `status`, `priority` and `assignee` match NVADR's Update Issue request. Check the others (`title`, `asset`, `severity`, `category`, `first_seen`, `last_seen`) against a real response from your account and map them to the body's names.
{% endhint %}

The body to send:

```json
{
  "id": 48213,
  "title": "Exposed Git Repository",
  "category": "Security Risk",
  "asset": "https://staging.acme-corp.com",
  "severity": "CRITICAL",
  "status": "OPEN",
  "priority": "P1",
  "assignee": "secops@acme-corp.com",
  "first_seen": "2026-10-12T21:47:05Z",
  "last_seen": "2026-10-13T03:12:40Z"
}
```

When the issue is closed, send the same body with `status` changed (and the current `last_seen`):

```json
{
  "id": 48213,
  "title": "Exposed Git Repository",
  "category": "Security Risk",
  "asset": "https://staging.acme-corp.com",
  "severity": "CRITICAL",
  "status": "CLOSED",
  "priority": "P1",
  "assignee": "secops@acme-corp.com",
  "first_seen": "2026-10-12T21:47:05Z",
  "last_seen": "2026-10-13T09:58:21Z"
}
```

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | Yes | The NVADR Issue Tracker issue id, a number or a string. It is the same on every delivery about one issue and is how Spike matches them. Without it a `CLOSED` or `WON'T FIX` cannot resolve the incident. Never in the title. |
| `status` | Yes | `OPEN`, `IN PROGRESS`, `WON'T FIX` or `CLOSED`. Case, underscores and the apostrophe do not matter, so `In_Progress` and `WONT_FIX` work. |
| `title` | Recommended | The risk name, such as `Exposed Git Repository`. |
| `asset` | Recommended | The host, IP or URL the risk was found on. A URL is shown as its host (and port) only. |
| `severity` | Recommended | `critical`, `high`, `moderate` or `low`, in any case. Shown in the title as `[Critical]` and so on. Any other value leaves the bracket out. Sets the incident severity. |
| `category` | Optional | `Security Risk` or `Data Leak`. Used in the title only when `title` is missing. |
| `priority` | Optional | NVADR priority, `P0` to `P4`. P1 to P4 set the incident priority; P0 is ignored. Not in the title. |
| `assignee` | Optional | Email of the NVADR user the issue is assigned to. Shown on the incident, not in the title. |
| `first_seen` | Optional | ISO 8601 time NVADR first saw the risk. Display only. |
| `last_seen` | Optional | ISO 8601 time NVADR last saw the risk. Moves on every rescan. Display only. |

A value left as an unexpanded template variable (`$id`, `${id}`, `{{id}}`, `%id%`, `<id>`) counts as missing.

## What each status does

| `status` | With no open incident for the `id` | With an open incident |
| --- | --- | --- |
| `OPEN` | Opens an incident | Joins it, no new page |
| `IN PROGRESS` | Opens an incident, because the risk is still live | Joins it |
| `CLOSED` | Dropped | Resolves it when the body carries the same `id` |
| `WON'T FIX` | Dropped | Resolves it when the body carries the same `id` |
| missing or unknown | Treated as firing | Treated as firing, never resolves |

A `CLOSED` or `WON'T FIX` body resolves an incident only when both it and the incident carry the same `id`. Without an `id` it joins the incident and leaves it open for someone to resolve by hand.

## Incident identity

Spike identifies the incident by `id`, so the title is display only. A repeat that changes only `last_seen`, `priority` or `assignee` joins the open incident instead of paging again. Two different issues with different ids are two incidents. A body with no usable `id` falls back to matching on the title, which is built to stay identical across deliveries. Titles can be shared by different issues (two paths on one host show the same host, and an issue without a `title` reads `NVADR security risk on <host>`), so a body without an `id` never resolves an incident. Always send the `id`.

## Incident title

NVADR sends no sentence about the fault, so Spike builds the title from `severity`, `title` and `asset`:

```
[Critical] Exposed Git Repository on staging.acme-corp.com
```

A closed issue replaces the severity bracket with NVADR's status word:

```
[Closed] Exposed Git Repository on staging.acme-corp.com
[Won't fix] Exposed Git Repository on staging.acme-corp.com
```

When a part is missing the title falls back in this order:

* No recognised severity: `Exposed Git Repository on staging.acme-corp.com`
* No asset: `[Critical] Exposed Git Repository`
* No `title`: `[High] NVADR security risk on 203.0.113.24` (the `category` lower-cased, or `NVADR issue` without it)
* A GROUPED-mode ticket title, `<asset> - <severity>` such as `staging.acme-corp.com - Critical`, names no risk and repeats the severity, so when its `<asset>` is the body's `asset` host it counts as no `title`: `[Critical] NVADR security risk on staging.acme-corp.com`
* Neither `title` nor `asset`: `NVADR issue with no details`

` on {asset}` is left out when the title already names that host as a whole word. Whitespace is collapsed, and the whole title is capped at 200 characters: the severity bracket and the asset host are kept whole and the `title` is cut at a word boundary with `...`. The id, priority, assignee, `first_seen` and `last_seen` are never in the title.

Use a [Title Remapper](../alerts/title-remapper.md) if you would rather read incidents another way.

{% hint style="info" %}
`WON'T FIX` resolves the incident in Spike. The exposure may still exist, so the `[Won't fix]` wording on the event list is the only trace of that decision.
{% endhint %}

## Step 4 — Confirm it end to end

1. Send the firing body with a test `id` and check an incident opens on your service titled `[Critical] Exposed Git Repository on staging.acme-corp.com`.
2. Send it again with a newer `last_seen` and check it joins the same incident.
3. Send the body with `"status": "CLOSED"` and check the incident resolves.

Disclaimer: These integration instructions are offered independently by Spike.sh, and Spike.sh is not affiliated with nor a partner of RedHunt Labs.
