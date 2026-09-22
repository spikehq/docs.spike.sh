---
description: >-
  Send Bitbucket Pipelines build failures to Spike so on-call is paged on phone, SMS, Slack or Teams, and incidents resolve when the pipeline goes green again.
---

# Integrate Spike with Bitbucket Pipelines

[Bitbucket Pipelines](https://bitbucket.org/product/features/pipelines) reports the outcome of every run back to the commit it built, and Bitbucket sends that outcome out as a webhook. Spike listens to those build status events, so a failed pipeline opens an incident that escalates through your on-call policy, and the next successful run of the same pipeline on the same branch closes it.

You can wire this up for a single repository, or once for a whole workspace so every repository in it reports to the same Spike service.

{% hint style="info" %}
This integration is for **Bitbucket Cloud** (`bitbucket.org`). Bitbucket Data Center and Bitbucket Server are not supported yet.
{% endhint %}

## What Spike does with each build status

Bitbucket sends a build status as `repo:commit_status_created` when a run starts reporting and `repo:commit_status_updated` when it finishes. Spike handles both and reacts to the state on them:

| Build state | What happens in Spike |
| --- | --- |
| `FAILED` | Opens an incident for that repository, branch and pipeline, or adds an event to the one already open |
| `SUCCESSFUL` | Auto-resolves the open incident. Dropped when nothing is open |
| `INPROGRESS` | Ignored. A run that is still going never pages anyone |
| `STOPPED` | Ignored. A cancelled run is not a failure |

There is one incident per repository, branch and pipeline. A branch that keeps failing on every push groups into that one incident instead of paging the team again and again, and the first green run on the same branch resolves it.

Incident titles stay the same across repeats, which is what makes them readable when Spike reads one out on a phone call:

```
Pipeline failed on main in acme/checkout-api
```

Each incident carries the detail on its page rather than in the title:

* Repository, with a link to it in Bitbucket
* Branch the run was on
* Commit hash, with a link to the commit
* Commit author, as reported by Bitbucket
* A link straight to the pipeline run, so on-call lands on the failing step
* The build status name and description Bitbucket sent

{% hint style="info" %}
[Alert rules](../alerts/alert-rules.md) work on this integration like any other. Use them to set severity per repository or branch, route a repository to a different escalation policy, or suppress pipelines you do not want to be paged for. Alerts are suppressed for repeat failures while the incident is open.
{% endhint %}

## Prerequisites

* A Bitbucket Cloud account with **admin** access on the repository, or on the workspace for a workspace-wide webhook
* At least one pipeline defined in `bitbucket-pipelines.yml`
* A Bitbucket Pipelines integration in Spike and its webhook URL

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Bitbucket Pipelines**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Add the webhook in Bitbucket

Pick one of the two below. A repository webhook covers one repository, a workspace webhook covers every repository in the workspace.

{% tabs %}
{% tab title="One repository" %}
Use this when different repositories should page different teams, or when you only want a few repositories in Spike.

1. Open the repository in Bitbucket and go to **Repository settings → Webhooks**.
2. Click **Add webhook**.
3. Fill in the form:
   * **Title**: `Spike`
   * **URL**: the webhook URL you copied in Step 1
   * **Status**: leave **Active** ticked
   * **SSL / TLS**: leave certificate validation enabled
4. Under **Triggers**, choose **Choose from a full list of triggers**, and in the **Repository** section tick:
   * **Build status created**
   * **Build status updated**
5. Click **Save**.

Repeat this for every repository you want in this Spike integration. Repositories that should page a different team get their own Spike integration and their own webhook URL.
{% endtab %}

{% tab title="Whole workspace" %}
Use this when every repository in the workspace should page the same team. One webhook, one Spike integration, no per-repository setup as the workspace grows.

1. From your workspace in Bitbucket, go to **Workspace settings → Webhooks**.
2. Click **Add webhook**.
3. Fill in the form:
   * **Title**: `Spike`
   * **URL**: the webhook URL you copied in Step 1
   * **Status**: leave **Active** ticked
   * **SSL / TLS**: leave certificate validation enabled
4. Under **Triggers**, choose **Choose from a full list of triggers**, and in the **Repository** section tick:
   * **Build status created**
   * **Build status updated**
5. Click **Save**.

Every repository in the workspace now reports to this one integration, and Spike still opens a separate incident per repository and branch.
{% endtab %}
{% endtabs %}

{% hint style="warning" %}
Do not point both a workspace webhook and a repository webhook at the same Spike integration for the same repository. Bitbucket would deliver every build status twice. The incidents still group, so you would not be paged twice, but the incident timeline fills with duplicate events.
{% endhint %}

## Step 3 — Check it works

1. Push a commit to a branch whose pipeline you expect to fail, or temporarily add a step that exits non-zero.
2. When the run turns red, the incident shows up in Spike with the repository, branch and a link to the run.
3. Fix the branch and push again. The green run resolves that incident.

If nothing arrives, open the webhook in Bitbucket and click **View requests** to see the deliveries and the response Spike returned.

## Event payload structure

Bitbucket sends the event key in the `X-Event-Key` header and a JSON body. Abridged to the parts Spike reads:

```json
{
  "commit_status": {
    "name": "Pipeline #142 for main",
    "description": "Pipeline failed",
    "state": "FAILED",
    "url": "https://bitbucket.org/acme/checkout-api/pipelines/results/142",
    "refname": "main",
    "type": "build",
    "created_on": "2026-02-17T09:14:02.120Z",
    "updated_on": "2026-02-17T09:18:44.881Z",
    "commit": {
      "hash": "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678",
      "links": {
        "html": { "href": "https://bitbucket.org/acme/checkout-api/commits/a1b2c3d" }
      }
    }
  },
  "repository": {
    "full_name": "acme/checkout-api",
    "links": {
      "html": { "href": "https://bitbucket.org/acme/checkout-api" }
    }
  },
  "actor": {
    "display_name": "Jane Doe"
  }
}
```

**Key fields:**

* `commit_status.state` — `FAILED`, `SUCCESSFUL`, `INPROGRESS` or `STOPPED`. This is what decides whether Spike opens, resolves or drops
* `commit_status.name` — the pipeline and run number, used in the incident
* `commit_status.url` — link to the pipeline run
* `commit_status.refname` — the branch, used for grouping
* `commit_status.commit.hash` — the commit that was built
* `repository.full_name` — workspace and repository, used for grouping
* `actor.display_name` — who pushed the commit that started the run

Fields Bitbucket leaves out are simply left off the incident.

{% hint style="info" %}
Anything that posts a build status to Bitbucket uses this same event, not only Pipelines. If you also run an external CI or a code coverage app that reports build statuses on your commits, their failures reach Spike too. Filter them out with [alert rules](../alerts/alert-rules.md) if you do not want to be paged for them.
{% endhint %}

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Open the webhook in Bitbucket and click **View requests**. Bitbucket shows every delivery it attempted along with the response.

* No requests at all means the triggers are wrong. Re-open the webhook and confirm **Build status created** and **Build status updated** are both ticked under **Repository**.
* Requests with a non-2xx response mean the URL is wrong. It must be the full `https://hooks.spike.sh/<your-token>/push-events` URL from the integration, with nothing trimmed off the end.
* Requests that all carry states of `INPROGRESS` mean your runs are not finishing. Spike only acts once a run reports `FAILED` or `SUCCESSFUL`.

</details>

<details>

<summary>Incidents open but never resolve</summary>

A `SUCCESSFUL` build status resolves the incident only when it is for the same repository, branch and pipeline. A run on a different branch does not close another branch's incident, which is deliberate: `main` staying red is not fixed by a green feature branch.

If someone already resolved the incident by hand in Spike, the later success has nothing to close and is dropped.

</details>

<details>

<summary>Every failing run opens a new incident</summary>

Grouping needs the branch, which Bitbucket sends as `commit_status.refname`. Runs started in a way that carries no branch, such as a run against a tag, cannot group with the branch's incidents. Check **View requests** in Bitbucket and look at `refname` on the deliveries that opened the extra incidents.

</details>

<details>

<summary>Incidents from repositories I do not care about</summary>

A workspace webhook fires for every repository in the workspace. Either drop it and add repository level webhooks only where you want them, or keep it and suppress the noisy repositories with [alert rules](../alerts/alert-rules.md).

</details>

<details>

<summary>Someone shared the webhook URL</summary>

The webhook URL is the only credential on this integration, so treat it as a secret. If it leaks, archive the integration in Spike and create a new one, then update the URL in Bitbucket.

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

</details>
