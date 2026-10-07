---
description: >-
  Subscribe Spike to a Snyk organization's webhook so a newly found vulnerability in a monitored project pages your on-call rotation by phone, SMS, Slack or Teams, and the incident resolves itself once the vulnerability is gone.
---

# Integrate Spike with Snyk

[Snyk](https://snyk.io) tests the projects you have imported into it — a repository's manifest, a container image — and keeps testing them on a schedule once they are monitored. Every one of those tests produces a snapshot of the project: what is installed, what is vulnerable, and what has changed since the last test.

Snyk posts that snapshot to a webhook. Point the webhook at a Spike integration URL and a vulnerability that appears in a monitored project pages your on-call rotation on the next test, every later test of that same project lands on the incident already open instead of paging again, and the incident resolves itself once the vulnerability is no longer there.

Nothing is installed anywhere. One webhook subscription per Snyk organization covers every monitored project in it.

{% hint style="warning" %}
**Snyk has no webhook screen.** Webhooks are created, listed and deleted through the Snyk API only — there is nothing to click in the Snyk Web UI. Step 3 is a `curl` call, and it is the whole of the setup on the Snyk side.
{% endhint %}

## What Spike does with each snapshot

Snyk sends one alert-bearing event, `project_snapshot`, on every test of a monitored project. It carries the project it tested plus two arrays: `newIssues`, the vulnerabilities this test found that the previous one did not, and `removedIssues`, the ones that were there before and are not now.

Those two arrays are all Spike reads to decide what happens:

| The snapshot | What Spike does |
| --- | --- |
| `newIssues` is **not empty** | Opens an incident for the project and pages, or adds to the project's open incident if there already is one |
| `newIssues` empty, `removedIssues` **not empty** | Resolves the project's open incident. Opens nothing if none is open |
| **Both empty** — a clean test | Nothing. No incident, no page |

The third row is the common case and the reason the integration is quiet. A monitored project is tested daily whether or not anything changed, so most of what Snyk sends is a snapshot with nothing in either array, and Spike deliberately opens nothing for it.

{% hint style="info" %}
A snapshot that carries **both** new and removed issues keeps the incident open rather than resolving it. Snyk found something new in the same test that cleared something old, and the new finding is the one that still needs a person.
{% endhint %}

## Incident identity

Spike identifies the incident by `project.id`, the Snyk project's UUID, and never by the title. Snyk repeats that id on every snapshot of the project, so one Snyk project's vulnerabilities collect into one Spike incident: the first finding pages, later findings on the same project land on it without paging again, and the snapshot that clears them resolves it.

Identity is the **project**, not the vulnerability. The same CVE in two imported projects is two incidents, and five new vulnerabilities found in one project in one test is one incident. That is on purpose — `spikehq/api:package-lock.json` and `spikehq/api:Dockerfile` are two Snyk projects with two ids, and they are usually two different pieces of work.

{% hint style="info" %}
`project.id` is stable for the life of the monitored project. Deleting a project in Snyk and importing it again gives it a new id, so anything still open in Spike for the old id will not resolve itself — resolve it by hand.
{% endhint %}

## Incident title

The title names the vulnerability, the package it is in and the project it was found in:

```
Critical: Prototype Pollution in lodash 4.17.15 — spikehq/api:package-lock.json
```

That is Snyk's own name for the vulnerability (`issueData.title`), its severity, the affected package and version, and the project last. When one test turns up several new vulnerabilities, the first one Snyk lists is named and the rest are counted:

```
Critical: Prototype Pollution in lodash 4.17.15 — spikehq/api:package-lock.json (+2 more)
```

A recovery names what was fixed:

```
Prototype Pollution in lodash 4.17.15 fixed — spikehq/api:package-lock.json
```

and falls back to a plain line when the snapshot names nothing Spike can read:

```
Snyk issues fixed in spikehq/api:package-lock.json — back to normal
```

A clean test, a connection ping and a delivery Spike cannot read anything out of each have their own fixed line:

```
Snyk tested spikehq/api:package-lock.json — no new issues
Snyk webhook test ping
Snyk alert with no details
```

Titles are capped at 200 characters and carry no Snyk issue ids, CVE numbers, advisory URLs or timestamps. Those are all on the incident page.

{% hint style="info" %}
The recovery reads differently from the notification that opened the incident, and that is fine — matching is done on `project.id`, never on the title. A responder scanning their event list needs to see which of their open incidents went away.
{% endhint %}

Use a [Title Remapper](../alerts/title-remapper.md) if your team reads findings by package rather than by vulnerability:

```handlebars
{{data.body.newIssues.0.pkgName}} — {{data.body.project.name}}
```

## Severity

Spike does not set the severity badge from Snyk's `severity`. Snyk's `low` / `medium` / `high` / `critical` is kept on the incident and shown in the title, but incidents open at your integration's default.

To put Snyk's level on the badge, write an [alert rule](../alerts/alert-rules.md) on `newIssues.0.issueData.severity`. Alert rules can also route the incident to another service or escalation policy, or suppress it — useful if you only want to be paged for `critical` and `high`. Read more about [priority and severity](../incidents/priority-and-severity.md).

## Prerequisites

* A Snyk account, and a **Snyk API token** belonging to a user with admin access to the organization, or a service account with the **Org Admin** role. Webhook endpoints reject anything with less
* Your **Snyk organization ID**
* At least one **monitored** project in that organization. Snyk only sends snapshots for projects it is monitoring on a schedule, not for one-off `snyk test` runs
* A Snyk integration in Spike and its webhook URL
* Nothing to open on your own network. Snyk calls out to Spike

{% hint style="warning" %}
**Only Open Source and container projects emit `project_snapshot`.** Snyk Code, Snyk IaC and Snyk Container registry-scanning targets do not send this event, so importing one of those and waiting for an incident will wait forever.
{% endhint %}

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Snyk**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Find your Snyk organization ID and API token

Both are in the Snyk Web UI, and both are needed for the call in Step 3.

1. **Organization ID.** Select the organization in the top-left organization picker, then go to **Settings** (the cog, next to the organization name) **→ General**. **Organization ID** is the first field; copy it. It is a UUID.

2. **API token.** Select your avatar in the bottom-left **→ Account settings → General → Auth Token (KEY)**, then select **click to show** and copy it.

   For a long-lived integration, use a service account instead: **Settings → Service accounts → Create a service account**, give it the **Org Admin** role, and copy the token Snyk shows you. Snyk shows a service account token once and never again.

{% hint style="info" %}
If your Snyk account is on a regional instance, the API hostname changes with it — `https://api.eu.snyk.io` for EU, `https://api.au.snyk.io` for AU, and `https://api.snyk.io` for the default US instance. Use the one your Snyk Web UI address matches in every call below.
{% endhint %}

## Step 3 — Subscribe Spike to the organization's webhooks

This is the step that creates the webhook. Run it once per Snyk organization you want paged, substituting the organization ID from Step 2, the token from Step 2, and the Spike URL from Step 1:

```bash
curl -X POST "https://api.snyk.io/v1/org/{SNYK-ORG-ID}/webhooks" \
  -H "Authorization: token <SNYK-TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://hooks.spike.sh/<your-token>/push-events",
    "secret": "<a random string you generate>"
  }'
```

Both body fields are required:

* **`url`** — the Spike integration URL from Step 1, in full. Snyk requires `https://`, which it is
* **`secret`** — a random string you make up, at least 20 characters. Snyk signs every delivery with it. Generate one with `openssl rand -hex 32` and keep it somewhere; you cannot read it back out of Snyk later

A successful call answers `201 Created` with the webhook it made:

```json
{
  "id": "4e0828e9-66ba-4b0f-9d1b-b7ca2b5d3a84",
  "url": "https://hooks.spike.sh/<your-token>/push-events"
}
```

Keep that `id`. It is how you ping, inspect or delete this subscription later.

{% hint style="warning" %}
Spike does not verify the `X-Hub-Signature` header Snyk signs each delivery with. The token in the webhook URL is the credential, the same model every other Spike integration uses — so treat the webhook URL like a password. If it leaks, archive the integration in Spike, create a new one, and delete and recreate the Snyk webhook with the new URL.
{% endhint %}

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

## Step 4 — Confirm it

Snyk can send a test delivery for a webhook it has created. Using the `id` from Step 3:

```bash
curl -X POST "https://api.snyk.io/v1/org/{SNYK-ORG-ID}/webhooks/{WEBHOOK-ID}/ping" \
  -H "Authorization: token <SNYK-TOKEN>"
```

That opens an incident in Spike titled `Snyk webhook test ping`. Acknowledge and resolve it — it has done its job, which is to prove the URL, the escalation policy and the notification channels all work.

{% hint style="info" %}
The ping body carries only a `webhookId` and no project, so Spike cannot key it on `project.id` the way it keys a real snapshot. It is titled with the same fixed line every time, which means repeated pings join one incident instead of opening a new one each time. Run the ping before you attach a live escalation policy if you would rather not wake anyone.
{% endhint %}

The real test is the next scheduled test of a monitored project. Watch for both moments:

1. Snyk finds a new vulnerability and an incident opens in Spike naming it, on the service you attached, escalating through your policy.
2. The vulnerability is upgraded away, Snyk's next test of that project finds it gone, and the incident resolves itself.

## Managing the subscription later

Everything is the same API. List what an organization is subscribed to:

```bash
curl "https://api.snyk.io/v1/org/{SNYK-ORG-ID}/webhooks" \
  -H "Authorization: token <SNYK-TOKEN>"
```

And remove one — do this when you archive the Spike integration, so Snyk stops posting to a dead URL:

```bash
curl -X DELETE "https://api.snyk.io/v1/org/{SNYK-ORG-ID}/webhooks/{WEBHOOK-ID}" \
  -H "Authorization: token <SNYK-TOKEN>"
```

## Payload reference

Snyk sends its own payload and there is no template to edit, so this section is a reference for what lands on the incident page, and for what [alert rules](../alerts/alert-rules.md) and the [Title Remapper](../alerts/title-remapper.md) can read as `data.body.<field>`.

A `project_snapshot` that found a new vulnerability, which opens the incident:

```json
{
  "project": {
    "name": "spikehq/api:package-lock.json",
    "id": "af137b96-6966-46c1-826b-2e79ac49bbd9",
    "created": "2024-03-11T09:50:54.014Z",
    "origin": "github",
    "type": "npm",
    "readOnly": false,
    "testFrequency": "daily",
    "totalDependencies": 1042,
    "issueCountsBySeverity": {
      "low": 4,
      "medium": 9,
      "high": 3,
      "critical": 1
    },
    "hostname": null,
    "remoteRepoUrl": "https://github.com/spikehq/api.git",
    "lastTestedDate": "2026-10-07T03:14:22.118Z",
    "browseUrl": "https://app.snyk.io/org/4a18d42f-0706-4ad0-b127-24078731fbed/project/af137b96-6966-46c1-826b-2e79ac49bbd9",
    "importingUser": {
      "id": "e713cf94-bb02-4ea0-89d9-613cce0caed2",
      "name": "kaushik@spike.sh",
      "username": "kaushik",
      "email": "kaushik@spike.sh"
    },
    "isMonitored": true,
    "branch": "main",
    "targetReference": null,
    "tags": [
      {
        "key": "team",
        "value": "platform"
      }
    ],
    "attributes": {
      "criticality": [
        "high"
      ],
      "environment": [
        "backend"
      ],
      "lifecycle": [
        "production"
      ]
    },
    "remediation": {
      "upgrade": {},
      "patch": {},
      "pin": {}
    }
  },
  "org": {
    "name": "Spike.sh",
    "id": "a04d9cbd-ae6e-44af-b573-0556b0ad4bd2",
    "slug": "spike-sh",
    "url": "https://api.snyk.io/v1/org/spike-sh",
    "created": "2023-11-18T10:39:00.983Z"
  },
  "group": {
    "name": "Spike HQ",
    "id": "a060a49f-636e-480f-9e14-38e773b2a97f"
  },
  "newIssues": [
    {
      "id": "SNYK-JS-LODASH-1040724",
      "issueType": "vuln",
      "pkgName": "lodash",
      "pkgVersions": [
        "4.17.15"
      ],
      "issueData": {
        "id": "SNYK-JS-LODASH-1040724",
        "title": "Prototype Pollution",
        "severity": "critical",
        "url": "https://security.snyk.io/vuln/SNYK-JS-LODASH-1040724",
        "description": "## Overview\nAffected versions of this package are vulnerable to Prototype Pollution via the `zipObjectDeep` function.\n\n## Remediation\nUpgrade `lodash` to version 4.17.21 or higher.\n\n## References\n- GitHub Commit",
        "identifiers": {
          "CVE": [
            "CVE-2020-8203"
          ],
          "CWE": [
            "CWE-1321"
          ],
          "ALTERNATIVE": [
            "SNYK-JS-LODASH-567746"
          ]
        },
        "credit": [
          "Snyk Security Research Team"
        ],
        "exploitMaturity": "proof-of-concept",
        "semver": {
          "vulnerable": [
            "<4.17.20"
          ]
        },
        "publicationTime": "2020-07-15T08:00:00Z",
        "disclosureTime": "2020-07-10T21:00:00Z",
        "CVSSv3": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
        "cvssScore": 9.8,
        "language": "js",
        "patches": [],
        "nearestFixedInVersion": "4.17.21"
      },
      "isPatched": false,
      "isIgnored": false,
      "fixInfo": {
        "isUpgradable": true,
        "isPinnable": false,
        "isPatchable": false,
        "nearestFixedInVersion": "4.17.21"
      },
      "priority": {
        "score": 899,
        "factors": [
          {
            "name": "isFixable",
            "description": "Has a fix available"
          },
          {
            "name": "cvssScore",
            "description": "CVSS 9.8"
          }
        ]
      }
    }
  ],
  "removedIssues": []
}
```

It opens an incident titled:

```
Critical: Prototype Pollution in lodash 4.17.15 — spikehq/api:package-lock.json
```

The snapshot from the next test, once `lodash` has been upgraded. The vulnerability has moved from `newIssues` to `removedIssues`, and `project.id` is the one the opening snapshot carried — that is what joins the two:

```json
{
  "project": {
    "name": "spikehq/api:package-lock.json",
    "id": "af137b96-6966-46c1-826b-2e79ac49bbd9",
    "created": "2024-03-11T09:50:54.014Z",
    "origin": "github",
    "type": "npm",
    "readOnly": false,
    "testFrequency": "daily",
    "totalDependencies": 1042,
    "issueCountsBySeverity": {
      "low": 4,
      "medium": 9,
      "high": 3,
      "critical": 0
    },
    "hostname": null,
    "remoteRepoUrl": "https://github.com/spikehq/api.git",
    "lastTestedDate": "2026-10-07T09:02:11.504Z",
    "browseUrl": "https://app.snyk.io/org/4a18d42f-0706-4ad0-b127-24078731fbed/project/af137b96-6966-46c1-826b-2e79ac49bbd9",
    "importingUser": {
      "id": "e713cf94-bb02-4ea0-89d9-613cce0caed2",
      "name": "kaushik@spike.sh",
      "username": "kaushik",
      "email": "kaushik@spike.sh"
    },
    "isMonitored": true,
    "branch": "main",
    "targetReference": null,
    "tags": [
      {
        "key": "team",
        "value": "platform"
      }
    ],
    "attributes": {
      "criticality": [
        "high"
      ],
      "environment": [
        "backend"
      ],
      "lifecycle": [
        "production"
      ]
    },
    "remediation": {
      "upgrade": {},
      "patch": {},
      "pin": {}
    }
  },
  "org": {
    "name": "Spike.sh",
    "id": "a04d9cbd-ae6e-44af-b573-0556b0ad4bd2",
    "slug": "spike-sh",
    "url": "https://api.snyk.io/v1/org/spike-sh",
    "created": "2023-11-18T10:39:00.983Z"
  },
  "group": {
    "name": "Spike HQ",
    "id": "a060a49f-636e-480f-9e14-38e773b2a97f"
  },
  "newIssues": [],
  "removedIssues": [
    {
      "id": "SNYK-JS-LODASH-1040724",
      "issueType": "vuln",
      "pkgName": "lodash",
      "pkgVersions": [
        "4.17.15"
      ],
      "issueData": {
        "id": "SNYK-JS-LODASH-1040724",
        "title": "Prototype Pollution",
        "severity": "critical",
        "url": "https://security.snyk.io/vuln/SNYK-JS-LODASH-1040724",
        "description": "## Overview\nAffected versions of this package are vulnerable to Prototype Pollution via the `zipObjectDeep` function.\n\n## Remediation\nUpgrade `lodash` to version 4.17.21 or higher.\n\n## References\n- GitHub Commit",
        "identifiers": {
          "CVE": [
            "CVE-2020-8203"
          ],
          "CWE": [
            "CWE-1321"
          ],
          "ALTERNATIVE": [
            "SNYK-JS-LODASH-567746"
          ]
        },
        "credit": [
          "Snyk Security Research Team"
        ],
        "exploitMaturity": "proof-of-concept",
        "semver": {
          "vulnerable": [
            "<4.17.20"
          ]
        },
        "publicationTime": "2020-07-15T08:00:00Z",
        "disclosureTime": "2020-07-10T21:00:00Z",
        "CVSSv3": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
        "cvssScore": 9.8,
        "language": "js",
        "patches": [],
        "nearestFixedInVersion": "4.17.21"
      },
      "isPatched": false,
      "isIgnored": false,
      "fixInfo": {
        "isUpgradable": true,
        "isPinnable": false,
        "isPatchable": false,
        "nearestFixedInVersion": "4.17.21"
      },
      "priority": {
        "score": 899,
        "factors": [
          {
            "name": "isFixable",
            "description": "Has a fix available"
          },
          {
            "name": "cvssScore",
            "description": "CVSS 9.8"
          }
        ]
      }
    }
  ]
}
```

It resolves the incident, and the event reads:

```
Prototype Pollution in lodash 4.17.15 fixed — spikehq/api:package-lock.json
```

The fields Spike itself reads are a small subset of that: `project.id` for identity, `project.name` for the end of the title, the length of `newIssues` and `removedIssues` to tell firing from recovery, and `issueData.title`, `issueData.severity`, `pkgName` and `pkgVersions` from each new issue for the rest of the title. Everything else above is kept on the incident, so alert rules and the Title Remapper can read it.

## Things worth knowing

* **One subscription covers every project in the organization.** There is no per-project webhook. If you have several Snyk organizations, run Step 3 once per organization.
* **Several Spike integrations are fine.** To split projects across teams, create one Snyk organization per team — the webhook is organization-wide, so that is the only level the split can happen at.
* **The schedule is Snyk's.** A monitored project is tested on its `testFrequency`, daily by default. A vulnerability disclosed this afternoon pages you when Snyk next tests the project, not the moment the advisory is published.
* **Resolving in Spike does not touch Snyk.** The issue stays open in Snyk until it is actually fixed, ignored or the project stops being monitored.
* **Ignoring an issue in Snyk is not a recovery.** Whether an ignored issue leaves `newIssues` is up to Snyk's own test; if the incident stays open after you ignore something, resolve it in Spike.

## Troubleshooting

<details>

<summary>The curl in Step 3 returns 401 or 403</summary>

401 means the token is wrong or malformed — check the header is `Authorization: token <SNYK-TOKEN>`, with the literal word `token` before it, and not `Bearer`.

403 means the token is valid but the account it belongs to is not an admin of that organization. Webhook endpoints need admin access, or a service account with the **Org Admin** role.

If both look right, check the hostname: a token for an EU or AU instance will not authenticate against `api.snyk.io`.

</details>

<details>

<summary>The curl returns 422</summary>

The body was rejected. Both `url` and `secret` are required, `url` has to be `https://`, and the secret has to be a reasonable length — use `openssl rand -hex 32`.

</details>

<details>

<summary>Nothing arrives in Spike</summary>

Run the ping from Step 4 first. If the ping arrives and real snapshots do not, the subscription is fine and the projects are the problem — check in order:

1. The project is **monitored**. `snyk test` on its own sends nothing; `snyk monitor`, or importing the project through a Snyk integration, is what puts it on a schedule.
2. The project is an **Open Source or container** project. Snyk Code and Snyk IaC targets do not emit `project_snapshot`.
3. Snyk has actually tested it since you created the webhook. Check **lastTestedDate** on the project in Snyk.

If the ping does not arrive either, confirm with `GET /org/{SNYK-ORG-ID}/webhooks` that the subscription exists and its `url` is the full `https://hooks.spike.sh/<your-token>/push-events`, and that the integration has not been archived in Spike.

</details>

<details>

<summary>Every test opens its own incident</summary>

Open two of the incidents in Spike and compare `project.id` on the incident page. If it differs, they are different Snyk projects, and different projects are different incidents by design — one repository usually has several (`:package-lock.json`, `:Dockerfile`, and one per manifest).

If the ids match and incidents still pile up, the earlier one was already resolved when the next snapshot arrived. Spike joins a snapshot to an **open** incident only.

</details>

<details>

<summary>Incidents never resolve</summary>

A recovery is a snapshot with an empty `newIssues` and a non-empty `removedIssues`, for the same `project.id`, while the incident is still open. The usual reasons it does not happen:

* The vulnerability is still there. Snyk will keep it out of `removedIssues` until a test finds it gone.
* Snyk has not tested the project again yet.
* The same test found something new as well. A snapshot carrying both arrays keeps the incident open on purpose.
* The project was deleted and re-imported in Snyk, so its id changed and the new snapshots belong to a different incident.

A [resolve timer](../incidents/resolve-timer.md) is a reasonable backstop, not a replacement.

</details>

<details>

<summary>We get paged for low-severity findings we do not care about</summary>

Snyk sends the whole snapshot and Spike opens an incident for anything in `newIssues`, so filter on the Spike side with an [alert rule](../alerts/alert-rules.md) on `newIssues.0.issueData.severity` — suppress `low` and `medium`, or route them to a service with a quieter escalation policy.

Narrowing what Snyk reports at all is a Snyk-side setting, in the organization's **Settings → Severity threshold** for the relevant target.

</details>

<details>

<summary>An incident titled "Snyk alert with no details" opened</summary>

Spike could not read a project, any issues or a `webhookId` out of the delivery. It opens an incident rather than dropping it, because the alternative is losing a real security finding silently. Acknowledge it, resolve it, and send the payload on the incident page to Spike support — a delivery shaped this way is one Spike has not seen before.

</details>

<details>

<summary>We want to stop Snyk posting without archiving the Spike integration</summary>

Delete the subscription with `DELETE /org/{SNYK-ORG-ID}/webhooks/{WEBHOOK-ID}`, as in the Managing the subscription section. Recreating it later is the same `curl` as Step 3, with a new secret.

</details>

Disclaimer: These integration instructions are offered independently by Spike.sh, and Spike.sh is not affiliated with nor a partner of Snyk, Inc.
