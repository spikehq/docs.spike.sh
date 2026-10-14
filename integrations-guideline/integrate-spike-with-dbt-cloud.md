---
description: >-
   Integrate Spike with dbt Cloud to get alerted by Phone calls, SMS, Slack, MS Teams, and more when a dbt job run errors, and auto-resolve the incident when the job succeeds again.
---

# How Spike Integrates with dbt Cloud

## Overview
[dbt Cloud](https://www.getdbt.com/product/dbt-cloud) is the hosted platform for running dbt projects. Scheduled and triggered jobs build your data models, run tests and refresh your warehouse.

With Spike’s dbt Cloud integration, a job run that errors creates an incident, and the incident resolves itself when the same job next succeeds.

## How it works
Spike decides what a webhook means from the run status, in this order:

| What Spike reads | What Spike does |
| --- | --- |
| `data.runStatusCode` `20` (Errored) | Creates an incident, or joins the open incident for the same job |
| `data.runStatusCode` `10` (Success) | Resolves the open incident for the same job; never creates one |
| `data.runStatusCode` `3` (Running) or any other number | Ignored: never creates or resolves an incident |

* `data.runStatusCode` can arrive as a number or a numeric string.
* Only when `data.runStatusCode` is missing or not a number does Spike read `data.runStatus`, compared case-insensitively after trimming: `Errored` or `Error` creates or joins, `Success` resolves, anything else is ignored.
* Only when neither is readable does Spike use `eventType`: `job.run.errored` creates or joins, while `job.run.started` and `job.run.completed` are ignored.
* If you subscribe to both **Run errored** and **Run completed**, a failed run sends `job.run.errored` and then `job.run.completed` with code `20`; the second joins the incident that is already open.

Spike identifies the incident by `data.jobId`, the dbt Cloud job. It stays the same from run to run, so every failed run of a job groups into one incident and the job's next successful run resolves it. A value counts as an id when it is a non-empty string or a number (`0` is an id). If `data.jobId` is missing, a failure is matched to an open incident by its title instead, and a success cannot resolve anything. Resolving needs an exact `data.jobId` match between the failure and the success.

### Incident title
* Failure, when `data.runStatusMessage` holds a real sentence (not empty, not `None`/`null`) and `data.jobId` is present: `{data.runStatusMessage} — {data.jobName} in {data.environmentName}`. dbt Cloud sends `None` in its documented examples, so you will normally see the next form.
* Failure otherwise: `dbt Cloud job Nightly build (dbt build) failed in Production`. With no job name it is `dbt Cloud job failed in Production`; with no environment ` in …` is dropped.
* Success: `dbt Cloud job Nightly build (dbt build) recovered in Production`.
* Runs that are ignored (for example Running) get the plain failure form but never create an incident.
* With neither a job name nor an environment the title is `dbt Cloud alert with no details`.

Whitespace is collapsed and titles never contain run ids, links, timestamps or the run reason. Titles are cut at 200 characters; a long `data.runStatusMessage` is shortened with `...` so the job and environment stay whole.

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

The **Webhook name**, **Events** and **Endpoint** fields are required. Spike needs `data.jobId` and `data.runStatusCode` on every delivery; dbt Cloud includes both. Send all jobs of one Spike integration from a single dbt Cloud account, because job ids are not known to be unique across accounts. dbt Cloud shows a secret key for the webhook after saving; Spike does not use it, because the token in the webhook URL is the credential.

**Run errored** opens the incident and **Run completed** resolves it when the job next succeeds. Without **Run completed**, incidents never auto-resolve.
{% endtab %}
{% endtabs %}

## Example payloads

dbt Cloud sends the following when a job run errors:

```json
{
  "accountId": 70403103932011,
  "webhookId": "wsu_2fJq8bXkT0mNc4Rz",
  "eventId": "wev_2nV7hQeXcL1pZ9aKdR3sYtB6uWm",
  "timestamp": "2026-10-13T06:15:20.419714619Z",
  "eventType": "job.run.errored",
  "webhookName": "Spike on-call",
  "data": {
    "jobId": "418236",
    "jobName": "Nightly build (dbt build)",
    "runId": "70403139217654",
    "environmentId": "218544",
    "environmentName": "Production",
    "dbtVersion": "1.9.0",
    "projectName": "Analytics Warehouse",
    "projectId": "312077",
    "runStatus": "Errored",
    "runStatusCode": 20,
    "runStatusMessage": "None",
    "runReason": "Kicked off by the scheduler",
    "runStartedAt": "2026-10-13T06:00:04Z",
    "runErroredAt": "2026-10-13T06:15:20Z"
  }
}
```

When the same job next succeeds, dbt Cloud sends the following, and Spike resolves the incident:

```json
{
  "accountId": 70403103932011,
  "webhookId": "wsu_2fJq8bXkT0mNc4Rz",
  "eventId": "wev_2nVbR4kTzQ8xMw2cHs7LpE1aYfD",
  "timestamp": "2026-10-13T07:42:35.789265936Z",
  "eventType": "job.run.completed",
  "webhookName": "Spike on-call",
  "data": {
    "jobId": "418236",
    "jobName": "Nightly build (dbt build)",
    "runId": "70403139288120",
    "environmentId": "218544",
    "environmentName": "Production",
    "dbtVersion": "1.9.0",
    "projectName": "Analytics Warehouse",
    "projectId": "312077",
    "runStatus": "Success",
    "runStatusCode": 10,
    "runStatusMessage": "None",
    "runReason": "Kicked off from the UI by maria.lopez@example.com",
    "runStartedAt": "2026-10-13T07:30:11Z",
    "runFinishedAt": "2026-10-13T07:42:32Z"
  }
}
```

The fields Spike reads are `eventType`, `data.jobId`, `data.jobName`, `data.environmentName`, `data.runStatus`, `data.runStatusCode` and `data.runStatusMessage`. Every other field is kept on the incident.

## Test the integration
1. Run a dbt Cloud job that fails (for example, a job with a model that does not compile).
2. Confirm dbt Cloud sends the webhook and verify a new incident is created in Spike.
3. Fix the problem and run the same job again so that it succeeds.
4. Confirm Spike auto-resolves the incident for that job.

Disclaimer: These integration instructions are offered independently by Spike.sh, and Spike.sh is not affiliated with nor a partner of dbt Labs, Inc.
