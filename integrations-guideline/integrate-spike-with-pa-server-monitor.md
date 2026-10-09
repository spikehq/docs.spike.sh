---
description: >-
  Send PA Server Monitor (Power Admin) alerts to Spike so a failing monitor pages your on-call rotation by phone, SMS, Slack or Teams, and resolves its incident when the monitor is back to OK.
---

# Integrate Spike with PA Server Monitor

[PA Server Monitor](https://www.poweradmin.com/server-monitor/) (by Power Admin) watches Windows and Linux servers with monitors for disk space, CPU, services, event logs, ping and more. When a monitor finds a problem it runs the actions you attached to it. A **Call URL** action posts that alert to Spike, and a second Call URL action in **Fixed/Resolved Actions** tells Spike when the monitor is back to normal.

Spike opens one incident per monitor on one computer. A repeat alert from the same monitor lands on the incident already open instead of paging again, and the incident resolves itself when PA Server Monitor reports the monitor as OK.

## Incident identity and title

Spike identifies the incident by `MonitorKey`, which you build in the template as `$Machine$/$MonitorTitle$`. The Error action and the Fixed action describe the same monitor on the same computer, so they send the same key, and that is what joins a recovery to its incident. If `MonitorKey` is left out, Spike falls back to `Machine` plus `MonitorTitle`.

The title is PA Server Monitor's own sentence (`Details`) followed by the computer:

```
Drive C: has 4.1 GB free (4.1% of 100 GB), below the 10% free space threshold on SQL-PROD-02
```

When the sentence already names the computer, ` on {Machine}` is not repeated. When `Details` is empty the title is `{MonitorTitle} on {Machine}`. A recovery is titled:

```
Disk Space: C: on SQL-PROD-02 is back to OK
```

The title is for display. Matching is done on `MonitorKey`, so a reading that changes between alerts does not open a new incident.

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
4. Paste this body. All seven fields are used by Spike, and `Status` is required: it is what tells Spike an alert from a recovery.

```json
{
  "Status": "$Status$",
  "StatusText": "$StatusText$",
  "MonitorKey": "$Machine$/$MonitorTitle$",
  "MonitorTitle": "$MonitorTitle$",
  "MonitorType": "$MonitorType$",
  "Machine": "$Machine$",
  "Details": "$Details_Single_Line['\"',' ']$"
}
```

5. Save the action.

| Field | Filled by | Used for |
| --- | --- | --- |
| `Status` | `$Status$` | Required. `msOK` means recovered; every other value (`msALERT`, `msALERT_RED`, `msCANTMONITOR`, `msERROR`, ...) is an alert |
| `StatusText` | `$StatusText$` | Used only when `Status` is missing or empty: `OK` means recovered |
| `MonitorKey` | `$Machine$/$MonitorTitle$` | Identity of the incident. Strongly recommended |
| `MonitorTitle` | `$MonitorTitle$` | The monitor's title, for example `Disk Space: C:` |
| `Machine` | `$Machine$` | The computer where the monitor found the issue |
| `MonitorType` | `$MonitorType$` | Used in the title only when `MonitorTitle` is empty |
| `Details` | `$Details_Single_Line['"',' ']$` | The vendor's sentence about the fault; it becomes the incident title |

{% hint style="warning" %}
PA Server Monitor does not document whether Custom POST escapes variable values. A backslash (a Windows path such as `C:\`) or a double quote in `Details` or the monitor title could make the body invalid JSON, and Spike would reject it. The `['"',' ']` modifier in the template replaces quotes in `Details` with spaces. If alerts for a particular monitor do not arrive, check whether its title or details contain backslashes.
{% endhint %}

## Step 3 — Attach the action to your monitors

1. Open the monitor you want to page on and go to its **Actions** settings.
2. Under the **Error** (alert) actions, add `Spike - alert`.
3. Repeat for each monitor, or attach the action through a shared action list if you use one.

## Step 4 — Create the recovery action

A recovery is a second action with the same body, run when the monitor is fixed.

1. Add another **Call URL** action, for example `Spike - recovery`, with the same URL, **POST**, **Custom POST**, `application/json` and the same body as Step 2. The body is identical: PA Server Monitor fills `$Status$` with `msOK` and `$StatusText$` with `OK` when it runs the action for a recovery.
2. On each monitor, add `Spike - recovery` under **Fixed/Resolved Actions**.

{% hint style="info" %}
PA Server Monitor runs Fixed actions only if the alert actions ran for the original event. Attach both actions to every monitor you want to page on, or an alert will never be followed by its recovery.
{% endhint %}

A recovery that arrives when no incident is open is dropped, not turned into a new incident.

## Step 5 — Test it

Trigger a test alert from the action's **Test** button, or lower a monitor's threshold until it alerts, and check that:

1. An incident opens in Spike with PA Server Monitor's sentence as its title.
2. A second alert from the same monitor lands on that incident without paging again.
3. When the monitor returns to normal, the incident resolves and the event reads `... is back to OK`.

## Example payloads

An alert, which opens the incident:

```json
{
  "Status": "msALERT",
  "StatusText": "Alert",
  "MonitorKey": "SQL-PROD-02/Disk Space: C:",
  "MonitorTitle": "Disk Space: C:",
  "MonitorType": "Disk Space Monitor",
  "Machine": "SQL-PROD-02",
  "Details": "Drive C: has 4.1 GB free (4.1% of 100 GB), below the 10% free space threshold"
}
```

The recovery for the same monitor, which resolves it:

```json
{
  "Status": "msOK",
  "StatusText": "OK",
  "MonitorKey": "SQL-PROD-02/Disk Space: C:",
  "MonitorTitle": "Disk Space: C:",
  "MonitorType": "Disk Space Monitor",
  "Machine": "SQL-PROD-02",
  "Details": "Drive C: has 22 GB free (22% of 100 GB)"
}
```

Spike keeps the whole body on the incident, so [alert rules](../alerts/alert-rules.md) and the [Title Remapper](../alerts/title-remapper.md) can read any field as `data.body.<field>`.

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Check that the URL is the full webhook URL with nothing appended, that the action is set to POST with Custom POST and `application/json`, and that the monitor's Error actions list includes the Spike action. Also check that the integration is not archived in Spike.

</details>

<details>

<summary>Incidents never resolve</summary>

Check that `Spike - recovery` is attached under the monitor's **Fixed/Resolved Actions**, and that its body is the same as the alert action's, including `MonitorKey`. A recovery resolves the incident with the same `MonitorKey`.

</details>

<details>

<summary>Every alert opens a new incident</summary>

Compare the `MonitorKey` of two incidents on the incident page. If the monitor title or computer name changes between alerts, the keys differ and so do the incidents.

</details>

Disclaimer: These integration instructions are offered independently by Spike.sh, and Spike.sh is not affiliated with nor a partner of Power Admin LLC.
