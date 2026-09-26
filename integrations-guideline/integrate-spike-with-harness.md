---
description: >-
  Send Harness pipeline, stage and step failures to Spike so on-call is paged on phone, SMS, Slack or Teams, and incidents resolve when the next run of the same pipeline succeeds.
---

# Integrate Spike with Harness

[Harness](https://www.harness.io) runs your CI and CD pipelines, and every pipeline can carry notification rules that fire on the events you pick. One of the notification methods is a plain webhook, so a Harness pipeline can POST straight to a Spike integration URL. A failed pipeline, stage or step opens an incident that escalates through your on-call policy, and the next successful run of the same pipeline closes it.

Nothing is installed anywhere. You add a notification rule to the pipeline in Harness, point its webhook at the Spike integration URL, and the two stay in sync from there.

## What Spike does with each event

Harness sends the event type as `eventData.eventType`. Spike reacts to it:

| `eventType` | What happens in Spike |
| --- | --- |
| `PipelineFailed` | Opens an incident for that pipeline, or adds an event to the one already open |
| `StageFailed` | Opens an incident for that pipeline, or adds an event to the one already open |
| `StepFailed` | Opens an incident for that pipeline, or adds an event to the one already open |
| `PipelineSuccess` | Auto-resolves the open incident. Dropped when nothing is open |
| `PipelineStart`, `PipelineEnd` | Skipped. Spike answers 200 with a skip reason and creates no event |
| `PipelinePaused`, `PipelineResumed` | Skipped. Spike answers 200 with a skip reason and creates no event |
| `WaitingForUserAction` | Skipped. Spike answers 200 with a skip reason and creates no event |

The skipped events are the ones that say a run is moving along rather than that something is wrong. A pipeline sitting on a manual approval gate is not an outage, and a run that has just started has not failed yet, so neither one should wake anybody. They are skipped in Spike rather than left to you to filter, which means you can leave every event ticked in the Harness notification rule and still only be paged for failures.

{% hint style="info" %}
[Alert rules](../alerts/alert-rules.md) work on this integration like any other. Use them to set severity per project or pipeline, route a pipeline to a different escalation policy, or suppress the pipelines you do not want to be paged for. Alerts are suppressed for repeat failures while the incident is open.
{% endhint %}

## One incident per pipeline

Spike identifies the incident by the pipeline itself — `orgIdentifier`, `projectIdentifier` and `pipelineIdentifier` together. It deliberately does not use `planExecutionId`, which is the id of a single run and changes every time the pipeline runs.

That is what makes auto-resolve work. The `PipelineFailed` event and the `PipelineSuccess` event that fixes it come from two different runs and carry two different `planExecutionId` values, but they carry the same org, project and pipeline identifiers, so the success lands on the incident the failure opened and resolves it.

It also decides what groups and what does not:

* The same pipeline failing again while its incident is open adds an event to that incident instead of paging the team a second time.
* Two pipelines in the same project failing at the same time are two incidents. `pipelineIdentifier` is part of the identity, so `checkout_deploy` going red does not get mixed up with `checkout_build`.
* The same pipeline identifier in two Harness projects, or in two orgs, is two incidents.
* A `StageFailed` or `StepFailed` arriving during a run whose pipeline has already failed joins the same incident. You get one incident for the run, with the stage and step detail on its timeline.

## Incident titles

Titles stay the same across repeats, which is what makes them readable when Spike reads one out on a phone call:

```
Pipeline Checkout Deploy failed in checkout
```

That is `Pipeline {pipelineName} failed in {projectIdentifier}`. Everything else stays on the incident page rather than in the title:

* The error message Harness reported, such as `Deployment step failed: image pull backoff`
* A link straight to the failing execution, from `executionUrl`
* A link to the pipeline, from `pipelineUrl`
* The org, project and pipeline identifiers
* Who or what triggered the run, from `triggeredBy` — the trigger type, name and email
* Start and end time of the run, and the node status Harness reported

Use a [Title Remapper](../alerts/title-remapper.md) if you would rather have the org or the error message in the title:

```handlebars
{{eventData.orgIdentifier}}/{{eventData.projectIdentifier}} — {{eventData.pipelineName}} failed
```

## Severity

Harness does not send a severity on a notification, so Spike does not set one. Set severity on a Harness incident with [alert rules](../alerts/alert-rules.md) — a production deploy pipeline can page as SEV1 while a nightly build pipeline stays lower. The same rules route the incident to another escalation policy or suppress it entirely. Read more about [priority and severity](../incidents/priority-and-severity.md).

## Prerequisites

* A Harness account with permission to edit the pipeline you want to be paged for
* A Harness integration in Spike and its webhook URL

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Harness**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Add the notification rule in Harness

{% tabs %}
{% tab title="Setup on Harness" %}
1. **Open the pipeline:**
   In Harness, go to the project that owns the pipeline, open the pipeline, and select the **Notify** tab in the pipeline studio.

2. **Add a notification rule:**
   Click **Notify** (or **+ Notification**) and give the rule a name such as `Spike`.

3. **Choose the events:**
   Tick the events this rule should fire on. At a minimum tick the ones Spike acts on:
   * **Pipeline Failed**
   * **Stage Failed** — Harness then asks which stages it applies to; pick the ones you want to be paged for, or all of them
   * **Step Failed**
   * **Pipeline Success** — this is the one that resolves the incident, so do not leave it out

   You can also tick **Pipeline Start**, **Pipeline End**, the pause and resume events and **Pipeline is waiting for user action** if you want one rule that covers everything. Spike skips those and creates no incident for them.

4. **Pick the webhook method:**
   On the notification method step, choose **Webhook**, and paste the Spike webhook URL from Step 1 into the **Webhook URL** field. Leave the optional headers empty — Spike needs none.

5. **Save:**
   Click **Finish** (or **Submit**), then save the pipeline. In Harness, notification rules live on the pipeline, so they only take effect once the pipeline itself is saved.
{% endtab %}
{% endtabs %}

{% hint style="info" %}
A notification rule belongs to one pipeline. Repeat the steps above on every pipeline you want in Spike, pasting the same webhook URL each time — Spike still opens a separate incident per pipeline. Pipelines that should page a different team get their own Spike integration and their own webhook URL.
{% endhint %}

{% hint style="warning" %}
Do not add two notification rules on the same pipeline pointing at the same Spike integration. Harness would deliver every event twice. The incidents still group, so you would not be paged twice, but the incident timeline fills with duplicate events.
{% endhint %}

## Step 3 — Check it works

1. Run a pipeline you expect to fail, or temporarily add a step that exits non-zero.
2. When the run goes red, the incident shows up in Spike with the pipeline name, the error message and a link to the execution.
3. Fix the pipeline and run it again. The successful run resolves that incident.

If the failure never arrives, check the execution in Harness — the notification attempt is recorded on the run, and a rule that never fired usually means the event was not ticked or the pipeline was not saved after the rule was added.

## Payload reference

Harness POSTs `application/json` with everything inside an `eventData` object. A `PipelineFailed` looks like this:

```json
{
  "eventData": {
    "accountIdentifier": "acc-8f3c2a1d",
    "orgIdentifier": "acme",
    "projectIdentifier": "checkout",
    "pipelineIdentifier": "checkout_deploy",
    "pipelineName": "Checkout Deploy",
    "planExecutionId": "exec-9c1d4b2f",
    "executionUrl": "https://app.harness.io/executions/9c1d4b2f",
    "pipelineUrl": "https://app.harness.io/pipelines/checkout_deploy",
    "eventType": "PipelineFailed",
    "nodeStatus": "Failed",
    "errorMessage": "Deployment step failed: image pull backoff",
    "triggeredBy": {
      "triggerType": "MANUAL",
      "name": "priya",
      "email": "priya@acme.com"
    },
    "startTime": "2026-09-24T09:15:00Z",
    "endTime": "2026-09-24T09:18:00Z"
  }
}
```

The `PipelineSuccess` that resolves it is the same shape, from a later run. Note that `planExecutionId` differs and the identifiers do not — that is what lets Spike match the two:

```json
{
  "eventData": {
    "accountIdentifier": "acc-8f3c2a1d",
    "orgIdentifier": "acme",
    "projectIdentifier": "checkout",
    "pipelineIdentifier": "checkout_deploy",
    "pipelineName": "Checkout Deploy",
    "planExecutionId": "exec-1a2b3c4d",
    "executionUrl": "https://app.harness.io/executions/1a2b3c4d",
    "pipelineUrl": "https://app.harness.io/pipelines/checkout_deploy",
    "eventType": "PipelineSuccess",
    "nodeStatus": "Success",
    "errorMessage": "",
    "startTime": "2026-09-24T09:40:00Z",
    "endTime": "2026-09-24T09:44:00Z"
  }
}
```

**Key fields:**

* `eventData.eventType` — decides whether Spike opens, resolves or skips
* `eventData.orgIdentifier`, `eventData.projectIdentifier`, `eventData.pipelineIdentifier` — together, the identity of the incident
* `eventData.pipelineName` and `eventData.projectIdentifier` — the incident title
* `eventData.errorMessage` — what Harness reported as the reason, shown on the incident
* `eventData.executionUrl` and `eventData.pipelineUrl` — links on the incident
* `eventData.triggeredBy` — who or what started the run
* `eventData.planExecutionId` — the id of this one run. Kept on the incident for reference, never used for grouping

Fields Harness leaves out are simply left off the incident.

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Open the pipeline in Harness and check the **Notify** tab is still there with the rule enabled, then open a failed execution and look at whether the notification fired.

* A rule that was added but never fired usually means the pipeline was not saved after the rule was created, or the event that happened was not one of the ticked events.
* A delivery with a non-2xx response means the URL is wrong. It must be the full `https://hooks.spike.sh/<your-token>/push-events` URL from the integration, with nothing trimmed off the end.
* A rule on a pipeline template does not apply to pipelines created from it before the rule was added. Check the rule is on the pipeline that actually ran.

</details>

<details>

<summary>Incidents open but never resolve</summary>

Spike resolves on `PipelineSuccess`, so the rule has to have **Pipeline Success** ticked as well as the failure events. A rule that only sends failures opens incidents that nobody ever closes automatically.

The success also has to be for the same org, project and pipeline. A different pipeline going green does not resolve another pipeline's incident, which is deliberate — a passing build pipeline does not mean the deploy pipeline is fixed.

If someone already resolved the incident by hand in Spike, the later success has nothing to close and is dropped.

</details>

<details>

<summary>Every failing run opens a new incident</summary>

It should not — grouping is on the org, project and pipeline identifiers, which do not change between runs. If you are seeing one incident per run, check that the extra incidents really are the same pipeline and not a second pipeline with a similar name, and that the previous incident was still open when the next failure arrived. A failure that lands after its incident is resolved opens a fresh one, which is the intended behaviour.

</details>

<details>

<summary>A pipeline that only paused is paging the team</summary>

It should not be. `PipelineStart`, `PipelineEnd`, pause, resume and waiting-for-user-action events are skipped by Spike and create nothing. If something that is not a failure is opening incidents, look at the incident's payload to see which `eventType` Harness actually sent — a step that a pipeline treats as failed on a timeout arrives as `StepFailed`, which is a real failure as far as Spike is concerned. Suppress it with [alert rules](../alerts/alert-rules.md) if that pipeline should not page anyone.

</details>

<details>

<summary>Too many incidents from one project</summary>

Every pipeline with the rule on it reports independently, and that is on purpose. Either take the rule off the pipelines you do not want to hear about, or keep it and suppress those pipelines with [alert rules](../alerts/alert-rules.md) on `eventData.pipelineIdentifier`.

</details>

<details>

<summary>Someone shared the webhook URL</summary>

The webhook URL is the only credential on this integration, so treat it as a secret. If it leaks, archive the integration in Spike and create a new one, then update the URL in every Harness notification rule that used it.

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

</details>
