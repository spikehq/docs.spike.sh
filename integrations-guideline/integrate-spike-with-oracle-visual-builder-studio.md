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
* `projectId` (the Message-level project identifier) is the project half of the identity. It is required to keep two jobs with the same name in different projects apart. If it is missing, Spike falls back to `events[].projectId` for the title only.
* `events[].data.jobName` identifies the build job. It is required: without a usable job name Spike cannot tell jobs apart.
* `events[].data.details.result` carries the build result (`FAILURE`, `UNSTABLE` or `SUCCESS`, exactly in uppercase). If it is not there, Spike reads `events[].data.result`.

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
  "messageId": "9c1f2e7a-3b44-4d5e-8a61-2f0b7c9d4e13",
  "timestamp": 1760351413257,
  "testEvent": false,
  "projectId": "acme-dev_payments-service",
  "events": [
    {
      "eventId": "BUILD",
      "projectId": "payments-service",
      "timestamp": 1760351413256,
      "data": {
        "jobName": "payments-api-main",
        "details": {
          "timestamp": 1760351290256,
          "number": 482,
          "url": "https://vbstudio.example.oraclecloud.com/acme-dev/s/acme-dev_payments-service/hudson/job/payments-api-main/482/",
          "result": "FAILURE",
          "duration": 122905,
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
  "messageId": "1e6a0b3d-7f2c-4a8e-9d15-6c3b2a7e8f40",
  "timestamp": 1760352215774,
  "testEvent": false,
  "projectId": "acme-dev_payments-service",
  "events": [
    {
      "eventId": "BUILD",
      "projectId": "payments-service",
      "timestamp": 1760352215773,
      "data": {
        "jobName": "payments-api-main",
        "details": {
          "timestamp": 1760352101773,
          "number": 483,
          "url": "https://vbstudio.example.oraclecloud.com/acme-dev/s/acme-dev_payments-service/hudson/job/payments-api-main/483/",
          "result": "SUCCESS",
          "duration": 114002,
          "artifacts": [
            {
              "fileName": "payments-api-2.14.0.jar",
              "relativePath": "payments-api/target/payments-api-2.14.0.jar",
              "url": "https://vbstudio.example.oraclecloud.com/acme-dev/s/acme-dev_payments-service/hudson/job/payments-api-main/483/artifact/payments-api/target/payments-api-2.14.0.jar"
            }
          ]
        }
      }
    }
  ]
}
```

**Key fields:**
* `events[].eventId` - only `BUILD` is an alert. Every other value (`ISSUE`, `PUSH`, `REVIEW`, `ACTIVITY`) is acknowledged and ignored: no incident is opened or resolved.
* `projectId` and `events[].data.jobName` - together they identify the incident, so every build of the same job in the same project joins or resolves the same incident. The build number, URL, message id and timestamps are deliberately not part of the identity.
* `events[].data.details.result` - `FAILURE` or `UNSTABLE` opens an incident, or joins the one already open for the same project and job; `SUCCESS` resolves it and never opens one. `ABORTED`, `NOT_BUILT`, a missing result or any other value is ignored: it neither opens, joins nor closes an incident.
* `events[].projectId` - used only as the project shown in the title when the Message-level `projectId` is not usable. It is never part of the identity.
* `events[].data.details.number`, `url` and `duration` - shown in the incident body only.
* `testEvent` - does not change processing.
* An empty job name, or one that is an unexpanded template variable (for example `${JOB_NAME}`), is not an identity. Such alerts are matched by title instead. For the title only, Spike then takes the job name from the `/job/<name>/` part of `details.url` when there is one.

## Incident titles

Spike builds the title because the payload has no sentence about the fault. It is built from the first `BUILD` event and never contains the build number, URL, message id or timestamps:

* `FAILURE`: `payments-api-main build failed in acme-dev_payments-service`
* `UNSTABLE`: `payments-api-main build unstable in acme-dev_payments-service`
* `SUCCESS` (recovery): `payments-api-main build back to normal in acme-dev_payments-service`
* `ABORTED`, `NOT_BUILT` or a missing result: a title is built (for example `payments-api-main build was aborted in acme-dev_payments-service`) but no incident is opened or resolved.
* Job name unusable: `Oracle Visual Builder Studio build failed in acme-dev_payments-service` (or `unstable`).
* Nothing usable: `Oracle Visual Builder Studio alert with no details`.

The project is the Message-level `projectId`, then `events[].projectId`; ` in <projectId>` is dropped when neither is usable. Titles are whitespace-collapsed and capped at 200 characters, shortening the job name and never cutting the project.

The incident is found by project and job name, so the title is for display only (except when the job name is unusable, where the title is what matches the recovery).

{% hint style="success" %}
This integration supports auto-resolution. When a later build of the same job in the same project succeeds, the open incident resolves.
{% endhint %}
