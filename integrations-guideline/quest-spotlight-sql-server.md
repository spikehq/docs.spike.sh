---
description: >-
  Send Quest Spotlight on SQL Server alarms to Spike so a raised alarm pages your on-call team by phone, SMS, Slack or Teams, and resolves its incident when Spotlight clears the alarm.
---

# Integrate Spike with Quest Spotlight on SQL Server

[Quest Spotlight on SQL Server Enterprise](https://www.quest.com/products/spotlight-on-sql-server-enterprise/) monitors SQL Server instances and raises alarms when a metric crosses a threshold, such as days since the last full backup or average CPU usage.

Spotlight has no webhook action. It can, however, run a program when an alarm is raised or cleared, and that program can call a URL. Point two alarm actions at a Spike integration URL and a raised alarm pages your on-call team, a repeat of the same alarm joins the incident that is already open, and the incident resolves itself when Spotlight clears the alarm.

{% hint style="info" %}
Spike matches a clear to its raise by `alarm_id`. Compose it from the same template in both actions and a Medium alarm that becomes High, and then clears, stays one incident.
{% endhint %}

## Set up instructions

**Step 1:** Create a Quest Spotlight on SQL Server integration in the Spike dashboard and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

**Step 2:** Create the two alarm actions in Spotlight. You need one action for raised alarms and one for cleared alarms.

1. Open **Spotlight on SQL Server Enterprise** and go to the **Alarm Action** settings (the Alarm Action Dialog).
2. Create a new action of type **Run a program**.
3. **Conditions:** select the alarm severities you want to be paged for: **Low**, **Medium**, **High** and **Information**.
4. **Program:** `curl.exe`
5. **Command line (arguments):** paste the following, replacing `YOUR_SPIKE_WEBHOOK_URL` with the URL from Step 1:

   ```
   -m 20 -X POST -H "Content-Type: application/json" -d "{\"status\":\"raised\",\"alarm_id\":\"{{CONNECTION_NAME}}|{{RULE_NAME}}|{{key}}\",\"connection_name\":\"{{CONNECTION_NAME}}\",\"connection_desc\":\"{{CONNECTION_DESC}}\",\"rule_name\":\"{{RULE_NAME}}\",\"key\":\"{{key}}\",\"severity\":\"{{SEVERITY}}\",\"value\":\"{{value}}\",\"alarm_message\":\"{{MESSAGE}}\",\"time\":\"{{TIME}}\"}" YOUR_SPIKE_WEBHOOK_URL
   ```

   `-m 20` sets a 20 second timeout. Spotlight ignores a new run of an action while the previous run is still executing, so a hanging request could swallow the cleared event. Keep the timeout.
6. Save the action.
7. Create a second **Run a program** action. For **Conditions** use **The alarm has been cleared**.
8. Use the same program and the same command line, with one change: `\"status\":\"cleared\"` instead of `\"status\":\"raised\"`. Every other field stays exactly as above.
9. Save the action and assign both actions to the alarms (or to all alarms) you want in Spike.

**Step 3:** Trigger or wait for an alarm and confirm that an incident appears in Spike.

## Fields Spike reads

| Field | Required | What it is |
| --- | --- | --- |
| `status` | Yes | `raised` in the first action, `cleared` in the second. Anything other than `cleared`, or a missing value, is treated as a raised alarm. |
| `alarm_id` | Yes | `{{CONNECTION_NAME}}\|{{RULE_NAME}}\|{{key}}`, identical in both actions. It does not contain the severity. |
| `connection_name` | Yes | `{{CONNECTION_NAME}}`, the Spotlight connection (SQL Server instance) the alarm was raised on. |
| `connection_desc` | No | `{{CONNECTION_DESC}}`, the display name of the connection. Used in the title when present. |
| `rule_name` | Yes | `{{RULE_NAME}}`, the alarm name. |
| `key` | No | `{{key}}`, the item of a multi-valued alarm, such as the database name. |
| `severity` | No | `{{SEVERITY}}`. |
| `value` | No | `{{value}}`, the value that triggered the alarm. |
| `alarm_message` | Yes | `{{MESSAGE}}`, Spotlight's sentence about what is wrong. It becomes the incident title. |
| `time` | No | `{{TIME}}`, when the alarm was raised. Kept on the event only. |

### Raised alarm

```json
{
  "status": "raised",
  "alarm_id": "SQLPROD01|Backup - Days Since Last Full Backup|SalesDB",
  "connection_name": "SQLPROD01",
  "connection_desc": "Sales OLTP (prod)",
  "rule_name": "Backup - Days Since Last Full Backup",
  "key": "SalesDB",
  "severity": "High",
  "value": "4",
  "alarm_message": "Database SalesDB has not had a full backup for 4 days.",
  "time": "2026-10-09 03:12:45"
}
```

Spike opens an incident titled `Database SalesDB has not had a full backup for 4 days on Sales OLTP (prod)`.

### Cleared alarm

```json
{
  "status": "cleared",
  "alarm_id": "SQLPROD01|Backup - Days Since Last Full Backup|SalesDB",
  "connection_name": "SQLPROD01",
  "connection_desc": "Sales OLTP (prod)",
  "rule_name": "Backup - Days Since Last Full Backup",
  "key": "SalesDB",
  "severity": "Normal",
  "value": "0",
  "alarm_message": "Database SalesDB was last fully backed up 0 days ago.",
  "time": "2026-10-09 04:02:10"
}
```

Spike finds the incident with the same `alarm_id` and resolves it.

## FAQs

<details>
<summary>Why are there two actions?</summary>
Spotlight can run a program for a raised alarm and for a cleared alarm, but the program receives no field that says which one it was. The `status` you hard-code in each action tells Spike.
</details>

<details>
<summary>Why must `alarm_id` leave out the severity?</summary>
Spotlight can raise a new alarm when the severity changes. Without the severity in `alarm_id`, a Medium to High change joins the open incident instead of paging again, and the clear resolves it.
</details>

<details>
<summary>The incident did not resolve. What should I check?</summary>
Check that the cleared action sends the same `alarm_id` template as the raised action and that its `status` is `cleared`. Also check that the program call finished within the timeout.
</details>

<details>
<summary>My alarm message contains quotes or backslashes.</summary>
`{{MESSAGE}}` is placed into the JSON as is. A value containing a double quote or backslash can make the body invalid JSON. If you see missing events, test with such an alarm and adjust the command line for your Windows shell.
</details>
