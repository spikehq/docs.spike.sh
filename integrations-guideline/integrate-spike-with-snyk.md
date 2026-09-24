---
description: >-
  Send Snyk project snapshots to Spike so a new critical or high vulnerability in a dependency pages your on-call team, and the scan that fixes it closes the incident.
---

# Integrate Spike with Snyk

[Snyk](https://snyk.io/) rescans your Open Source and Container projects on a schedule and emails whoever owns the project when a scan turns up something new. A critical remote code execution in a dependency you ship to production is an on-call event, not an inbox item, so point Snyk's `project_snapshot` webhook at Spike and the scan that finds it pages your escalation policy, titled with the vulnerability and the package it is in. The scan that fixes it closes the incident again.

There is no UI for this in Snyk. You create the webhook yourself with one `curl` against Snyk's API, and the exact call is in Step 3 below.

## What Spike does with each snapshot

Snyk fires `project_snapshot` on **every** recurring scan of **every** Open Source and Container project in the org, whether anything changed or not. A healthy project scanned nightly sends 365 "still clean" webhooks a year, and Spike throws those away before they reach your pager:

| Snapshot | What happens in Spike |
| --- | --- |
| Brings a new `critical` or `high` issue, and nothing is open for that project | Opens an incident and pages your escalation policy |
| Brings a new `critical` or `high` issue while an incident is open for that project | Added as an event to the open incident. It never pages again |
| Brings nothing new, but the project still has critical or high issues open | Added as an event to the open incident, so you can see the project is still vulnerable. Opens one if nothing is open |
| Removes the last critical or high issue | Auto-resolves the open incident |
| Brings nothing, removes nothing, and the project has no critical or high issues | Dropped. Spike answers `200` and creates nothing at all |
| Only `medium`, `low` or `isIgnored: true` issues | Dropped, for the same reason. See [Threshold](#threshold) |
| `ping` | Answered `200`. Creates nothing |

### One incident per project, not per vulnerability

Spike groups on `project.id`, the uuid Snyk gives a project for its whole life. A dependency bump that pulls in a dozen advisories in a single scan is one incident carrying a dozen issues, not twelve pages, and renaming the project or moving the repository keeps every snapshot landing on the same incident.

Two Snyk projects are always two incidents, including the two that a single repository produces when it has both a `package.json` and a `Dockerfile`. Those are separate projects in Snyk, with separate ids and separate scan schedules.

### Threshold

Only `critical` and `high` issues page anyone. `medium` and `low` findings ride along in the payload and show up on the incident page, but they never open one and they never hold one open.

Issues marked **ignored** in Snyk never page either, whatever their severity. Your team already made a call on those inside Snyk, and Spike does not relitigate it.

{% hint style="warning" %}
Ignoring an issue in Snyk stops it paging, but Snyk's own `issueCountsBySeverity` may still count it. If a project carries a permanently ignored critical or high issue, its incidents can stay open even after everything else is fixed. Resolve those by hand, or set the ignore to expire in Snyk. See [Things worth knowing](#things-worth-knowing).
{% endhint %}

## How incidents are titled

The title names the worst thing the scan found, so on-call can tell from a Slack message, a lock screen or a phone call what is actually wrong without opening the incident:

```
Critical: Prototype Pollution in lodash@4.17.15 — spikehq/api:package.json
```

Severity first, then the vulnerability, then the package and version it is in, then the Snyk project. When more than one issue arrives at that same top severity, Spike names the worst one and counts the rest:

```
High: Prototype Pollution in xml2js@0.6.0 (+1 more) — globex-manufacturing/inventory-api:package.json
```

The count is only of the issues at the *highest* severity in that snapshot. One critical arriving alongside three highs reads as a critical with no `(+3 more)`, because the three highs are not the thing you are being woken up for.

| Snapshot | Title |
| --- | --- |
| One new critical issue | `Critical: Prototype Pollution in lodash@4.17.15 — spikehq/api:package.json` |
| Two new high issues | `High: Prototype Pollution in xml2js@0.6.0 (+1 more) — globex-manufacturing/inventory-api:package.json` |
| A license finding (`issueType: license`) | `High: GPL-3.0 license in left-pad@1.3.0 — spikehq/api:package.json` |
| Nothing new, project still vulnerable | `Open: 1 critical, 2 high — spikehq/api:package.json` |
| The scan that fixes the last issue | `Resolved: Prototype Pollution in lodash@4.17.15 fixed — spikehq/api:package.json` |

License findings are titled exactly like vulnerabilities. Snyk caps them at `high`, so a GPL violation in a dependency reads as `High: GPL-3.0 license in left-pad@1.3.0` and pages the same way a CVE does.

{% hint style="info" %}
The title changes from one snapshot to the next, on purpose. Grouping is on `project.id`, a real field Snyk sends on every delivery, so a title that moves with the findings never splits an incident or breaks auto-resolve. [Alert rules](../alerts/alert-rules.md) matching on Snyk title text should match on the project name at the end of the title, which is the part that stays put.
{% endhint %}

The CVE ids, the fix versions, `fixInfo`, `priority.score`, the CVSS scores and the link back to Snyk are all on the incident page rather than in the title.

## Severity

Snyk sends no single severity for a snapshot — severity lives per issue, in `newIssues[].issueData.severity`. Spike computes one for the incident:

| The snapshot | Severity Spike sets | Severity in Spike |
| --- | --- | --- |
| Brings at least one new `critical` issue | `critical` | SEV1 |
| Anything else that opens an incident | `high` | SEV1 |

Critical and high both land on SEV1 in Spike, because both are things you asked to be paged for. Use [alert rules](../alerts/alert-rules.md) if you want highs at SEV2, or to route a particular project's incidents to a quieter escalation policy. Read more about [priority and severity](../incidents/priority-and-severity.md).

{% hint style="info" %}
Severity is set when the incident is created. A later snapshot that brings a critical issue onto an incident opened by a high is recorded as an event on the incident and does not raise its severity.
{% endhint %}

## Prerequisites

* A Snyk org on **US-01, US-02, EU-01 or AU-01**. Webhooks are not available in other regions
* A Snyk API token with admin access to that org, from **Account settings → Auth Token**, or a service account token
* At least one Open Source or Container project in the org, with recurring scans enabled
* A Snyk integration in Spike and its webhook URL

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Snyk**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Find your org id and API endpoint

The org id is on **Settings → General** for the org in Snyk, or from `GET /v1/orgs` with the same token. It is a uuid, not the org slug in the URL.

The API endpoint depends on which region hosts your org, which you can read off the address bar:

| Region | You log in at | API endpoint |
| --- | --- | --- |
| SNYK-US-01 | `app.snyk.io` | `https://api.snyk.io` |
| SNYK-US-02 | `app.us.snyk.io` | `https://api.us.snyk.io` |
| SNYK-EU-01 | `app.eu.snyk.io` | `https://api.eu.snyk.io` |
| SNYK-AU-01 | `app.au.snyk.io` | `https://api.au.snyk.io` |

{% hint style="warning" %}
Snyk only offers webhooks in these four regions. On any other region or a single-tenant install, the endpoints in Step 3 return `404` or `403` and there is no way to create the webhook. Nothing else in this guide will help; talk to Snyk support about your region.
{% endhint %}

## Step 3 — Create the webhook

One call, from anywhere that can reach Snyk's API:

```bash
curl --request POST \
  --url https://api.snyk.io/v1/org/<your-org-id>/webhooks \
  --header 'Authorization: token <your-snyk-api-token>' \
  --header 'Content-Type: application/json' \
  --data '{
    "url": "https://hooks.spike.sh/<your-token>/push-events",
    "secret": "<any-random-string-you-choose>"
  }'
```

Swap `https://api.snyk.io` for your region's endpoint from Step 2. Snyk answers `201` with the webhook it created:

```json
{
  "id": "6c4e8b7a-4b9f-4f3a-9a1b-2f0b7a5c1d33",
  "url": "https://hooks.spike.sh/<your-token>/push-events",
  "isDisabled": false,
  "createdAt": "2026-09-24T09:12:44.000Z"
}
```

Keep the `id`. You need it to send a ping in Step 4, and to delete the webhook later.

The `secret` is required by Snyk and is yours to choose — any random string will do. Snyk signs each delivery with it and sends the result as `X-Hub-Signature`. Spike does not verify that header today, so the secret has no effect on what reaches your incidents; the token in the webhook URL is what authenticates the delivery. Generate one anyway and store it with your other secrets, so verification can be turned on later without recreating the webhook.

The webhook is per org, not per project. Every Open Source and Container project in that org starts sending snapshots to Spike as soon as it is created, which is usually what you want: a new repository onboarded into Snyk is covered without anybody remembering to wire it up. Create one webhook per Snyk org, pointing each at the Spike integration for the team that owns it.

## Step 4 — Send a ping

Snyk can fire a test delivery at the webhook:

```bash
curl --request POST \
  --url https://api.snyk.io/v1/org/<your-org-id>/webhooks/<webhook-id>/ping \
  --header 'Authorization: token <your-snyk-api-token>'
```

A `200` back means Snyk reached Spike. The ping carries no project and nothing to page anyone about, so Spike accepts it and creates no incident — an empty incident list after a successful ping is the integration working, not a failure.

To see a real incident, wait for the next scheduled scan, or open the project in Snyk and click **Retest now** on a project you know has a critical or high issue. Recurring scans usually run daily, so the wait can be up to 24 hours.

## Managing the webhook

| What | Call |
| --- | --- |
| List the org's webhooks | `GET /v1/org/<org-id>/webhooks` |
| Read one | `GET /v1/org/<org-id>/webhooks/<webhook-id>` |
| Ping one | `POST /v1/org/<org-id>/webhooks/<webhook-id>/ping` |
| Delete one | `DELETE /v1/org/<org-id>/webhooks/<webhook-id>` |

All of them take the same `Authorization: token <your-snyk-api-token>` header. There is no update call: to change the URL, delete the webhook and create a new one.

If you [archive the Spike integration](archive-an-integration.md), delete the Snyk webhook too. Snyk keeps retrying a webhook whose target has gone away.

## Which projects send snapshots

| Snyk product | Sends `project_snapshot` |
| --- | --- |
| Snyk Open Source | Yes, on every recurring scan |
| Snyk Container | Yes, on every recurring scan |
| Snyk Code (SAST) | No |
| Snyk IaC | No |

Only Open Source and Container projects on **recurring** scans produce snapshot webhooks. A project imported but never rescanned, a one-off CLI test, and anything scanned by Snyk Code or Snyk IaC send nothing, so a silent integration is often a project-type question rather than a webhook question.

## Payload reference

Snyk posts `application/json` with `X-Snyk-Event: project_snapshot/v0`, a `X-Snyk-Transport-ID` delivery id and the `X-Hub-Signature` HMAC. A snapshot that brings a new critical issue looks like this:

```json
{
  "project": {
    "id": "af137b96-6966-46c1-826b-2e79ac49bd58",
    "name": "spikehq/api:package.json",
    "origin": "github",
    "type": "npm",
    "browseUrl": "https://app.snyk.io/org/spike/project/af137b96-6966-46c1-826b-2e79ac49bd58",
    "issueCountsBySeverity": { "low": 4, "medium": 6, "high": 2, "critical": 1 }
  },
  "org": { "id": "8a3e1f0c-4d1a-4a4e-9f3d-9c2c2a9b0f11", "name": "Spike" },
  "group": { "id": "b2b8f2f4-5d3a-4d66-9a5e-6a0b1a4c8e22", "name": "Spike.sh" },
  "newIssues": [
    {
      "id": "SNYK-JS-LODASH-567746",
      "issueType": "vuln",
      "pkgName": "lodash",
      "pkgVersions": ["4.17.15"],
      "issueData": {
        "title": "Prototype Pollution",
        "severity": "critical",
        "cvssScore": 9.1,
        "url": "https://snyk.io/vuln/SNYK-JS-LODASH-567746"
      },
      "isIgnored": false,
      "fixInfo": { "isUpgradable": true, "isPatchable": false, "nearestFixedInVersion": "4.17.20" },
      "priority": { "score": 899 }
    }
  ],
  "removedIssues": []
}
```

| Field | What Spike does with it |
| --- | --- |
| `project.id` | Groups snapshots. One open incident per project, for the life of the project |
| `project.name` | The tail of the title, `spikehq/api:package.json` |
| `project.issueCountsBySeverity` | Decides whether the project is still vulnerable. `critical + high` at zero is what lets an incident resolve, and what makes a nothing-happened snapshot droppable |
| `project.browseUrl`, `project.origin`, `project.type` | Shown on the incident, so you can open the project in Snyk |
| `newIssues[]` | The issues this scan found. The worst one at the top severity becomes the title, the rest are on the incident page |
| `newIssues[].issueData.severity` | Sets the incident's severity: `critical` if any new issue is critical, otherwise `high` |
| `newIssues[].isIgnored` | `true` never pages and never counts towards the title |
| `newIssues[].issueType` | `vuln` or `license`. Both are titled the same way, from `issueData.title` |
| `removedIssues[]` | The issues this scan cleared. A snapshot that removes the last critical or high issue resolves the incident and names the fix in the title |
| `org`, `group` | Shown on the incident. Useful when one Spike service covers several Snyk orgs |

{% hint style="info" %}
`removedIssues` is the reason a fixed project closes its incident. The scan that ships the fix reports `newIssues: []` and a critical+high count of `0` — on the surface identical to a project that was never vulnerable, which Spike drops. The non-empty `removedIssues` is the only thing in the payload that says this delivery matters, so it is never dropped.
{% endhint %}

### Title Remapper sample

A [Title Remapper](../alerts/title-remapper.md) on the Snyk integration replaces the default title with one you write against the payload, which is how you fold in an environment or a team:

```handlebars
[{{data.org.name}}] {{data.newIssues.[0].issueData.title}} in {{data.newIssues.[0].pkgName}} — {{data.project.name}}
```

Output: `[Spike] Prototype Pollution in lodash — spikehq/api:package.json`

Write the remapper so it still reads sensibly when `newIssues` is empty, which is what a standing-issues or resolving snapshot looks like. A remapper that only reads `newIssues[0]` produces a title with holes in it on exactly the delivery that tells your team the problem is fixed.

## Things worth knowing

* **Nightly scans of a clean project cost you nothing.** Snyk fires a snapshot every scan, including the 364 that found nothing. Spike drops those before they become an event, so a healthy org can be sending Spike thousands of webhooks a month and never create an incident.
* **Ignored issues may still hold an incident open.** Whether Snyk's `issueCountsBySeverity` includes issues your team ignored is not documented, and Spike assumes it does — the safe reading, since assuming otherwise would resolve incidents on projects that still have real issues open. If a project carries a permanently ignored critical or high issue and its incidents never resolve on their own, that is this assumption showing. Give the ignore an expiry in Snyk, or resolve those incidents by hand.
* **The webhook is per org.** Every Open Source and Container project in the Snyk org sends to the same Spike integration. Split by team with a second Snyk org and a second integration, or keep one and split with [alert rules](../alerts/alert-rules.md) on the project name.
* **Snyk does not send a severity for the scan.** It sends one per issue. Spike computes the incident's severity from the new issues in that snapshot, so an incident opened by a high stays a high even when a critical lands on it later. The critical is still recorded on the incident.
* **Deliveries are signed but not verified.** Snyk signs the body with your secret and sends `X-Hub-Signature: sha256=<hex>`. Spike does not check it today, so treat the webhook URL as the credential: anyone holding it can open incidents on this integration. If it leaks, archive the integration, create a new one, then delete and recreate the Snyk webhook with the new URL.
* **Snyk calls webhooks beta.** The payload shape above is what Snyk documents and sends today, and Snyk reserves the right to change it. If an incident suddenly loses its title or stops resolving after a Snyk release, that is the first thing to check.
* **One incident per project, not per vulnerability.** If you want a page per package, an [alert rule](../alerts/alert-rules.md) can route on the title, but the incident model stays per project.

## Troubleshooting

<details>

<summary>The ping worked but no incidents ever show up</summary>

Most often the org has nothing that sends snapshots. Only Open Source and Container projects on recurring scans do, so an org that is entirely Snyk Code or Snyk IaC will ping fine and never send another thing.

Next, check the threshold. Spike only opens incidents for `critical` and `high` issues that are not ignored. A project sitting on twenty mediums sends a snapshot every night and none of them page, by design.

Finally, remember the schedule. Recurring scans usually run once a day, so a webhook created this morning may not produce its first real snapshot until tomorrow. Click **Retest now** on a project with a known critical issue to force one.

</details>

<details>

<summary>Incidents open but never resolve</summary>

An incident resolves when a snapshot removes the last critical or high issue from the project. Two things stop that.

The first is that the issues are not actually gone. Check `issueCountsBySeverity` on the project in Snyk — an incident stays open while any critical or high remains, including ones on other packages that arrived after the incident opened.

The second is an ignored issue that Snyk still counts. If the project has an issue ignored in Snyk and its incidents never resolve, set an expiry on the ignore or resolve the incidents by hand. See [Things worth knowing](#things-worth-knowing).

</details>

<details>

<summary>A fixed project's incident stayed open, and no webhook seemed to arrive</summary>

The resolving delivery is the scan that removed the issue, and it is the only one Spike can resolve on. A scan that ran after the fix, with nothing new and nothing removed on a clean project, is dropped on purpose — by then there is nothing in the payload to tell Spike which project got better.

If the fix landed while the webhook was deleted, disabled or pointing at an archived Spike integration, that one delivery was missed and the incident has to be resolved by hand. Everything after it works normally.

</details>

<details>

<summary>One repository opened two incidents</summary>

Two Snyk projects, two incidents. A repository with a `package.json` and a `Dockerfile` is two projects in Snyk with two ids and two scan schedules, and Spike keeps them apart deliberately: fixing the dependency does not fix the base image.

</details>

<details>

<summary>A dependency bump opened one incident for a dozen CVEs</summary>

That is the design. One scan is one incident, however many advisories it brought, and the title names the worst of them with a `(+n more)` for the rest at that severity. Every issue is on the incident page.

</details>

<details>

<summary>The title says "Open: 1 critical, 2 high" instead of naming a vulnerability</summary>

That snapshot brought no new issues — the project is still vulnerable from a previous scan, and Snyk sent its nightly "nothing changed" snapshot while an incident was open. There is no new vulnerability to name, so the title reports what is still open. The next scan that actually finds something names it.

</details>

<details>

<summary>Creating the webhook returns 404 or 403</summary>

Check the endpoint first. Each Snyk region has its own API host, and calling `api.snyk.io` for an org hosted in EU-01 answers `404`. The table in Step 2 has the right host for each region.

Then check the token and the id. The token needs admin access to the org, and the org id is the uuid from **Settings → General**, not the slug in the app URL. If both are right and the call still fails, your region does not offer webhooks — they exist only on US-01, US-02, EU-01 and AU-01.

</details>
