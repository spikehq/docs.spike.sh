---
description: "Send Oracle Visual Builder Studio build results to Spike so a failed or unstable build pages your on-call rotation and a later successful build resolves the incident."
---
# Integrate Spike with Oracle Visual Builder Studio

## Overview

[Oracle Visual Builder Studio](https://www.oracle.com/application-development/visual-builder-studio/) (VBS) is Oracle's hosted development platform. It combines Git repositories, issue tracking, code review and build pipelines in one project.

Point a VBS **Generic webhook** at a Spike integration URL and Spike will:

* **Open an incident** when a build job ends `FAILURE` (the build failed) or `UNSTABLE` (the build ran but tests or quality gates failed).
* **Group repeats**: further failures of the same build job in the same project join the incident that is already open instead of paging again.
* **Resolve the incident** when a later build of the same job in the same project ends `SUCCESS`.

{% hint style="info" %}
Only `BUILD` events are alerts. Issue, push, review and activity events are accepted but never open or resolve an incident. Builds that end `ABORTED` or `NOT_BUILT`, or that carry no result, neither open nor resolve an incident.
{% endhint %}

## Set up instructions

**Step 1:** Create an Oracle Visual Builder Studio integration in the Spike dashboard and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

**Step 2:**

{% tabs %}
{% tab title="Setup on Oracle Visual Builder Studio" %}

**Prerequisites:**
* Project Owner access to the VBS project you want to monitor
* The Spike webhook URL from Step 1

**Steps:**

1. Open your project in Visual Builder Studio and click **Project Administration** in the left navigation.
2. Click the **Webhooks** tab, then click **+ Create Webhook**.
3. Choose **Generic** as the webhook type.
4. Fill in the form:
   * **Name** (required): for example `Spike`.
   * **Payload URL** (required): paste the Spike webhook URL copied in Step 1.
   * **Secret** (optional): Spike does not check it, so leave it empty.
5. Under **Events**, tick the **Build** events: the build job events for the jobs you want to monitor. Leave the other event groups unticked, or tick them if you like; Spike ignores everything except `BUILD`.
6. Click **Create**.
7. To confirm delivery, run a build that you expect to fail, then run one that succeeds.

**Required fields in the payload:**

* `events[].eventId` must be `BUILD`. The first `BUILD` entry in `events` is the one Spike reads.
* `events[].data.jobName` identifies the build job. It is required: without a usable job name Spike cannot tell jobs apart.
* `events[].data.details.result` carries the build result (`FAILURE`, `UNSTABLE` or `SUCCESS`, exactly in uppercase).
* `events[].projectId` names the project. It is optional, but when it is present it keeps two jobs with the same name in different projects apart. The Message-level `projectId` is not read.

VBS sends these fields itself; you do not build the body.

**Test the integration:**
* Run a build that fails. An incident titled `<jobName> build failed in <projectId>` appears in Spike.
* Run the same job again and let it succeed. The incident resolves.
* The **Test** button in VBS may send a sample build with `testEvent` set to `true` and a `SUCCESS` result. That does not open an incident.

{% endtab %}
{% endtabs %}

## Event payload structure

Oracle Visual Builder Studio sends a body like this when a build fails:

```json
{
  "apiVersion": "1.0",
  "messageId": "9d1f7c42-3b6e-4f0a-8c21-5e7a2b94d310",
  "timestamp": 1760352612481,
  "testEvent": false,
  "projectId": "acme-dev_payments-service",
  "events": [
    {
      "eventId": "BUILD",
      "projectId": "payments-service",
      "timestamp": 1760352612480,
      "data": {
        "jobName": "payments-api-main",
        "details": {
          "timestamp": 1760352425138,
          "number": 214,
          "url": "https://vbstudio-acme.developer.ocp.oraclecloud.com/acme-dev/s1/payments-service/hudson/job/payments-service.payments-api-main/214/",
          "result": "FAILURE",
          "duration": 187342,
          "artifacts": []
        }
      }
    }
  ]
}
```

The next successful build of the same job arrives as:

```json
{
  "apiVersion": "1.0",
  "messageId": "5b0e8a17-c6d4-4a39-9f02-71d3e8b6a4c9",
  "timestamp": 1760353518902,
  "testEvent": false,
  "projectId": "acme-dev_payments-service",
  "events": [
    {
      "eventId": "BUILD",
      "projectId": "payments-service",
      "timestamp": 1760353518900,
      "data": {
        "jobName": "payments-api-main",
        "details": {
          "timestamp": 1760353307714,
          "number": 215,
          "url": "https://vbstudio-acme.developer.ocp.oraclecloud.com/acme-dev/s1/payments-service/hudson/job/payments-service.payments-api-main/215/",
          "result": "SUCCESS",
          "duration": 201876,
          "artifacts": [
            {
              "fileName": "payments-api-2.8.1.jar",
              "relativePath": "payments-api/target/payments-api-2.8.1.jar",
              "url": "https://vbstudio-acme.developer.ocp.oraclecloud.com/acme-dev/s1/payments-service/hudson/job/payments-service.payments-api-main/215/artifact/payments-api/target/payments-api-2.8.1.jar"
            }
          ]
        }
      }
    }
  ]
}
```

**Key fields:**
* `events[].eventId` - only `BUILD` is an alert. Every other value (`ISSUE`, `PUSH`, `REVIEW`, `ACTIVITY`) is ignored, including an `ACTIVITY` event named `BUILD`, which repeats the build event.
* `events[].data.jobName` - the build job. Together with `events[].projectId` it identifies the incident, so every build of the same job joins or resolves the same incident. The build number and URL are deliberately not part of the identity.
* `events[].data.details.result` - `FAILURE` or `UNSTABLE` opens an incident or joins the one already open for the same job; `SUCCESS` resolves it and never opens one. `ABORTED`, `NOT_BUILT`, a missing result or any other value only joins an open incident for the same job; it never opens or closes one.
* An empty job name, or one that is an unexpanded template variable (for example `${JOB}`), is not an identity. Such alerts are matched by title instead.

## Incident titles

Spike builds the title because the payload has no sentence about the fault. It is built from the first `BUILD` event and never contains the build number, URL, message id or timestamps:

* `FAILURE`: `payments-api-main build failed in payments-service`
* `UNSTABLE`: `payments-api-main build is unstable in payments-service`
* `SUCCESS`: `payments-api-main build succeeded in payments-service`
* `ABORTED`: `payments-api-main build was aborted in payments-service`
* `NOT_BUILT`, or a missing or unknown result: `payments-api-main build was not built in payments-service`
* Two or more failing or unstable `BUILD` events in one message: `3 failed builds in payments-service: payments-api-main, payments-ui-main +1 more` (at most two jobs named).
* Job name unusable: `Visual Builder Studio build failed in payments-service` for both failures and unstable builds, and a success resolves the incident with that same title.
* No `BUILD` event: `Visual Builder Studio PUSH event in payments-service`, which opens no incident.
* Nothing usable: `Oracle Visual Builder Studio alert with no details`.

` in <projectId>` is dropped when the event has no usable `projectId`. Titles are whitespace-collapsed and capped at 200 characters, shortening the job name first.

The incident is found by job name and project, so the title is for display only (except when the job name is unusable, where the title is what matches the recovery).

{% hint style="success" %}
This integration supports auto-resolution. When a later build of the same job in the same project succeeds, the open incident resolves.
{% endhint %}
