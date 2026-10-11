---
description: "Send Oracle Visual Builder Studio build results to Spike so a failed or unstable build pages your on-call rotation and a later successful build resolves the incident."
---
# Integrate Spike with Oracle Visual Builder Studio

## Overview

[Oracle Visual Builder Studio](https://docs.oracle.com/en/cloud/paas/visual-builder-studio/) (VBS) is Oracle's hosted development platform. It combines Git repositories, issue tracking, code review and build pipelines in one project.

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

* `events[].eventId` must be `BUILD`.
* `events[].data.jobName` identifies the build job.
* `events[].data.details.result` carries the build result (`FAILURE`, `UNSTABLE` or `SUCCESS`).
* `projectId` names the project. If it is missing at the top level, Spike uses `events[].projectId`.

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
  "messageId": "9c1e5f0a-7b2d-4c8e-a3f1-2d6b8e4f7a19",
  "timestamp": 1760169482311,
  "testEvent": false,
  "projectId": "order-portal",
  "events": [
    {
      "eventId": "BUILD",
      "projectId": "order-portal",
      "timestamp": 1760169482309,
      "data": {
        "jobName": "order-portal-build",
        "details": {
          "timestamp": 1760169301877,
          "number": 218,
          "url": "https://acme-vbs.developer.ocp.oraclecloud.com/acme/s/order-portal/hudson/job/order-portal.order-portal-build/218/",
          "result": "FAILURE",
          "duration": 180432,
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
  "messageId": "3f7a2b91-0d4e-4a6c-9b5e-81c2d7e4f036",
  "timestamp": 1760171127540,
  "testEvent": false,
  "projectId": "order-portal",
  "events": [
    {
      "eventId": "BUILD",
      "projectId": "order-portal",
      "timestamp": 1760171127538,
      "data": {
        "jobName": "order-portal-build",
        "details": {
          "timestamp": 1760170911204,
          "number": 219,
          "url": "https://acme-vbs.developer.ocp.oraclecloud.com/acme/s/order-portal/hudson/job/order-portal.order-portal-build/219/",
          "result": "SUCCESS",
          "duration": 214806,
          "artifacts": [
            {
              "fileName": "order-portal-2.4.1.jar",
              "relativePath": "order-portal/target/order-portal-2.4.1.jar",
              "url": "https://acme-vbs.developer.ocp.oraclecloud.com/acme/s/order-portal/hudson/job/order-portal.order-portal-build/219/artifact/order-portal/target/order-portal-2.4.1.jar"
            }
          ]
        }
      }
    }
  ]
}
```

**Key fields:**
* `projectId` - the VBS project; falls back to `events[].projectId` when empty.
* `events[].eventId` - only `BUILD` events are alerts.
* `events[].data.jobName` - the build job. Together with `projectId` it identifies the incident, so every build of the same job joins or resolves the same incident. The build number is deliberately not part of the identity.
* `events[].data.details.result` - `FAILURE` or `UNSTABLE` opens or joins an incident; `SUCCESS` resolves it. Spike reads `data.details.result` first and `data.result` as a fallback.

## Incident titles

Spike builds the title because the payload has no sentence about the fault:

* One build: `order-portal-build build failed in order-portal`, or `build unstable` for an unstable build.
* Recovery: `order-portal-build build recovered in order-portal`.
* Several failing builds in one message: the jobs are named by result, for example `order-portal-build, order-portal-deploy failed +1 more in order-portal`.

{% hint style="success" %}
This integration supports auto-resolution. When a later build of the same job in the same project succeeds, the open incident resolves.
{% endhint %}
