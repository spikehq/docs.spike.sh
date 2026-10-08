---
description: "Connect Harness to Spike for real-time alerts on failed pipelines, stages and steps, with auto-resolution when the pipeline succeeds."
---
# Integrate Spike with Harness
## Overview

[Harness](https://www.harness.io/) is a software delivery platform for CI/CD. Its pipeline notification rules can send a webhook whenever a pipeline, stage or step changes state.

With Spike's integration, you can receive real-time alerts for:

* **Pipeline Failures**: A pipeline execution fails.
* **Stage and Step Failures**: A stage or step inside a pipeline fails.
* **Trigger Failures**: A trigger fails to start a pipeline.
* **Recovery**: The pipeline succeeds again, and the incident resolves on its own.

{% hint style="info" %}
Spike will automatically group repeated incidents and also suppress alerts while incident is open. You can set up [alert rules](https://docs.spike.sh/alerts/alert-rules) to determine incident severity and take actions accordingly. Incidents are grouped per pipeline (organization, project and pipeline identifier).
{% endhint %}

## Set up instructions

**Step 1:** Create a Harness integration in the Spike dashboard and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

**Step 2:**

{% tabs %}
{% tab title="Setup on Harness" %}

**Prerequisites:**
* A Harness account with permission to edit the pipeline's notification rules

**Steps:**

1. Open the pipeline in **Pipeline Studio** and click **Notify** in the right-hand side panel.
2. Click **+ New Notification Rule**.
3. Enter a **Notification Name** (for example `Spike`) and click **Next**.
4. Under **Pipeline Events**, select the events to send:
   * **Pipeline Failed**
   * **Pipeline Success** (needed for auto-resolution)
   * **Stage Failed**
   * **Stage Success** (resolves a Stage Failed incident for the same stage)
   * **Step Failed**
   * **Trigger Failed** (optional)

   Pipeline Failed and Pipeline Success are the minimum. The Stage, Step and Trigger events are optional.

   Do not select **Pipeline Start**, **Stage Start** or **Pipeline End**. Spike never opens or resolves an incident from them.
5. Click **Next**. Under **Notification Method**, select **Webhook**.
6. Enter a **Webhook Name** and paste the Spike webhook URL copied in Step 1 into **Webhook URL**.
7. Click **Test** to send a sample notification, then click **Finish**.
8. Make sure the rule is switched on in the notification list, then click **Apply Changes** and **Save**.

**Required fields:**
* `eventData.eventType` - which event happened. A missing or unknown value is treated as a failure.
* `eventData.pipelineIdentifier` - ties a failure to its recovery. Without it Spike falls back to matching by title, so recovery by pipeline needs this field.

Optional fields that sharpen the incident: `orgIdentifier`, `projectIdentifier`, `pipelineName`, `stageName`, `stageIdentifier`, `stepName`, `triggerName` and `errorMessage`.

{% hint style="warning" %}
Do not use a custom notification template. Spike reads the standard `eventData` body shown below. A custom template may drop the wrapper, and then Spike cannot match a recovery to its failure by pipeline.
{% endhint %}

**Test the Integration:**
* Run a pipeline that you expect to fail and verify the incident appears in Spike
* Run it again successfully and verify the incident resolves

{% endtab %}
{% endtabs %}

## Event payload structure

Harness sends the notification as a JSON body wrapped in `eventData`. Failure example:

```json
{
  "eventData": {
    "accountIdentifier": "Xk3mP9qRT2a8vLwYc1nB7g",
    "orgIdentifier": "default",
    "projectIdentifier": "payments",
    "pipelineIdentifier": "deploy_payments_api",
    "pipelineName": "deploy-payments-api",
    "planExecutionId": "PyPIvqsDRBWdWPIhcvvqSw",
    "executionUrl": "https://app.harness.io/ng/#/account/Xk3mP9qRT2a8vLwYc1nB7g/cd/orgs/default/projects/payments/pipelines/deploy_payments_api/executions/PyPIvqsDRBWdWPIhcvvqSw/pipeline",
    "pipelineUrl": "https://app.harness.io/ng/#/account/Xk3mP9qRT2a8vLwYc1nB7g/cd/orgs/default/projects/payments/pipelines/deploy_payments_api/pipeline-studio",
    "eventType": "PipelineFailed",
    "nodeStatus": "failed",
    "triggeredBy": {
      "triggerType": "MANUAL",
      "name": "Priya Natarajan",
      "email": "priya@acme.io"
    },
    "moduleInfo": {},
    "startTime": "Wed Oct 07 08:25:04 GMT 2026",
    "startTs": 1791361504,
    "endTime": "Wed Oct 07 08:25:18 GMT 2026",
    "errorMessage": "Shell Script execution failed. Please check execution logs.",
    "endTs": 1791361518
  }
}
```

Recovery example:

```json
{
  "eventData": {
    "accountIdentifier": "Xk3mP9qRT2a8vLwYc1nB7g",
    "orgIdentifier": "default",
    "projectIdentifier": "payments",
    "pipelineIdentifier": "deploy_payments_api",
    "pipelineName": "deploy-payments-api",
    "planExecutionId": "bW4tR7yKQe2Lr0x9JcF3sA",
    "executionUrl": "https://app.harness.io/ng/#/account/Xk3mP9qRT2a8vLwYc1nB7g/cd/orgs/default/projects/payments/pipelines/deploy_payments_api/executions/bW4tR7yKQe2Lr0x9JcF3sA/pipeline",
    "pipelineUrl": "https://app.harness.io/ng/#/account/Xk3mP9qRT2a8vLwYc1nB7g/cd/orgs/default/projects/payments/pipelines/deploy_payments_api/pipeline-studio",
    "eventType": "PipelineSuccess",
    "nodeStatus": "completed",
    "triggeredBy": {
      "triggerType": "MANUAL",
      "name": "Priya Natarajan",
      "email": "priya@acme.io"
    },
    "moduleInfo": {},
    "startTime": "Wed Oct 07 09:02:10 GMT 2026",
    "startTs": 1791363730,
    "endTime": "Wed Oct 07 09:02:41 GMT 2026",
    "endTs": 1791363761
  }
}
```

**Key Fields:**
* `eventData.eventType` - `PipelineFailed`, `StageFailed`, `StepFailed` and `TriggerFailed` open or join an incident. `PipelineSuccess` resolves the open incident of the same pipeline. `StageSuccess` resolves a `StageFailed` incident for the same stage
* `eventData.pipelineIdentifier` - Stable pipeline id used to group and resolve incidents
* `eventData.orgIdentifier` and `eventData.projectIdentifier` - Scope the pipeline id to its organization and project
* `eventData.pipelineName` - Pipeline name shown in the incident title
* `eventData.stageName` and `eventData.stageIdentifier` - Stage shown in the title, and the stage a `StageSuccess` resolves
* `eventData.stepName` - Step shown in the title for `StepFailed`
* `eventData.triggerName` - Trigger shown in the title for `TriggerFailed`
* `eventData.errorMessage` - Harness's own description of the failure, used as the incident title

{% hint style="success" %}
This integration supports auto-resolution. When the pipeline succeeds, the open incident for that pipeline is resolved automatically.
{% endhint %}
