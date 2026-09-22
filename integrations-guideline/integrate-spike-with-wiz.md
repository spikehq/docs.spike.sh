---
description: >-
  Send Wiz Issues and Wiz Defend Threats to Spike so a cloud security finding pages your on-call rotation, and resolving or rejecting it in Wiz closes the incident.
---

# Integrate Spike with Wiz

[Wiz](https://www.wiz.io/) scans your cloud estate and raises an **Issue** when a Control matches a resource — a publicly exposed bucket, a virtual machine carrying a critical vulnerability. If you run Wiz Defend it also raises **Threats**: correlated runtime activity on a workload, like a crypto mining process on a production container.

Spike turns each one into an incident that escalates through your on-call policy and closes again when Wiz resolves or rejects the finding. Setting it up is a webhook and a few Automation Rules, and you do not have to write a request body: Wiz's default already carries everything Spike needs.

## What Spike does with each webhook

One Wiz Issue is one incident, and one Wiz Threat is one incident. Spike identifies it by the finding's own id, so every webhook about it lands on the same incident. What happens next comes from its `status`, not from which rule fired:

| Status | What happens in Spike |
| --- | --- |
| `OPEN` | Opens an incident for that finding, or adds an event to the one already open |
| `IN_PROGRESS` | Adds an event to the open incident. Opens one if nothing is open, which is what happens when somebody picks the finding up in Wiz before the created rule ever fired |
| `RESOLVED` | Auto-resolves the open incident. Dropped when nothing is open |
| `REJECTED` | Auto-resolves the open incident, the same as `RESOLVED`. A finding your team dismissed in Wiz should not keep paging |

A severity change, an assignment, a note and a status change all arrive as updates on that one incident, so a noisy Control never pages the team twice. If Wiz reopens a finding after it was resolved, the next `OPEN` webhook opens a fresh incident.

Incident titles read well when Spike reads them out on a phone call, and stay the same for every update:

```
Publicly exposed bucket containing sensitive data on prod-customer-uploads
Crypto mining process detected on api-worker-7f9c
```

That is the Control's name and the resource's name for an Issue (`control.name` and `resource.name`), and the Threat's own title and its first resource for a Threat. The cloud platform, the subscription, the region, the projects, the MITRE technique and the link back to Wiz are all on the incident page rather than in the title.

Severity comes from the finding's `severity`:

| Wiz severity | Severity in Spike | Priority |
| --- | --- | --- |
| `CRITICAL` | SEV1 | P1 |
| `HIGH` | SEV1 | P2 |
| `MEDIUM` | SEV2 | P3 |
| `LOW` | SEV3 | P4 |
| `INFORMATIONAL` | SEV3 | P5 |

{% hint style="info" %}
Severity is set when the incident is created and does not move when Wiz re-scores the finding later. The change is still recorded on the incident. [Alert rules](../alerts/alert-rules.md) can override the severity, route the incident elsewhere, or suppress it entirely.
{% endhint %}

## Prerequisites

* A Wiz user who can reach **Settings → Integrations** and **Automation Rules**
* A Wiz integration in Spike and its webhook URL

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Wiz**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Add the webhook integration in Wiz

In Wiz, go to **Settings → Integrations → Add Integration** and pick **Webhook**.

* **Name** — `Spike`, or the name of the service you attached the integration to
* **URL** — the webhook URL from Step 1
* **Authentication** — `None` is enough. See the note below
* **Scope** — leave it open to the whole tenant unless you run one Spike service per Wiz project, in which case scope the integration to that project and repeat these steps per service

Save it, and use Wiz's **Test** button to confirm the call leaves your tenant. The test sends Wiz's own sample rather than a real finding, so it may land in Spike as an incident with an empty title. Resolve it and move on.

{% hint style="warning" %}
Wiz does not sign its webhooks, so there is no signature for Spike to verify. The token in the webhook URL is the shared secret: anyone holding that URL can open incidents on this integration. Keep it out of shared documents and tickets, and archive and recreate the integration if it leaks.

Wiz's `Basic` and `Bearer` options exist for gateways that insist on an `Authorization` header. Spike does not need one and ignores it, so pick either if a proxy in front of you requires it.
{% endhint %}

## Step 3 — Create the Automation Rules

Go to **Automation → Automation Rules → Add Rule** and create one rule per trigger. They all use the same action — the webhook integration from Step 2 — and none of them needs the request body edited.

**For Issues:**

| Rule | Trigger | What it does in Spike |
| --- | --- | --- |
| `Spike — Issue created` | Issue created | Opens the incident and starts the escalation |
| `Spike — Issue updated` | Issue updated | Appends the change to the open incident |
| `Spike — Issue resolved` | Issue resolved | Auto-resolves the incident |

**For Threats, if you run Wiz Defend:**

| Rule | Trigger | What it does in Spike |
| --- | --- | --- |
| `Spike — Threat created` | Threat created | Opens the incident |
| `Spike — Threat updated` | Threat updated | Appends the change |
| `Spike — Threat resolved` | Threat resolved | Auto-resolves the incident |

For each rule:

1. **Trigger** — pick one of the above.
2. **If** — this is where severity filtering happens. Set `Severity` `is one of` the severities you want to page on, for example `CRITICAL` and `HIGH`. Add conditions for `Project` or `Cloud Account` if only part of the estate should reach this Spike service.
3. **Then** — choose **POST a Webhook** and select the `Spike` integration from Step 2.
4. **Request body** — **leave it as it is.** Wiz's default body already carries the id, the status, the severity, the Control and the resource. See below if you want to send less.

{% hint style="danger" %}
The **resolved** rule is what makes auto-resolve work. Skip it and every Wiz incident stays open in Spike until somebody resolves it by hand, even after Wiz has closed the finding.
{% endhint %}

{% hint style="info" %}
Put the same severity filter on all three rules of a set. If the created rule pages on `CRITICAL` only but the resolved rule fires for everything, Spike simply drops the resolutions it has no open incident for, which is harmless. The reverse — a narrow resolved rule — leaves incidents open.

A rejection arrives on the **updated** rule, not the resolved one, which is another reason to wire up all three. Spike reads the status rather than the rule name, so a rejection on the updated rule still closes the incident.
{% endhint %}

## What Wiz sends

You do not need to configure any of this — it is here so you know what lands on the incident page, and so you can write [alert rules](../alerts/alert-rules.md) and remappers against it.

A Wiz Automation Rule posts four top-level objects for an Issue. The two halves of the title are in the last two, **not** inside `issue`:

```json
{
    "trigger": {
        "source": "ISSUES",
        "type": "Created",
        "ruleId": "c2a8f1e4-7b3d-4e9a-9f12-3d5b6a7c8e90",
        "ruleName": "Send critical issues to Spike"
    },
    "issue": {
        "id": "8f3e2d1c-4b5a-4c6d-9e7f-1a2b3c4d5e6f",
        "status": "OPEN",
        "severity": "CRITICAL",
        "created": "2026-09-21T06:42:17.123Z",
        "projects": [
            {
                "id": "5d4c3b2a-1e0f-4a9b-8c7d-6e5f4a3b2c1d",
                "name": "Production",
                "businessUnit": "Platform",
                "riskProfile": { "businessImpact": "HBI" }
            }
        ]
    },
    "resource": {
        "id": "arn:aws:s3:::prod-customer-uploads",
        "name": "prod-customer-uploads",
        "type": "BUCKET",
        "cloudPlatform": "AWS",
        "subscriptionId": "123456789012",
        "subscriptionName": "prod-account",
        "region": "ap-south-1",
        "status": "Active",
        "cloudProviderURL": "https://s3.console.aws.amazon.com/s3/buckets/prod-customer-uploads"
    },
    "control": {
        "id": "wc-id-1234",
        "name": "Publicly exposed bucket containing sensitive data",
        "description": "S3 bucket is publicly accessible and contains PII detected by Wiz data scanning.",
        "severity": "CRITICAL",
        "sourceCloudConfigurationRuleId": "",
        "sourceCloudConfigurationRuleName": ""
    }
}
```

What Spike takes from each object:

| Object | What Spike uses |
| --- | --- |
| `issue` | `id` is the identity — it is how every later webhook finds this incident. `status` decides open, append or resolve. `severity` sets the incident's severity |
| `control` | `name` is the finding: the first half of the title |
| `resource` | `name` is the cloud resource: the second half. `id`, the ARN, is used when there is no name |
| `trigger` | `type` is which rule fired. Only read when the payload carries no status at all |

Everything else — the project list, the business impact, the region, the subscription, the console URL — is kept and rendered on the incident page as a searchable table.

{% hint style="info" %}
`resource.status` is the *resource's* lifecycle, not the finding's. Spike only ever reads `issue.status`, so an `Active` resource on a `RESOLVED` Issue still resolves the incident.
{% endhint %}

### A Threat looks different

A Threat payload is **two** top-level objects, not four. There is no `control` and no top-level `resource`: the Threat names itself and carries its own list of resources.

```json
{
    "trigger": {
        "source": "THREAT_DETECTION",
        "type": "Created",
        "ruleName": "Send threats to Spike"
    },
    "threat": {
        "id": "a1b2c3d4-e5f6-4789-a0b1-c2d3e4f5a6b7",
        "title": "Crypto mining process detected",
        "status": "OPEN",
        "severity": "HIGH",
        "cloudPlatform": "AWS",
        "resources": [
            { "id": "i-0abc123def4567890", "name": "api-worker-7f9c", "type": "CONTAINER" }
        ],
        "actors": [ { "name": "eks-node-role", "type": "SERVICE_ACCOUNT" } ],
        "mitreTechniques": ["T1496"],
        "threatURL": "https://app.wiz.io/threats#~(issue~'a1b2c3d4-e5f6-4789-a0b1-c2d3e4f5a6b7)"
    }
}
```

The title comes from `threat.title` and the first entry of `threat.resources`. Wiz correlates activity that can touch more than one workload, so that list can grow as a Threat spreads — the first entry is the one the Threat opened on and stays first, and the incident is identified by `threat.id` regardless.

### Sending a smaller payload

If you would rather post less than Wiz's default, paste this into the rule's request body. It renders the same two halves of the title into a flat shape Spike also reads. The `{{#x}}…{{/x}}` guards are Wiz's own — they render a missing value as an empty string rather than the literal `{{…}}`, so the body stays valid JSON.

```json
{
  "source": "wiz",
  "trigger": "{{trigger.type}}",
  "issue": {
    "id": "{{issue.id}}",
    "status": "{{issue.status}}",
    "severity": "{{issue.severity}}",
    "control": "{{#control}}{{control.name}}{{/control}}",
    "entity": "{{#resource}}{{resource.name}}{{/resource}}",
    "cloud": "{{#resource}}{{resource.cloudPlatform}}{{/resource}}",
    "subscription": "{{#resource}}{{resource.subscriptionName}}{{/resource}}",
    "region": "{{#resource}}{{resource.region}}{{/resource}}",
    "projects": "{{#issue.projects}}{{name}} {{/issue.projects}}",
    "createdAt": "{{issue.created}}"
  },
  "url": "{{#resource}}{{resource.cloudProviderURL}}{{/resource}}"
}
```

{% hint style="warning" %}
Keep `issue.id`, `issue.status`, `issue.severity`, `control` and `entity` whatever else you trim. They are the identity, the auto-resolve, the severity and the two halves of the title. An edited body can only lose fields, which is why the default is the recommendation.
{% endhint %}

## Step 4 — Verify

Lower the severity filter on the created rule to include `LOW` for a moment, or pick a low-severity Issue that already exists, and use **Run rule** on it from the Wiz Issues page. An incident opens in Spike titled with the Control name and the resource. Resolve the Issue in Wiz and the incident resolves itself within seconds. Then put your real severity filter back.

## Renaming incidents with Title Remapper

The default title is the finding and the resource. If your responders would rather see the cloud account or the project first, write a [Title Remapper](../alerts/title-remapper.md) for the Wiz integration:

```
[{{data.resource.cloudPlatform}}/{{data.resource.subscriptionName}}] {{data.control.name}} on {{data.resource.name}}
```

Output: `[AWS/prod-account] Publicly exposed bucket containing sensitive data on prod-customer-uploads`

Or lead with the business unit that owns the project:

```
{{data.issue.projects.[0].businessUnit}} — {{data.control.name}} on {{data.resource.name}}
```

Output: `Platform — Publicly exposed bucket containing sensitive data on prod-customer-uploads`

{% hint style="warning" %}
A remapped title is still part of how an incident is recognised. Only use fields that stay the same across the created, updated and resolved webhooks for one finding: `control.name`, `resource.*` and `issue.projects` are safe, `issue.status`, `issue.severity` and the resolution note are not.
{% endhint %}

## Things worth knowing

* **Severity filtering belongs in Wiz, not in Spike.** The rule's *If* condition decides what ever reaches Spike, which keeps low-severity findings out of the escalation path entirely instead of having them open and suppress incidents. Use [alert rules](../alerts/alert-rules.md) for the routing decisions you want to make after a finding has arrived.
* **A rejected finding resolves the incident.** Wiz treats `REJECTED` as closed, and so does Spike. Whoever dismissed it in Wiz has decided it should not page.
* **Resolutions for unknown findings are dropped.** A `RESOLVED` webhook for something Spike has no open incident for does nothing, which is what should happen if the incident was already resolved by hand or the finding never matched your severity filter.
* **Issues and Threats never share an incident.** They are separate id spaces in Wiz and Spike keys them apart, so a resolved Threat cannot close an Issue's incident even in the unlikely event that the two ids match.
* **One Control, many Issues.** A Control that matches fifty resources raises fifty Issues, each with its own id and resource, so they become fifty incidents with fifty distinct titles. That is the intent — they are fifty separate things to fix — but a customer whose *If* condition is too broad will feel it. Severity filtering in the rule is the answer.
* **Wiz has no retries you can rely on.** If `hooks.spike.sh` is unreachable when a rule fires, the delivery is lost. Wiz records the failure on the rule's run history.

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Open the automation rule in Wiz and check its run history. A rule with no runs is not matching anything, usually because the *If* condition is narrower than you think, or because the trigger is on a different object. A rule with failed runs shows the HTTP status Spike returned: a `404` means the webhook URL is wrong or the integration was archived, anything else is worth sending to [support@spike.sh](mailto:support@spike.sh).

</details>

<details>

<summary>Incidents open but never resolve</summary>

You are almost certainly missing the **resolved** rule, or its *If* condition is narrower than the created rule's. Confirm the rule exists and points at the same webhook integration.

If it is a Threat rather than an Issue, check the **updated** rule too: Wiz sends a rejection there rather than on the resolved rule.

</details>

<details>

<summary>Incidents have an empty or wrong title</summary>

Spike builds the title from `control.name` and `resource.name`, which are top-level objects in Wiz's payload rather than fields inside `issue`. If the rule's request body was edited and either was dropped, or was referenced as `issue.control.name`, the title falls apart. The fix is to reset the body to Wiz's default, or to use the flattened template above exactly as published.

Wiz's **Test** button on the integration itself sends Wiz's own sample rather than your rule's body, and that one does arrive with no title.

</details>

<details>

<summary>One Wiz finding opened several incidents in Spike</summary>

Check that the rule's body still carries `issue.id` (or `threat.id`), and that no Title Remapper linked to this integration puts a changing field such as `status` or `severity` into the title. The finding's id is how Spike recognises an update as belonging to an incident already open.

</details>

<details>

<summary>The body renders the word null</summary>

A nullable field was pasted into a custom body without its `{{#x}}…{{/x}}` guard. Use the flattened template above, which guards every field that can be empty, or go back to Wiz's default body, which needs no guards at all.

</details>
