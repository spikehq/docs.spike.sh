---
description: >-
  Send PA Server Monitor (Power Admin) alerts to Spike so a failing monitor pages your on-call rotation by phone, SMS, Slack or Teams, and resolves its incident when the monitor is back to OK.
---

# Integrate Spike with PA Server Monitor

[PA Server Monitor](https://www.poweradmin.com/server-monitor/) (by Power Admin) watches Windows and Linux servers with monitors for disk space, CPU, services, event logs, ping and more. When a monitor finds a problem it runs the actions you attached to it. A **Call URL** action posts that alert to Spike, and a second Call URL action in **Fixed/Resolved Actions** tells Spike when the monitor is back to normal.

Spike opens one incident per alert. A repeat from the same alert lands on the incident already open instead of paging again, and the incident resolves itself when PA Server Monitor reports the monitor as OK.

## Incident identity and title

Spike identifies the incident by `alert_id`, the value of `$AlertID$` (PA Server Monitor's unique integer for the alert). It arrives as a form string and is compared exactly as sent. `0` is a valid id. A value that is empty, or is a variable PA Server Monitor did not expand (`$AlertID$`, `$alert_id`, `${alert_id}`, `{{alert_id}}`, `%alert_id%`), is not an id, so two alerts that both carry an unexpanded `alert_id` are two incidents. When there is no usable id, Spike matches the next event by title instead.

The title is your own monitor message, `message` (`$MonitorMsg$`, the sentence you set under **Advanced Monitor Options**), with whitespace collapsed:

```
Low disk space on the SQL data drive of db-prod-03
```

* When `message` is empty or unexpanded, the title is `{monitor_title} on {where}`, for example `Disk Space - D: on db-prod-03`. `{where}` is `machine_alias`, else `machine`, else `group`.
* When `monitor_title` is empty as well, the title is `PA Server Monitor alert on {where}`.
* When nothing is usable, the title is `PA Server Monitor alert with no details`.
* A recovery is titled `{same title} recovered`, for example `Low disk space on the SQL data drive of db-prod-03 recovered`.
* The title is capped at 200 characters. The cap cuts `monitor_title`, never the `{where}` part.

The title never holds `details`, readings, ids, status or timestamps, so it is the same on every repeat. Set a distinct `$MonitorMsg$` per monitor: with no usable `alert_id`, the title is what joins a repeat and resolves a recovery. `details`, `time_in_error`, `date`, `time`, `status` and `status_text` change between deliveries of the same alert and are shown on the incident page only.

## What each `status` does

`status` is PA Server Monitor's `$Status$` code. `status_text` (`$StatusText$`: OK, Alert, Internal Error) is read only when `status` is missing or unexpanded: `OK` resolves, anything else fires.

| `status` | What happens in Spike |
| --- | --- |
| `msALERT`, `msALERT_RED` | Opens an incident, or joins the open one with the same identity |
| `msERROR` (the monitor's internal error) | Opens an incident, or joins the open one |
| `msALERT_GREEN` | Joins an open incident, never opens one |
| `msOK` | Resolves the open incident |
| `msDISABLED` | Ignored, no incident |
| Anything else, or an unexpanded `$Status$` | Treated as an alert, so a misconfigured body still pages |

A recovery that arrives when no incident is open is dropped, not turned into a new incident.

## Prerequisites

* A PA Server Monitor installation where you can edit **Actions** and the monitors that use them
* A PA Server Monitor integration in Spike and its webhook URL
* The PA Server Monitor server must be able to reach `hooks.spike.sh` over HTTPS

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → PA Server Monitor**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Create the alert action

1. In the PA Server Monitor console, open **Actions** and add a new action of type **Call URL**. Name it, for example, `Spike - alert`.
2. Set the **URL** to the webhook URL from Step 1 and the method to **POST**.
3. Add one parameter for each row of the table below, using the name in the first column as the parameter name and the variable in the second as its value. Keep the names exactly as written.
4. Save the action.

| Parameter name | Value | Used for |
| --- | --- | --- |
| `alert_id` | `$AlertID$` | Required. Identity of the incident |
| `status` | `$Status$` | Required. Alert or recovery, see above |
| `status_text` | `$StatusText$` | Fallback when `status` is missing |
| `message` | `$MonitorMsg$` | The incident title |
| `monitor_title` | `$MonitorTitle$` | Fallback title |
| `machine_alias` | `$MachineAlias$` | Fallback title, the computer |
| `machine` | `$Machine$` | Fallback title when there is no alias |
| `group` | `$Group$` | Fallback title when there is neither |
| `details` | `$Details_Single_Line$` | Incident page only |
| `monitor_type` | `$MonitorType$` | Incident page only |
| `machine_ip` | `$MachineIP$` | Incident page only |
| `group_path` | `$GroupPath$` | Incident page only |
| `time_in_error` | `$TimeInError$` | Incident page only |
| `date` | `$Date$` | Incident page only |
| `time` | `$Time$` | Incident page only |

`alert_id` and `status` are the required fields. Without a usable `message`, `monitor_title` or computer, the title falls back to the generic forms above.

{% hint style="info" %}
PA Server Monitor's documentation only says the action posts a form, and does not say whether a failed Call URL is retried or which Content-Type it sends. Spike has not seen a captured payload from PA Server Monitor, so check the first real alert on the incident page.
{% endhint %}

## Step 3 — Attach the action to your monitors

1. Open the monitor you want to page on and go to its **Actions** settings.
2. Under the **Error** actions, add `Spike - alert`.
3. Repeat for each monitor, or use a shared action list if you have one.
4. Under **Advanced Monitor Options**, set the monitor's message, which becomes the incident title.

## Step 4 — Create the recovery action

A recovery is a second action with the same URL, method and parameters, run when the monitor is fixed.

1. Add another **Call URL** action, for example `Spike - recovery`, with the same URL, **POST** and parameters as Step 2.
2. On each monitor, attach `Spike - recovery` to the **error resolved** node of its actions. `$Status$` should then expand to `msOK` and `$StatusText$` to `OK`.

{% hint style="info" %}
Attach both actions to every monitor you want to page on. PA Server Monitor does not document whether `$AlertID$` is the same in the resolved action as in the original alert. If it differs, Spike cannot match the recovery by id and the incident stays open; check `alert_id` on both events if incidents do not resolve.
{% endhint %}

## Step 5 — Test it

Lower a monitor's threshold until it alerts, then restore it, and check that:

1. An incident opens in Spike with the monitor's message as its title.
2. A second alert from the same monitor lands on that incident without paging again.
3. When the monitor returns to normal, the incident resolves.

## Example payloads

An alert, which opens the incident:

```json
{
  "alert_id": "48213",
  "status": "msALERT",
  "status_text": "Alert",
  "message": "Low disk space on the SQL data drive of db-prod-03",
  "monitor_title": "Disk Space - D:",
  "monitor_type": "Disk Space Monitor",
  "machine": "DB-PROD-03",
  "machine_alias": "db-prod-03",
  "machine_ip": "10.0.4.23",
  "group": "Production SQL",
  "group_path": "All Servers\\Production\\Production SQL",
  "details": "Drive D: has 4.2 GB free (8%), which is below the 10% limit",
  "time_in_error": "12 minutes",
  "date": "10/13/2026",
  "time": "3:04:12 AM"
}
```

The recovery for the same alert, which resolves it and is titled `Low disk space on the SQL data drive of db-prod-03 recovered`:

```json
{
  "alert_id": "48213",
  "status": "msOK",
  "status_text": "OK",
  "message": "Low disk space on the SQL data drive of db-prod-03",
  "monitor_title": "Disk Space - D:",
  "monitor_type": "Disk Space Monitor",
  "machine": "DB-PROD-03",
  "machine_alias": "db-prod-03",
  "machine_ip": "10.0.4.23",
  "group": "Production SQL",
  "group_path": "All Servers\\Production\\Production SQL",
  "details": "Drive D: has 21 GB free (42%)",
  "time_in_error": "47 minutes",
  "date": "10/13/2026",
  "time": "3:39:30 AM"
}
```

Spike keeps the whole body on the incident, so [alert rules](../alerts/alert-rules.md) and the [Title Remapper](../alerts/title-remapper.md) can read any field as `data.body.<field>`.

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Check that the URL is the full webhook URL with nothing appended, that the action is set to POST, and that the monitor's Error actions include the Spike action. Also check that the integration is not archived in Spike.

</details>

<details>

<summary>Incidents never resolve</summary>

Check that `Spike - recovery` is attached to the monitor's error resolved node, that its `status` arrives as `msOK`, and that `alert_id` matches the one on the alert. When both events carry an id, the ids must be equal.

</details>

<details>

<summary>Two alerts became one incident, or one alert became two</summary>

Check `alert_id` on the incidents. A literal `$AlertID$` is not an id. Without an id, Spike matches by title, so give each monitor its own message in **Advanced Monitor Options**.

</details>

Disclaimer: These integration instructions are offered independently by Spike.sh, and Spike.sh is not affiliated with nor a partner of Power Admin LLC.
