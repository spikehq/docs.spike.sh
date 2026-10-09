---
description: >-
  Send Pandora FMS alerts to Spike so a failing module pages your on-call rotation by phone, SMS, Slack or Teams, and its incident resolves when the alert recovers.
---

# Integrate Spike with Pandora FMS

[Pandora FMS](https://pandorafms.com) is a monitoring platform for servers, networks, applications and cloud services. Agents report modules (checks such as CPU Load or Disk Free), and an alert fires when a module crosses a threshold.

Point a Pandora FMS alert action at a Spike integration URL and a critical or warning module pages your on-call rotation. Repeat firings of the same alert land on the incident already open, and the incident resolves when Pandora FMS reports the alert recovered.

## How Spike reads the alert

Spike identifies the incident by `alert_id`, the value of Pandora FMS's `_id_alert_` macro. One alert (an agent, module and template assignment) keeps the same ID across firing, re-firing and recovery, so they all belong to one Spike incident.

The `event` field decides what Spike does with a message:

| `event` | Meaning |
| --- | --- |
| `fired` | Opens an incident, or joins the one already open for this `alert_id`. A missing `event`, or any other value, is also treated as firing. |
| `recovered` | Resolves the open incident for this `alert_id`. Compared case-insensitively. |

You type `fired` and `recovered` yourself in the action, so these two literals are the only part of the body that is not a Pandora FMS macro.

The incident title is built from the body: for example `CPU Load critical at 97% (threshold 90%) on web-prod-03`. The reading and threshold appear only when `alert_id` is present.

## Set up instructions

**Step 1:** Create a Pandora FMS integration in the Spike dashboard and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

**Step 2:** Create the alert action in Pandora FMS.

{% tabs %}
{% tab title="Setup on Pandora FMS" %}
1. Log in to the Pandora FMS console as an administrator.
2. Open **Alerts → Actions** and click **Create**. The menu location differs a little between Pandora FMS versions.
3. Fill in the form:
   - **Name:** `Spike`
   - **Group:** the group that should be able to use this action, or `All`.
   - **Command:** `API request` (called **Pandora FMS API request** in some versions). This command is not available in older versions; there, create a custom command that runs `curl` with the same URL and body.
4. Set the request fields. **URL**, **Method** and the **Triggering** and **Recovery** data fields are all required.
   - **URL:** paste the webhook URL from Spike.
   - **Method:** `POST`.
   - **Content type:** `application/json`, if the form asks for it.
5. In the **Triggering** data (Field) box, paste this body:

   ```json
   {
     "event": "fired",
     "alert_id": "_id_alert_",
     "alert_name": "_alert_name_",
     "severity": "_alert_text_severity_",
     "agent": "_agent_",
     "address": "_address_",
     "agent_group": "_agentgroup_",
     "module": "_module_",
     "module_status": "_modulestatus_",
     "data": "_data_",
     "unit": "_dataunit_",
     "critical_threshold_min": "_critical_threshold_min_",
     "critical_threshold_max": "_critical_threshold_max_",
     "warning_threshold_min": "_warning_threshold_min_",
     "warning_threshold_max": "_warning_threshold_max_",
     "timestamp": "_timestamp_"
   }
   ```

6. In the **Recovery** data (Field) box, paste the same body with one change: `"event": "recovered"`.

   ```json
   {
     "event": "recovered",
     "alert_id": "_id_alert_",
     "alert_name": "_alert_name_",
     "severity": "_alert_text_severity_",
     "agent": "_agent_",
     "address": "_address_",
     "agent_group": "_agentgroup_",
     "module": "_module_",
     "module_status": "_modulestatus_",
     "data": "_data_",
     "unit": "_dataunit_",
     "critical_threshold_min": "_critical_threshold_min_",
     "critical_threshold_max": "_critical_threshold_max_",
     "warning_threshold_min": "_warning_threshold_min_",
     "warning_threshold_max": "_warning_threshold_max_",
     "timestamp": "_timestamp_"
   }
   ```

7. Click **Create** to save the action.

**Step 3:** Use the action in an alert template.

1. Open **Alerts → Templates** and edit the template you want to send to Spike, or create one.
2. Turn on **Alert recovery** in the template. Without it, Pandora FMS never sends the recovery body and the incident stays open until you resolve it in Spike.
3. Open **Alerts → List of alerts** (or the agent's **Alerts** tab) and click **Add alert**. Pick the agent, the module, the template, and the **Spike** action.
4. Save the alert.

**Step 4:** Test it.

Force the module past its threshold, or use the alert's **Force** option in the alert list. A new incident should appear in Spike with a title like `CPU Load critical at 97% (threshold 90%) on web-prod-03`. When the module returns to normal, the incident resolves.
{% endtab %}
{% endtabs %}

## Fields Spike reads

| Field | Pandora FMS macro | Used for |
| --- | --- | --- |
| `event` | typed by you | `fired` or `recovered` |
| `alert_id` | `_id_alert_` | Identity of the alert across firing and recovery |
| `alert_name` | `_alert_name_` | Template name; the "what" in the title when `module` is empty |
| `severity` | `_alert_text_severity_` | Status word when `module_status` is empty or `Normal` |
| `agent` | `_agent_` | The "where" in the title (agent alias, or name when there is no alias) |
| `address` | `_address_` | The "where" when `agent` is empty |
| `agent_group` | `_agentgroup_` | Context only |
| `module` | `_module_` | The "what" in the title |
| `module_status` | `_modulestatus_` | Status word: critical, warning, unknown |
| `data` | `_data_` | The reading, when it is a number |
| `unit` | `_dataunit_` | Unit for the reading and threshold |
| `critical_threshold_min`, `critical_threshold_max` | `_critical_threshold_min_`, `_critical_threshold_max_` | Threshold cited when the module is critical |
| `warning_threshold_min`, `warning_threshold_max` | `_warning_threshold_min_`, `_warning_threshold_max_` | Threshold cited when the module is warning |
| `timestamp` | `_timestamp_` | Context only |

A threshold is shown only when the minimum is a non-zero number and the maximum is `0` or empty. Anything else is left out of the title rather than guessed.

## FAQs

<details>
<summary>Will the incident resolve when the alert recovers?</summary>
Yes, if the template has <strong>Alert recovery</strong> enabled and the action's Recovery data uses <code>"event": "recovered"</code>. Spike matches the recovery to the incident by <code>alert_id</code>.
</details>
<details>
<summary>Why does the title have no reading on some incidents?</summary>
The reading and threshold are added only when <code>alert_id</code> is present. Without it Spike matches by title, so the title stays plain, such as <code>CPU Load critical on web-prod-03</code>.
</details>
<details>
<summary>Do I need one action per alert?</summary>
No. One <strong>Spike</strong> action can be used by any number of alerts and templates.
</details>
<details>
<summary>Can event or log alerts recover?</summary>
For event and log (correlated) alerts in recent Pandora FMS versions, the module and agent macros may be empty in the recovery fields. The recovery can then arrive without a module or agent name. It still resolves the incident if <code>alert_id</code> is sent.
</details>
