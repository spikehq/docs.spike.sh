---
description: >-
  Connect OpenText SiteScope (formerly HP, HPE and Micro Focus SiteScope) to Spike with its Rest alert action, so a monitor in error, warning or nodata pages your on-call team and the incident closes itself when the monitor returns to good.
---

# Integrate Spike with OpenText SiteScope

[SiteScope](https://www.opentext.com/products/sitescope) is agentless monitoring for servers, applications, databases and URLs. Its **Rest** alert action posts a JSON body to any URL you give it, and the body is built from a template file you control, so SiteScope can talk to Spike directly with nothing installed in between.

You do two things: drop Spike's template into SiteScope's `templates.rest` directory, then add a Rest alert action twice on the alert — once for the problem states and once for **Good**, which is what closes the incident again.

SiteScope has changed hands from HP to HPE to Micro Focus to OpenText, so you may know it as **HP SiteScope** or **Micro Focus SiteScope**. It is the same product and the same integration. Use the **OpenText SiteScope** tile in Spike whichever name you searched for.

## What Spike does with each alert

Spike reads the `category` field of the payload, which is SiteScope's own monitor category:

| `category` | What happens in Spike |
| --- | --- |
| `error` | Opens an incident for that monitor and pages your escalation policy, or adds an event to the one already open |
| `warning` | The same as `error`. A warning with nothing open opens an incident, it does not wait for an error first |
| `nodata` | The same as `error`. SiteScope has lost the ability to run the monitor, which is worth paging on rather than dropping |
| `good` | Auto-resolves the open incident for that monitor. Dropped when nothing is open |

There is one incident per monitor. Spike groups on `monitor_uuid`, the id SiteScope gives the monitor itself, so every check interval, every repeat and a warning that later turns into an error all land on the one incident and page your team once.

{% hint style="info" %}
SiteScope has no separate alert-instance id, so the monitor is the unit of identity. Two monitors alerting at the same time carry different `monitor_uuid` values and become two incidents, even when they sit in the same group or watch the same host.
{% endhint %}

A `good` payload that matches nothing open is dropped rather than treated as an error, which is what should happen when you resolved the incident in Spike by hand before SiteScope recovered.

## Incident titles

The title is the monitor, its category and SiteScope's own status string, which already reads as a sentence:

| Payload | Incident title |
| --- | --- |
| `category: error`, `state: Error: Connection refused` | `HTTP - Checkout API is in error: Error: Connection refused` |
| `category: warning`, `state: Warning: Response time above threshold` | `HTTP - Checkout API is in warning: Warning: Response time above threshold` |
| `category: nodata`, `state: No data received from monitor` | `HTTP - Checkout API is in nodata: No data received from monitor` |

The group, the full monitor path, the target host and IP, the sample text and the drill-down URL stay on the incident page rather than in the title, so the title still fits a lock screen and a phone call. Use a [Title Remapper](../alerts/title-remapper.md) if your team would rather lead with the group or the host:

```handlebars
{{payload.group}} — {{payload.monitor}}: {{payload.state}}
```

## Severity

Set severity on a SiteScope incident with [alert rules](../alerts/alert-rules.md). SiteScope's template carries a `category`, not a severity, so Spike does not set one from the payload today. The same rules route the incident to another escalation policy or suppress it entirely, which is how you keep warnings on a staging group quieter than errors in production:

```
When payload.category is warning → set severity SEV2
When payload.category is error   → set severity SEV1
```

Read more about [priority and severity](../incidents/priority-and-severity.md).

## Prerequisites

* SiteScope 11.3x or later. The Rest alert action ships with SiteScope itself, including the current 24.4 and 26.2 releases
* An account that can edit alerts in the SiteScope web interface
* Filesystem access to the SiteScope server, to add one template file
* A SiteScope integration in Spike and its webhook URL

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → OpenText SiteScope**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

One integration URL is enough for the whole SiteScope server. Create a second integration only when a different group of monitors should page a different team.

## Step 2 — Add the Spike template to SiteScope

SiteScope builds the Rest body from a template file. The templates live in the `templates.rest` directory under the SiteScope root, one file per template, and the file name is the name that shows up in the **Template** drop down.

Save the file below as `spike`, with no extension, in that directory:

* Windows: `C:\SiteScope\templates.rest\spike`
* Linux: `/opt/HP/SiteScope/templates.rest/spike`

<details>

<summary>templates.rest/spike</summary>

```json
{
  "source": "sitescope",
  "state": "<state>",
  "category": "<category>",
  "monitor": "<name>",
  "full_name": "<fullMonitorName>",
  "monitor_uuid": "<monitorUUID>",
  "monitor_type": "<monitorType>",
  "group": "<group>",
  "target_host": "<targetHost>",
  "target_ip": "<targetIP>",
  "alert_name": "<alert::name>",
  "sample": "<sample>",
  "time": "<currentTime>",
  "sitescope_host": "<siteScopeHost>",
  "url": "<monitorDrilldownUrl>"
}
```

</details>

Everything in angle brackets is a SiteScope template variable. SiteScope substitutes the real value for the monitor that fired before it posts, so nothing in this file needs editing — copy it as it is.

{% hint style="warning" %}
The **Template** drop down is read when the alert action page loads. If `spike` is not in the list, check the file is directly inside `templates.rest` with no `.json` or `.txt` extension, then reopen the alert action page.
{% endhint %}

## Step 3 — Create the alert

In the SiteScope web interface, right-click the SiteScope root, a group, or a single monitor in the context tree and choose **New → Alert**. Right-clicking the root or a group applies the alert to everything under it, which is usually what you want.

1. In **General Settings**, name the alert `Spike`.
2. In **Alert Targets**, confirm the groups and monitors this alert covers. The node you right-clicked is already ticked.
3. Leave **Alert Action Trigger** on its default so the alert fires on every state change rather than only after N repeats. Repeats are grouped onto the incident already open in Spike, so they cost nothing.

Do not save yet. The alert needs its two actions first.

## Step 4 — Add the Rest action twice

{% hint style="danger" %}
The Rest action has to be added **twice**: once triggered on **Error** and once triggered on **Good**. SiteScope only sends what you tell it to send, so an alert with only the error action will open incidents in Spike that never resolve themselves.
{% endhint %}

### The problem action

In the **Alert Actions** section, click **New Alert Action**, choose **Rest** as the action type, and fill in:

| Field | Value |
| --- | --- |
| **Action name** | `Spike - problem` |
| **Rest to URL** | Your webhook URL from Step 1, `https://hooks.spike.sh/<your-token>/push-events` |
| **HTTP Method** | `POST` |
| **Format Type** | `JSON` |
| **Template** | `spike` |
| **Additional Parameters** | Leave empty |

Then open the **Status Trigger** section of that action and select **Error**. Tick **Warning** and **Unavailable** as well if you want SiteScope's warning threshold and its "could not run the check" state to page too. Spike opens or joins an incident for all three.

Save the action.

### The resolve action

Click **New Alert Action** again and create a second **Rest** action with exactly the same URL, method, format and template. Change two things:

| Field | Value |
| --- | --- |
| **Action name** | `Spike - resolve` |
| **Status Trigger** | **Good** |

Save the action, then save the alert.

{% hint style="info" %}
Both actions point at the same Spike URL and use the same template. Spike tells them apart by the `category` in the body, not by the URL, so there is nothing to configure twice on the Spike side.
{% endhint %}

## Step 5 — Test it

SiteScope's **Alerts** tab has a working **Test** button, so you can check the wiring without waiting for a real failure.

1. Go to the **Alerts** tab, select the `Spike` alert and click **Test**.
2. Pick the monitor to test against and run it. SiteScope posts the body to Spike with that monitor's current values.
3. The incident shows up in Spike within a few seconds, titled after the monitor and its state.

For an end-to-end check of the resolve path, point a test URL monitor at a hostname that does not exist, wait for it to go into error and open an incident, then fix the URL and wait for the next check. The monitor turns good, the resolve action fires, and the incident closes itself.

## Payload reference

SiteScope posts `application/json` over POST. Every value is a string, substituted from the template in Step 2.

A monitor going into error, which opens the incident:

```json
{
  "source": "sitescope",
  "state": "Error: Connection refused",
  "category": "error",
  "monitor": "HTTP - Checkout API",
  "full_name": "Production/APIs/HTTP - Checkout API",
  "monitor_uuid": "6f2a1b8c-3d4e-4f5a-9b6c-7d8e9f0a1b2c",
  "monitor_type": "URL Monitor",
  "group": "Production/APIs",
  "target_host": "checkout-api.acme.internal",
  "target_ip": "10.4.2.17",
  "alert_name": "Checkout API down",
  "sample": "Connection refused after 3 retries",
  "time": "2026-09-24T09:15:00Z",
  "sitescope_host": "sitescope-prod-01.acme.internal",
  "url": "https://sitescope-prod-01.acme.internal/SiteScope/servlet/Main?monitor=6f2a1b8c"
}
```

The same monitor crossing its warning threshold, which joins the incident already open:

```json
{
  "source": "sitescope",
  "state": "Warning: Response time above threshold",
  "category": "warning",
  "monitor": "HTTP - Checkout API",
  "full_name": "Production/APIs/HTTP - Checkout API",
  "monitor_uuid": "6f2a1b8c-3d4e-4f5a-9b6c-7d8e9f0a1b2c",
  "monitor_type": "URL Monitor",
  "group": "Production/APIs",
  "target_host": "checkout-api.acme.internal",
  "target_ip": "10.4.2.17",
  "alert_name": "Checkout API slow",
  "sample": "Response time 4200ms, threshold 2000ms",
  "time": "2026-09-24T09:20:00Z",
  "sitescope_host": "sitescope-prod-01.acme.internal",
  "url": "https://sitescope-prod-01.acme.internal/SiteScope/servlet/Main?monitor=6f2a1b8c"
}
```

The monitor recovering, which resolves the incident:

```json
{
  "source": "sitescope",
  "state": "Good",
  "category": "good",
  "monitor": "HTTP - Checkout API",
  "full_name": "Production/APIs/HTTP - Checkout API",
  "monitor_uuid": "6f2a1b8c-3d4e-4f5a-9b6c-7d8e9f0a1b2c",
  "monitor_type": "URL Monitor",
  "group": "Production/APIs",
  "target_host": "checkout-api.acme.internal",
  "target_ip": "10.4.2.17",
  "alert_name": "Checkout API down",
  "sample": "Response time 180ms",
  "time": "2026-09-24T09:35:00Z",
  "sitescope_host": "sitescope-prod-01.acme.internal",
  "url": "https://sitescope-prod-01.acme.internal/SiteScope/servlet/Main?monitor=6f2a1b8c"
}
```

An **Unavailable** trigger sends the same shape with `category` set to `nodata` and a `state` describing what SiteScope could not do.

Add your own fields to the template if your team wants them on the incident page. SiteScope's alert template variables are all available, and Spike shows every key it receives.

{% hint style="warning" %}
Keep `monitor_uuid` in the template. It is the field Spike groups on, and a payload without it cannot be matched to the incident it belongs to, so every check interval would open a new one.
{% endhint %}

## Things worth knowing

* **The URL is the credential.** SiteScope's Rest alert action has no authentication fields, which is fine and expected. The token in the webhook URL identifies your integration, the same as every other Spike integration. If the URL leaks, archive the integration and create a new one.
* **Alerts are inherited down the tree.** An alert created on the SiteScope root covers every group and monitor under it, including ones added later, so you rarely need more than one alert per team.
* **An alert on the root plus an alert on a group means two deliveries.** Both alerts fire for a monitor in that group. They carry the same `monitor_uuid`, so Spike keeps them as one incident with two events rather than two incidents, but it is still worth avoiding.
* **Only the Rest action is covered.** SiteScope's older **Post** alert, which sends CGI-style form fields rather than JSON, along with Script, Email, SNMP trap, Pager and Database alert actions, are different delivery mechanisms this integration does not read. Use the Rest action.

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Check the SiteScope alert log, **Tools → Log Files → alert.log** or `<SiteScope root>/logs/alert.log`, for the alert firing. If it is not there, the alert's **Alert Targets** does not cover the monitor, or the **Status Trigger** on the action does not include the state the monitor is in.

If the alert fired but Spike saw nothing, the SiteScope server cannot reach `hooks.spike.sh` on port 443. SiteScope servers usually sit inside a private network, so check for an egress proxy or a firewall rule, and confirm the URL in the action is the full `https://hooks.spike.sh/<your-token>/push-events` with no trailing characters.

</details>

<details>

<summary>SiteScope reports an error about additional parameters</summary>

The **Additional Parameters** field has to list every extra parameter your template uses. The Spike template needs none, so leave the field empty. If you added parameters to the template yourself, list them there too.

</details>

<details>

<summary>Incidents open but never resolve</summary>

The second Rest action is missing, or its **Status Trigger** is not set to **Good**. Open the `Spike` alert and confirm the **Alert Actions** section lists two Rest actions, one triggered on Error and one on Good. This is the single most common setup mistake, because SiteScope does not send a recovery on its own.

Also check that the good payload carries the same `monitor_uuid` as the error that opened the incident. It will, unless the two actions use different templates.

</details>

<details>

<summary>A monitor opens a new incident on every check interval</summary>

The `monitor_uuid` is not reaching Spike. Open the incident in Spike and look at the payload: if `monitor_uuid` is empty or still reads `<monitorUUID>`, the template file is not the one being used, or the variable name was edited. Copy the template from Step 2 again and re-select it in both actions.

</details>

<details>

<summary>Warnings page the team too often</summary>

Untick **Warning** in the **Status Trigger** of the problem action and SiteScope stops sending them, or keep sending them and use an [alert rule](../alerts/alert-rules.md) to suppress or reroute incidents where `payload.category` is `warning`. The rule is the better option of the two, since the warning is still recorded in Spike when it joins an incident an error already opened.

</details>

<details>

<summary>Two monitors watching the same host made two incidents</summary>

That is by design. Identity is the monitor, not the host or the group, so a CPU monitor and a disk monitor on the same server are two problems and two incidents. [Group them](../incidents/grouping-incidents.md) in Spike if your team would rather see one.

</details>
