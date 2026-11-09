---
description: >-
  Subscribe Spike to a Snyk organization webhook so a new vulnerability in a monitored project alerts your on-call team by phone, SMS, Slack or Teams.
---

# Integrate Spike with Snyk

[Snyk](https://snyk.io) tests the projects you have imported into it. A Snyk webhook posts a snapshot of the project on every test of an Open Source or container project ([Snyk: Webhook events and payloads](https://docs.snyk.io/developer-tools/snyk-api/using-specific-snyk-apis/webhooks-apis/webhooks)).

Snyk posts that snapshot to a webhook. Point the webhook at a Spike integration URL and a vulnerability that appears in a monitored project pages your on-call rotation on the next test, every later test of that same project lands on the incident already open instead of paging again, and the incident resolves itself once the project has no known vulnerabilities left.

Nothing is installed anywhere. One webhook subscription per Snyk organization covers every monitored project in it.

{% hint style="warning" %}
**Webhooks are set up through the Snyk API.** Snyk documents webhooks only through its [Webhooks (v1) API](https://docs.snyk.io/developer-tools/snyk-api/reference/webhooks-v1), so Step 3 is a `curl` call. The Snyk API is for Snyk **Enterprise** plan customers ([Snyk: Authentication for API](https://docs.snyk.io/developer-tools/snyk-api/authentication-for-api)).

Snyk marks the Webhooks API as **beta**: "Snyk may change the API and the structure of webhook payloads at any time, without notice", and webhooks are "available only in the Snyk US-01, US-02, EU-01, and AU-01 regions" ([Snyk: About webhooks](https://docs.snyk.io/developer-tools/snyk-api/using-specific-snyk-apis/webhooks-apis/about-webhooks)).
{% endhint %}

## What Spike does with each snapshot

Snyk documents two webhook events: `ping` and `project_snapshot`. `project_snapshot` "is triggered on every test of a project, whether or not there are new issues". It carries the project it tested plus two arrays of issues: `newIssues` and `removedIssues`. Spike reads `newIssues` as the new vulnerabilities this test found.

The snapshot's `project` is "project object matching API responses", the Projects (v1) project. Its `issueCountsBySeverity` is the "Number of known vulnerabilities in the project, not including ignored issues", one count each for `low`, `medium`, `high` and `critical` ([Snyk: Projects (v1)](https://docs.snyk.io/developer-tools/snyk-api/reference/projects-v1)). Spike uses those counts, not `removedIssues`, to decide when the project is back to normal:

| The snapshot | What Spike does |
| --- | --- |
| `newIssues` is **not empty** | Opens an incident for the project and pages, or adds to the project's open incident if there already is one |
| `newIssues` empty, and **every** `issueCountsBySeverity` count is **0** | Resolves the project's open incident. Opens nothing if none is open |
| `newIssues` empty, and **any** count above 0 | Nothing new opens, and the project's open incident **stays open**, even if this test removed some issues |

Most snapshots fall in the last row: Snyk sends a snapshot on every test, whether or not there are new issues, and Spike opens nothing for it. Snyk has no acknowledge event and no resolve event.

{% hint style="warning" %}
A Snyk incident resolves only when the project has **no** known vulnerabilities left at any severity. Fixing one vulnerability while others remain keeps the incident open. Snyk does not count ignored issues, so ignoring the last open issues also resolves the incident.
{% endhint %}

{% hint style="info" %}
A snapshot that carries **both** new and removed issues keeps the incident open rather than resolving it. Snyk found something new in the same test that cleared something old, and the new finding is the one that still needs a person.
{% endhint %}

## Incident identity

Spike identifies the incident by `project.id`, the Snyk project's UUID, and never by the title. Snyk repeats that id on every snapshot of the project, so one Snyk project's vulnerabilities collect into one Spike incident: the first finding pages, later findings on the same project land on it without paging again, and the snapshot that clears them resolves it.

Identity is the **project**, not the vulnerability. The same CVE in two imported projects is two incidents, and five new vulnerabilities found in one project in one test is one incident.

## Incident title

The title names the vulnerability, the package it is in and the project it was found in:

```
Critical: Prototype Pollution in lodash 4.17.15 — spikehq/api:package-lock.json
```

That is the vulnerability's severity, Snyk's own name for it (`issueData.title`), the affected package and version, and the project last. When one test turns up several new vulnerabilities, the title counts them, breaks them down by severity, and names the two worst:

```
3 new Snyk issues (1 critical, 2 high) in spikehq/api:package-lock.json: Prototype Pollution (lodash), Regular Expression Denial of Service (ReDoS) (ms) +1 more
```

A test that removed issues reads as a recovery only when the project has no known vulnerabilities left; otherwise it says the project is not all clear and the incident stays open:

```
Snyk issues fixed in spikehq/api:package-lock.json — back to normal
Some Snyk issues fixed in spikehq/api:package-lock.json — not all clear
```

A clean test, the connection ping and a delivery Spike cannot read anything out of each have their own fixed line. None of them opens an incident, so you only see them in the integration's events:

```
Snyk tested spikehq/api:package-lock.json — no new issues
Snyk webhook test ping
Snyk alert with no details
```

Titles are capped at 200 characters and carry no Snyk issue ids, CVE numbers, advisory URLs or timestamps. Those are all on the incident page.

{% hint style="info" %}
The recovery reads differently from the notification that opened the incident, and that is fine — matching is done on `project.id`, never on the title.
{% endhint %}

Use a [Title Remapper](../alerts/title-remapper.md) if your team reads findings by package rather than by vulnerability:

```handlebars
{{data.body.newIssues.0.pkgName}} — {{data.body.project.name}}
```

## Severity

Spike reads Snyk's `severity` field and sets the incident's severity from it: `critical` and `high` become **SEV1**, `medium` **SEV2** and `low` **SEV3**. When one test finds several new vulnerabilities, the severity of the last one in `newIssues` is the one used, so a batch can open at a lower severity than its worst finding. The title always leads with the worst.

To change that, write an [alert rule](../alerts/alert-rules.md). Alert rules can set the severity or priority, route the incident to another service or escalation policy, or suppress it — useful if you only want to be paged for `critical` and `high`. Read more about [priority and severity](../incidents/priority-and-severity.md).

## Prerequisites

* A Snyk **Enterprise** plan. "To use the Snyk API, you must be an Enterprise plan customer"
* A **Snyk API token** with the permissions Snyk lists for creating a webhook: **View Organization**, **View Outbound Webhooks** and **Create Outbound Webhooks** ([Snyk: Webhooks (v1)](https://docs.snyk.io/developer-tools/snyk-api/reference/webhooks-v1))
* Your **Snyk organization ID**
* At least one Open Source or container project in that organization
* A Snyk integration in Spike and its webhook URL
* Nothing to open on your own network. Snyk calls out to Spike

{% hint style="warning" %}
**Only Open Source and container projects emit `project_snapshot`.** Snyk: "Currently supported targets/scan types are Open Source and container." Other project types send no snapshot, so they never open an incident.
{% endhint %}

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Snyk**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Find your Snyk organization ID and API token

Both are in the Snyk Web UI, and both are needed for the call in Step 3.

1. **Organization ID.** In your organization, go to **Settings → General** and copy **Organization ID** ([Snyk: Organization general settings](https://docs.snyk.io/platform-administration/snyk-hierarchy/organizations/organization-general-settings)).

2. **API token.** Snyk recommends a service account for automation: "Enterprise users should use a service account to authenticate for any kind of automation". **Settings → General → Manage Service accounts** opens them. To use your personal token instead, open your [account settings](https://app.snyk.io/account), and in the **key** field select **Click to show** ([Snyk: Authentication for API](https://docs.snyk.io/developer-tools/snyk-api/authentication-for-api)).

{% hint style="info" %}
"Use the URL for your region when calling an API." Snyk's API hosts are `api.snyk.io` (SNYK-US-01), `api.us.snyk.io` (SNYK-US-02), `api.eu.snyk.io` (SNYK-EU-01) and `api.au.snyk.io` (SNYK-AU-01), and "Snyk tokens are region-specific" ([Snyk: API URLs](https://docs.snyk.io/developer-tools/snyk-api/rest-api/about-the-rest-api#api-urls)). The calls below use `api.snyk.io`; replace it with your region's host.
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

* **`url`** — the Spike integration URL from Step 1, in full. "Webhooks can only be configured for URLs using the HTTPS protocol", which the Spike URL uses
* **`secret`** — "a random string with high entropy" that you make up. Snyk signs every delivery with it in the `X-Hub-Signature` header. For example, generate one with `openssl rand -hex 32`

A successful call answers with the webhook it made:

```json
{
  "id": "d3cf26b3-2d77-497b-bce2-23b33cc15362",
  "url": "https://hooks.spike.sh/<your-token>/push-events"
}
```

Keep that `id`. It is how you ping, retrieve or delete this subscription later.

{% hint style="warning" %}
Spike does not verify the `X-Hub-Signature` header Snyk signs each delivery with. The token in the webhook URL is the credential, the same model every other Spike integration uses — so treat the webhook URL like a password. If it leaks, archive the integration in Spike, create a new one, and delete and recreate the Snyk webhook with the new URL.
{% endhint %}

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

## Step 4 — Confirm it

"Snyk sends a `ping` event to the newly configured webhook", and you can send another one with the ping API, using the `id` from Step 3. The ping needs the **View Organization** and **View Outbound Webhooks** permissions:

```bash
curl -X POST "https://api.snyk.io/v1/org/{SNYK-ORG-ID}/webhooks/{WEBHOOK-ID}/ping" \
  -H "Authorization: token <SNYK-TOKEN>"
```

Spike records the ping as an event titled `Snyk webhook test ping` but **opens no incident** for it, and pages nobody: a ping reports no vulnerability. It only proves that Snyk can reach the URL.

The real test is the next scheduled test of a monitored project. Watch for both moments:

1. A test finds a new vulnerability (`newIssues` not empty) and an incident opens in Spike naming it, on the service you attached, escalating through your policy.
2. A later test of that project reports no new issues and every `issueCountsBySeverity` count at 0, and the incident resolves itself.

## Managing the subscription later

Everything is the same API. List what an organization is subscribed to:

```bash
curl "https://api.snyk.io/v1/org/{SNYK-ORG-ID}/webhooks" \
  -H "Authorization: token <SNYK-TOKEN>"
```

And remove one (this needs **Remove Outbound Webhooks**) — do this when you archive the Spike integration, so Snyk stops posting to a dead URL:

```bash
curl -X DELETE "https://api.snyk.io/v1/org/{SNYK-ORG-ID}/webhooks/{WEBHOOK-ID}" \
  -H "Authorization: token <SNYK-TOKEN>"
```

## Payload reference

Snyk sends its own payload and there is no template to edit, so this section is a reference for what lands on the incident page, and for what [alert rules](../alerts/alert-rules.md) and the [Title Remapper](../alerts/title-remapper.md) can read as `data.body.<field>`.

Every delivery carries an `X-Snyk-Event` header that names the event and its version (`ping/v0`, `project_snapshot/v0`), plus `X-Snyk-Transport-ID`, `X-Snyk-Timestamp`, `X-Hub-Signature` and `User-Agent`. The bodies below are Snyk's own documented examples ([Snyk: Webhook events and payloads](https://docs.snyk.io/developer-tools/snyk-api/using-specific-snyk-apis/webhooks-apis/webhooks)), with the documented example issue placed in `newIssues`.

The `ping` body:

```json
{
  "webhookId": "d3cf26b3-2d77-497b-bce2-23b33cc15362"
}
```

It opens no incident, and its event reads `Snyk webhook test ping`.

A `project_snapshot` that found a new issue, which opens the incident:

```json
{
  "project": {
    "name": "snyk/goof",
    "id": "af137b96-6966-46c1-826b-2e79ac49bbd9",
    "created": "2018-10-29T09:50:54.014Z",
    "origin": "github",
    "type": "maven",
    "readOnly": false,
    "testFrequency": "daily",
    "totalDependencies": 42,
    "issueCountsBySeverity": {
      "low": 13,
      "medium": 8,
      "high": 4,
      "critical": 5
    },
    "imageId": "sha256:caf27325b298a6730837023a8a342699c8b7b388b8d878966b064a1320043019",
    "imageTag": "latest",
    "imageBaseImage": "alpine:3",
    "imagePlatform": "linux/arm64",
    "imageCluster": "Production",
    "hostname": null,
    "remoteRepoUrl": "https://github.com/snyk/goof.git",
    "lastTestedDate": "2019-02-05T08:54:07.704Z",
    "browseUrl": "https://app.snyk.io/org/4a18d42f-0706-4ad0-b127-24078731fbed/project/af137b96-6966-46c1-826b-2e79ac49bbd9",
    "importingUser": {
      "id": "e713cf94-bb02-4ea0-89d9-613cce0caed2",
      "name": "example-user@snyk.io",
      "username": "exampleUser",
      "email": "example-user@snyk.io"
    },
    "isMonitored": false,
    "branch": null,
    "targetReference": null,
    "tags": [
      {
        "key": "example-tag-key",
        "value": "example-tag-value"
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
        "development"
      ]
    },
    "remediation": {
      "upgrade": {},
      "patch": {},
      "pin": {}
    }
  },
  "org": {
    "name": "My Org",
    "id": "a04d9cbd-ae6e-44af-b573-0556b0ad4bd2",
    "slug": "my-org",
    "url": "https://api.snyk.io/v1/org/my-org",
    "created": "2020-11-18T10:39:00.983Z"
  },
  "group": {
    "name": "ACME Inc.",
    "id": "a060a49f-636e-480f-9e14-38e773b2a97f"
  },
  "newIssues": [
    {
      "id": "npm:ms:20170412",
      "issueType": "vuln",
      "pkgName": "ms",
      "pkgVersions": [
        "1.0.0"
      ],
      "issueData": {
        "id": "npm:ms:20170412",
        "title": "Regular Expression Denial of Service (ReDoS)",
        "severity": "low",
        "url": "https://snyk.io/vuln/npm:ms:20170412",
        "description": "Lorem ipsum",
        "identifiers": {
          "CVE": [],
          "CWE": [
            "CWE-400"
          ],
          "ALTERNATIVE": [
            "SNYK-JS-MS-10509"
          ]
        },
        "credit": [
          "Snyk Security Research Team"
        ],
        "exploitMaturity": "no-known-exploit",
        "semver": {
          "vulnerable": [
            ">=0.7.1 <2.0.0"
          ]
        },
        "publicationTime": "2017-05-15T06:02:45Z",
        "disclosureTime": "2017-04-11T21:00:00Z",
        "CVSSv3": "CVSS:3.0/AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:N/A:L",
        "cvssScore": 3.7,
        "language": "js",
        "patches": [
          {
            "id": "patch:npm:ms:20170412:2",
            "urls": [
              "https://snyk-patches.s3.amazonaws.com/npm/ms/20170412/ms_071.patch"
            ],
            "version": "=0.7.1",
            "comments": [],
            "modificationTime": "2019-12-03T11:40:45.866206Z"
          }
        ],
        "nearestFixedInVersion": "2.0.0"
      },
      "isPatched": false,
      "isIgnored": false,
      "fixInfo": {
        "isUpgradable": false,
        "isPinnable": false,
        "isPatchable": true,
        "nearestFixedInVersion": "2.0.0"
      },
      "priority": {
        "score": 399,
        "factors": [
          {
            "name": "isFixable",
            "description": "Has a fix available"
          },
          {
            "name": "cvssScore",
            "description": "CVSS 3.7"
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
Low: Regular Expression Denial of Service (ReDoS) in ms 1.0.0 — snyk/goof
```

The same snapshot with the issue in `removedIssues` and `newIssues` empty does **not** resolve the incident: the documented project still counts known vulnerabilities (`issueCountsBySeverity` 13 low, 8 medium, 4 high, 5 critical). Its event reads:

```
Some Snyk issues fixed in snyk/goof — not all clear
```

Only when all four counts are 0 does a snapshot resolve the project's incident, and its event reads `Snyk issues fixed in snyk/goof — back to normal`.

{% hint style="info" %}
Snyk publishes no example of a populated `removedIssues`; it documents the field as an "array of issues object matching API responses". Spike reads only how many entries it has, never what is inside them.
{% endhint %}

The fields Spike itself reads are a small subset of that: `project.id` for identity, `project.name` for the end of the title, the length of `newIssues` to tell a new finding, `project.issueCountsBySeverity` to tell a recovery, `issueData.title`, `issueData.severity`, `pkgName` and `pkgVersions` from the new issues for the rest of the title, and `severity` for the incident's severity. Everything else above is kept on the incident, so alert rules and the Title Remapper can read it.

## Things worth knowing

* **One subscription covers every project in the organization.** There is no per-project webhook. If you have several Snyk organizations, run Step 3 once per organization.
* **Several Spike integrations are fine.** To split projects across teams, create one Snyk organization per team — the webhook is organization-wide, so that is the only level the split can happen at.
* **The schedule is Snyk's.** A snapshot is sent when Snyk tests the project (`testFrequency` in the payload), not the moment an advisory is published.
* **Resolving in Spike does not touch Snyk.** Spike never calls Snyk; the issue stays as it is in Snyk.
* **Snyk documents no retries.** Snyk's webhook pages do not describe retries or timeouts for a delivery that fails.

## Troubleshooting

<details>

<summary>The curl in Step 3 returns 401 or 403</summary>

Check the header is `Authorization: token <SNYK-TOKEN>`, with the literal word `token` before it ([Snyk: Authentication for API](https://docs.snyk.io/developer-tools/snyk-api/authentication-for-api)).

Check the hostname: "Using a token from the wrong region returns a `401 Unauthorized` error."

Check the token has the permissions in the Prerequisites, and that the organization is on an Enterprise plan.

</details>

<details>

<summary>Nothing arrives in Spike</summary>

Send the ping from Step 4 first and look for the `Snyk webhook test ping` event on the integration. If the ping arrives and real snapshots do not, the subscription is fine and the projects are the problem — check in order:

1. The project is an **Open Source or container** project. Snyk sends `project_snapshot` for no other type.
2. Snyk has actually tested the project since you created the webhook. The snapshot "is not triggered when a new project is created or imported", only when an existing project is tested.
3. Your Snyk account is in one of the regions that have webhooks: US-01, US-02, EU-01 or AU-01.

If the ping does not arrive either, confirm with `GET /org/{SNYK-ORG-ID}/webhooks` that the subscription exists and its `url` is the full `https://hooks.spike.sh/<your-token>/push-events`, and that the integration has not been archived in Spike.

</details>

<details>

<summary>Every test opens its own incident</summary>

Open two of the incidents in Spike and compare `project.id` on the incident page. If it differs, they are different Snyk projects, and different projects are different incidents by design.

If the ids match and incidents still pile up, the earlier one was already resolved when the next snapshot arrived. Spike joins a snapshot to an **open** incident only.

</details>

<details>

<summary>Incidents never resolve</summary>

A recovery is a snapshot for the same `project.id` with an empty `newIssues` and every `issueCountsBySeverity` count at 0, while the incident is still open. The usual reasons it does not happen:

* The project still has known vulnerabilities at some severity, even if the one that paged is fixed. Check the project's issue counts in Snyk.
* The same test found something new as well.

A [resolve timer](../incidents/resolve-timer.md) is a reasonable backstop, not a replacement.

</details>

<details>

<summary>We get paged for low-severity findings we do not care about</summary>

Snyk sends the whole snapshot and Spike opens an incident for anything in `newIssues`, so filter on the Spike side with an [alert rule](../alerts/alert-rules.md) on `newIssues.0.issueData.severity` — suppress `low` and `medium`, or route them to a service with a quieter escalation policy.

</details>

<details>

<summary>We want to stop Snyk posting without archiving the Spike integration</summary>

Delete the subscription with `DELETE /org/{SNYK-ORG-ID}/webhooks/{WEBHOOK-ID}`, as in the Managing the subscription section. Recreating it later is the same `curl` as Step 3, with a new secret.

</details>

Disclaimer: These integration instructions are offered independently by Spike.sh, and Spike.sh is not affiliated with nor a partner of Snyk, Inc.
