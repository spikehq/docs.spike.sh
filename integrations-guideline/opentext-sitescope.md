---
description: >-
  Send OpenText SiteScope alerts to Spike so a monitor crossing its threshold pages your on-call rotation by phone, SMS, Slack or Teams, and resolves its incident when the monitor returns to good.
---

# Integrate Spike with OpenText SiteScope

[OpenText SiteScope](https://www.opentext.com/products/sitescope) (formerly Micro Focus SiteScope, and HP SiteScope before that) is agentless infrastructure and application monitoring. Monitors run on a schedule against servers, databases, URLs, services and the network, and each run puts the monitor into one of three threshold categories — **good**, **warning** or **error**.

With this integration, a monitor going to **error** or **warning** opens an incident in Spike and escalates it through your policy, every later run of that same monitor lands on the incident that is already open instead of paging again, and the monitor going back to **good** resolves it.

Nothing is installed. SiteScope's own **REST** alert action posts to a Spike webhook URL, so the only thing to configure is one alert in SiteScope.

{% hint style="info" %}
SiteScope has no fixed webhook payload. The body of a REST alert action is a template **you** paste, written in SiteScope's alert properties, so this guide gives you the exact body to paste. Spike reads the keys below and nothing else — do not rename `monitor_id` or `category`.
{% endhint %}

## What Spike does with a SiteScope alert

`category` is the whole decision, and it is the only field Spike treats as a verdict.

| `category` | What Spike does |
| --- | --- |
| `error` | Opens an incident and escalates it, or adds the reading to the incident already open for that monitor |
| `warning` | The same. Which of the two is worth waking somebody for is an [alert rule's](../alerts/alert-rules.md) decision, not the payload's |
| `good` | Resolves the open incident for that monitor |

The comparison is case-insensitive, so `error`, `Error` and `ERROR` all fire and `good`, `Good` and `GOOD` all resolve. A category Spike has never been shown — or a payload with no category at all — is treated as firing, because failing to page somebody is the worse mistake.

`state` is never consulted for this. It is the reading the monitor took ("95% full, 2.1GB free", "no response"), not a status word, and a recovery's reading looks nothing like one.

## Incident identity

Spike identifies the incident by `monitor_id` — SiteScope's `<monitorUUID>`, the monitor's own stable id. SiteScope repeats it on every alert about that monitor, so one disk filling up reads as one incident: it pages once at 11:42, the 11:47 run lands on it, and the `good` at 12:05 resolves it.

That matters more here than for most tools, because SiteScope re-evaluates `state` on every scheduled run. The readings move while one problem stays one problem, and only the monitor's id gets that right.

{% hint style="warning" %}
**If your SiteScope does not substitute `<monitorUUID>`,** Spike falls back to matching on the incident title. That still groups and still auto-resolves, but it only works because the title is then kept byte-for-byte identical across every run of the monitor — which means the readings are dropped from it. See [Incident title](#incident-title).

Check this on your first alert: open the incident in Spike and look at `monitor_id` on the payload. If it holds the literal text `<monitorUUID>` rather than a uuid, your SiteScope version does not know that property.
{% endhint %}

## Incident title

SiteScope writes no summary, description or message — there is no field in the payload where SiteScope says in prose what is wrong — so Spike builds the title: **what**, then **how much**, then **where**, with the host last.

```
Disk Space /var: 95% full, 2.1GB free on prod-db-01
CPU Utilization: 92% used over 5 minutes on prod-app-02
Ping: no response on prod-db-02
```

The **what** is `monitor_name`, falling back to `monitor_type` and then to `alert_name`. The **how much** is `state`, as SiteScope wrote it. The **where** is `target_host`, falling back to `group` for a monitor with no remote target — a URL monitor measures a URL, not a machine — and dropped entirely when SiteScope sends neither:

```
URL - checkout: 503 Service Unavailable on Customer Facing URLs
SiteScope Health - log event checker: the log file is not accessible
```

When `state` is empty, or just repeats the category, the title says the state in words instead:

```
Service Monitor - nginx is in error state on prod-web-01
```

A recovery is written as one, without readings, because "71% full, 12.4GB free" is true of a healthy disk and says nothing at the moment a page goes away:

```
Disk Space /var on prod-db-01 is back to normal
```

And a monitor Spike has no `monitor_id` for gets the plain, stable form — no readings, because the title is what the next alert is matched on:

```
Swap Space on prod-cache-01
Swap Space on prod-cache-01 is back to normal
```

Titles are capped at 200 characters with the host kept whole, whitespace is collapsed, and they carry no ids, no URLs and no timestamps. Those are all on the incident page.

{% hint style="info" %}
A status string long enough to be prose — a URL monitor can report the first line of the error page it got back — is reduced to the fault it names rather than cut off mid-sentence: `the server returned 502 Bad Gateway and the response body said that the upstream connection was reset while ...` becomes `URL - checkout: the server returned 502 Bad Gateway on prod-lb-01`. The whole string stays on the incident page.
{% endhint %}

Use a [Title Remapper](../alerts/title-remapper.md) if your team reads SiteScope alerts differently — by group and monitor type, for instance:

```handlebars
{{data.body.group}} — {{data.body.monitor_name}} ({{data.body.state}})
```

## Severity

Spike does not read a severity from the SiteScope payload. `category` decides whether an incident opens and whether it resolves, and it never sets the severity badge, so a `warning` and an `error` open at your integration's default.

If you want SiteScope's categories on the badge, write an [alert rule](../alerts/alert-rules.md) on `category`. Alert rules can also route the incident to another service or escalation policy, or suppress it entirely. Read more about [priority and severity](../incidents/priority-and-severity.md).

## Prerequisites

* A SiteScope user with permission to create alerts — SiteScope's **Alerts** permission, usually an administrator
* SiteScope's **REST** alert action, which is available from the **Action Type** list when you add an alert action
* An OpenText SiteScope integration in Spike, and its webhook URL
* Outbound HTTPS from the SiteScope server to `hooks.spike.sh`. SiteScope calls out to Spike, so nothing has to be opened inbound

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → OpenText SiteScope**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Create the alert in SiteScope

{% tabs %}
{% tab title="Setup on SiteScope" %}
1. **Sign in to SiteScope** at `https://<your-sitescope-server>:8443/SiteScope` and open the **Monitors** context.

2. **Create the alert.** In the monitor tree on the left, right-click the group, the monitor or the **SiteScope** root you want the alert to cover and select **New → Alert**. The **New Alert** dialog opens.

3. **General Settings.** Give the alert a **Name** — this is required, and it is what arrives in `alert_name`. `Spike - error and good` describes what it does.

4. **Alert Targets.** Tick the groups and monitors this alert applies to. The node you right-clicked is ticked already; tick the whole **SiteScope** root to cover every monitor you have.

5. **Alert Actions.** Select **New Alert Action**. In the **Action Type** list of the **Alert Action** wizard, choose **REST**, then select **Next**.

6. **Action Settings.** Fill in the four fields that matter, all of them required:
   * **URL** — the webhook URL from Step 1
   * **HTTP Method** — `POST`
   * **Format Type** — `JSON`
   * **Request Body** — the template in Step 3

7. **Status Trigger.** This is the step that decides what reaches Spike. Tick **Error**, **Warning** and **Good**, and set the trigger frequency to alert **always, after the condition has occurred at least once** so a monitor that stays in error keeps reporting its reading.

8. **Save** the alert action, then **Save** the alert.
{% endtab %}
{% endtabs %}

{% hint style="warning" %}
**Tick `Good` as well as `Error`.** The `good` alert is the only thing that resolves the incident. An alert that fires on **Error** alone pages your rotation and then leaves the incident open until somebody resolves it by hand — a [resolve timer](../incidents/resolve-timer.md) is a reasonable backstop, not a replacement.

Some SiteScope versions let one REST alert action carry several status triggers, and some want one alert action per status. If yours only accepts one, create one REST alert action for **Error**, one for **Warning** and one for **Good**, each with the same URL, HTTP method, format type and request body.
{% endhint %}

{% hint style="info" %}
The dialog labels differ a little between SiteScope versions, and older versions read the body from a template file under `<SiteScope root>/templates.rest` instead of from a field in the dialog. The four things to set are the same either way: the URL, `POST`, `JSON`, and the body below.
{% endhint %}

## Step 3 — Paste the request body

This is the body Spike reads. Paste it into **Request Body** exactly as it is — the keys on the left are what Spike looks for, and the values on the right are SiteScope's own alert properties, which SiteScope replaces when the alert fires.

```json
{
  "monitor_id": "<monitorUUID>",
  "monitor_name": "<name>",
  "monitor_type": "<monitorTypeDisplayName>",
  "state": "<state>",
  "category": "<category>",
  "group": "<group>",
  "target_host": "<targetHost>",
  "alert_name": "<alertName>",
  "sitescope_server": "<siteScopeHost>",
  "time": "<time>"
}
```

What each key is for, and which ones Spike cannot do without:

| Key | SiteScope property | Required | What Spike does with it |
| --- | --- | --- | --- |
| `monitor_id` | `<monitorUUID>` | **Required** | Incident identity. Groups every alert about one monitor onto one incident, and is what the recovery resolves |
| `category` | `<category>` | **Required** | `error` and `warning` open an incident, `good` resolves it |
| `monitor_name` | `<name>` | **Required** | The "what" — the head of the incident title |
| `state` | `<state>` | Recommended | The reading behind the breach, and the "how much" in the title |
| `target_host` | `<targetHost>` | Recommended | The "where" — the host the monitor was measuring |
| `group` | `<group>` | Recommended | The "where" for a monitor with no host, such as a URL monitor |
| `monitor_type` | `<monitorTypeDisplayName>` | Optional | The "what", when the monitor has no name |
| `alert_name` | `<alertName>` | Optional | The "what", when there is no name and no type |
| `sitescope_server` | `<siteScopeHost>` | Optional | Context on the incident page. Which SiteScope sent the alert |
| `time` | `<time>` | Optional | Context on the incident page. Titles carry no timestamps |

{% hint style="warning" %}
**`monitor_id` and `category` are read under those two names and no others.** Spike tolerates SiteScope's own property names for the display fields — `name`, `stateString`, `monitorTypeDisplayName`, `targetHost`, `fullGroupName`, `alertName` — so a renamed display key costs a title a detail rather than costing it everything. Rename `monitor_id` and every run of the monitor opens its own incident; rename `category` and nothing ever auto-resolves.
{% endhint %}

{% hint style="info" %}
`<alertName>` is spelled `<alert::name>` in some SiteScope versions. If `alert_name` arrives as the literal text `<alertName>` on your first incident, swap it for `<alert::name>`. The same goes for any other property your version does not know — Spike treats an unsubstituted property as a missing value rather than as a name, so a wrong spelling costs a fallback, never a grouped incident.
{% endhint %}

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

## Step 4 — Confirm it end to end

Trigger a real state change on one monitor — pause and resume it, or point a URL monitor at a port nothing is listening on — and watch for all three moments:

1. The monitor goes to **error** and an incident opens in Spike with the monitor, the reading and the host in its title, on the service you attached, escalating through your policy.
2. The monitor runs again while still in error, and the new reading lands on the same incident instead of paging again.
3. The monitor goes back to **good** and the incident resolves itself.

If the first step works and the third does not, the **Status Trigger** is the thing to check: **Good** has to be ticked on an alert action pointing at the same Spike URL.

## Payload reference

Everything SiteScope posts is kept on the incident, so every key in the body is available to [alert rules](../alerts/alert-rules.md) and the [Title Remapper](../alerts/title-remapper.md) as `data.body.<key>`.

A monitor crossing its threshold, which opens the incident:

```json
{
  "monitor_id": "a8f1c4d2-6b19-4e27-9f3a-2d5c7b0e81aa",
  "monitor_name": "Disk Space /var",
  "monitor_type": "Disk Space",
  "state": "95% full, 2.1GB free",
  "category": "error",
  "group": "Production Databases",
  "target_host": "prod-db-01",
  "alert_name": "Spike - error and good",
  "sitescope_server": "sitescope-01.corp.internal",
  "time": "2026-10-07 11:42:05"
}
```

```
Disk Space /var: 95% full, 2.1GB free on prod-db-01
```

The same monitor back inside its thresholds, which resolves it. Note that `monitor_id` is the one the error carried — that is what joins the two:

```json
{
  "monitor_id": "a8f1c4d2-6b19-4e27-9f3a-2d5c7b0e81aa",
  "monitor_name": "Disk Space /var",
  "monitor_type": "Disk Space",
  "state": "71% full, 12.4GB free",
  "category": "good",
  "group": "Production Databases",
  "target_host": "prod-db-01",
  "alert_name": "Spike - error and good",
  "sitescope_server": "sitescope-01.corp.internal",
  "time": "2026-10-07 12:05:11"
}
```

```
Disk Space /var on prod-db-01 is back to normal
```

## Things worth knowing

* **One alert can cover every monitor you have.** Tick the **SiteScope** root under **Alert Targets** and the one REST alert action covers the whole estate. There is no per-monitor setup.
* **Several Spike integrations are fine.** If different teams own different parts of the estate, create one Spike integration per team and one SiteScope alert per integration, with that team's groups ticked under **Alert Targets**.
* **Resolving in Spike does not touch SiteScope.** The monitor stays in error in SiteScope until it measures its way out of it.
* **SiteScope's own alert actions are separate.** The email, SNMP and script actions you already have keep working; the REST action is additional, not a replacement.
* **One monitor per request.** SiteScope alerts fire per monitor state change, so each delivery is about one monitor.

## FAQs

<details>

<summary>Will incidents in Spike auto-resolve when a monitor recovers?</summary>

Yes, as long as **Good** is ticked under **Status Trigger** on a REST alert action pointing at the Spike URL. Spike resolves on `"category": "good"` and on nothing else — not on a healthier `state`, and not on a change of category from `error` to `warning`.

If your SiteScope only allows one status trigger per alert action, create a second REST alert action with the same URL and the same request body and tick **Good** on that one.

</details>

<details>

<summary>Does Spike group repeated alerts from the same monitor?</summary>

Yes. Every alert carrying the same `monitor_id` lands on the incident already open for that monitor, with the new reading on its event list, and your rotation is not paged again. If SiteScope sends no usable `monitor_id`, Spike groups on the incident title instead, which is why that title is kept identical across runs and carries no readings.

</details>

<details>

<summary>Every run of the monitor opens its own incident</summary>

Open two of the incidents in Spike and compare `monitor_id` on the payload. If it is missing, empty, or the literal text `<monitorUUID>`, your SiteScope version does not substitute that property — Spike then matches on the title, and the titles have to be identical, so check that the monitor's name and host are not themselves changing between runs.

If `monitor_id` differs between the two, they are genuinely two monitors. Two monitors are two incidents by design, even when they watch the same host.

</details>

<details>

<summary>Do warnings open incidents?</summary>

Yes. `warning` and `error` both open one, and the title says what the monitor measured rather than which of the two it was. Use an [alert rule](../alerts/alert-rules.md) on `category` if you want warnings routed somewhere quieter, given a lower severity, or suppressed.

</details>

<details>

<summary>Can I add fields to the request body?</summary>

Yes — anything you add is kept on the incident and is readable by alert rules and the Title Remapper as `data.body.<key>`. What you should not do is rename or remove the ten keys above: `monitor_id` and `category` are read under those names only, and dropping `monitor_name` costs the title the monitor it is about.

</details>

<details>

<summary>An incident titled "SiteScope alert with no details" opened</summary>

The delivery named no monitor, no host and no state — usually a request body whose properties SiteScope substituted nothing into, so every value arrived as the literal text that was pasted. Check the payload on the incident page against the body in Step 3, and check the property spellings against your SiteScope version. Spike opens an incident for an unreadable delivery rather than dropping it silently.

</details>

<details>

<summary>Nothing arrives in Spike</summary>

Check these in order. That the **URL** on the alert action is the full `https://hooks.spike.sh/<your-token>/push-events` with nothing appended, and that the integration has not been archived in Spike. That **HTTP Method** is `POST` and **Format Type** is `JSON`. That at least one status is ticked under **Status Trigger** — an alert action with no trigger fires for nothing. That the monitor you are testing is inside the **Alert Targets** you ticked. And that the SiteScope server can reach `hooks.spike.sh` on port 443; SiteScope's **Tools → Alert** test and its alert log, `<SiteScope root>/logs/alert.log`, say whether the POST left the server.

</details>

<details>

<summary>Can I customise the incident title?</summary>

Yes, with a [Title Remapper](../alerts/title-remapper.md) over any key in the body, for example `{{data.body.monitor_name}} on {{data.body.target_host}}`. If your monitors have no `monitor_id`, keep the remapped title free of anything that moves between runs — readings, counters, timestamps — because the title is then what Spike matches the next alert on.

</details>

Disclaimer: These integration instructions are offered independently by Spike.sh, and Spike.sh is not affiliated with nor a partner of Open Text Corporation.
