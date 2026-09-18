---
description: >-
  Send Wiz Issues to Spike so a cloud security finding at the severity you choose pages your on-call rotation, and resolving or rejecting the Issue in Wiz closes the incident.
---

# Integrate Spike with Wiz

[Wiz](https://www.wiz.io/) scans your cloud estate and raises an **Issue** when a control matches a resource, for example a publicly exposed bucket or a virtual machine carrying a critical vulnerability. Wiz sends those Issues out through an automation rule, so Spike turns each one into an incident that escalates through your on-call policy, and closes it again when Wiz resolves or rejects the Issue.

Wiz builds the webhook body from a template you paste in yourself, so this guide publishes the exact body Spike expects. Paste it as-is into all three rules.

{% hint style="info" %}
This integration covers Wiz **Issues**. Wiz **Detections**, the threat events from Wiz Defend, are not a Spike source yet.
{% endhint %}

## What Spike does with each Issue

Spike identifies an incident by the Wiz Issue id, so every webhook about the same Issue lands on the same incident. What happens next comes from `issue.status`, not from which rule fired:

| `issue.status` | What happens in Spike |
| --- | --- |
| `OPEN` | Opens an incident for that Issue, or adds an event to the one already open |
| `IN_PROGRESS` | Adds an event to the open incident. Opens one if nothing is open, which is what happens when somebody picks the Issue up in Wiz before the created rule ever fired |
| `RESOLVED` | Auto-resolves the open incident. Dropped when nothing is open |
| `REJECTED` | Auto-resolves the open incident, the same as `RESOLVED`. A finding your team dismissed in Wiz should not keep paging |

One Wiz Issue is one incident. A severity change, an assignment, a note and a status change all arrive as updates on that one incident, so a noisy control never pages the team twice. If Wiz reopens an Issue after it was resolved, the next `OPEN` webhook opens a fresh incident.

Incident titles read well when Spike reads them out on a phone call, and stay the same for every update:

```
S3 bucket is publicly accessible on prod-customer-assets
Virtual machine has a critical vulnerability with a known exploit on prod-api-01
```

That is `{{issue.control.name}} on {{issue.entitySnapshot.name}}`. The cloud platform, the subscription, the projects, the resolution note and the link back to Wiz are on the incident page rather than in the title.

Severity comes from `issue.severity`:

| Wiz severity | Severity in Spike |
| --- | --- |
| `CRITICAL`, `HIGH` | SEV1 |
| `MEDIUM` | SEV2 |
| `LOW`, `INFORMATIONAL` | SEV3 |

{% hint style="info" %}
Severity is set when the incident is created and does not move when Wiz raises or lowers the Issue's severity later. The change is still recorded on the incident. [Alert rules](../alerts/alert-rules.md) can override the severity, route the incident elsewhere, or suppress it entirely.
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

Save it, and use Wiz's **Test** button to confirm the call leaves your tenant. The test payload is not the body from Step 3, so it may land in Spike as an incident with an empty title. Resolve it and move on.

{% hint style="warning" %}
Wiz does not sign its webhooks, so there is no signature for Spike to verify. The token in the webhook URL is the shared secret: anyone holding that URL can open incidents on this integration. Keep it out of shared documents and tickets, and archive and recreate the integration if it leaks.

Wiz's `Basic` and `Bearer` options exist for gateways that insist on an `Authorization` header. Spike does not need one and ignores it, so pick either if a proxy in front of you requires it.
{% endhint %}

## Step 3 — Create the three automation rules

Go to **Automation → Automation Rules → Add Rule**, and create one rule per trigger. All three use the same action, the webhook integration from Step 2, and the same request body.

| Rule | Trigger | What it does in Spike |
| --- | --- | --- |
| `Spike — Issue created` | Issue created | Opens the incident and starts the escalation |
| `Spike — Issue updated` | Issue updated | Appends the change to the open incident |
| `Spike — Issue resolved` | Issue resolved | Auto-resolves the incident |

For each rule:

1. **Trigger** — pick one of the three above.
2. **If** — this is where severity filtering happens. Set `Severity` `is one of` the severities you want to page on, for example `CRITICAL` and `HIGH`. Add conditions for `Project` or `Cloud Account` if only part of the estate should reach this Spike service.
3. **Then** — choose **POST a Webhook** and select the `Spike` integration from Step 2.
4. **Request body** — paste the template below.

{% hint style="danger" %}
The **Issue resolved** rule is what makes auto-resolve work. Skip it and every Wiz incident stays open in Spike until somebody resolves it by hand, even after Wiz has closed the finding.
{% endhint %}

{% hint style="info" %}
Put the same severity filter on all three rules. If the created rule pages on `CRITICAL` only but the resolved rule fires for everything, Spike simply drops the resolutions it has no open incident for, which is harmless. The reverse — a narrow resolved rule — leaves incidents open.
{% endhint %}

### The request body

```json
{
  "source": "wiz",
  "trigger": "{{triggerType}}",
  "issue": {
    "id": "{{issue.id}}",
    "status": "{{issue.status}}",
    "severity": "{{issue.severity}}",
    "control": "{{issue.control.name}}",
    "entity": "{{issue.entitySnapshot.name}}",
    "cloud": "{{issue.entitySnapshot.cloudPlatform}}",
    "subscription": "{{#issue.entitySnapshot.subscriptionName}}{{issue.entitySnapshot.subscriptionName}}{{/issue.entitySnapshot.subscriptionName}}",
    "projects": "{{#issue.projects}}{{name}} {{/issue.projects}}",
    "createdAt": "{{issue.createdAt}}",
    "resolvedAt": "{{#issue.resolvedAt}}{{issue.resolvedAt}}{{/issue.resolvedAt}}",
    "note": "{{#issue.resolutionNote}}{{issue.resolutionNote}}{{/issue.resolutionNote}}"
  },
  "url": "{{issue.url}}"
}
```

A few things about that body:

* **Paste it into all three rules unchanged.** Spike reads `issue.status` to decide whether to open, append or resolve, so the created, updated and resolved rules do not need different bodies.
* **`{{#field}}…{{/field}}` are Wiz's guards for fields that can be null.** `subscriptionName`, `resolvedAt` and `resolutionNote` are empty on a freshly created Issue, and the guard renders an empty string instead of the word `null`. The keys are always present, so the body is always valid JSON.
* **`projects` is a list**, so the guard iterates it and renders the project names separated by spaces. Spike trims the trailing space.
* **Keep `"source": "wiz"`.** It is how Spike tells a Wiz body apart from a plain webhook body.
* **Add fields if you want them.** Anything extra you add to the `issue` object shows up on the incident page. Do not rename `id`, `status`, `severity`, `control` or `entity` — those five drive the identity, the resolve, the severity and the title.

## Step 4 — Verify

Lower the severity filter on the created rule to include `LOW` for a moment, or pick a low-severity Issue that already exists, and use **Run rule** on the Issue from the Wiz Issues page. An incident opens in Spike with the control name and the entity in the title. Resolve the Issue in Wiz and the incident resolves itself within seconds. Then put your real severity filter back.

## Payload reference

This is what Spike receives when a critical Issue is created:

```json
{
  "source": "wiz",
  "trigger": "created",
  "issue": {
    "id": "6f1a0f5a-3c2e-4b4b-9a0d-2f1c5b8e7d10",
    "status": "OPEN",
    "severity": "CRITICAL",
    "control": "S3 bucket is publicly accessible",
    "entity": "prod-customer-assets",
    "cloud": "AWS",
    "subscription": "acme-production",
    "projects": "Payments Platform",
    "createdAt": "2026-09-18T09:14:02Z",
    "resolvedAt": "",
    "note": ""
  },
  "url": "https://app.wiz.io/issues#~(issue~'6f1a0f5a-3c2e-4b4b-9a0d-2f1c5b8e7d10)"
}
```

And when the same Issue is resolved:

```json
{
  "source": "wiz",
  "trigger": "resolved",
  "issue": {
    "id": "6f1a0f5a-3c2e-4b4b-9a0d-2f1c5b8e7d10",
    "status": "RESOLVED",
    "severity": "CRITICAL",
    "control": "S3 bucket is publicly accessible",
    "entity": "prod-customer-assets",
    "cloud": "AWS",
    "subscription": "acme-production",
    "projects": "Payments Platform",
    "createdAt": "2026-09-18T09:14:02Z",
    "resolvedAt": "2026-09-18T11:40:55Z",
    "note": "Bucket policy corrected in PR 4821"
  },
  "url": "https://app.wiz.io/issues#~(issue~'6f1a0f5a-3c2e-4b4b-9a0d-2f1c5b8e7d10)"
}
```

{% hint style="info" %}
There is no top-level `title` key in this payload on purpose. Spike builds the title from `control` and `entity`, which keeps it identical across the created, updated and resolved webhooks for one Issue. That is what lets Spike group them and resolve the right incident.
{% endhint %}

## Renaming incidents with Title Remapper

The default title is `{control} on {entity}`. If your responders would rather see the cloud account or the project first, write a [Title Remapper](../alerts/title-remapper.md) for the Wiz integration:

```
[{{data.issue.cloud}}/{{data.issue.subscription}}] {{data.issue.control}} on {{data.issue.entity}}
```

Output: `[AWS/acme-production] S3 bucket is publicly accessible on prod-customer-assets`

Or lead with the project and fall back to the subscription when an Issue has no project:

```
{{#if data.issue.projects}}{{data.issue.projects}}{{else}}{{data.issue.subscription}}{{/if}} — {{data.issue.control}} on {{data.issue.entity}}
```

Output: `Payments Platform — S3 bucket is publicly accessible on prod-customer-assets`

{% hint style="warning" %}
A remapped title is still the incident's identity. Only use fields that stay the same across the created, updated and resolved webhooks for one Issue: `control`, `entity`, `cloud`, `subscription` and `projects` are safe, `status`, `severity` and `note` are not.
{% endhint %}

## Things worth knowing

* **Severity filtering belongs in Wiz, not in Spike.** The rule's *If* condition decides what ever reaches Spike, which keeps low-severity findings out of the escalation path entirely instead of having them open and suppress incidents. Use [alert rules](../alerts/alert-rules.md) for the routing decisions you want to make after an Issue has arrived.
* **A rejected Issue resolves the incident.** Wiz treats `REJECTED` as a closed Issue, and so does Spike. Whoever dismissed the finding in Wiz has decided it should not page.
* **Resolutions for unknown Issues are dropped.** A `RESOLVED` webhook for an Issue Spike has no open incident for does nothing, which is what should happen if the incident was already resolved by hand or the Issue never matched your severity filter.
* **Wiz has no retries you can rely on.** If `hooks.spike.sh` is unreachable when a rule fires, the delivery is lost. Wiz records the failure on the rule's run history.
* **Wiz Detections use a different shape.** Wiz Defend detections carry `detection.*` rather than `issue.*` and are not a Spike source yet. Do not point a detection rule at a Wiz integration.

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Open the automation rule in Wiz and check its run history. A rule with no runs is not matching anything, usually because the *If* condition is narrower than you think, or because the trigger is on a different object. A rule with failed runs shows the HTTP status Spike returned: a `404` means the webhook URL is wrong or the integration was archived, anything else is worth sending to [support@spike.sh](mailto:support@spike.sh).

</details>

<details>

<summary>Incidents open but never resolve</summary>

You are almost certainly missing the **Issue resolved** rule, or its *If* condition is narrower than the created rule's. Confirm the resolved rule exists, that it points at the same webhook integration, and that it carries the same request body, so `issue.status` and `issue.id` actually arrive.

</details>

<details>

<summary>Incidents have an empty or wrong title</summary>

Spike builds the title from `issue.control` and `issue.entity`. If either is missing from the body, or was renamed, the title falls apart. Compare the rule's request body against the template above character for character — a rule created by copying an older one is the usual culprit. Wiz's **Test** button on the integration itself also sends its own sample payload rather than your body, and that one does arrive with no title.

</details>

<details>

<summary>One Wiz Issue opened several incidents in Spike</summary>

Check that every rule sends `issue.id`, and that no Title Remapper linked to this integration puts a changing field such as `status` or `severity` into the title. The title and the Issue id are how Spike recognises an update as belonging to an incident already open.

</details>

<details>

<summary>The body renders the word null</summary>

A nullable field was pasted without its `{{#field}}…{{/field}}` guard. `subscriptionName`, `resolvedAt` and `resolutionNote` are the three that are regularly empty. Use the template above, which guards all three.

</details>
