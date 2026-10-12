---
description: >-
  Send WhatsUp Gold alerts to Spike with a PowerShell Script Action so a down device or monitor pages your on-call rotation by phone, SMS, Slack or Teams, and resolves its incident when WhatsUp Gold reports it up again.
---

# Integrate Spike with WhatsUp Gold

## Overview

[WhatsUp Gold](https://www.whatsupgold.com) is a network and infrastructure monitoring tool. It watches devices with active monitors (Ping, HTTPS, CPU and so on) and passive monitors (SNMP traps, syslog, Windows events), and runs Actions when a monitor or a device changes state.

WhatsUp Gold has no built-in webhook for Spike. Instead you add a **PowerShell Script Action** that posts a small JSON body to your Spike integration URL. You create two actions, one bound to the **Down** state change and one bound to the **Up** state change. The word you type into each script (`down` or `up`) is what tells Spike whether to open or resolve an incident.

{% hint style="info" %}
Spike groups alerts by **device and monitor**. A repeat Down for the same monitor on the same device joins the incident that is already open, and the Up for that monitor resolves it. A device-level alert and a monitor-level alert on the same device stay separate incidents.
{% endhint %}

---

## Set up instructions

**Step 1:** Create a WhatsUp Gold integration in the Spike dashboard and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

**Step 2:** Create the actions in WhatsUp Gold

{% tabs %}
{% tab title="Setup on WhatsUp Gold" %}
1. **Log in to WhatsUp Gold** with an administrator account.

2. **Open the action library:** from the main menu, go to **SETTINGS → Actions & Alerts → Actions and Policies**.

3. **Create the Down action:**
   - On the **Actions** tab, click the **Add** icon.
   - In **Select Action Type**, choose **PowerShell Script** and click **Select**.
   - **Name:** `Spike - Down`.
   - **Script:** paste the script below, replacing `YOUR_SPIKE_WEBHOOK_URL` with the URL from Step 1.
   - Save the action.

   ```powershell
   $body = @"
   {
     "status": "down",
     "device_id": "%Device.DatabaseID",
     "device_name": "%Device.DisplayName",
     "host_name": "%Device.HostName",
     "address": "%Device.Address",
     "monitor": "%ActiveMonitor.Name",
     "monitor_state": "%ActiveMonitor.State",
     "device_state": "%Device.State",
     "down_monitors": "%Device.ActiveMonitorDownNamesCSV"
   }
   "@
   Invoke-RestMethod -Uri "YOUR_SPIKE_WEBHOOK_URL" -Method Post -ContentType "application/json" -Body $body
   ```

4. **Create the Up action:** repeat step 3 with **Name** `Spike - Up` and the same script, changing only the first line of the body to `"status": "up",`.

5. **Test the actions:** on the **Actions** tab, click **Test**, pick `Spike - Down` and click **Test**. A test run has no device behind it, so the variables may arrive unexpanded. If they do, Spike opens an incident titled `WhatsUp Gold alert with no details`; resolve it by hand.

6. **Create the action policy:**
   - On the **Action Policy** tab, click the **Add** icon to open the **Action Policy Builder**, and name the policy, for example `Spike`.
   - Click **Add** to add a rule: **Action** `Spike - Down`, and under **Execute the action on the following state change** pick the **Down** state.
   - Click **Add** again for a second rule: **Action** `Spike - Up`, triggered on the **Up** state.
   - Click **Save**.

7. **Apply the policy:**
   - For a whole device, open its **Device Properties → Actions**, click **Apply the following Action Policy**, select `Spike` and click **Save**. Spike treats these as device-level alerts.
   - For a single active monitor, assign the policy to that monitor on the device instead. Spike then tracks each monitor on its own.

8. **Check it end to end:** bring a test monitor down and up again, and confirm an incident opens and then resolves in Spike.
{% endtab %}
{% endtabs %}

### Field reference

Send exactly these fields. All of them are plain strings. A variable WhatsUp Gold leaves unexpanded (for example `%ActiveMonitor.Name` in a device-level action) is treated as empty.

| Field | WhatsUp Gold variable | Required | Used for |
| --- | --- | --- | --- |
| `status` | typed by you: `down` or `up` | **Yes** | `down` opens or joins an incident, `up` resolves it. `resolved`, `closed`, `ok`, `cleared` and `recovered` also count as `up`; anything else is treated as `down`. |
| `device_id` | `%Device.DatabaseID` | **Yes** | Identifies the device. Repeats join, recoveries resolve. |
| `monitor` | `%ActiveMonitor.Name` | Yes for monitor alerts | Second part of the identity. Empty for device-level actions. |
| `device_name` | `%Device.DisplayName` | Recommended | Names the device in the incident title. |
| `host_name` | `%Device.HostName` | Optional | Used when `device_name` is empty. |
| `address` | `%Device.Address` | Optional | Last-resort device name. |
| `monitor_state` | `%ActiveMonitor.State` | Optional | Shown in the title, for example `Down at least 5 min`. |
| `device_state` | `%Device.State` | Optional | Shown in the title for device-level alerts. |
| `down_monitors` | `%Device.ActiveMonitorDownNamesCSV` | Optional | Names the down monitors in device-level alert titles. |
| `text` | `%PassiveMonitor.LoggedText` | Passive monitors only | The trap, syslog or event-log line. Becomes the title, and is part of the identity. |

Example of what the Down action sends:

```json
{
  "status": "down",
  "device_id": "1042",
  "device_name": "web-prod-01",
  "host_name": "web-prod-01.corp.example.com",
  "address": "10.20.4.21",
  "monitor": "HTTPS",
  "monitor_state": "Down at least 5 min",
  "device_state": "Down at least 5 min",
  "down_monitors": "HTTPS"
}
```

And the Up action:

```json
{
  "status": "up",
  "device_id": "1042",
  "device_name": "web-prod-01",
  "host_name": "web-prod-01.corp.example.com",
  "address": "10.20.4.21",
  "monitor": "HTTPS",
  "monitor_state": "Up",
  "device_state": "Up",
  "down_monitors": ""
}
```

That body produces the incident title `HTTPS is Down at least 5 min on web-prod-01`, and the Up produces `HTTPS recovered on web-prod-01`.

### Passive monitors (SNMP traps, syslog, Windows events)

Passive monitors have no Up state, so they need only a Down-style action. Create a third action, `Spike - Passive`, with the same script as `Spike - Down` plus one more line in the body, after `down_monitors` (add a comma at the end of the `down_monitors` line):

```
  "text": "%PassiveMonitor.LoggedText"
```

Put it in its own action policy and assign that policy to the passive monitors you want Spike to page on.

When `text` is filled in, it becomes the incident title as WhatsUp Gold logged it, for example `Link down on interface GigabitEthernet1/0/24`. Spike keeps each different text on a device as its own incident, and keeps them apart from that device's Down alerts, so an open trap incident never hides the device itself going down. Because passive monitors never report Up, resolve these incidents by hand once you have dealt with them.

{% hint style="warning" %}
**Quotes and dollar signs in names.** WhatsUp Gold pastes the variable values into the script text before PowerShell runs it. A device or monitor name containing a double quote (`"`) or a `$` will break the double-quoted here-string and the post will fail. Avoid those characters in display names. Wrapping the body in a single-quoted here-string (`@'` … `'@`) avoids `$` expansion, but a single quote in a name then breaks it instead.
{% endhint %}

{% hint style="warning" %}
Each action must be bound to the right state change. Spike trusts the `status` you typed: an Up script bound to a Down state change would resolve incidents instead of opening them. Also, WhatsUp Gold limits how long a script action may run, so make sure the WhatsUp Gold server can reach Spike over HTTPS (including through any proxy) within that time.
{% endhint %}

## FAQs

<details>
<summary>Will incidents in Spike auto-resolve when a device or monitor recovers?</summary>
Yes, when the Up action runs. It sends <code>"status": "up"</code> with the same <code>device_id</code> and <code>monitor</code>, and Spike resolves the matching incident. An Up for a different device or monitor never resolves it, and an Up with nothing open is ignored. Passive-monitor incidents are never auto-resolved.
</details>

<details>
<summary>Does Spike group repeated WhatsUp Gold alerts?</summary>
Yes. Repeated Down alerts for the same monitor on the same device join the open incident instead of paging again.
</details>

<details>
<summary>Can I use the same actions for device-level alerts?</summary>
Yes. In a device-level action <code>%ActiveMonitor.Name</code> is empty or left unexpanded, so Spike treats it as a device alert, separate from that device's monitor alerts.
</details>

<details>
<summary>What if <code>%Device.DatabaseID</code> does not expand?</summary>
Spike then has no device id and groups alerts by title instead. The title drops the state and the list of down monitors so that repeats still match, for example <code>HTTPS is down on web-prod-01</code>, and the Up action resolves the incident with the same monitor and device name.
</details>
