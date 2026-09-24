---
description: >-
  Send GitLab CI/CD pipeline and deployment failures to Spike so on-call is paged on phone, SMS, Slack or Teams, and incidents resolve themselves when the next run is green.
---

# Integrate Spike with GitLab

[GitLab CI/CD](https://docs.gitlab.com/ee/ci/) reports the outcome of every pipeline and every deployment, and GitLab can send both out as webhooks. Spike listens to those two events, so a failed pipeline on a protected branch, or a failed deployment to a production environment, opens an incident that escalates through your on-call policy — and the next successful pipeline on that branch, or the next successful deployment to that environment, closes it.

Nothing is installed anywhere. You paste one Spike URL into GitLab's webhook form, tick two triggers, and the two stay in sync from there.

{% hint style="info" %}
This works on GitLab.com and on self-managed GitLab, with a project webhook or a group webhook. Only the two triggers below are read; everything else GitLab sends is answered and dropped.
{% endhint %}

## What pages, and what never does

Spike is deliberately narrow about what is worth waking somebody for:

* **Pipelines**: only on a protected branch or protected tag. A pipeline on a feature branch, or a merge request pipeline, never pages anyone.
* **Deployments**: only to an environment whose tier is **production**. Staging, testing, development and other tiers never page anyone.
* **Child pipelines** (`source: parent_pipeline`) are ignored. The parent pipeline is the unit, so one failing tree is one incident.

Everything else — pipelines that are still running, cancelled runs, merge request, push, tag push, job and release events — is answered with a `200` and a reason, and never creates an event or an incident.

## What Spike does with each event

Every state GitLab can send has a decision. Nothing falls through to "does nothing" by accident.

### Pipeline events

| Pipeline status | What happens in Spike |
| --- | --- |
| `failed` on a protected ref | Opens an incident for that project and branch, or adds an event to the one already open |
| `success` on a protected ref | Auto-resolves the open incident for that project and branch. Dropped when nothing is open |
| `running`, `pending` | Skipped. A run that is still going never pages anyone |
| `canceled`, `skipped` | Skipped. A cancelled run is not a failure, and it does not resolve anything either |
| Any status on an unprotected branch | Skipped |
| `source: merge_request_event` | Skipped. Merge request pipelines are the author's problem, not on-call's |
| `source: parent_pipeline` | Skipped. The parent pipeline already covers the run |

### Deployment events

| Deployment status | What happens in Spike |
| --- | --- |
| `failed` to a `production` tier environment | Opens an incident for that project and environment, or adds an event to the one already open |
| `success` to the same environment | Auto-resolves the open incident. Dropped when nothing is open |
| `failed` or `success` to any other tier | Skipped |
| `running`, `blocked`, `approved` | Skipped. A deployment in flight, or waiting on an approval, is not an outage |
| `rejected` | Skipped — and so is the `failed` event GitLab sends straight after a rejection, so a deployment somebody turned down never pages |

### Every other hook

Merge Request, Push, Tag Push, Issue, Note, Job, Release and the rest are answered with a `200` and `unsupported event <kind>`. They never create an event or an incident.

## Grouping and auto-resolve

Spike identifies an incident from the payload, not from the title:

* A **pipeline** incident is one project, one ref, and scheduled-or-not.
* A **deployment** incident is one project and one environment.

That gives you one incident per red branch and one per broken environment. A branch that keeps failing on every retry and every new commit groups into that one incident instead of paging the team again and again, and the first green pipeline on the same ref resolves it.

| Situation | What happens |
| --- | --- |
| `main` fails, is retried, and passes | One incident, opened on the failure and resolved by the pass |
| `main` fails again while the incident is open | No new incident. The open one gains an event, and alerts stay suppressed |
| GitLab redelivers the same failure after a timeout, or you resend it by hand | Added to the open incident, not opened as a second one |
| `main` fails, then a pipeline on `release/2.3` fails | Two incidents. One red branch is not fixed by another |
| `main` is cancelled after it failed | Nothing. A cancelled run does not resolve an incident |
| A pipeline passes with nothing open | Nothing is created |

{% hint style="info" %}
**Scheduled pipelines are tracked on their own.** A nightly pipeline on `main` and a push pipeline on `main` are two separate incidents, so a green push does not quietly close a failing nightly, and a red nightly does not keep firing on every push. All schedules on the same ref share one incident — the pipeline's name is not part of the identity.
{% endhint %}

## Incident titles

Titles say what failed, where, and in which project, in one short sentence, so they hold up when Spike reads one out on a phone call or it lands on a lock screen:

```
Pipeline failed on main in acme/checkout-api
Pipeline passed on main in acme/checkout-api
Scheduled pipeline failed on main in acme/checkout-api
Pipeline failed on tag v2.3.0 in acme/checkout-api
Deployment to production failed in acme/checkout-api
Deployment to production succeeded in acme/checkout-api
```

{% hint style="info" %}
Pipeline ids, commit shas, job names, who triggered the run and how long it took are deliberately kept out of the title. They change on every run, and a title that moves breaks the things that read it: the **Repeated N times** grouping on an incident, duplicate suppression, and any [alert rule](../alerts/alert-rules.md) matching on title text. All of it is on the incident page instead.
{% endhint %}

Each incident carries the detail on its page rather than in the title:

* The project path, and a link to the pipeline run or the deployment job in GitLab
* The ref — branch or tag — the run was on
* The commit that was built, its title, and a link to it
* Who triggered the run
* The failed jobs from the payload, with the stage and GitLab's failure reason
* For deployments: the environment, its tier, and its external URL

Want the title to read differently — the environment first, or your team's own wording? Use a [Title Remapper](../alerts/title-remapper.md):

```handlebars
{{payload.project.path_with_namespace}} — pipeline {{payload.object_attributes.status}} on {{payload.object_attributes.ref}}
```

## Severity

GitLab sends neither priority nor severity, so Spike sets neither. Add them with [alert rules](../alerts/alert-rules.md), which is also how you route a project to a different escalation policy or suppress one you do not want to be paged for.

A rule that marks failed production deploys as SEV1:

| | |
| --- | --- |
| **Condition** | Incident title **contains** `Deployment to production failed` |
| **Action** | Mark severity as **SEV1** |
| **Action** | Load escalation policy **Primary on-call** |

Because titles are byte-identical across repeats, a title condition like that one keeps matching on every later failure of the same environment.

## Prerequisites

* **Maintainer** or **Owner** on the GitLab project, or on the group for a group webhook
* At least one protected branch (GitLab protects `main` by default), or a production-tier environment
* A GitLab integration in Spike and its webhook URL

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → GitLab**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Add the webhook in GitLab

Pick one of the two below. A project webhook covers one project, a group webhook covers every project in the group.

{% tabs %}
{% tab title="One project" %}
Use this when different projects should page different teams, or when you only want a few projects in Spike.

1. Open the project in GitLab and go to **Settings → Webhooks**.
2. Click **Add new webhook**.
3. Fill in the form:
   * **URL**: the webhook URL you copied in Step 1
   * **Name**: `Spike`
   * **Secret token**: leave it empty. Spike authenticates on the token in the URL
   * **Enable SSL verification**: leave it ticked
4. Under **Trigger**, tick only:
   * **Pipeline events**
   * **Deployment events**
5. Click **Add webhook**.

Repeat this for every project you want in this Spike integration. Projects that should page a different team get their own Spike integration and their own webhook URL.
{% endtab %}

{% tab title="Whole group" %}
Use this when every project in the group should page the same team. One webhook, one Spike integration, no per-project setup as the group grows.

1. Open the group in GitLab and go to **Settings → Webhooks**.
2. Click **Add new webhook**.
3. Fill in the form exactly as for a project webhook: the Spike URL, no secret token, SSL verification on.
4. Under **Trigger**, tick only **Pipeline events** and **Deployment events**.
5. Click **Add webhook**.

Every project in the group now reports to this one integration. Spike still opens a separate incident per project, so the project path in the title tells them apart.
{% endtab %}
{% endtabs %}

{% hint style="warning" %}
Do not point both a group webhook and a project webhook at the same Spike integration for the same project. GitLab would deliver every event twice. The incidents still group, so you would not be paged twice, but the incident timeline fills with duplicate events.
{% endhint %}

{% hint style="info" %}
On older self-managed GitLab the page is under **Settings → Integrations → Webhooks**, and the trigger checkboxes have the same names.
{% endhint %}

## Step 3 — Check it works

1. Push a commit to a protected branch whose pipeline you expect to fail, or temporarily add a job that exits non-zero.
2. When the pipeline turns red, the incident shows up in Spike with the project, the branch and a link to the pipeline.
3. Fix the branch and push again. The green pipeline resolves that incident.

GitLab's **Test** dropdown on the webhook can send a **Pipeline events** sample, which is the project's most recent real pipeline — so it only opens an incident if that pipeline actually failed on a protected ref. GitLab has no test option for deployment events at all, and testing is not offered on group webhooks, so a real deployment is the only way to exercise that half.

## Reading Spike's answer in GitLab

Open the webhook in GitLab and look at **Edit → Recent events**. GitLab lists every delivery with the response Spike returned, which is how you tell "Spike never got it" apart from "Spike got it and decided not to page".

An admitted delivery is answered with the id of the event Spike created:

```json
{ "Ok": true, "event": "66f3c8a19b4e2f0012ab34cd" }
```

A delivery Spike decided not to act on is also a `200`, with the reason it was skipped:

```json
{ "Ok": true, "skipped": "pipeline status running" }
```

The reasons map onto the tables above — an unprotected ref, a merge request or child pipeline, a status that is neither `failed` nor `success`, a non-production environment tier, a rejected deployment, or `unsupported event <kind>` for a hook Spike does not read.

{% hint style="info" %}
Spike answers GitLab straight away and escalates afterwards, so a delivery never sits waiting on a phone call or a Slack message. That keeps every delivery well inside GitLab's 10-second webhook timeout. It also means **Recent events** shows the event id rather than the outcome of the escalation — open the incident in Spike to see who was alerted.
{% endhint %}

{% hint style="warning" %}
GitLab disables a webhook automatically after 4 consecutive failed deliveries, and drops events while it is disabled. Because Spike answers every delivery it understands — including the ones it skips — with a `200`, this should not happen. If GitLab does show the webhook as disabled, re-enable it from the same page and check the URL first.
{% endhint %}

## Payload reference

GitLab sends the hook name in the `X-Gitlab-Event` header and a JSON body. Abridged to the parts Spike reads.

### Pipeline Hook

```json
{
  "object_kind": "pipeline",
  "object_attributes": {
    "id": 31,
    "ref": "main",
    "tag": false,
    "sha": "bcbb5ec396a2c0f828686f14fac9b80b780504f2",
    "source": "push",
    "status": "failed",
    "detailed_status": "failed",
    "stages": ["build", "test", "deploy"],
    "duration": 158,
    "protected_ref": true,
    "default_branch": true,
    "url": "https://gitlab.com/acme/checkout-api/-/pipelines/31"
  },
  "user": { "name": "Priya Shah", "username": "priya" },
  "project": {
    "id": 1,
    "name": "checkout-api",
    "web_url": "https://gitlab.com/acme/checkout-api",
    "path_with_namespace": "acme/checkout-api",
    "default_branch": "main"
  },
  "commit": {
    "id": "bcbb5ec396a2c0f828686f14fac9b80b780504f2",
    "title": "fix: retry payment webhook on 429",
    "url": "https://gitlab.com/acme/checkout-api/-/commit/bcbb5ec396a2c0f828686f14fac9b80b780504f2",
    "author": { "name": "Priya Shah", "email": "priya@acme.com" }
  },
  "builds": [
    {
      "id": 378,
      "stage": "test",
      "name": "test-build",
      "status": "failed",
      "failure_reason": "script_failure",
      "allow_failure": false
    }
  ]
}
```

**Key fields:**

* `object_attributes.status` — `failed` or `success` is what decides whether Spike opens or resolves. Anything else is skipped
* `object_attributes.protected_ref` — whether the ref is protected. This is what decides whether the pipeline pages at all
* `object_attributes.ref` and `object_attributes.tag` — the branch or tag, used for grouping and in the title
* `object_attributes.source` — `push`, `schedule`, `merge_request_event`, `parent_pipeline`, and so on. Scheduled pipelines group separately; merge request and child pipelines are skipped
* `object_attributes.url` — link to the pipeline run
* `project.id` — used for grouping, so renaming a project keeps its incidents together
* `project.path_with_namespace` — the project shown in the title
* `commit` and `user` — shown on the incident
* `builds[]` — the jobs, with `status` and `failure_reason`, so on-call can see which job failed without opening GitLab

### Deployment Hook

```json
{
  "object_kind": "deployment",
  "status": "failed",
  "status_changed_at": "2026-09-24 09:20:11 +0000",
  "deployment_id": 15,
  "deployable_url": "https://gitlab.com/acme/checkout-api/-/jobs/796",
  "environment": "production",
  "environment_tier": "production",
  "environment_external_url": "https://checkout.acme.com",
  "project": {
    "id": 1,
    "name": "checkout-api",
    "web_url": "https://gitlab.com/acme/checkout-api",
    "path_with_namespace": "acme/checkout-api",
    "default_branch": "main"
  },
  "short_sha": "279484c0",
  "user": { "name": "Priya Shah", "username": "priya" },
  "commit_url": "https://gitlab.com/acme/checkout-api/-/commit/279484c09fbe69ededfced8c1bb6e6d24616b468",
  "commit_title": "fix: retry payment webhook on 429"
}
```

**Key fields:**

* `status` — `failed` or `success` opens or resolves. `running`, `blocked`, `approved` and `rejected` are skipped
* `environment_tier` — only `production` pages
* `environment` — used for grouping and in the title
* `deployment_id` — used to recognise the `failed` event that follows a rejected deployment
* `deployable_url` — link to the deployment job
* `project.id` and `project.path_with_namespace` — grouping, and the project in the title
* `commit_url`, `commit_title`, `short_sha` and `user` — shown on the incident

Fields GitLab leaves out are simply left off the incident.

## Things worth knowing

* **Older GitLab versions** do not send `protected_ref` on pipeline events. When it is missing, Spike falls back to "the ref is the project's default branch", so `main` still pages and feature branches still do not.
* **Environments with no tier** are treated as production, so a real failure is never missed because somebody forgot to set the tier in GitLab. Set the tier on your non-production environments to keep them quiet.
* **Rejected deployments** are remembered for 24 hours, so the `failed` event GitLab sends right after somebody rejects an approval does not page. A genuine failure of a later deployment to the same environment still does.
* **The webhook URL is the only credential** on this integration. Spike does not verify GitLab's secret token, so leave that field empty and treat the URL as a secret.
* **Branches and tiers are not configurable yet.** Protected refs and production-tier deployments page; everything else does not. If you need staging deployments or every branch to page, email [support@spike.sh](mailto:support@spike.sh) — it helps to know.

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Open the webhook in GitLab and look at **Edit → Recent events**. GitLab shows every delivery it attempted along with the response.

* No deliveries at all means the triggers are wrong. Re-open the webhook and confirm **Pipeline events** and **Deployment events** are both ticked.
* Deliveries with a non-2xx response mean the URL is wrong. It must be the full `https://hooks.spike.sh/<your-token>/push-events` URL from the integration, with nothing trimmed off the end.
* A webhook marked as disabled means GitLab gave up after 4 consecutive failures. Fix the URL, then re-enable it.
* Deliveries that were all skipped mean Spike is receiving them and deciding not to page. The reason on each one says why.

</details>

<details>

<summary>A failed pipeline did not open an incident</summary>

Look at the delivery in **Recent events** and check, in this order:

* `object_attributes.protected_ref` — an unprotected branch never pages. Protect the branch in **Settings → Repository → Protected branches**.
* `object_attributes.source` — `merge_request_event` and `parent_pipeline` never page.
* `object_attributes.status` — only `failed` opens an incident. A pipeline that was cancelled or is still running does not.
* An [alert rule](../alerts/alert-rules.md) with an **Ignore incident** action, or an incident for the same project and branch that is already open, in which case the failure was added to it as an event instead.

</details>

<details>

<summary>A failed deployment did not open an incident</summary>

Deployments page only from a `production` tier environment. Check `environment_tier` on the delivery, and set the tier in GitLab under **Operate → Environments → Edit** if the environment really is production.

A `failed` that arrives right after a `rejected` for the same deployment is skipped on purpose — that is the rejection, not an outage.

</details>

<details>

<summary>Incidents open but never resolve</summary>

A `success` resolves an incident only when it is for the same project and ref, or the same project and environment.

* A green pipeline on another branch does not close `main`'s incident. That is deliberate: `main` staying red is not fixed by a green feature branch.
* A green push pipeline does not close a failing **scheduled** pipeline on the same branch, and the other way around. They are tracked separately.
* A cancelled pipeline does not resolve anything. Re-run it and let it finish.
* If somebody resolved the incident by hand in Spike, the later success has nothing to close and is dropped.

</details>

<details>

<summary>Every failing pipeline opens a new incident</summary>

Grouping uses the project id, the ref and whether the pipeline was scheduled. Check **Recent events** for the deliveries that opened the extra incidents: a different `ref`, or a `source` of `schedule` on one and `push` on another, is enough to make them separate incidents on purpose.

If you have both a group webhook and a project webhook pointing at the same Spike integration, the events arrive twice. Remove one of them.

</details>

<details>

<summary>Incidents from projects I do not care about</summary>

A group webhook fires for every project in the group. Either drop it and add project webhooks only where you want them, or keep it and suppress the noisy projects with [alert rules](../alerts/alert-rules.md) on the project path in the title.

</details>

<details>

<summary>Someone shared the webhook URL</summary>

The webhook URL is the only credential on this integration, so treat it as a secret. If it leaks, archive the integration in Spike and create a new one, then update the URL in GitLab.

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

</details>
