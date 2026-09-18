---
description: >-
  Page your on-call when Snyk finds a new critical or high vulnerability in a project, and resolve the incident when the next scan comes back clean.
---

# Integrate Spike with Snyk

[Snyk](https://snyk.io) scans your dependencies and container images on a schedule and mails you the result. A new critical CVE in a production dependency is an on-call event, not an email, so this integration turns Snyk's `project_snapshot` webhook into an incident that pages whoever is on call.

Snyk has no webhook screen in its UI. Webhooks are created with the Snyk API, so the setup below is three `curl` calls rather than a settings page.

## What Spike does with each snapshot

Snyk sends a `project_snapshot` event after every recurring test of a project, whether or not anything changed. Spike only acts on the ones that matter:

| Snapshot | What happens in Spike |
| --- | --- |
| Brings new `critical` or `high` issues that are not ignored | Opens an incident for that project, or adds an event to the one already open |
| Brings new issues only below the threshold, or all of them ignored in Snyk | Accepted and dropped. Nobody is paged |
| Brings nothing new and the project still has `critical` or `high` issues open | Nothing changes. The incident that is open stays open |
| Brings nothing new and the project has no `critical` or `high` issues left | Auto-resolves the open incident. Dropped when nothing is open |
| `ping` | Answered with `200`. Nothing is created |

There is **one incident per Snyk project**, identified by `project.id`. A weekly scan that keeps finding the same two vulnerabilities never opens a second incident, and a scan that finds three more adds them to the incident already open instead of paging the team again.

Scans of a clean project are dropped before they reach Spike's incident pipeline, so a hundred projects testing nightly cost you nothing.

{% hint style="info" %}
An incident covers the project, not the vulnerability. If you would rather split by package or by origin, add an [alert rule](../alerts/alert-rules.md) that matches on the payload.
{% endhint %}

### Incident titles

The title counts the new issues in the snapshot that opened the incident and names the worst of them:

```
3 new critical vulnerabilities in spikehq/api:package.json
```

The full list of issues, the package names and versions, the CVSS scores, the fix information and the `browseUrl` back to Snyk are all on the incident page.

### Severity

Spike reads the highest `issueData.severity` among the new issues in the snapshot and maps it:

| Snyk severity | Spike severity |
| --- | --- |
| `critical` | SEV1 |
| `high` | SEV2 |
| `medium`, `low` | SEV3 |

The bottom row is there for completeness. At the default threshold a snapshot that only brings medium and low issues never opens an incident, so a Snyk incident is a SEV1 or a SEV2.

{% hint style="info" %}
Severity is set when the incident is created and does not move on repeats. [Alert rules](../alerts/alert-rules.md) can override it, route the incident elsewhere, or suppress it entirely.
{% endhint %}

### The severity threshold

The threshold is `high`. New `critical` and `high` issues open an incident; new `medium` and `low` issues never do, and neither does an issue you have ignored in Snyk, even when its severity is critical.

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

A `200` from Snyk means it reached Spike. Your first real incident arrives with the next recurring test that finds something new, which is within 24 hours on daily testing and within a week on weekly testing. To see one sooner, open a project in Snyk and click **Retest now** on a project you know has an unfixed critical vulnerability.

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

Snyk sends the event name in `X-Snyk-Event` and a per-delivery id in `X-Snyk-Transport-ID`. Quote the transport id when you ask [support](../administration/contact-the-support-team.md) about a delivery.

## Payload reference

A `project_snapshot` that opens an incident looks like this, trimmed to the fields Spike reads:

```json
{
  "project": {
    "id": "af137b96-6966-46c1-826b-2e79ac49bbd9",
    "name": "spikehq/api:package.json",
    "origin": "github",
    "type": "npm",
    "branch": "main",
    "browseUrl": "https://app.snyk.io/org/spike/project/af137b96-6966-46c1-826b-2e79ac49bbd9",
    "issueCountsBySeverity": {
      "critical": 1,
      "high": 2,
      "medium": 5,
      "low": 11
    }
  },
  "org": {
    "id": "27ec0b4a-1d5e-4f34-9f6c-9d2f5e8a1b33",
    "name": "spike"
  },
  "group": {
    "id": "8f2b4c1d-9a7e-4c3b-b5d6-1e2f3a4b5c6d",
    "name": "Spike"
  },
  "newIssues": [
    {
      "id": "SNYK-JS-AXIOS-6124857",
      "issueType": "vuln",
      "pkgName": "axios",
      "pkgVersions": ["1.5.0"],
      "priority": { "score": 866 },
      "issueData": {
        "id": "SNYK-JS-AXIOS-6124857",
        "title": "Server-side Request Forgery (SSRF)",
        "severity": "critical",
        "cvssScore": 9.1,
        "url": "https://security.snyk.io/vuln/SNYK-JS-AXIOS-6124857"
      },
      "isIgnored": false,
      "fixInfo": {
        "isUpgradable": true,
        "isPatchable": false,
        "nearestFixedInVersion": "1.6.0"
      }
    }
  ],
  "removedIssues": []
}
```

Spike adds a top-level `severity` of `critical`, `high`, `medium` or `low` to the payload before the incident is created, so [alert rules](../alerts/alert-rules.md) and the [Title Remapper](../alerts/title-remapper.md) can read it without walking `newIssues`.

{% hint style="info" %}
Snyk lists webhooks as beta and reserves the right to change this payload. If a field you depend on stops arriving, the payload on the incident page is always what Snyk actually sent.
{% endhint %}

### Rewriting the title

To put your own wording on these incidents, build a [Title Remapper](../alerts/title-remapper.md) on the Snyk integration. Avoid loops, so address the first new issue by index:

```
{{data.project.name}} needs {{data.newIssues.[0].fixInfo.nearestFixedInVersion}} of {{data.newIssues.[0].pkgName}}
```

Output: `spikehq/api:package.json needs 1.6.0 of axios`

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

A snapshot that brings nothing new is also dropped on purpose, so a project whose vulnerabilities you already know about stays quiet until something new appears.

</details>

<details>

<summary>Incidents are created but never resolve</summary>

The incident resolves on the first snapshot where the project has no `critical` and no `high` issues left. Medium and low issues can stay open, they do not hold the incident. If the counts are at zero in Snyk and the incident is still open, the project has not been re-tested since the fix, so retest it from the Snyk UI.

</details>

<details>

<summary>Too many incidents from one org</summary>

Every project in the org that finds something new gets its own incident, which is the point, but an org with hundreds of projects can be loud after a widely used package gets a new CVE. Route the noisy ones with [alert rules](../alerts/alert-rules.md) on `project.origin` or `project.name`, or create the webhook on a smaller Snyk org.

</details>
