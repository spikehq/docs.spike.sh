---
description: >-
  Send PA Server Monitor (Power Admin) alerts to Spike so a failing monitor pages your on-call rotation by phone, SMS, Slack or Teams, and resolves its incident when the monitor is back to OK.
---

# Integrate Spike with PA Server Monitor

[PA Server Monitor](https://www.poweradmin.com/server-monitor/) (by Power Admin) watches Windows and Linux servers with monitors for disk space, CPU, services, event logs, ping and more. When a monitor finds a problem it runs the actions you attached to it. A **Call URL** action posts that alert to Spike, and a second Call URL action in the monitor's **Resolved/Fixed Actions** tells Spike when the monitor is back to normal.

Spike opens one incident per monitor on one computer. A repeat from the same monitor lands on the incident already open instead of paging again, and the incident resolves itself when PA Server Monitor reports the monitor as OK.

## Incident identity and title

Spike identifies the incident by `monitor_key`. You build it from two PA Server Monitor variables as `$Machine$/$MonitorTitle$`, so one monitor on one computer has the same key on its error delivery, every escalation re-delivery and its resolved delivery, for example `SQL-PROD-02/Disk Space C:`. Spike compares it exactly as sent.

`monitor_key` is not an id when it is empty, or when it still contains a variable PA Server Monitor did not expand: a `$Name$` token anywhere in it (`$Machine$/$MonitorTitle$`, `SQL-PROD-02/$MonitorTitle$`), or a value that is only `$name`, `${name}`, `{{name}}` or `%name%`. Two alerts that both carry an unexpanded key are two incidents. When there is no usable key, Spike matches the next event by title instead.

The title is your own monitor message, `monitor_message` (`$MonitorMsg$`, the sentence you write per monitor in **Advanced Monitor Options**), with whitespace collapsed:

```
Low free space on the system drive, check SQL log growth on SQL-PROD-02
```

* ` on {machine}` is appended unless the sentence already names the computer as a whole word.
* When `monitor_message` is empty or unexpanded, the title is `{monitor_title} on {machine}`, for example `Disk Space C: on SQL-PROD-02`.
* When that is not available either, the title is `{monitor_title}` alone, then `PA Server Monitor alert on {machine}`, then `PA Server Monitor alert with no details`.
* A recovery is titled `{monitor_title} on {machine} is back to OK` (or `PA Server Monitor alert on {machine} is back to OK`, or `PA Server Monitor alert is back to OK`).
* A value that is empty or an unexpanded variable counts as missing.
* The title is capped at 200 characters. The ` on {machine}` part is kept whole and the rest is cut back to a word boundary with `...`.

The title never holds `details`, `time_in_error`, `date`, `time`, `alert_id` or `status`. Those change between deliveries of the same alert and are shown on the incident page only. `alert_id`, `status_text`, `group`, `machine_ip` and `monitor_type` are shown on the incident page as well.

## What each `status` does

`status` is PA Server Monitor's `$Status$` code, compared without regard to case or surrounding spaces.

| `status` | What happens in Spike |
| --- | --- |
| `msOK`, `msUNACKNOWLEDGED` | Resolves the open incident |
| `msALERT`, `msALERT_RED`, `msALERT_GREEN`, `msERROR`, `msCANTMONITOR`, `msUNLICENSED`, `msWRONG_EDITION`, `msOWNING_SATELLITE_DISCONNECTED` | Opens an incident, or joins the open one with the same `monitor_key` |
| A missing, unexpanded or unknown value | Treated as an alert, so a misconfigured body still pages |
| `msSUPPRESSED_ALERT`, `msSUPPRESSED_ERROR`, `msDISABLED`, `msRUNNING`, `msINIT`, `msPAUSING`, `msSKIPPINGACTIONS`, `msCANTMONITORNOW`, `msTRAINING`, `msMAINTENANCE`, `msEXCLUSION_PERIOD`, `msDEPENDENCY_NOT_MET`, `msSERVER_DISABLED` | Joins an open incident only. It never opens or resolves one, and is dropped when nothing is open |

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
2. Set the **URL** to the webhook URL from Step 1 and select **Custom POST**, with `application/json` as the encoding. Plain **POST** sends name/value pairs as a form post and cannot carry this body.
3. Paste the template below into the **Parameters** section. Keep the field names exactly as written.
4. Save the action.

```json
{
  "monitor_key": "$Machine$/$MonitorTitle$",
  "alert_id": "$AlertID$",
  "status": "$Status$",
  "status_text": "$StatusText$",
  "machine": "$Machine$",
  "machine_ip": "$MachineIP$",
  "group": "$Group$",
  "monitor_title": "$MonitorTitle$",
  "monitor_type": "$MonitorType$",
  "monitor_message": "$MonitorMsg$",
  "details": "$Details_Single_Line['\"',' ']$",
  "time_in_error": "$TimeInError$",
  "date": "$Date$",
  "time": "$Time$"
}
```

| Field | Value | Used for |
| --- | --- | --- |
| `monitor_key` | `$Machine$/$MonitorTitle$` | Required. Identity of the incident |
| `status` | `$Status$` | Required. Alert or recovery, see above |
| `machine` | `$Machine$` | The computer, in the title |
| `monitor_title` | `$MonitorTitle$` | The monitor, in the title |
| `monitor_message` | `$MonitorMsg$` | The incident title when set |
| `details` | `$Details_Single_Line$` with double quotes replaced by spaces | Incident page only |
| `status_text` | `$StatusText$` | Incident page only |
| `alert_id` | `$AlertID$` | Incident page only |
| `group` | `$Group$` | Incident page only |
| `machine_ip` | `$MachineIP$` | Incident page only |
| `monitor_type` | `$MonitorType$` | Incident page only |
| `time_in_error` | `$TimeInError$` | Incident page only |
| `date` | `$Date$` | Incident page only |
| `time` | `$Time$` | Incident page only |

`monitor_key` and `status` are the required fields. Without `monitor_message`, `monitor_title` or `machine`, the title falls back to the generic forms above.

{% hint style="warning" %}
PA Server Monitor documents no JSON escaping. A backslash in an expanded value (a Windows path, `DOMAIN\host`) or a double quote in `$MonitorTitle$` or `$MonitorMsg$` makes the posted body invalid JSON. Avoid them in monitor titles and messages. The replace modifier on `details` swaps double quotes for spaces for the same reason.
{% endhint %}

{% hint style="info" %}
Spike has not seen a captured payload from PA Server Monitor. The body above is Spike's template built from PA Server Monitor's documented variables, so check the first real alert on the incident page, including that `details` expands as expected in your PA Server Monitor version.
{% endhint %}

## Step 3 — Attach the action to your monitors

1. Open the monitor you want to page on and go to its **Actions** settings.
2. Under the **Error** actions, add `Spike - alert`.
3. Repeat for each monitor, or use a shared action list if you have one.
4. Under **Advanced Monitor Options**, write the monitor's message. It becomes the incident title.

## Step 4 — Create the recovery action

A recovery is a second action with the same URL, method and body, run when the monitor is fixed.

1. Add another **Call URL** action, for example `Spike - recovery`, with the same URL, **Custom POST** (`application/json`) and body as Step 2.
2. On each monitor, add `Spike - recovery` to its **Resolved/Fixed Actions**. `$Status$` should then expand to `msOK` and `$StatusText$` to `OK`.

{% hint style="info" %}
Attach both actions to every monitor you want to page on. PA Server Monitor does not document whether `$Machine$` and `$MonitorTitle$` expand the same in the resolved action as in the error action, or that `$Status$` is `msOK` there. If either differs, Spike cannot match the recovery and the incident stays open; compare `monitor_key` and `status` on both events if incidents do not resolve. Event-type monitors fire on every detection and never run resolved actions, so their repeats join the open incident until you resolve it by hand.
{% endhint %}

## Step 5 — Test it

Lower a monitor's threshold until it alerts, then restore it, and check that:

1. An incident opens in Spike with the monitor's message as its title.
2. A second alert from the same monitor lands on that incident without paging again.
3. When the monitor returns to normal, the incident resolves.

## Example payloads

An alert, which opens the incident titled `Low free space on the system drive, check SQL log growth on SQL-PROD-02`:

```json
{
  "monitor_key": "SQL-PROD-02/Disk Space C:",
  "alert_id": "48213",
  "status": "msALERT_RED",
  "status_text": "Alert (Red)",
  "machine": "SQL-PROD-02",
  "machine_ip": "10.20.4.17",
  "group": "SQL Servers",
  "monitor_title": "Disk Space C:",
  "monitor_type": "Disk Space Monitor",
  "monitor_message": "Low free space on the system drive, check SQL log growth",
  "details": "Drive C: has 3.8 GB free (4% of 95.4 GB), below the 10% free space limit",
  "time_in_error": "Was in error for 0h 5m 0s",
  "date": "10/13/2026",
  "time": "3:14:07 AM"
}
```

The recovery for the same monitor, which resolves it and is titled `Disk Space C: on SQL-PROD-02 is back to OK`:

```json
{
  "monitor_key": "SQL-PROD-02/Disk Space C:",
  "alert_id": "48213",
  "status": "msOK",
  "status_text": "OK",
  "machine": "SQL-PROD-02",
  "machine_ip": "10.20.4.17",
  "group": "SQL Servers",
  "monitor_title": "Disk Space C:",
  "monitor_type": "Disk Space Monitor",
  "monitor_message": "Low free space on the system drive, check SQL log growth",
  "details": "Drive C: has 21.6 GB free (23% of 95.4 GB)",
  "time_in_error": "Was in error for 1h 2m 3s",
  "date": "10/13/2026",
  "time": "4:16:10 AM"
}
```

Spike keeps the whole body on the incident, so [alert rules](../alerts/alert-rules.md) and the [Title Remapper](../alerts/title-remapper.md) can read any field as `data.body.<field>`.

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Check that the URL is the full webhook URL with nothing appended, that the action is set to **Custom POST** with `application/json` and the JSON template in Parameters, and that the monitor's Error actions include the Spike action. If the body is not valid JSON (a backslash or double quote in a title or message), Spike cannot read it. Also check that the integration is not archived in Spike.

</details>

<details>

<summary>Incidents never resolve</summary>

Check that `Spike - recovery` is in the monitor's Resolved/Fixed Actions, that its `status` arrives as `msOK`, and that `monitor_key` is identical on the alert and the recovery.

</details>

<details>

<summary>Two alerts became one incident, or one alert became two</summary>

Check `monitor_key` on the incidents. A key that still contains `$Machine$` or `$MonitorTitle$` is not an id. Without a key, Spike matches by title, so give each monitor its own message in **Advanced Monitor Options**.

</details>

Disclaimer: These integration instructions are offered independently by Spike.sh, and Spike.sh is not affiliated with nor a partner of Power Admin LLC.
