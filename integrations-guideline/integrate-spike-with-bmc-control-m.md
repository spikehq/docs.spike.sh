---
description: >-
   Integrate Spike with BMC Control-M to receive real-time alerts via Phone calls, SMS, Slack, MS Teams, and more when batch jobs fail or run late.
---

# Integrate Spike with BMC Control-M

## Overview
[BMC Control-M](https://www.bmc.com/it-solutions/control-m.html) is a workflow orchestration platform for scheduling and monitoring batch jobs across servers and applications.

With Spike's Control-M integration, an alert raised by Control-M becomes a Spike incident, and closing the alert in Control-M resolves it. Control-M does not send webhooks itself. It runs an alerts listener script that you provide, and that script posts the alert to Spike.

## How it works
* `status` decides what happens. `0` (Not_Noticed, or `New`) opens an incident, or joins the one already open for the same `id`. `1` (Noticed, or `Reviewed`) joins the open incident and never opens one. `2` (Handled, or `Closed`) resolves the incident with the same `id`. Words are matched in any case, and `status` may be sent as a string or a number. Anything else counts as `0`.
* `eventType` (`I` for a new alert, `U` for an update) is shown on the incident but does not decide anything. Open, join and resolve follow `status` and `id`.
* `id` is the Control-M alert id. It stays the same across the `I` and `U` events of one alert, and Spike uses it to match them. It may be sent as a string or a number. Spike reads it exactly as sent. An empty value, or one that is still a placeholder such as `$alert_id`, `%%alert_id`, `<id>` or `{{id}}`, is not an id.
* Without a valid `id`, Spike falls back to matching by title. Always send `id`: an alert without one cannot be reliably joined or resolved.
* The incident title is `message` (Control-M's own sentence, whitespace collapsed) followed by the job and the node in brackets. Examples:
  * `Ended not OK (NightlySettlement on batch-node-07)` when the alert opens.
  * `Alert handled: NightlySettlement on batch-node-07` when it is handled. The handling title may differ from the opening one, because Spike resolves by `id`.
* Title rules, in order:
  * The job is `jobName`, or `fileName` when `jobName` is empty. The node is `host`, or `server` when `host` is empty.
  * When `message` already contains the job name, the `{job} on` part is dropped: `Job NightlySettlement failed (batch-node-07)`.
  * When both job and node are empty, the brackets are dropped.
  * With an empty `message` the title is `{job} alert on {node}`. With nothing usable it is `Control-M alert with no details`.
  * A handled alert with neither job nor node is titled `Control-M alert handled`.
  * Titles are capped at 200 characters. The message is cut and the brackets are kept whole.
  * `id`, `runId`, times and URLs never appear in the title.

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
1. Enable external alerts for your Control-M environment and choose the alert types to send (the `enableExternalAlerts` and `externalAlertTypes` settings, described in BMC's "Sending events to external monitoring tools" tutorial). Set `externalAlertTypes` to `{"value": "Alerts"}` so that only job alerts are sent. Control-M system alerts use different status codes and have no `id`, so Spike does not support them: do not send them to this integration.
2. Keep the **default alert template**. Control-M then passes each alert to the **alerts listener** as `name: ` and `value ` arguments that use the field names in the table below (`eventType`, `id`, `status`, `message`, `jobName`, `host` and so on). Do not rename them.
3. Save the listener script below on the machine that runs the alerts listener, and make it executable. Control-M passes each field name as one argument with a trailing space (`id: `) and each value as the next argument (`4127 `). The script trims both and ignores template fields it does not know, such as `closedByControlM` and `ticketNumber`. Replace `SPIKE_WEBHOOK_URL` with the URL from Step 1.
4. Register the script as the listener's command, following BMC's tutorial for your version, then restart the listener.

```bash
#!/bin/bash
# Turns Control-M "name: " / "value " arguments into a JSON body and posts it to Spike.
SPIKE_WEBHOOK_URL="https://hooks.spike.sh/..."
FIELDS=" eventType id server fileName runId severity status time user updateTime message runAs subApplication application jobName host type runNo notes "

body='{}'
name=""
value=""
flush() {
  if [ -n "$name" ]; then
    body=$(printf '%s' "$body" | jq -c --arg k "$name" --arg v "$value" '. + {($k): $v}')
  fi
}
for token in "$@"; do
  trimmed="${token%"${token##*[![:space:]]}"}"
  if [[ "$trimmed" =~ ^[A-Za-z]+:$ ]]; then
    flush
    key="${trimmed%:}"
    if [[ "$FIELDS" == *" $key "* ]]; then name="$key"; else name=""; fi
    value=""
  else
    value="${value:+$value }$trimmed"
  fi
done
flush

curl -sS -X POST -H 'Content-Type: application/json' -d "$body" "$SPIKE_WEBHOOK_URL"
```

The script needs `jq` and `curl`. A field with no value, such as `user:`, is sent as an empty string.

The script produces this body for a new alert:

```json
{
  "eventType": "I",
  "id": "4127",
  "server": "ctm-prod-01",
  "fileName": "nightly_settlement.sh",
  "runId": "00b1x",
  "severity": "V",
  "status": "0",
  "time": "20261013031402",
  "user": "",
  "updateTime": "20261013031402",
  "message": "Ended not OK",
  "runAs": "batchusr",
  "subApplication": "Settlement",
  "application": "Finance",
  "jobName": "NightlySettlement",
  "host": "batch-node-07",
  "type": "R",
  "runNo": "1",
  "notes": ""
}
```

When an operator handles (closes) the alert, the script sends the same alert with `eventType` `U` and `status` `2`:

```json
{
  "eventType": "U",
  "id": "4127",
  "server": "ctm-prod-01",
  "fileName": "nightly_settlement.sh",
  "runId": "00b1x",
  "severity": "V",
  "status": "2",
  "time": "20261013031402",
  "user": "jdoe",
  "updateTime": "20261013035810",
  "message": "Ended not OK",
  "runAs": "batchusr",
  "subApplication": "Settlement",
  "application": "Finance",
  "jobName": "NightlySettlement",
  "host": "batch-node-07",
  "type": "R",
  "runNo": "1",
  "notes": "Rerun after SFTP credentials were rotated"
}
```
{% endtab %}
{% endtabs %}

### Fields

Send these fields and no others. All values are strings. Only `id`, `status` and `message` are needed for the incident to open and resolve correctly. The rest make the title more useful and are kept on the incident.

| Field | Control-M source | Meaning |
| --- | --- | --- |
| `eventType` | `call_type` | `I` = new alert, `U` = update of an existing alert. Shown only. |
| `id` | `alert_id` | **Required.** Unique key of the alert, the same across its `I` and `U` events. |
| `status` | `status` | **Required.** `0` Not_Noticed, `1` Noticed, `2` Handled (Closed). |
| `message` | `message` | **Required.** The alert text. It is the start of the incident title. |
| `jobName` | `job_name` | Job that raised the alert. Used in the title. |
| `fileName` | `memname` | Job file name. Used in the title in place of `jobName` when that is empty. |
| `host` | `host_id` | Node where the job ran. Used in the title. |
| `server` | `data_center` | Control-M/Server. Used in the title in place of `host` when that is empty. |
| `severity` | `severity` | `V` very urgent, `U` urgent, `R` regular. Shown only. |
| `type` | `alert_type` | `R` regular, `B` SLA (BIM). Shown only. |
| `application` | `application` | The job's application. Shown only. |
| `subApplication` | `sub_application` | The job's sub-application. Shown only. |
| `runId` | `order_id` | Unique ID of the job run. Shown only, never used to match alerts. |
| `runNo` | `run_counter` | Execution instance of the run. Shown only. |
| `runAs` | `run_as` | The Run As user that owns the job. Shown only. |
| `time` | `send_time` | When the alert was issued, `yyyymmddhhmmss`. Shown only. |
| `updateTime` | `last_time` | When the alert was last modified, `yyyymmddhhmmss`. Shown only. |
| `user` | `last_user` | The user who last changed the alert. Shown only. |
| `notes` | `notes` | Note text attached to the alert. Shown only. |

{% hint style="warning" %}
Auto-resolve depends on Control-M sending an event with status `2` when an alert is handled. The documented way to do that is an operator setting the alert to Closed, so alerts that are never handled stay open in Spike. If an update does not repeat `jobName` and `host`, the handled title is `Control-M alert handled`; the incident still resolves, because Spike matches on `id`.

Alert ids may not be unique across separate Control-M environments. Create one Spike integration for each Control-M/EM or SaaS environment.
{% endhint %}

## Test the integration
1. Make a Control-M job end not OK so that it raises an alert, or run the listener script by hand, for example `./listener.sh "eventType: " "I " "id: " "4127 " "status: " "0 " "message: " "Ended not OK " "jobName: " "NightlySettlement " "host: " "batch-node-07 "`. It posts the first body above, limited to the fields you pass.
2. Verify a new incident titled `Ended not OK (NightlySettlement on batch-node-07)` is created in Spike.
3. In Control-M, handle (close) the alert, or run the script again with `"status: " "2 "` and the same `id`.
4. Confirm Spike auto-resolves the incident for that `id`.
