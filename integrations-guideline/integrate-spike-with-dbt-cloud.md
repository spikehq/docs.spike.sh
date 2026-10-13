---
description: >-
   Integrate Spike with dbt Cloud to get alerted by Phone calls, SMS, Slack, MS Teams, and more when a dbt job run errors, and auto-resolve the incident when the job succeeds again.
---

# How Spike Integrates with dbt Cloud

## Overview
[dbt Cloud](https://www.getdbt.com/product/dbt-cloud) is the hosted platform for running dbt projects. Scheduled and triggered jobs build your data models, run tests and refresh your warehouse.

With Spike’s dbt Cloud integration, a job run that errors creates an incident, and the incident resolves itself when the same job next succeeds.

## How it works
Spike reads `eventType`, `data.runStatusCode` and `data.runStatus` of each dbt Cloud webhook:

| Event | What Spike does |
| --- | --- |
| `job.run.errored` | Creates an incident, or joins the open incident for the same job |
| `job.run.completed` with `data.runStatusCode` `20` (or `data.runStatus` `Errored` / `Error`) | Creates an incident, or joins the open incident for the same job |
| `job.run.completed` with `data.runStatusCode` `10` (or `data.runStatus` `Success`) | Resolves the open incident for the same job; never creates one |
| `job.run.started`, or any other status code | Ignored: never creates or resolves an incident |

* `data.runStatusCode` can arrive as a number or a numeric string. Only when it is missing or not a number does Spike fall back to `data.runStatus`.
* `eventType` is compared exactly after trimming spaces.
* If you subscribe to both **Run errored** and **Run completed**, a failed run may send two webhooks; the second joins the incident that is already open.

Spike identifies the incident by `data.jobId`, the dbt Cloud job. It stays the same from run to run, so every failed run of a job groups into one incident and the job's next successful run resolves it. If `data.jobId` is missing, a failure is matched to an open incident by its title instead, and a success cannot resolve anything.

### Incident title
* Failure, when `data.runStatusMessage` holds a real sentence (not empty and not `None`): the first line of the sentence, then the job and environment, as `{data.runStatusMessage} — {data.jobName} in {data.environmentName}`. dbt Cloud sends `None` in its documented examples, so you will normally see the next form.
* Failure otherwise: `dbt job Nightly build (dbt build) failed in Production (Analytics Warehouse)`. A missing part is dropped with its connector words. With no job name, `data.jobId` is used: `dbt job 184562 failed in Production`.
* Success: `dbt job Nightly build (dbt build) recovered in Production (Analytics Warehouse)`.
* With nothing usable the title is `dbt Cloud alert with no details`.

Titles never contain run ids, links, timestamps or the run reason, and are cut at 200 characters.

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
4. Under **Events**, select **Run errored** and **Run completed**. Optionally add **Run started**; Spike ignores it.
5. Under **Jobs**, select the specific jobs you want Spike to page on, or leave it empty to cover all jobs.
6. Paste the Spike webhook URL into the **Endpoint** field.
7. Click **Save**.

The **Webhook name**, **Events** and **Endpoint** fields are required. Spike needs `eventType`, `data.jobId` and `data.runStatusCode` on every delivery; dbt Cloud includes all three. dbt Cloud shows a secret key for the webhook after saving; Spike does not use it, because the token in the webhook URL is the credential.

**Run errored** opens the incident and **Run completed** resolves it when the job next succeeds. Without **Run completed**, incidents never auto-resolve.
{% endtab %}
{% endtabs %}

## Example payloads

dbt Cloud sends the following when a job run errors:

```json
{
  "accountId": 43127,
  "webhookId": "wsu_2Lq8Hk4nV0bXcR7tYpW1mZ9aE3s",
  "eventId": "wev_2Q7mXb9Kc4TzVnR1sLp8YdHf6Ga",
  "timestamp": "2026-10-13T06:15:20.419714619Z",
  "eventType": "job.run.errored",
  "webhookName": "Spike - production failures",
  "data": {
    "jobId": "184562",
    "jobName": "Nightly build (dbt build)",
    "runId": "297431058",
    "environmentId": "92311",
    "environmentName": "Production",
    "dbtVersion": "1.8.0",
    "projectName": "Analytics Warehouse",
    "projectId": "167194",
    "runStatus": "Errored",
    "runStatusCode": 20,
    "runStatusMessage": "None",
    "runReason": "Kicked off by schedule",
    "runStartedAt": "2026-10-13T06:00:04Z",
    "runErroredAt": "2026-10-13T06:15:20Z"
  }
}
```

When the same job next succeeds, dbt Cloud sends the following, and Spike resolves the incident:

```json
{
  "accountId": 43127,
  "webhookId": "wsu_2Lq8Hk4nV0bXcR7tYpW1mZ9aE3s",
  "eventId": "wev_2Q9rTa3Nd8WuKmB5vHq2ZeJc7Lx",
  "timestamp": "2026-10-14T06:12:41.789265936Z",
  "eventType": "job.run.completed",
  "webhookName": "Spike - production failures",
  "data": {
    "jobId": "184562",
    "jobName": "Nightly build (dbt build)",
    "runId": "297688214",
    "environmentId": "92311",
    "environmentName": "Production",
    "dbtVersion": "1.8.0",
    "projectName": "Analytics Warehouse",
    "projectId": "167194",
    "runStatus": "Success",
    "runStatusCode": 10,
    "runStatusMessage": "None",
    "runReason": "Kicked off by schedule",
    "runStartedAt": "2026-10-14T06:00:03Z",
    "runFinishedAt": "2026-10-14T06:12:38Z"
  }
}
```

The fields Spike reads are `eventType`, `data.jobId`, `data.jobName`, `data.projectName`, `data.environmentName`, `data.runStatus`, `data.runStatusCode` and `data.runStatusMessage`. Every other field is kept on the incident.

## Test the integration
1. Run a dbt Cloud job that fails (for example, a job with a model that does not compile).
2. Confirm dbt Cloud sends the webhook and verify a new incident is created in Spike.
3. Fix the problem and run the same job again so that it succeeds.
4. Confirm Spike auto-resolves the incident for that job.

Disclaimer: These integration instructions are offered independently by Spike.sh, and Spike.sh is not affiliated with nor a partner of dbt Labs, Inc.
