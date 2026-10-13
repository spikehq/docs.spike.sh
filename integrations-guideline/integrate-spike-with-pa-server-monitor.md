---
description: >-
  Send PA Server Monitor (Power Admin) alerts to Spike so a failing monitor pages your on-call rotation by phone, SMS, Slack or Teams, and resolves its incident when the monitor is back to OK.
---

# Integrate Spike with PA Server Monitor

[PA Server Monitor](https://www.poweradmin.com/server-monitor/) (by Power Admin) watches Windows and Linux servers with monitors for disk space, CPU, services, event logs, ping and more. When a monitor finds a problem it runs the actions you attached to it. A **Call URL** action posts that alert to Spike, and a second Call URL action in **Fixed/Resolved Actions** tells Spike when the monitor is back to normal.

Spike opens one incident per monitor on one computer. A repeat alert from the same monitor lands on the incident already open instead of paging again, and the incident resolves itself when PA Server Monitor reports the monitor as OK.

## Incident identity and title

Spike identifies the incident by `monitor_key`, which you build in the template as `$Machine$/$MonitorTitle$` (computer name, a slash, monitor title). The Error action and the Resolved action describe the same monitor on the same computer, so they send the same key, and that is what joins a repeat alert to its incident and a recovery to its incident. The key is compared exactly as sent. Renaming a monitor or a computer changes the key.

A `monitor_key` counts only when it is not empty and still has no unexpanded `$Variable$` token in it (for example `$Machine$/CPU Usage` is not a key). Then Spike falls back to `machine` plus `monitor_title`, and if those are not usable either, it matches by title.

The title is PA Server Monitor's own sentence (`details`) followed by the computer:

```
CPU usage has been above 90% for 10 minutes (currently 97%) on DB-PROD-03
```

* ` on {machine}` is left off when `details` already names the computer, for example `Drive D: on fs-01 has 3.2 GB free, below the 10% threshold`.
* Whitespace is collapsed and the title is capped at 200 characters by cutting `details`, never the computer name.
* When `details` is empty or unexpanded, the title is `{monitor_title} on {machine}`.
* A recovery is titled `{monitor_title} on {machine} recovered`, for example `CPU Usage on DB-PROD-03 recovered`.
* When there is no usable key and no usable computer plus monitor title, Spike matches by title, so the title carries no readings: `{monitor_title}` if only the monitor title is usable, `PA Server Monitor alert on {machine}` if only the computer is, otherwise `PA Server Monitor alert with no monitor or computer name`. A recovery gets the same title and closes the incident.

With a usable key, the title is display only. Matching is done on `monitor_key`, so a reading that changes between alerts does not open a new incident.

## What each `status` does

`status` is PA Server Monitor's `$Status$` code, compared case-insensitively after trimming.

| `status` | What happens in Spike |
| --- | --- |
| `msALERT`, `msALERT_RED`, `msALERT_GREEN`, `msERROR`, `msCANTMONITOR` | Opens an incident, or joins the open one with the same identity |
| `msOK`, `msUNACKNOWLEDGED` | Resolves the open incident |
| `msSUPPRESSED_ALERT`, `msDISABLED`, `msRUNNING`, `msINIT`, `msPAUSING`, `msMAINTENANCE`, `msTRAINING`, `msEXCLUSION_PERIOD`, `msDEPENDENCY_NOT_MET`, and any other code | Added to an open incident, never opens or closes one |
| Missing, empty or unexpanded (`$Status$`) | Treated as an alert, so a misconfigured body still pages |

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
2. Set the **URL** to the webhook URL from Step 1.
3. Set the method to **POST**, choose **Pass Parameters: Custom POST**, and set the content type to `application/json`.
4. Paste this body exactly. `status` and `monitor_key` are required: `status` tells Spike an alert from a recovery and `monitor_key` joins them. The other fields feed the title and the incident page.

```json
{
  "monitor_key": "$Machine$/$MonitorTitle$",
  "status": "$Status$",
  "details": "$Details_Single_Line$",
  "monitor_title": "$MonitorTitle$",
  "machine": "$Machine$",
  "group": "$Group$",
  "monitor_type": "$MonitorType$"
}
```

5. Save the action.

| Field | Filled by | Used for |
| --- | --- | --- |
| `monitor_key` | `$Machine$/$MonitorTitle$` | Required. Identity of the incident |
| `status` | `$Status$` | Required. Alert or recovery, see above |
| `details` | `$Details_Single_Line$` | The vendor's sentence; the incident title |
| `monitor_title` | `$MonitorTitle$` | Recovery and fallback titles; backup identity |
| `machine` | `$Machine$` | The computer, shown in every title; backup identity |
| `group` | `$Group$` | Context on the incident page only |
| `monitor_type` | `$MonitorType$` | Context on the incident page only |

{% hint style="warning" %}
PA Server Monitor does not document whether Custom POST escapes variable values. A backslash (such as a Windows path) or a double quote in `details` or a monitor title could make the body invalid JSON, and Spike would reject it. If alerts for one monitor do not arrive, check its title and details for those characters.
{% endhint %}

## Step 3 — Attach the action to your monitors

1. Open the monitor you want to page on and go to its **Actions** settings.
2. Under the **Error** actions, add `Spike - alert`.
3. Repeat for each monitor, or use a shared action list if you have one.

## Step 4 — Create the recovery action

A recovery is a second action with the same body, run when the monitor is fixed.

1. Add another **Call URL** action, for example `Spike - recovery`, with the same URL, **POST**, **Custom POST**, `application/json` and the same body as Step 2. PA Server Monitor fills `$Status$` with `msOK` when it runs the action for a recovery.
2. On each monitor, add `Spike - recovery` under **Resolved Actions**.

{% hint style="info" %}
PA Server Monitor runs resolved actions only if the alert actions ran for the original event. Attach both actions to every monitor you want to page on. A recovery that arrives when no incident is open is dropped, not turned into a new incident.
{% endhint %}

## Step 5 — Test it

Lower a monitor's threshold until it alerts, then restore it, and check that:

1. An incident opens in Spike with PA Server Monitor's sentence and the computer in its title.
2. A second alert from the same monitor lands on that incident without paging again.
3. When the monitor returns to normal, the incident resolves.

## Example payloads

An alert, which opens the incident:

```json
{
  "monitor_key": "DB-PROD-03/CPU Usage",
  "status": "msALERT_RED",
  "details": "CPU usage has been above 90% for 10 minutes (currently 97%)",
  "monitor_title": "CPU Usage",
  "machine": "DB-PROD-03",
  "group": "Production Databases",
  "monitor_type": "CPU Usage"
}
```

The recovery for the same monitor, which resolves it and is titled `CPU Usage on DB-PROD-03 recovered`:

```json
{
  "monitor_key": "DB-PROD-03/CPU Usage",
  "status": "msOK",
  "details": "CPU usage is 23%",
  "monitor_title": "CPU Usage",
  "machine": "DB-PROD-03",
  "group": "Production Databases",
  "monitor_type": "CPU Usage"
}
```

Spike keeps the whole body on the incident, so [alert rules](../alerts/alert-rules.md) and the [Title Remapper](../alerts/title-remapper.md) can read any field as `data.body.<field>`.

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Check that the URL is the full webhook URL with nothing appended, that the action is set to POST with Custom POST and `application/json`, and that the monitor's Error actions include the Spike action. Also check that the integration is not archived in Spike.

</details>

<details>

<summary>Incidents never resolve</summary>

Check that `Spike - recovery` is attached under the monitor's **Resolved Actions**, and that its body is the same as the alert action's, including `monitor_key`. A recovery resolves the incident with the same key.

</details>

<details>

<summary>Every alert opens a new incident</summary>

Compare `monitor_key` on two incidents. If the monitor title or computer name changes between alerts, the keys differ. A key that still contains a literal `$Machine$` or `$MonitorTitle$` is not used at all.

</details>

Disclaimer: These integration instructions are offered independently by Spike.sh, and Spike.sh is not affiliated with nor a partner of Power Admin LLC.
