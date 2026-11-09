---
description: >-
  Send Spotlight on SQL Server alarms to Spike so a raised alarm alerts your on-call team, and the incident resolves when Spotlight clears the alarm.
---

# Integrate Spike with Spotlight on SQL Server Enterprise

[Spotlight on SQL Server Enterprise](https://www.quest.com/products/spotlight-on-sql-server-enterprise/) from Quest monitors SQL Server and Windows connections and raises an alarm when a metric crosses a threshold, such as disk free space or page life expectancy.

Spotlight has no webhook action. It can, however, run a PowerShell script when an alarm is raised or cleared, and that script can call a URL. Point two alarm actions at a Spike integration URL: a raised alarm pages your on-call team, a repeat of the same alarm joins the incident that is already open, and the incident resolves itself when Spotlight clears the alarm.

## What Spike does with each alarm

Every body carries a `state` that you type into the script. Spike acts on two values:

| `state` | Sent when | What happens in Spike |
| --- | --- | --- |
| `raised` | The alarm severity is Information, Low, Medium or High | Opens an incident and pages your escalation policy, or joins the open incident with the same `alarm_key` |
| `cleared` | The alarm has been cleared | Resolves the open incident with the same `alarm_key`. Dropped when nothing is open |

Any other value, or a missing `state`, is treated as `raised` and opens an incident. It never resolves one.

### Incident identity

Spike identifies the incident by `alarm_key`, which the script composes as `{{CONNECTION_NAME}}|{{RULE_NAME}}|{{key}}`. It leaves out the severity on purpose: Spotlight raises a new alarm whenever the severity changes, and without the severity in the key a Medium alarm that becomes High joins the same incident instead of paging again. The clear then resolves it.

An `alarm_key` only counts as an id when it holds something other than unexpanded variables. A value such as `{{CONNECTION_NAME}}|{{RULE_NAME}}|{{key}}` arriving as literal text is not an id, and Spike then matches the alarm by its plain title (see below).

A partly expanded key, such as `sqlprod-01|{{RULE_NAME}}|D:`, does count as an id, so every alarm on that connection and drive would share one incident. After setup, open the first incident's payload and check that `alarm_key` holds no `{{` left over.

{% hint style="info" %}
A `cleared` body with no matching open incident is dropped rather than turned into a new incident. Resolving an incident in Spike does not clear the alarm in Spotlight.
{% endhint %}

### What Spotlight does not send

Spotlight runs alarm actions only on the conditions of a rule. Of those, Spike uses **The alarm severity is…** ("Take action when the alarm severity changes to one of the following": Information, Low, Medium, High) and **The alarm has been cleared** ("Take action when the alarm severity returns to Normal"), as [Quest documents](https://help.spotlightessentials.com/enterprise_cfgmonitor_alarmaction). Quest documents no action that runs when an alarm is acknowledged, snoozed or ignored, so acknowledging an alarm in Spotlight does not acknowledge the Spike incident. There is no test notification either.

A rule with **Run actions again after** re-runs its script, and the repeat joins the open incident.

## Incident title

When `alarm_key` is an id, the title is Spotlight's own sentence (`description`, from `{{MESSAGE}}`) with ` on {connection_name}` added when the sentence does not already name the connection:

```
Disk D: has 4.2% free space remaining, below the High threshold of 5% on sqlprod-01
```

Whitespace is collapsed and the title is capped at 200 characters. A longer sentence is cut at its first clause (up to a `;`), else at a comma, else at a word boundary, and ` on {connection_name}` is kept whole (a connection name longer than 100 characters is cut to 100).

The title is display only, so readings in it may change between deliveries without opening a new incident; the `alarm_key` is what joins them.

When `alarm_key` is not an id, or `description` is empty, the title is plain and has no readings, because Spike then matches on the title:

```
Disk Free Space D: on sqlprod-01
```

That is `{rule_name} {key} on {connection_name}`, leaving out `key` when it is empty. With no rule it is `Spotlight alarm on {connection_name}`, and with nothing usable `Spotlight on SQL Server alarm with no details`.

A cleared alarm is titled `{rule_name} {key} on {connection_name} cleared`.

## Severity

Severity comes from the `severity` field (`{{SEVERITY}}`):

| Spotlight severity | Severity in Spike |
| --- | --- |
| `High` | SEV1 |
| `Medium` | SEV2 |
| `Low` | SEV3 |
| `Information` | Left unset |

Severity is set when the incident opens. A later raise at another severity joins the open incident and does not change it.

[Alert rules](../alerts/alert-rules.md) can override severity, route the incident, or suppress it. Read more about [priority and severity](../incidents/priority-and-severity.md).

## Prerequisites

* Spotlight on SQL Server Enterprise, with access to its alarm actions
* A Spotlight on SQL Server Enterprise integration in Spike and its webhook URL
* Outbound HTTPS to `hooks.spike.sh` from each monitored Windows server. Spotlight runs a **Run a Powershell script** action on the monitored server itself, as the account set in that Windows connection's properties
* A Windows connection that does not use **Use Diagnostic Server credentials**. Spotlight cannot run a PowerShell script action for such a connection ([Quest KB 4221017](https://support.quest.com/spotlight-on-sql-server-enterprise/kb/4221017/error-running-powershell-script-in-alarm-actions-cannot-execute-a-powershell-script-for-a-windows-connection-that-uses-the-diagnostic-server))

## Set up instructions

**Step 1:** Create a Spotlight on SQL Server Enterprise integration in the Spike dashboard, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

**Step 2:** Create two alarm action rules in Spotlight, one for raised alarms and one for cleared alarms. A rule runs its actions when all of its conditions are met.

1. In the Spotlight Client, click **Configure | Alarm Actions**, then click **New** to open the **Alarm Action** dialog.
2. **Conditions:** add **The alarm severity is…** and pick **Information**, **Low**, **Medium** and **High**, the severities you want to be paged for. To limit the rule to some alarms or servers, also add **The alarm is…** or **The connection is…**.
3. **Actions:** add **Run a Powershell script**.
4. **Script:** paste the following, replacing `YOUR_SPIKE_WEBHOOK_URL` with the URL from Step 1. Each `{{VARIABLE}}` is one of Spotlight's [alarm message variables](https://help.spotlightessentials.com/enterprise_cfgmonitor_alarm_messagevariables), which Quest documents for use in a PowerShell script.

   ```powershell
   $body = @{
       state           = 'raised'
       alarm_key       = @'
   {{CONNECTION_NAME}}|{{RULE_NAME}}|{{key}}
   '@
       connection_name = @'
   {{CONNECTION_NAME}}
   '@
       display_name    = @'
   {{CONNECTION_DESC}}
   '@
       rule_name       = @'
   {{RULE_NAME}}
   '@
       key             = @'
   {{key}}
   '@
       severity        = @'
   {{SEVERITY}}
   '@
       value           = @'
   {{value}}
   '@
       time            = @'
   {{TIME}}
   '@
       description     = @'
   {{MESSAGE}}
   '@
   }
   foreach ($name in @($body.Keys)) { $body[$name] = $body[$name].Trim() }
   Invoke-RestMethod -Uri 'YOUR_SPIKE_WEBHOOK_URL' -Method Post -ContentType 'application/json' -Body ($body | ConvertTo-Json) -TimeoutSec 20
   ```

   The here-strings (`@'` … `'@`, each closing `'@` at the start of its line) let a value hold quotes and backslashes without breaking the JSON. Keep `-TimeoutSec 20`, so a request that cannot reach Spike ends instead of holding the script open.
5. Save the rule.
6. Click **New** again. For **Conditions** add **The alarm has been cleared**, plus the same **The alarm is…** or **The connection is…** conditions as the first rule. For **Actions** add **Run a Powershell script**.
7. Use the same script with one change: `state = 'cleared'` instead of `state = 'raised'`. Every other line stays exactly as above.
8. Save the rule. Make sure no earlier rule with **Stop processing further rules** or **Suppress the alarm** catches these alarms first.

**Step 3:** Spotlight has no test button for a script action. Run the script by hand in PowerShell with literal values in place of the `{{VARIABLE}}` tokens, or lower a threshold until an alarm fires, and confirm that an incident appears in Spike. Then restore the threshold and confirm the incident resolves.

## Fields Spike reads

The body is exactly the fields in the script above. Do not rename or drop any.

| Field | Required | What it is |
| --- | --- | --- |
| `state` | Yes | `raised` in the first action, `cleared` in the second. |
| `alarm_key` | Yes | `{{CONNECTION_NAME}}\|{{RULE_NAME}}\|{{key}}` (no backslash in the real value), identical in both actions. |
| `description` | Yes | `{{MESSAGE}}`, Spotlight's sentence about what is wrong. It becomes the incident title. |
| `connection_name` | Yes | `{{CONNECTION_NAME}}`, the SQL Server or Windows connection the alarm was raised on. Part of the title. |
| `rule_name` | Yes | `{{RULE_NAME}}`, the alarm name. Used in the plain and cleared titles. |
| `key` | No | `{{key}}`, the item of a multi-valued alarm, such as a drive or database. Used in the plain and cleared titles when not empty. |
| `severity` | No | `{{SEVERITY}}`. Sets the incident severity. |
| `display_name` | No | `{{CONNECTION_DESC}}`, shown on the incident page. |
| `value` | No | `{{value}}`, the alarm value. Shown on the incident page. |
| `time` | No | `{{TIME}}`, when the alarm was raised. Shown on the incident page. |

### Raised alarm

```json
{
  "state": "raised",
  "alarm_key": "sqlprod-01|Disk Free Space|D:",
  "connection_name": "sqlprod-01",
  "display_name": "SQL Prod 01 (Orders)",
  "rule_name": "Disk Free Space",
  "key": "D:",
  "severity": "High",
  "value": "4.2",
  "time": "10/13/2026 3:12:45 AM",
  "description": "Disk D: has 4.2% free space remaining, below the High threshold of 5%"
}
```

Spike opens an incident titled `Disk D: has 4.2% free space remaining, below the High threshold of 5% on sqlprod-01`.

### Cleared alarm

```json
{
  "state": "cleared",
  "alarm_key": "sqlprod-01|Disk Free Space|D:",
  "connection_name": "sqlprod-01",
  "display_name": "SQL Prod 01 (Orders)",
  "rule_name": "Disk Free Space",
  "key": "D:",
  "severity": "Normal",
  "value": "12",
  "time": "10/13/2026 4:05:10 AM",
  "description": "Disk D: has 12% free space remaining"
}
```

Spike finds the incident with the same `alarm_key` and resolves it. If the raised alarm had no usable `alarm_key`, the clear is matched by its plain title, `{rule_name} {key} on {connection_name}`, instead. Its title is `Disk Free Space D: on sqlprod-01 cleared`.

## FAQs

<details>
<summary>Why are there two actions?</summary>
The script receives no variable that says whether the alarm was raised or cleared. The `state` you type into each action tells Spike.
</details>

<details>
<summary>Why must alarm_key leave out the severity?</summary>
Spotlight raises a new alarm when the severity changes. Without the severity in `alarm_key`, a Medium to High change joins the open incident instead of paging again, and the clear resolves it.
</details>

<details>
<summary>The incident did not resolve. What should I check?</summary>
Check that the cleared rule sends the same `alarm_key` template as the raised rule and that its `state` is `cleared`. Also check the Spotlight alarm log for a failed script action, that the monitored server can reach `hooks.spike.sh`, and that Spotlight expanded the variables: an `alarm_key` that arrives as literal `{{CONNECTION_NAME}}|{{RULE_NAME}}|{{key}}` is not an id.
</details>

<details>
<summary>Every alarm opens its own incident.</summary>
Open an incident and look at the payload on its page. If `alarm_key` holds unexpanded variables, Spotlight did not substitute them; check the variable names in your version's alarm action help. Compare them with the [message variables](https://help.spotlightessentials.com/enterprise_cfgmonitor_alarm_messagevariables) your Spotlight version lists.
</details>

<details>
<summary>The cleared alarm has an odd description or severity.</summary>
Neither is used to resolve. A cleared body only needs `state` and the same `alarm_key`. Whether Spotlight fills `{{MESSAGE}}` and `{{SEVERITY}}` for a cleared alarm can vary.
</details>

Disclaimer: These integration instructions are offered independently by Spike.sh, and Spike.sh is not affiliated with nor a partner of Quest Software Inc.
