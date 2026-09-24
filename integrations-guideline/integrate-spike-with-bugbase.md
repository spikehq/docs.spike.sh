---
description: >-
  Send BugBase bug bounty and vulnerability disclosure reports to Spike so a new submission pages your security on-call by phone, SMS, Slack or Teams, and resolving the report closes the incident.
---

# Integrate Spike with BugBase

[BugBase](https://bugbase.ai) runs your bug bounty programme, your vulnerability disclosure programme and your pentests. Every program has its own webhook, and BugBase posts a JSON body to it each time a report moves through triage. Point that webhook at a Spike integration and a researcher submitting a critical finding at 2am pages your security on-call, while marking the report resolved in BugBase closes the incident.

Nothing is installed anywhere. You add a webhook on the program, paste a Spike URL into it and tick the triggers it should fire on.

## What Spike does with each trigger

One BugBase report is one incident. Spike identifies it by `report_id`, so every later delivery about that report lands on the incident already open rather than paging your team a second time.

| Trigger in BugBase | What happens in Spike |
| --- | --- |
| `New Report is Submitted` | Opens an incident for that report and pages your escalation policy |
| `New Vulnerability is Reported` | Opens an incident for that report and pages your escalation policy |
| `Report is marked as Resolved` | Auto-resolves the open incident |
| `Vulnerability is marked as Resolved` | Auto-resolves the open incident |
| `Report is Closed` | Auto-resolves the open incident |
| `Report is marked as Duplicate` | Auto-resolves the open incident. A duplicate is already being worked on somewhere else |
| `Report is marked as Invalid` | Auto-resolves the open incident |
| `Report is marked as Informational` | Auto-resolves the open incident |
| Any other trigger — triage status changes, severity or priority edits, comments | Added as an event on the open incident. Escalation continues, nobody is paged again |

A delivery that resolves a report Spike has nothing open for is dropped, which is what you want when the incident was already resolved by hand.

### Two things mark a report closed

Spike resolves on either of two independent signals, whichever one the delivery carries:

* `is_closed` is `"true"`, or
* the trigger is one of the resolving triggers in the table above.

They should agree — a report marked resolved is a closed report — but Spike does not assume they do. A resolving trigger that arrives with `is_closed` unset still resolves the incident, and a triage update that arrives with `is_closed: "true"` resolves it too.

## Incident titles

The title is built from the report itself, so it reads as a sentence when Spike speaks it out on a phone call:

```
critical Injection report: SQL injection in /api/search endpoint
```

That is `{severity} {category} report: {summary}`. The report id, the scope, the priority, the status, the reporter's username and whether the report is private all stay in the payload and show up on the incident page, where they belong.

The title stays the same for the life of the report even as it moves through triage, because Spike builds it once, when the incident is created.

A report that leaves one of those three fields empty simply loses that word rather than printing a gap:

| What BugBase sent | Incident title |
| --- | --- |
| Severity, category and summary | `critical Injection report: SQL injection in /api/search endpoint` |
| No severity | `Injection report: SQL injection in /api/search endpoint` |
| No category | `critical report: SQL injection in /api/search endpoint` |
| Neither severity nor category | `BugBase report: SQL injection in /api/search endpoint` |
| No summary | `BugBase report BB-20261` |

{% hint style="info" %}
An unset field is not the same as a missing one on this integration. BugBase leaves a template variable it has no value for as the literal text `{{severity}}` rather than blanking it, so Spike treats **any value still containing `{{` as empty**. That is why a report with no severity reads `Injection report: …` and never `{{severity}} Injection report: …`. The same rule applies to every field in the body, including `report_id`, `is_closed` and `trigger`.
{% endhint %}

## Severity

Severity comes from the report's `severity`:

| BugBase severity | Severity in Spike |
| --- | --- |
| `critical` | SEV1 |
| `high` | SEV1 |
| `medium` | SEV2 |
| `low` | SEV3 |
| Unset, or a value Spike does not recognise | Your integration's default |

{% hint style="info" %}
Severity is set when the incident is created. A researcher's severity being revised during triage is recorded on the incident but does not move the incident's own severity. [Alert rules](../alerts/alert-rules.md) can override severity, route the incident to another escalation policy, or suppress it entirely — which is how you keep `low` findings on a VDP out of the pager while `critical` ones wake somebody up.
{% endhint %}

Read more about [priority and severity](../incidents/priority-and-severity.md).

## Prerequisites

* A BugBase account with permission to manage the program's settings
* A BugBase integration in Spike and its webhook URL

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → BugBase**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Add the webhook on your program

1. In BugBase, open the program and go to **Settings → Integrations → Webhooks**.
2. Add a webhook and paste the Spike URL from Step 1 into the **URL** field.
3. Leave the request body as BugBase's default. It already carries everything Spike reads — see [Payload reference](#payload-reference) below, and the note on custom bodies if you intend to edit it.
4. Save the webhook.

One webhook per program. If two programs should page different teams, create a second Spike integration and give that program its own URL.

{% hint style="warning" %}
BugBase does not sign its webhooks, so the token in the URL is the shared secret. Anyone holding that URL can open incidents on your account, so keep it out of shared documents, program briefs and tickets. If it leaks, archive the integration in Spike and create a new one, then update the webhook on the program.
{% endhint %}

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

## Step 3 — Enable the triggers

This is the step people get wrong, so it gets its own step. The webhook fires only on the triggers you tick, and you need triggers from **both** lists for an incident to open *and* close on its own.

**Enable these to open incidents:**

* `New Report is Submitted`
* `New Vulnerability is Reported`

**Enable these to resolve them:**

* `Report is marked as Resolved`
* `Vulnerability is marked as Resolved`
* `Report is Closed`
* `Report is marked as Duplicate`
* `Report is marked as Invalid`
* `Report is marked as Informational`

{% hint style="danger" %}
Enabling only the submitted trigger is the most common mistake on this integration. Every BugBase incident then stays open in Spike until somebody resolves it by hand, long after the report was closed in BugBase. Tick the resolving triggers at the same time as the opening ones.
{% endhint %}

Any remaining triggers — triage status changes, severity or priority edits, comments — are optional. Turn them on if you want the report's progress visible on the incident timeline; they never page anyone and never open an incident of their own.

{% hint style="info" %}
If your program only runs one of the two vocabularies — some programs speak of reports, others of vulnerabilities — tick the triggers that exist on your program and ignore the rest. Spike reads whichever it receives.
{% endhint %}

## Step 4 — Send a test report

Submit a test report on the program, or use BugBase's own test delivery if the webhook offers one. An incident should appear in Spike within a few seconds and start escalating through the policy you attached. Mark that report resolved in BugBase and the incident should resolve itself.

Running both halves once, before a real researcher submits anything, is the only way to know the resolving triggers are actually enabled.

## Payload reference

BugBase posts `application/json` over POST. A newly submitted report:

```json
{
  "source": "bugbase",
  "trigger": "New Report is Submitted",
  "report_id": "BB-20261",
  "summary": "SQL injection in /api/search endpoint",
  "category": "Injection",
  "scope": "api.acme.com",
  "severity": "critical",
  "priority": "p1",
  "status": "triaging",
  "reporter": "sec_researcher_42",
  "is_closed": "false",
  "is_private": "true",
  "timestamp": "2026-09-24T09:15:00Z"
}
```

The same report once it is resolved. The id is unchanged, which is how it finds the incident that is already open:

```json
{
  "source": "bugbase",
  "trigger": "Report is marked as Resolved",
  "report_id": "BB-20261",
  "summary": "SQL injection in /api/search endpoint",
  "category": "Injection",
  "scope": "api.acme.com",
  "severity": "critical",
  "priority": "p1",
  "status": "resolved",
  "reporter": "sec_researcher_42",
  "is_closed": "true",
  "is_private": "true",
  "timestamp": "2026-09-25T14:00:00Z"
}
```

What Spike does with each field:

| Field | What Spike uses it for |
| --- | --- |
| `report_id` | The identity. Every delivery carrying this id lands on the same incident |
| `trigger` | Decides open, append or resolve |
| `is_closed` | `"true"` resolves the incident, whatever the trigger says |
| `severity` | Sets the incident's severity when the incident is created |
| `category`, `summary` | The incident title, with `severity` |
| `scope`, `priority`, `status`, `reporter`, `is_private`, `timestamp` | Kept on the incident page and available to [alert rules](../alerts/alert-rules.md). Never part of the title or the identity |

Every value arrives as a string, including `is_closed` and `is_private`, so an alert rule matching on them should compare against `"true"` and `"false"` rather than booleans.

### If you customise the body

BugBase's default body is the one above, and it is the one Spike is built against. If you edit the template, keep `report_id`, `trigger`, `severity`, `category` and `summary` in it, and keep their names.

Whatever you send, be aware of how BugBase renders a variable it has no value for:

```json
{ "severity": "{{severity}}" }
```

It leaves the placeholder in the body as literal text rather than substituting an empty string. That is why Spike treats any value still containing `{{` as empty — a finding on a program that does not use severities would otherwise reach your on-call titled `{{severity}} Injection report: …`, which reads as a broken integration to the person being woken up. The same protection covers a variable you add to the template that your program does not populate.

### Title Remapper sample

A [Title Remapper](../alerts/title-remapper.md) rewrites the title against the payload, which is how you fold in the scope or the programme name:

```handlebars
[{{data.scope}}] {{data.category}}: {{data.summary}}
```

Output: `[api.acme.com] Injection: SQL injection in /api/search endpoint`

{% hint style="warning" %}
Write the remapper against fields that do not move while the report is being triaged — `report_id`, `summary`, `category` and `scope` are safe. `status`, `priority` and `is_closed` change on every delivery, and a title built on them stops repeats grouping onto the incident already open.

A remapper reading a field your program leaves unset prints BugBase's literal `{{…}}` text, since the remapper runs on the raw payload. Use the fields your program actually fills in.
{% endhint %}

## Things worth knowing

* **Resolving in Spike does not change the report in BugBase.** The two are not linked in this version. Close the report in BugBase and let it resolve the incident, rather than the other way round, to keep the two sides in step.
* **Private reports are not treated differently.** `is_private` is context on the incident, not a filter. A private report pages exactly like a public one, so if your escalation policy reaches people who should not see embargoed findings, split those programs onto their own Spike service.
* **The reporter's username comes across.** It is on the incident page, so whoever picks up the page can go straight to the right report in BugBase, but it is deliberately kept out of the title.
* **Duplicates resolve rather than merge.** Spike does not join a duplicate report's incident to the original's. Marking it duplicate in BugBase resolves its incident, which is the closest honest representation of what happened.
* **One report, one incident, one page.** A report that is triaged, re-scored, commented on twice and finally resolved pages your on-call exactly once.

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Check the webhook on the program first. Confirm the URL is the full `https://hooks.spike.sh/<your-token>/push-events` with nothing trailing it, that the webhook is enabled, and that at least one opening trigger is ticked. A webhook with no triggers enabled is saved happily and never fires.

Then confirm the integration has not been archived in Spike, and submit a test report to force a delivery rather than waiting for a researcher.

</details>

<details>

<summary>Incidents open but never resolve</summary>

The resolving triggers in Step 3 are not enabled on the webhook. This is the usual cause by a wide margin. Tick `Report is marked as Resolved`, `Report is Closed` and the Duplicate, Invalid and Informational variants, then resolve a test report to confirm.

If they are enabled and incidents still stay open, check whether the body template was edited and `report_id` dropped or renamed. A resolving delivery with no id has no incident to find.

</details>

<details>

<summary>An incident's title contains `{{severity}}` or another placeholder</summary>

Spike strips any value still containing `{{`, so a default title never shows one. A title that does is coming from a [Title Remapper](../alerts/title-remapper.md) on this integration, which reads the raw payload. Point the remapper at fields your program fills in, or drop the unset one from the template.

</details>

<details>

<summary>One report opened several incidents</summary>

Spike groups on `report_id`. Several incidents for one report means the deliveries carried different ids, or none at all — check the body template on the webhook. If the earlier incident had already been resolved, in Spike or by a resolving trigger, the next delivery correctly opens a fresh one.

</details>

<details>

<summary>A reopened report does not page anyone</summary>

Only the opening triggers create an incident. If a report that was marked Duplicate or Invalid is reopened on your program and BugBase sends that as a plain status update, Spike has nothing open to attach it to and the delivery is dropped. Enable `New Report is Submitted` alongside the resolving triggers, and tell us at [support@spike.sh](mailto:support@spike.sh) which trigger your program sends on a reopen — we will map it.

</details>

<details>

<summary>Every report pages, including the low-severity noise</summary>

Public programmes attract volume, and BugBase's webhook has no severity filter of its own. Use [alert rules](../alerts/alert-rules.md) on the Spike side to suppress or reroute on `data.severity`, `data.priority` or `data.scope` — for example paging only on `critical` and `high`, and sending the rest to a service with no escalation policy for review during the day.

</details>

Disclaimer: These integration instructions are offered independently by Spike, and Spike is not affiliated with nor a partner of BugBase.
