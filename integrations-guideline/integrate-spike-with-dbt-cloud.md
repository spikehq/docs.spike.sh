---
description: >-
   Integrate Spike with dbt Cloud to get alerted by Phone calls, SMS, Slack, MS Teams, and more when a dbt job run errors, and auto-resolve the incident when the job succeeds again.
---

# How Spike Integrates with dbt Cloud

## Overview
[dbt Cloud](https://www.getdbt.com/product/dbt-cloud) is the hosted platform for running dbt projects. Scheduled and triggered jobs build your data models, run tests and refresh your warehouse.

With Spike’s dbt Cloud integration, a job run that errors creates an incident, and the incident resolves itself when the same job next succeeds.

## How it works
Spike reads the `eventType` of each dbt Cloud webhook, together with `data.runStatus` (or `data.runStatusCode`):

* `job.run.errored` creates an incident.
* `job.run.completed` with `data.runStatus` of `Errored` (or `data.runStatusCode` of `20`) creates an incident. dbt Cloud sends both events for one failure, so the second one joins the incident that is already open.
* `job.run.completed` with `data.runStatus` of `Success` (or `data.runStatusCode` of `10`) resolves the open incident for the same job.
* `job.run.started` never creates or resolves an incident.
* A delivery that carries none of `eventType`, `data.runStatus` and `data.runStatusCode` (for example a test delivery) still creates an incident, so nothing is dropped silently.

Spike identifies the incident by `data.jobId`, the dbt Cloud job. It stays the same from run to run, so repeated failures of one job group into one incident and a later success resolves it. When `accountId` is present it must match as well, so two dbt Cloud accounts posting to one Spike integration never collide. If `data.jobId` is missing, Spike falls back to `data.jobName` plus `data.environmentName`.

The incident title is built from the job, project and environment, for example `dbt Cloud job Nightly production build (dbt build) errored in Analytics / Production`. If dbt Cloud sends its own message in `data.runStatusMessage`, that sentence leads the title instead.

{% hint style="success" %}
Auto-resolution is supported for this integration. Spike will also automatically group repeated incidents and suppress alerts while an incident is open.
{% endhint %}

## Set up instructions

**Step 1:** Create a dbt Cloud integration in the Spike dashboard and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

**Step 2:** Create the webhook in dbt Cloud.

{% tabs %}
{% tab title="Setup on dbt Cloud" %}
1. Log in to dbt Cloud and open **Account settings**.
2. In the left menu, click **Webhooks**, then **Create webhook**.
3. Enter a **Webhook name** (for example `Spike on-call`) and, if you like, a **Description**.
4. Under **Events**, select **Run completed (any status)** and **Run completed (errored)**. Optionally add **Run started**; Spike ignores it.
5. Under **Jobs**, choose **All jobs** or select the specific jobs you want Spike to page on.
6. Paste the Spike webhook URL into the **Endpoint** field.
7. Click **Save**.

The **Webhook name**, **Events**, **Jobs** and **Endpoint** fields are required. dbt Cloud shows a secret key for the webhook after saving; Spike does not use it, because the token in the webhook URL is the credential.

Select **Run completed (any status)** as well as **Run completed (errored)**. The success delivery that resolves the incident is a `job.run.completed` event, so without it incidents never auto-resolve.
{% endtab %}
{% endtabs %}

## Example payloads

dbt Cloud sends the following when a job run errors:

```json
{
  "accountId": 43786,
  "webhookId": "wsu_2nQx8YbKfJ4tL0",
  "eventId": "wev_2pV7cZ1kYw3RmA9sQe5TnB0xHdL",
  "timestamp": "2026-10-09T03:12:48.519204331Z",
  "eventType": "job.run.errored",
  "webhookName": "Spike on-call",
  "data": {
    "jobId": "512049",
    "jobName": "Nightly production build (dbt build)",
    "runId": "318274655",
    "environmentId": "218762",
    "environmentName": "Production",
    "dbtVersion": "1.9.0",
    "projectName": "Analytics",
    "projectId": "301284",
    "runStatus": "Errored",
    "runStatusCode": 20,
    "runStatusMessage": "None",
    "runReason": "Kicked off by the scheduler",
    "runStartedAt": "2026-10-09T03:00:04Z",
    "runErroredAt": "2026-10-09T03:12:47Z"
  }
}
```

When the same job next succeeds, dbt Cloud sends the following, and Spike resolves the incident:

```json
{
  "accountId": 43786,
  "webhookId": "wsu_2nQx8YbKfJ4tL0",
  "eventId": "wev_2pVJ4mQ8sTb6XcE1oFr7WkN2yGa",
  "timestamp": "2026-10-09T05:24:19.074615902Z",
  "eventType": "job.run.completed",
  "webhookName": "Spike on-call",
  "data": {
    "jobId": "512049",
    "jobName": "Nightly production build (dbt build)",
    "runId": "318281102",
    "environmentId": "218762",
    "environmentName": "Production",
    "dbtVersion": "1.9.0",
    "projectName": "Analytics",
    "projectId": "301284",
    "runStatus": "Success",
    "runStatusCode": 10,
    "runStatusMessage": "None",
    "runReason": "Kicked off from the UI by data-oncall@acme.com",
    "runStartedAt": "2026-10-09T05:10:02Z",
    "runFinishedAt": "2026-10-09T05:24:15Z"
  }
}
```

The fields Spike reads are `eventType`, `accountId`, `data.jobId`, `data.jobName`, `data.projectName`, `data.environmentName`, `data.runStatus`, `data.runStatusCode` and `data.runStatusMessage`. Every other field is kept on the incident.

## Test the integration
1. Run a dbt Cloud job that fails (for example, a job with a model that does not compile).
2. Confirm dbt Cloud sends the webhook and verify a new incident is created in Spike.
3. Fix the problem and run the same job again so that it succeeds.
4. Confirm Spike auto-resolves the incident for that job.

{% hint style="info" %}
The **Test Endpoint** button in dbt Cloud sends a sample delivery that carries no run status. Spike opens an incident for it rather than dropping it; resolve it manually.
{% endhint %}

Disclaimer: These integration instructions are offered independently by Spike.sh, and Spike.sh is not affiliated with nor a partner of dbt Labs, Inc.
