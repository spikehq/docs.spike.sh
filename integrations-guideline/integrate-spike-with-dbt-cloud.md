---
description: >-
   Integrate Spike with dbt Cloud to get alerted by Phone calls, SMS, Slack, MS Teams, and more when a dbt job run errors, and auto-resolve the incident when the job succeeds again.
---

# How Spike Integrates with dbt Cloud

## Overview
[dbt Cloud](https://www.getdbt.com/product/dbt-cloud) is the hosted platform for running dbt projects. Scheduled and triggered jobs build your data models, run tests and refresh your warehouse.

With Spike’s dbt Cloud integration, a job run that errors creates an incident, and the incident resolves itself when the same job next succeeds.

## How it works
Spike reads `eventType` and `data.runStatusCode` of each dbt Cloud webhook:

| `data.runStatusCode` | Meaning | What Spike does |
| --- | --- | --- |
| `20` | Error | Creates an incident, or joins the open incident for the same job |
| `10` | Success | Resolves the open incident for the same job; never creates one |
| `1`, `2`, `3`, `30` | Queued, Starting, Running, Cancelled | Ignored: never creates or resolves an incident |

* `job.run.errored` always counts as a failure. dbt Cloud sends it in addition to `job.run.completed` for a failed run, so if you subscribe to both, the second webhook joins the incident that is already open.
* `job.run.started` never creates or resolves an incident.
* `data.runStatusCode` can arrive as a number or a numeric string. Only when it is missing or not a number does Spike fall back to `data.runStatus` (case-insensitive): `Errored` or `Error` opens, `Success` resolves, anything else is ignored.

Spike identifies the incident by `data.jobId`, the dbt Cloud job. It stays the same from run to run, so every failed run of a job groups into one incident and the job's next successful run resolves it. `0` is a valid job id. If `data.jobId` is missing, a failure is matched to an open incident by its title instead, and a success cannot resolve anything.

### Incident title
The title is built from the job, environment and project, and ignores `data.runStatusMessage`, run ids, links and timestamps:

* Failure: `dbt Cloud job Nightly prod build (dbt build) failed in Production (Analytics Warehouse)`. An empty project or environment part is dropped. With no job name it is `dbt Cloud run failed in Production`, and with nothing usable `dbt Cloud alert with no details`.
* Success: `dbt Cloud job Nightly prod build (dbt build) recovered in Production`.

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
4. Under **Events**, select **Run completed**. Optionally add **Run started**; Spike ignores it.
5. Under **Jobs**, select the specific jobs you want Spike to page on, or leave it empty to cover all jobs.
6. Paste the Spike webhook URL into the **Endpoint** field.
7. Click **Save**.

The **Webhook name**, **Events** and **Endpoint** fields are required. Spike needs `data.jobId` and `data.runStatusCode` on every delivery; dbt Cloud includes both. dbt Cloud shows a secret key for the webhook after saving; Spike does not use it, because the token in the webhook URL is the credential.

Select **Run completed** only. It fires for both failed and successful runs, so one event covers the failure that opens the incident and the success that resolves it. Also selecting **Run errored** is harmless but unnecessary: dbt Cloud then sends a second webhook for every failed run, and Spike joins it to the incident that is already open as a repeated event. Without **Run completed**, incidents never auto-resolve.
{% endtab %}
{% endtabs %}

## Example payloads

dbt Cloud sends the following when a job run fails:

```json
{
  "accountId": 43786,
  "webhookId": "wsu_2K8ZcQ1eWbFm7xvT",
  "eventId": "wev_2Xq7Nf3LhR9pD0aKsY4tB6uWcJm",
  "timestamp": "2026-10-13T03:12:48.502913245Z",
  "eventType": "job.run.completed",
  "webhookName": "Spike on-call",
  "data": {
    "jobId": "318204",
    "jobName": "Nightly prod build (dbt build)",
    "runId": "294771503",
    "environmentId": "201557",
    "environmentName": "Production",
    "dbtVersion": "1.9.4",
    "projectName": "Analytics Warehouse",
    "projectId": "170342",
    "runStatus": "Errored",
    "runStatusCode": 20,
    "runStatusMessage": "None",
    "runReason": "scheduled",
    "runStartedAt": "2026-10-13T03:00:04Z",
    "runErroredAt": "2026-10-13T03:12:41Z"
  }
}
```

When the same job next succeeds, dbt Cloud sends the following, and Spike resolves the incident:

```json
{
  "accountId": 43786,
  "webhookId": "wsu_2K8ZcQ1eWbFm7xvT",
  "eventId": "wev_2Xr0Bv8GmT2kQ5hNzE1pL7sYdUa",
  "timestamp": "2026-10-13T04:14:09.118406733Z",
  "eventType": "job.run.completed",
  "webhookName": "Spike on-call",
  "data": {
    "jobId": "318204",
    "jobName": "Nightly prod build (dbt build)",
    "runId": "294790118",
    "environmentId": "201557",
    "environmentName": "Production",
    "dbtVersion": "1.9.4",
    "projectName": "Analytics Warehouse",
    "projectId": "170342",
    "runStatus": "Success",
    "runStatusCode": 10,
    "runStatusMessage": "None",
    "runReason": "Kicked off from the UI by data-oncall@example.com",
    "runStartedAt": "2026-10-13T04:02:17Z",
    "runFinishedAt": "2026-10-13T04:14:02Z"
  }
}
```

The fields Spike reads are `eventType`, `data.jobId`, `data.jobName`, `data.projectName`, `data.environmentName`, `data.runStatus` and `data.runStatusCode`. Every other field is kept on the incident.

## Test the integration
1. Run a dbt Cloud job that fails (for example, a job with a model that does not compile).
2. Confirm dbt Cloud sends the webhook and verify a new incident is created in Spike.
3. Fix the problem and run the same job again so that it succeeds.
4. Confirm Spike auto-resolves the incident for that job.

Disclaimer: These integration instructions are offered independently by Spike.sh, and Spike.sh is not affiliated with nor a partner of dbt Labs, Inc.
