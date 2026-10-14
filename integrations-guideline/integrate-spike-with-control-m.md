---
description: >-
   Integrate Spike with BMC Control-M to receive real-time alerts via Phone calls, SMS, Slack, MS Teams, and more when batch jobs fail or run late.
---

# Integrate Spike with BMC Control-M

## Overview
[BMC Control-M](https://www.bmc.com/it-solutions/control-m.html) is a workflow orchestration platform for scheduling and monitoring batch jobs across servers and applications.

With Spike's Control-M integration, an alert raised by Control-M becomes a Spike incident, and closing the alert in Control-M resolves it. Control-M does not send webhooks itself. It runs an alerts listener script that you provide, and that script posts the alert to Spike.

## How it works
* `id` is the Control-M alert id. It stays the same across every `I` and `U` delivery about one alert, so Spike uses it to match them. It may be sent as a string or a number (`0` is an id). Spike reads it exactly as sent. An empty value, or a template variable that Control-M did not expand (`$id`, `$ID`, `${id}`, `{{id}}`, `%id%`), is not an id.
* `eventType` is `I` for a newly issued alert and `U` for an update. Matching is case-insensitive. An `I` delivery opens an incident. A `U` delivery never opens one: it joins the open incident with the same `id`, and is dropped when none is open. Any other or missing `eventType` opens an incident.
* `status` is `0` Not_Noticed (New), `1` Noticed (Reviewed) or `2` Handled (Closed). `0` opens on `I` and joins on `U`. `1` joins and never closes. `2` resolves the open incident with the same `id`, and never opens one, whatever the `eventType`. `status` may be a string or a number; `handled` and `closed` count as `2`, and `noticed` and `reviewed` as `1`, in any case. An unknown `status` never resolves.
* Without a valid `id`, Spike falls back to matching by title. Always send `id`: an alert without one cannot be reliably resolved.
* Changes to `eventType`, `status`, `severity`, `user`, `updateTime` and `notes` between deliveries do not create a new incident.
* The incident title is `{message}: {jobName} on {host}`, for example `Ended not OK: nightly-invoice-export on prod-batch-agent-02`.
  * `message` is Control-M's own sentence with whitespace collapsed. A variable Control-M did not expand counts as missing.
  * `: {jobName}` is dropped when `message` already names the job as a whole word, for example `Job nightly-invoice-export failed on prod-batch-agent-02`.
  * `on {host}` uses `server` when `host` is empty. It is dropped when `message` already names it, or when neither is present.
  * With an empty `message` the title is `Control-M alert: {jobName} on {host}`, then `Control-M alert on {host}`, then `Control-M alert with no details`.
  * The title is at most 200 characters. The message is cut at a word boundary with `...` and the `: {jobName} on {host}` part is kept whole, unless that part alone is over 100 characters, in which case the title is cut plainly.
  * `I`, `U`, Noticed and Handled deliveries of one alert give the same title. `id`, times, `status`, `severity` and `notes` never appear in it.

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
3. Save the listener script below on the machine that runs the alerts listener, and make it executable. Control-M starts it with `/bin/sh`, so it is written in plain POSIX shell. Control-M passes each field name as one argument with a trailing space (`id: `) and each value as the next argument (`4127 `). The script trims both and ignores template fields it does not know, such as `closedByControlM` and `ticketNumber`. Replace `SPIKE_WEBHOOK_URL` with the URL from Step 1.
4. Register the script as the listener's command, following BMC's tutorial for your version, then restart the listener.

```bash
#!/bin/sh
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
  case "$trimmed" in
    *[!A-Za-z:]*|*:?*|:|"")
      value="${value:+$value }$trimmed"
      ;;
    *:)
      flush
      key="${trimmed%:}"
      case "$FIELDS" in
        *" $key "*) name="$key" ;;
        *) name="" ;;
      esac
      value=""
      ;;
    *)
      value="${value:+$value }$trimmed"
      ;;
  esac
done
flush

curl -sS -X POST -H 'Content-Type: application/json' -d "$body" "$SPIKE_WEBHOOK_URL"
```

The script needs `jq` and `curl`. A field with no value, such as `user:`, is sent as an empty string.

The script produces this body for a newly issued alert:

```json
{
  "eventType": "I",
  "id": "2193",
  "server": "IN01",
  "fileName": "",
  "runId": "00q2e",
  "severity": "V",
  "status": "0",
  "time": "20261014031207",
  "user": "",
  "updateTime": "",
  "message": "Ended not OK",
  "runAs": "ctmagent",
  "subApplication": "invoicing",
  "application": "finance-batch",
  "jobName": "nightly-invoice-export",
  "host": "prod-batch-agent-02",
  "type": "R",
  "runNo": "00001",
  "notes": ""
}
```

When an operator handles (closes) the alert, the script sends the same alert with `eventType` `U` and `status` `2`:

```json
{
  "eventType": "U",
  "id": "2193",
  "server": "IN01",
  "fileName": "",
  "runId": "00q2e",
  "severity": "V",
  "status": "2",
  "time": "20261014031207",
  "user": "jsmith",
  "updateTime": "20261014034522",
  "message": "Ended not OK",
  "runAs": "ctmagent",
  "subApplication": "invoicing",
  "application": "finance-batch",
  "jobName": "nightly-invoice-export",
  "host": "prod-batch-agent-02",
  "type": "R",
  "runNo": "00001",
  "notes": "Input file re-delivered, job rerun ended OK"
}
```
{% endtab %}
{% endtabs %}

### Fields

Send these fields and no others. All values are strings. `id`, `eventType`, `status` and `message` drive how alerts open and resolve; `jobName`, `host` and `server` build the title. The rest are kept on the incident.

| Field | Control-M name | Meaning |
| --- | --- | --- |
| `eventType` | `call_type` | **Required.** `I` = newly issued alert, `U` = update of an existing alert. |
| `id` | `alert_id` | **Required.** Unique key of the alert, the same across its `I` and `U` deliveries. |
| `status` | `status` | **Required.** `0` Not_Noticed, `1` Noticed, `2` Handled (Closed). |
| `message` | `message` | **Required.** The full text of the alert. It starts the incident title. |
| `jobName` | `job_name` | Job that raised the alert. Used in the title. |
| `host` | `host_id` | Agent host where the job ran. Used in the title. |
| `server` | `data_center` | Control-M/Server. Used in the title when `host` is empty. |
| `severity` | `severity` | `V` very urgent, `U` urgent, `R` regular. Kept only; no severity badge is set. |
| `type` | `alert_type` | `R` regular, `B` SLA (BIM). Kept only. |
| `application` | `application` | The job's application. Kept only. |
| `subApplication` | `sub_application` | The job's sub-application. Kept only. |
| `fileName` | `memname` | Job file name, often empty. Kept only. |
| `runId` | `order_id` | Order id of the job run. Kept only. |
| `runNo` | `run_counter` | Run counter of the job execution. Kept only. |
| `runAs` | `run_as` | OS user the job runs as. Kept only. |
| `time` | `send_time` | When the alert was issued, `yyyymmddhhmmss`. Kept only. |
| `updateTime` | `last_time` | When the alert was last modified. Changes on every `U`. Kept only. |
| `user` | `last_user` | The user who last changed the alert. Kept only. |
| `notes` | `notes` | Note text attached to the alert. Kept only. |

On-premises Control-M/EM uses the older names in the "Control-M name" column (`call_type`, `alert_id`, `data_center` and so on). If your listener receives those, map them to the field names in the first column before posting.

{% hint style="warning" %}
Auto-resolve depends on Control-M sending a delivery with status `2` when an alert is handled. We expect an operator setting the alert to Handled to do this, but it has not been confirmed on a real delivery; alerts that are never handled stay open in Spike. Control-M has no setting that handles an alert automatically when a rerun ends OK.

Alert ids are unique only within one Control-M/EM or SaaS environment. Create one Spike integration for each environment.
{% endhint %}

## Test the integration
1. Make a Control-M job end not OK so that it raises an alert, or run the listener script by hand the way Control-M does, for example `/bin/sh listener.sh "eventType: " "I " "id: " "2193 " "status: " "0 " "message: " "Ended not OK " "jobName: " "nightly-invoice-export " "host: " "prod-batch-agent-02 "`. It posts the first body above, limited to the fields you pass.
2. Verify a new incident titled `Ended not OK: nightly-invoice-export on prod-batch-agent-02` is created in Spike.
3. In Control-M, handle (close) the alert, or run the script again with `"eventType: " "U " "status: " "2 "` and the same `id`.
4. Confirm Spike auto-resolves the incident for that `id`.
