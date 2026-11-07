---
description: >-
  Send GitLab CI/CD pipeline, job and deployment failures to Spike so on-call is paged, and have the incident resolve when the same pipeline, job or deployment succeeds again.
---

# Integrate Spike with GitLab CI/CD

[GitLab CI/CD](https://docs.gitlab.com/ci/) sends a webhook every time the status of a pipeline, a job or a deployment changes. Spike listens to those webhooks, so a failed pipeline opens an incident that escalates through your on-call policy, later failures of the same pipeline join it, and the next successful run closes it.

Set it up for a single project, or, on GitLab Premium and Ultimate, once for a whole group.

## What Spike reads

GitLab names the event type in the `X-Gitlab-Event` header and in the body's `object_kind`. Spike reads three of them:

| GitLab trigger | `X-Gitlab-Event` | `object_kind` | One incident per |
| --- | --- | --- | --- |
| Pipeline events | `Pipeline Hook` | `pipeline` | project and branch (or tag) |
| Job events | `Job Hook` | `build` | project, branch and job name |
| Deployment events | `Deployment Hook` | `deployment` | project and environment |

The pipeline id, the commit and the user are not part of that identity: a fix is a different commit from the breakage, and every push starts a new pipeline.

## What Spike does with each status

| Status GitLab sends | What happens in Spike |
| --- | --- |
| `failed` | Opens an incident, or adds an event to the one already open for the same pipeline, job or deployment |
| `success` | Auto-resolves the open incident for the same pipeline, job or deployment. Dropped when nothing is open |
| any other status (`created`, `pending`, `running`, `canceled`, `skipped`, `manual`, `scheduled`, a deployment's `blocked`, an approval's `approved` or `rejected`, and the rest) | Never opens or resolves an incident. Added as an event when one is open, dropped otherwise |

A job that fails with **allow failure** set (`build_allow_failure: true` on a job event) does not open an incident, because GitLab does not count it against the pipeline. In a pipeline event, jobs allowed to fail are left out of the title.

A success only resolves the incident of the very same thing: a green pipeline on another branch, in another project of the group, for another job, or of another kind (a job going green while a pipeline incident is open) resolves nothing.

Other GitLab events left ticked on the same webhook, such as push or merge request events, never open an incident.

GitLab sends no severity or priority on these events, and has no acknowledge event. Use [alert rules](../alerts/alert-rules.md) to set severity per project or branch.

## Incident titles

The title says what failed and where. For a pipeline it names the failed job, its stage and GitLab's failure reason, read from the pipeline's `builds` and `bridges` (trigger jobs):

```
Pipeline failed on main in acme/shop/checkout-api: job rspec failed in stage test (script failure)
Pipeline failed on release/2.4 in acme/shop/checkout-api: jobs rspec, jest and 1 more failed
Job rspec failed on main in acme/shop/checkout-api (stage test, script failure)
Deployment to production failed in acme/shop/checkout-api
```

Titles are capped at 200 characters.

## Prerequisites

* The **Maintainer** or **Owner** role on the GitLab project, or the **Owner** role on the group for a group webhook
* A GitLab CI/CD integration in Spike and its webhook URL

## Step 1: Create the integration in Spike

In Spike, go to **Integrations → Add integration → GitLab CI/CD**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2: Add the webhook in GitLab

{% tabs %}
{% tab title="One project" %}
1. In GitLab, open the project.
2. In the left sidebar, select **Settings > Webhooks**.
3. Select **Add new webhook**.
4. In **URL**, enter the webhook URL you copied in Step 1.
5. Leave **Secret token** empty. Spike does not check it: the token in the webhook URL is what identifies your integration.
6. In the **Trigger** section, select **Pipeline events**. Add **Deployment events** if you deploy to environments from GitLab.
7. Select **Add webhook**.
{% endtab %}

{% tab title="Whole group (Premium and Ultimate)" %}
A group webhook sends events for all projects in the group and its subgroups. Spike still opens a separate incident per project.

1. In GitLab, open the group.
2. In the left sidebar, select **Settings > Webhooks**.
3. Select **Add new webhook**.
4. In **URL**, enter the webhook URL you copied in Step 1.
5. Leave **Secret token** empty.
6. In the **Trigger** section, select **Pipeline events**. Add **Deployment events** if you deploy to environments from GitLab.
7. Select **Add webhook**.
{% endtab %}
{% endtabs %}

{% hint style="warning" %}
Tick **Job events** only if you want an incident per job. Pipeline events and job events are separate identities, so with both ticked one broken pipeline opens two incidents: one for the pipeline and one for the failed job.
{% endhint %}

## Step 3: Check it works

1. In GitLab, go to **Settings > Webhooks**, and from the **Test** dropdown of the Spike webhook select **Pipeline events**. This confirms GitLab can reach Spike. GitLab does not document which pipeline a test describes, and a test of a pipeline that did not fail opens no incident.
2. Push a commit to a branch whose pipeline you expect to fail. When the pipeline fails, the incident shows up in Spike.
3. Fix the branch and push again. The successful pipeline on the same branch resolves the incident.

If nothing arrives, select **Edit** on the webhook in GitLab and go to **Recent events** to see the requests GitLab made and the response Spike returned.

{% hint style="info" %}
GitLab disables a webhook that fails four times in a row. Sending a test request from the **Test** dropdown re-enables it once Spike answers.
{% endhint %}

## Event payload structure

A pipeline event, abridged to the parts Spike reads:

```json
{
  "object_kind": "pipeline",
  "object_attributes": {
    "ref": "main",
    "tag": false,
    "status": "failed"
  },
  "project": {
    "id": 5120,
    "path_with_namespace": "acme/shop/checkout-api"
  },
  "builds": [
    {
      "name": "rspec",
      "stage": "test",
      "status": "failed",
      "failure_reason": "script_failure",
      "allow_failure": false
    }
  ],
  "bridges": []
}
```

A job event carries the same facts at the top level: `build_status`, `build_name`, `build_stage`, `build_failure_reason`, `build_allow_failure`, `ref`, `project_id` and `project_name`. A deployment event carries `status`, `environment` and `project`.

GitLab documents every payload in [Webhook events](https://docs.gitlab.com/user/project/integrations/webhook_events/).
