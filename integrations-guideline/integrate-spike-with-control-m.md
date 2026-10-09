---
description: >-
   Integrate Spike with BMC Control-M to receive real-time alerts via Phone calls, SMS, Slack, MS Teams, and more when batch jobs fail or run late.
---

# How Spike Integrates with BMC Control-M

## Overview
[BMC Control-M](https://www.bmc.com/it-solutions/control-m.html) is a workflow orchestration platform for scheduling and monitoring batch jobs across servers and applications.

With Spike's Control-M integration, an alert raised by Control-M becomes a Spike incident, and closing the alert in Control-M resolves it. Control-M does not send webhooks itself. It runs an alerts listener script that you provide, and that script posts the alert to Spike.

## How it works
* Spike creates an incident for every new alert (`eventType: I`). A missing `eventType` is treated the same as `I`.
* An update to an existing alert (`eventType: U`) never creates a new incident. It joins the incident already opened for the same `id`.
* `id` is the Control-M alert id. It stays the same across the `I` and `U` events of one alert, and Spike uses it to match them. It may be sent as a string or a number.
* When `status` is `2` (also `Handled` or `Closed`, in any case), Spike resolves the incident with the same `id`. `0` and `1` (or `New`, `Reviewed`, `Not_Noticed`, `Noticed`) count as open.
* The incident title starts with `message`, Control-M's own sentence about what is wrong, followed by the job name and the host, for example `Ended not OK - PAYROLL_DAILY_EXTRACT on batch-node-03`. A closing update is titled `Alert closed: Ended not OK - PAYROLL_DAILY_EXTRACT on batch-node-03`.
* System alerts (alerts about Control-M components, with no `id`) use `component_name` and `component_machine` in place of the job and host. They are grouped by title and are not auto-resolved.

{% hint style="success" %}
Auto-resolution is supported for this integration. Spike will also automatically group repeated incidents and suppress alerts while incident is open.
{% endhint %}

## Set up instructions

**Step 1:** Create a Control-M integration in the Spike dashboard and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

**Step 2:** Configure the alerts listener in Control-M.

{% tabs %}
{% tab title="Setup on Control-M" %}
1. In Control-M, set up the **alerts listener**: the external script that Control-M runs for each alert. Follow BMC's "Alerts" documentation for your version to register the script (BMC calls this sending alerts to an external program).
2. Write the listener script. Control-M calls it with `name: value` arguments (`call_type`, `alert_id`, `data_center`, `memname`, `order_id`, `severity`, `status`, `send_time`, `last_user`, `last_time`, `message`, `run_as`, `application`, `sub_application`, `job_name`, `host_id`, `alert_type`, `closed_from_em`, `ticket_number`, `run_counter`, `notes`).
3. In the script, join every token up to the next `name:` token into one value, because a value such as `Ended not OK` contains spaces.
4. Make the script post a JSON body to the Spike webhook URL, using the field mapping below.
5. Restart the Control-M/EM server components so the listener is picked up.

Send exactly this body for a new alert:

```json
{
  "eventType": "I",
  "id": "2541",
  "server": "ctm-prod-01",
  "fileName": "payroll_daily_extract.sh",
  "runId": "18734",
  "runNo": "1",
  "severity": "V",
  "status": "0",
  "time": "20261009021514",
  "user": "",
  "updateTime": "",
  "message": "Ended not OK",
  "runAs": "batchusr",
  "application": "Finance",
  "subApplication": "Payroll",
  "jobName": "PAYROLL_DAILY_EXTRACT",
  "host": "batch-node-03",
  "type": "R",
  "notes": ""
}
```

When an operator handles (closes) the alert, send the same body with `eventType` `U` and `status` `2`:

```json
{
  "eventType": "U",
  "id": "2541",
  "server": "ctm-prod-01",
  "fileName": "payroll_daily_extract.sh",
  "runId": "18734",
  "runNo": "1",
  "severity": "V",
  "status": "2",
  "time": "20261009021514",
  "user": "jsmith",
  "updateTime": "20261009023702",
  "message": "Ended not OK",
  "runAs": "batchusr",
  "application": "Finance",
  "subApplication": "Payroll",
  "jobName": "PAYROLL_DAILY_EXTRACT",
  "host": "batch-node-03",
  "type": "R",
  "notes": "Rerun ended OK"
}
```
{% endtab %}
{% endtabs %}

### Fields

| Field | Control-M name | Meaning |
| --- | --- | --- |
| `eventType` | `call_type` | `I` = new alert, `U` = update of an existing alert. |
| `id` | `alert_id` | **Required for resolving.** Unique key of the alert, the same across its `I` and `U` events. |
| `status` | `status` | **Required for resolving.** `0` Not_Noticed, `1` Noticed, `2` Handled (Closed). |
| `message` | `message` | **Required.** The alert text. It is the start of the incident title. |
| `jobName` | `job_name` | Job that raised the alert. Used in the title. |
| `fileName` | `memname` | Job file name. Used in the title only when `message` and `jobName` are empty. |
| `host` | `host_id` | Node where the job ran. Used in the title. |
| `server` | `data_center` | Control-M/Server. Used in the title when `host` is empty. |
| `severity` | `severity` | `V` very urgent, `U` urgent, `R` regular. |
| `type` | `alert_type` | `R` regular, `B` SLA (BIM). |
| `application` | `application` | The job's application. |
| `subApplication` | `sub_application` | The job's sub-application. |
| `runId` | `order_id` | Unique ID of the job run. |
| `runNo` | `run_counter` | Execution instance of the run. |
| `runAs` | `run_as` | The Run As user that owns the job. |
| `time` | `send_time` | When the alert was issued, `yyyymmddhhmmss`. |
| `updateTime` | `last_time` | When a user last modified the alert, `yyyymmddhhmmss`. |
| `user` | `last_user` | The user who last changed the alert. |
| `notes` | `notes` | Note text attached to the alert. |

For system alerts, send `component_name` and `component_machine` as well. Spike uses them in the title because these alerts have no job.

{% hint style="warning" %}
Auto-resolve depends on Control-M sending a `U` event with status `2` when an alert is handled. Alerts that are never handled stay open in Spike.
{% endhint %}

## Test the integration
1. Make a Control-M job end not OK so that it raises an alert, or run the listener script by hand with the first body above.
2. Verify a new incident such as `Ended not OK - PAYROLL_DAILY_EXTRACT on batch-node-03` is created in Spike.
3. In Control-M, handle (close) the alert, or send the second body above.
4. Confirm Spike auto-resolves the incident for that `id`.
