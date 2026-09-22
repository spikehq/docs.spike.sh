---
description: >-
  Page your on-call when Snyk finds a new critical or high vulnerability in a project, and resolve the incident when a later scan reports it fixed.
---

# Integrate Spike with Snyk

[Snyk](https://snyk.io) scans your dependencies and container images on a schedule and mails you the result. A new critical CVE in a production dependency is an on-call event, not an email, so this integration turns Snyk's `project_snapshot` webhook into an incident that pages whoever is on call.

Snyk has no webhook screen in its UI. Webhooks are created through the Snyk API, so the setup below is a `curl` call rather than a settings page.

## What Spike does with each snapshot

Snyk sends a `project_snapshot` for **every** recurring test of **every** Open Source and Container project in the org, whether or not anything changed. A healthy project tested nightly sends 365 "still clean" deliveries a year. Spike drops those at the edge and acts on the rest:

| Delivery | What happens in Spike |
| --- | --- |
| Brings new `critical` or `high` issues that are not ignored | Opens an incident for that project, or adds an event to the one already open |
| Brings nothing new, and the project still has `critical` or `high` issues open | Added to the open incident as a standing-issues event. Opens one if nothing is open for that project yet |
| Reports the last `critical` and `high` issues removed | Auto-resolves the incident for that project |
| Brings nothing new, removes nothing, and the project has no `critical` or `high` issues left | Answered with `200` and dropped. It never reaches your incident list |
| Brings new issues only below the threshold, or all of them ignored in Snyk | Counts as nothing new, so it is dropped unless the project still has `critical` or `high` issues open |
| Names no project | Answered with `200` and dropped. There is nothing to open an incident against |
| `ping` | Answered with `200`. Nothing is created |

There is **one incident per Snyk project**, identified by `project.id`, the uuid Snyk keeps for the project's whole life. A dependency bump that pulls in a dozen advisories in one scan is one incident, not twelve pages, and renaming the project in Snyk does not split it in two.

{% hint style="info" %}
An incident covers the project, not the vulnerability. If you would rather split by package or by origin, add an [alert rule](../alerts/alert-rules.md) that matches on the payload.
{% endhint %}

### Incident titles

The title names the worst issue in the delivery rather than counting them, so a phone alert is worth listening to:

| Event | Title |
| --- | --- |
| New issues | `Critical: Prototype Pollution in lodash@4.17.15 — spikehq/api:package.json` |
| More than one at the top severity | `High: Prototype Pollution in xml2js@0.6.0 (+1 more) — globex-manufacturing/inventory-api:package.json` |
| Standing issues, nothing new this scan | `Open: 1 critical, 2 high — spikehq/api:package.json` |
| Resolved | `Resolved: Prototype Pollution in lodash@4.17.15 fixed — spikehq/api:package.json` |

`(+1 more)` counts only the other issues at the **highest severity the snapshot brought**, so a critical arriving alongside three highs reads as one critical, not as four.

License findings are titled the same way. Snyk reports them with `issueType: license` and an `issueData.title` like `GPL-3.0 license`, which fits the same slot as a CVE name.

Each incident carries the detail on its page rather than in the title:

* Every issue in the snapshot, with its Snyk id, severity and CVSS score
* Package name and the affected versions
* Fix information, including the nearest fixed version when Snyk reports one
* The project's current issue counts by severity
* The project origin and type, such as `github` and `npm`
* `browseUrl`, a link straight to the project in Snyk
* The Snyk org and group the project belongs to

### Severity

Snyk sends no event-level severity, only a severity per issue. Spike computes one for the incident — `critical` when any new issue in the snapshot is critical, otherwise `high` — and writes it onto the payload as a top-level `severity` before the incident is stored:

| Computed severity | Spike severity |
| --- | --- |
| `critical` | SEV1 |
| `high` | SEV2 |

Because only critical and high issues page, every Snyk incident is a SEV1 or a SEV2.

{% hint style="info" %}
Severity is set when the incident is created and does not move on repeats. [Alert rules](../alerts/alert-rules.md) can override it, route the incident elsewhere, or suppress it entirely.
{% endhint %}

### The severity threshold

The threshold is `high`. New `critical` and `high` issues open an incident; new `medium` and `low` issues never do, and neither does an issue you have ignored in Snyk, even when its severity is critical. Ignoring an issue in Snyk is a decision your team already made, and Spike does not page you about it again.

To page only on `critical`, keep the threshold where it is and add an alert rule that suppresses SEV2 incidents on this integration. That way `high` findings still land in Spike and stay on the incident list, they just do not wake anyone.

## What Snyk can send

Only **Open Source** and **Container** projects on recurring tests produce snapshots. Snyk Code, Infrastructure as Code and SAST projects do not send `project_snapshot` at all, so they cannot page you through this integration.

Webhooks are available on the multi-tenant regions only:

| Snyk region | API base URL |
| --- | --- |
| SNYK-US-01 (default) | `https://api.snyk.io` |
| SNYK-US-02 | `https://api.us.snyk.io` |
| SNYK-EU-01 | `https://api.eu.snyk.io` |
| SNYK-AU-01 | `https://api.au.snyk.io` |

Use the base URL for the region your org lives in. Single-tenant and on-premise Snyk deployments do not offer webhooks.

## Prerequisites

* A Snyk org ID, from **Settings → General** in the Snyk org, or the URL of any project in it
* A Snyk API token that can administer that org, from **Account settings → Auth Token**, or a service account token
* `curl`, and a Snyk org on one of the regions above

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Snyk**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Create the webhook with Snyk's API

Replace `<snyk-org-id>`, `<snyk-api-token>` and the Spike URL, and pick your own `secret`. Any random string of at least 20 characters will do, `openssl rand -hex 20` produces one.

```bash
curl -X POST "https://api.snyk.io/v1/org/<snyk-org-id>/webhooks" \
  -H "Authorization: token <snyk-api-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://hooks.spike.sh/<your-token>/push-events",
    "secret": "<a-random-string>"
  }'
```

Snyk answers `201` with the webhook it created. Keep the `id`, you need it to ping or delete the webhook later:

```json
{
  "id": "5f4a3b2c-1d0e-4f9a-8b7c-6d5e4f3a2b1c",
  "url": "https://hooks.spike.sh/<your-token>/push-events"
}
```

The webhook covers every project in that org. Run the call once per Snyk org you want paged.

{% hint style="warning" %}
Snyk requires a `secret` and signs every delivery with it as `X-Hub-Signature`. Spike does not verify that signature today, so the webhook URL is what keeps the endpoint private. Treat it like a credential: do not commit it, and archive the integration in Spike if it leaks.
{% endhint %}

## Step 3 — Send a test ping

Snyk can ping the webhook it just created. Spike answers `200` and creates nothing, which is exactly what you want from a test:

```bash
curl -X POST "https://api.snyk.io/v1/org/<snyk-org-id>/webhooks/<webhook-id>/ping" \
  -H "Authorization: token <snyk-api-token>"
```

A `200` from Snyk means it reached Spike. Your first real incident arrives with the next recurring test, which is within 24 hours on daily testing and within a week on weekly testing. To see one sooner, open a project you know has an unfixed critical vulnerability in Snyk and click **Retest now**.

## Managing the webhook

List the webhooks on an org:

```bash
curl "https://api.snyk.io/v1/org/<snyk-org-id>/webhooks" \
  -H "Authorization: token <snyk-api-token>"
```

Delete one, which is what you do when you archive the integration in Spike:

```bash
curl -X DELETE "https://api.snyk.io/v1/org/<snyk-org-id>/webhooks/<webhook-id>" \
  -H "Authorization: token <snyk-api-token>"
```

Snyk sends the event name in `X-Snyk-Event`, as `project_snapshot/v0` or `ping/v0`, and a per-delivery id in `X-Snyk-Transport-ID`. Quote the transport id when you ask [support](../administration/contact-the-support-team.md) about a delivery.

## Payload reference

A `project_snapshot` that opens an incident looks like this, trimmed to the fields Spike reads:

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

That delivery produces `Critical: Prototype Pollution in lodash@4.17.15 — spikehq/api:package.json`.

**Key fields:**

* `project.id` — the uuid Spike groups on. One open incident per project
* `project.name` — the repository and manifest, or the container image, used in the title
* `project.issueCountsBySeverity` — what is currently open on the project. Critical and high both at zero is what resolves the incident
* `newIssues[].issueData.title` and `.severity` — the vulnerability name and severity that build the title
* `newIssues[].pkgName` and `.pkgVersions` — the package and version the title names
* `newIssues[].isIgnored` — an ignored issue never pages, whatever its severity
* `removedIssues[]` — the issues this scan fixed. Same shape as `newIssues`

`removedIssues` is what closes an incident: the snapshot that fixes the last critical or high issue arrives with an empty `newIssues`, a critical and high count of zero, and the fixed issues in `removedIssues`.

Spike adds a top-level `severity` of `critical` or `high` to the stored payload, so [alert rules](../alerts/alert-rules.md) and the [Title Remapper](../alerts/title-remapper.md) can read one severity for the incident without walking `newIssues`.

{% hint style="info" %}
Snyk lists webhooks as beta and reserves the right to change this payload. If a field you depend on stops arriving, the payload on the incident page is always what Snyk actually sent.
{% endhint %}

### Rewriting the title

To put your own wording on these incidents, build a [Title Remapper](../alerts/title-remapper.md) on the Snyk integration. Avoid loops, so address the first new issue by index:

```
{{data.project.name}} needs {{data.newIssues.[0].pkgName}}@{{data.newIssues.[0].fixInfo.nearestFixedInVersion}}
```

Output: `spikehq/api:package.json needs lodash@4.17.20`

## Troubleshooting

<details>

<summary>The API call returns 401 or 403</summary>

`401` means the token is wrong or missing the `token ` prefix in the `Authorization` header. `403` means the token cannot administer that org. Use a token belonging to an org admin or a service account with admin rights, and check you are calling the base URL for your region.

</details>

<details>

<summary>The API call returns 422</summary>

Snyk rejects a `url` it cannot parse, a `secret` shorter than its minimum, and a `url` that already has a webhook on that org. List the webhooks on the org first, the one you are creating may be there already.

</details>

<details>

<summary>The ping works but no incidents ever arrive</summary>

Check the project type. Snyk Code, IaC and SAST projects never send `project_snapshot`. Then check that the project is on recurring tests rather than on manual tests only, under the project's settings in Snyk.

A scan of a project with nothing new and no critical or high issues open is dropped on purpose, so a healthy org stays quiet until something actually changes.

</details>

<details>

<summary>An incident never resolves</summary>

The incident closes on the snapshot that reports the project's last critical and high issues removed, so the project has to be tested again after the fix. If Snyk has not re-tested since the upgrade, retest it from the Snyk UI.

If the counts in Snyk look like zero to you but the incident stays open, check whether the project has an **ignored** critical or high issue. Spike reads `issueCountsBySeverity` as Snyk sends it, and Snyk's own documentation does not say whether those counts leave ignored issues out. If they are included, one long-standing ignored high keeps the project's count above zero and holds the incident open. Either stop ignoring the issue in Snyk, or resolve the incident by hand and tell [support](../administration/contact-the-support-team.md) — a real payload is the only way to settle this.

</details>

<details>

<summary>Too many incidents from one org</summary>

Every project in the org that finds something new gets its own incident, which is the point, but an org with hundreds of projects can be loud after a widely used package gets a new CVE. Route the noisy ones with [alert rules](../alerts/alert-rules.md) on `project.origin` or `project.name`, or create the webhook on a smaller Snyk org.

</details>

<details>

<summary>Someone shared the webhook URL</summary>

The webhook URL is the only credential on this integration, so treat it as a secret. If it leaks, archive the integration in Spike and create a new one, then create a fresh Snyk webhook pointing at the new URL and delete the old one with the `DELETE` call above.

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

</details>
