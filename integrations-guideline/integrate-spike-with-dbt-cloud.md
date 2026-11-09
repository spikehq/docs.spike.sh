---
description: >-
  Integrate Spike with dbt Cloud to get alerted by phone, SMS, Slack, MS Teams and more when a job run errors, with auto-resolve when it succeeds again.
---

# How Spike Integrates with dbt Cloud

## Overview
[dbt Cloud](https://www.getdbt.com) (now also called the dbt platform) is the hosted platform for running dbt projects. Scheduled and triggered jobs build your data models, run tests and refresh your warehouse.

With Spike’s dbt Cloud integration, a job run that errors creates an incident, and the incident resolves itself when the same job next succeeds.

## How it works
dbt Cloud sends a webhook for three events ([dbt docs](https://docs.getdbt.com/docs/deploy/webhooks)): `job.run.started` (Run started), `job.run.completed` (Run completed, "a run that has failed or succeeded") and `job.run.errored` (Run errored). Spike reads the run status in each one:

| What dbt Cloud sends | What Spike does |
| --- | --- |
| `data.runStatusCode` `20`, `data.runStatus` `Errored` | Creates an incident, or joins the open incident for the same job |
| `data.runStatusCode` `10`, `data.runStatus` `Success` | Resolves the open incident for the same job; never creates one |
| `data.runStatusCode` `3`, `data.runStatus` `Running` (Run started) | Ignored: never creates, joins or resolves an incident |

* dbt says Run errored "is a subset of the `job.run.completed` events. If you subscribe to both, you will receive two notifications when your job encounters an error." The second one joins the incident that is already open.
* Spike reads `data.runStatusCode` first. Only if it is missing does Spike read `data.runStatus`, and only if both are missing does it treat `job.run.errored` as a failure. Any other code or status is ignored.

Spike identifies the incident by `data.jobId`, the dbt Cloud job. It stays the same from run to run, so every failed run of a job groups into one incident and the job's next successful run resolves it. Resolving needs the same `data.jobId` on the failure and the success.

### Incident title
* Failure: `dbt Cloud job {data.jobName} failed in {data.environmentName}`, for example `dbt Cloud job dbt Vault failed in dbt Vault Demo`.
* Success: `dbt Cloud job {data.jobName} recovered in {data.environmentName}`.
* Run started: `dbt Cloud job {data.jobName} is running in {data.environmentName}`. It never creates an incident.

With no job name the title is `dbt Cloud job failed in …`, with no environment ` in …` is dropped, and with neither it is `dbt Cloud alert with no details`. Titles are cut at 200 characters and never contain run ids, links, timestamps or `data.runStatusMessage` (dbt's examples always send `None` there).

dbt Cloud sends no severity or priority, so incidents from it carry none unless an alert rule sets one.

{% hint style="success" %}
Auto-resolution is supported for this integration. Spike will also automatically group repeated incidents and suppress alerts while an incident is open.
{% endhint %}

## Set up instructions

dbt Cloud webhooks need a Starter or Enterprise-tier plan, and to create one you need the Account Admin, Admin or Developer permission set (Enterprise) or a Developer license (Starter).

**Step 1:** Create a dbt Cloud integration in the Spike dashboard and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

**Step 2:** Create the webhook in dbt Cloud.

{% tabs %}
{% tab title="Setup on dbt Cloud" %}
1. In dbt Cloud, open **Account settings** by clicking your account name in the left side panel.
2. Go to the **Webhooks** section and click **Create webhook**.
3. Enter a **Webhook name** (for example `Spike on-call`) and, if you like, a **Description**.
4. Under **Events**, select **Run errored** and **Run completed**. Optionally add **Run started**; Spike ignores it.
5. Under **Jobs**, select the specific jobs you want Spike to page on, or leave it empty to cover all jobs.
6. Paste the Spike webhook URL into the **Endpoint** field.
7. Click **Save**.

Send all jobs of one Spike integration from a single dbt Cloud account, because job ids are not known to be unique across accounts. After you save, dbt Cloud shows a secret token it uses to sign each delivery; Spike does not need it, because the token in the webhook URL is the credential.

**Run errored** opens the incident and **Run completed** resolves it when the job next succeeds. Without **Run completed**, incidents never auto-resolve.
{% endtab %}
{% endtabs %}

## Example payloads

These are dbt Cloud's own examples, from its [webhook docs](https://docs.getdbt.com/docs/deploy/webhooks).

A run that errored. Spike creates an incident titled `dbt Cloud job dbt Vault failed in dbt Vault Demo`:

```json
{
  "accountId": 1,
  "webhookId": "wsu_12345abcde",
  "eventId": "wev_2L6m5BggBw9uPNuSmtg4MUiW4Re",
  "timestamp": "2023-01-31T21:15:20.419714619Z",
  "eventType": "job.run.errored",
  "webhookName": "test",
  "data": {
    "jobId": "123",
    "jobName": "dbt Vault",
    "runId": "12345",
    "environmentId": "1234",
    "environmentName": "dbt Vault Demo",
    "dbtVersion": "1.0.0",
    "projectName": "Snowflake Github Demo",
    "projectId": "167194",
    "runStatus": "Errored",
    "runStatusCode": 20,
    "runStatusMessage": "None",
    "runReason": "Kicked off from the UI by test@test.com",
    "runStartedAt": "2023-01-31T21:14:41Z",
    "runErroredAt": "2023-01-31T21:15:20Z"
  }
}
```

A completed run that succeeded. Spike resolves the open incident with the same `data.jobId` (`123` here):

```json
{
  "accountId": 1,
  "webhookId": "wsu_12345abcde",
  "eventId": "wev_2L6ZDoilyiWzKkSA59Gmc2d7FDD",
  "timestamp": "2023-01-31T19:29:35.789265936Z",
  "eventType": "job.run.completed",
  "webhookName": "test",
  "data": {
    "jobId": "123",
    "jobName": "Daily Job (dbt build)",
    "runId": "12345",
    "environmentId": "1234",
    "environmentName": "Production",
    "dbtVersion": "1.0.0",
    "projectName": "Snowflake Github Demo",
    "projectId": "167194",
    "runStatus": "Success",
    "runStatusCode": 10,
    "runStatusMessage": "None",
    "runReason": "Kicked off from the UI by test@test.com",
    "runStartedAt": "2023-01-31T19:28:07Z",
    "runFinishedAt": "2023-01-31T19:29:32Z"
  }
}
```

The fields Spike reads are `eventType`, `data.jobId`, `data.jobName`, `data.environmentName`, `data.runStatus` and `data.runStatusCode`. Every field is kept on the incident's payload.

## Test the integration
1. Run a dbt Cloud job that fails (for example, a job with a model that does not compile).
2. Confirm dbt Cloud sends the webhook and verify a new incident is created in Spike.
3. Fix the problem and run the same job again so that it succeeds.
4. Confirm Spike auto-resolves the incident for that job.

Disclaimer: These integration instructions are offered independently by Spike.sh, and Spike.sh is not affiliated with nor a partner of dbt Labs, Inc.
