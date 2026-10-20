---
description: "Send Oracle Visual Builder Studio build results to Spike so a failed or unstable build pages your on-call rotation and a later successful build resolves the incident."
---
# Integrate Spike with Oracle Visual Builder Studio

## Overview

[Oracle Visual Builder Studio](https://www.oracle.com/application-development/visual-builder-studio/) (VBS) is Oracle's hosted development platform. It combines Git repositories, issue tracking, code review and build pipelines in one project.

Point a VBS **Generic webhook** at a Spike integration URL and Spike will:

* **Open an incident** when a build job ends `FAILURE` (the build failed), `UNSTABLE` (the build ran but tests or quality gates failed) or any other unrecognised non-empty result.
* **Group repeats**: further failures of the same build job in the same project join the incident that is already open instead of paging again.
* **Resolve the incident** when a later build of the same job in the same project ends `SUCCESS`.

{% hint style="info" %}
Only `BUILD` events are alerts. Issue, push, review and activity events are accepted but never open or resolve an incident. Builds that end `ABORTED` or `NOT_BUILT` join an open incident for the job but neither open nor resolve one; a build with no result does neither.
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

* `events[0].eventId` must be `BUILD`. Only the first entry in `events` is read.
* `events[0].data.jobName` identifies the build job. It is required: without it Spike cannot tell jobs apart and matches by title instead.
* `projectId` is the project half of the identity. It keeps two jobs with the same name in different projects apart. If `events[0].projectId` is empty, the title takes the project from `projectId`.
* `events[0].data.details.result` carries the build result.

VBS sends these fields itself; you do not build the body.

**Test the integration:**
* Run a build that fails. An incident titled `<jobName> build failed in <projectId>` appears in Spike.
* Run the same job again and let it succeed. The incident resolves.
* The **Test** button in VBS sends a message with `testEvent` set to `true`. Its title starts with `Test notification: ` and it opens its own incident every time, never joining a real build's incident. A test message never resolves anything.

{% endtab %}
{% endtabs %}

## Event payload structure

Oracle Visual Builder Studio sends a body like this when a build fails:

```json
{
  "apiVersion": "1.0",
  "messageId": "7c1e9a52-3f4b-4d8e-9b21-6a0f5d2c8e41",
  "timestamp": 1760352184512,
  "testEvent": false,
  "projectId": "order-portal",
  "events": [
    {
      "eventId": "BUILD",
      "projectId": "order-portal",
      "timestamp": 1760352184510,
      "data": {
        "jobName": "build-and-test",
        "details": {
          "timestamp": 1760352061235,
          "number": 142,
          "url": "https://acme-vbs.developer.ocp.oraclecloud.com/acme-vbs/s/order-portal/hudson/job/order-portal.build-and-test/142/",
          "result": "FAILURE",
          "duration": 118204,
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
  "messageId": "b2d47f10-8c6e-4a39-a5d3-91e7c0f4b6aa",
  "timestamp": 1760353902117,
  "testEvent": false,
  "projectId": "order-portal",
  "events": [
    {
      "eventId": "BUILD",
      "projectId": "order-portal",
      "timestamp": 1760353902115,
      "data": {
        "jobName": "build-and-test",
        "details": {
          "timestamp": 1760353771402,
          "number": 143,
          "url": "https://acme-vbs.developer.ocp.oraclecloud.com/acme-vbs/s/order-portal/hudson/job/order-portal.build-and-test/143/",
          "result": "SUCCESS",
          "duration": 129871,
          "artifacts": [
            {
              "fileName": "order-portal-2.4.1.zip",
              "relativePath": "order-portal/build/dist/order-portal-2.4.1.zip",
              "url": "https://acme-vbs.developer.ocp.oraclecloud.com/acme-vbs/s/order-portal/hudson/job/order-portal.build-and-test/143/artifact/order-portal/build/dist/order-portal-2.4.1.zip"
            }
          ]
        }
      }
    }
  ]
}
```

**Key fields:**
* `events[0].eventId` - only `BUILD` is an alert. A message whose first event is anything else (`ISSUE`, `PUSH`, `REVIEW`, `ACTIVITY`) never opens or resolves an incident. The value is compared after trimming, ignoring case.
* `events[0].data.jobName` and `projectId` - together they identify the incident, so every build of the same job in the same project joins or resolves the same incident. Two projects posting to one Spike integration never cross. If `jobName` is empty, Spike matches by title instead.
* `events[0].data.details.result` - compared after trimming, ignoring case:
  * `FAILURE` and `UNSTABLE` open an incident, or join the one already open for the job.
  * `SUCCESS` resolves the job's open incident and never opens one.
  * `ABORTED` and `NOT_BUILT` join an open incident but neither open nor resolve one.
  * A missing or empty result neither opens nor resolves.
  * Any other value opens an incident and does not resolve.
* `events[0].projectId` - used for the project shown in the title, falling back to `projectId`. Never part of the identity.
* `testEvent` - when `true`, the message is keyed on `messageId` so each test is its own incident, and it never resolves.
* `messageId`, `timestamp`, and `details.timestamp`, `number`, `url`, `duration` and `artifacts` change on every delivery and are not part of the identity: a repeat that changes only these joins the open incident.
* Only the first entry of `events` is read. Extra entries add ` (+N more events)` to the title.

## Incident titles

Spike builds the title because the payload has no sentence about the fault. It never contains the build number, URL, duration, artifacts or timestamps:

* `FAILURE`: `build-and-test build failed in order-portal`
* `UNSTABLE`: `build-and-test build is unstable in order-portal`
* `SUCCESS` (recovery): `build-and-test build succeeded in order-portal`
* `ABORTED`: `build-and-test build was aborted in order-portal`; `NOT_BUILT`: `build-and-test build was not built in order-portal`
* Any other result: `build-and-test build finished with <result> in order-portal`; empty result: `build-and-test build finished (result empty) in order-portal`
* Test button: prefixed with `Test notification: `
* More than one event: `build-and-test build failed (+1 more events) in order-portal`
* No job name: `Oracle VB Studio build failed in order-portal`
* First event not `BUILD`: `Oracle VB Studio ISSUE event in order-portal`
* Nothing usable: `Oracle Visual Builder Studio notification with no details`

` in <project>` is dropped when there is no project. Titles are whitespace-collapsed and capped at 200 characters; the job name is shortened with `...` and the project is kept whole.

The incident is found by project and job name, so the title is for display only (except when the job name is missing, where the title is what matches the recovery).

{% hint style="success" %}
This integration supports auto-resolution. When a later build of the same job in the same project succeeds, the open incident resolves.
{% endhint %}
