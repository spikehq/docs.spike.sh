---
description: >-
  Send Kentik alarms to Spike so a traffic threshold breach, a DDoS detection or a failing synthetic test pages your network on-call, and the alarm clearing resolves the incident.
---

# Integrate Spike with Kentik

[Kentik](https://www.kentik.com) watches your network — traffic, DDoS activity, mitigations and synthetic tests — and raises an alarm when one of a policy's thresholds is crossed. Point a Kentik notification channel at a Spike integration and that alarm becomes an incident that escalates through your on-call policy, and the alarm clearing in Kentik resolves the incident again.

Nothing is installed anywhere. You add a notification channel in Kentik, paste a Spike webhook URL into it, and attach the channel to the policy thresholds you want to be woken up for.

Kentik has two channel types that can post to Spike, and the same Spike integration reads both:

* **Custom Webhook** — you write the body from a Go template. This is the one to use, and Spike publishes a template below that you paste in unchanged.
* **JSON** — the older channel, with a fixed body Kentik writes for you. There is nothing to configure and Spike reads it too, so channels your account already has on it keep working. Kentik itself recommends Custom Webhook for anything new.

## What Spike does with each notification

Kentik posts when an alarm goes active and again when it clears, so one alarm is one incident that closes itself:

| Notification | What happens in Spike |
| --- | --- |
| Alarm active — `is_active: true` on the Custom Webhook, `IsActive: true` on the JSON channel | Opens an incident for that alarm and threshold, or adds an event to the one already open |
| Alarm cleared — `is_active: false` / `IsActive: false` | Auto-resolves the open incident. Dropped when nothing is open |
| Any other state change while the alarm is still active | Added as an event to the open incident. The escalation carries on |

{% hint style="info" %}
Resolving the incident in Spike does not clear the alarm in Kentik, and a clear that arrives when nothing is open has nothing left to close, so it is dropped. Let Kentik clear the alarm and resolve the incident for you and the two sides stay in step.
{% endhint %}

### Incident identity

Spike identifies a Kentik incident by the **alarm id and the threshold id together**, not by the alarm id on its own. That is the same pairing Kentik uses in its own PagerDuty template, and it matters because one policy can watch several thresholds at once:

* The same alarm crossing the same threshold again lands on the incident already open, as a [repeat](../incidents/grouping-incidents.md) rather than a second page.
* The same alarm crossing a **second** threshold — say a warning threshold and a critical threshold on one policy — opens a second incident. Those are two different problems, and Kentik tracks them separately too.
* A clear resolves only the incident for that alarm and threshold pair. The other threshold's incident stays open until its own clear arrives.

{% hint style="warning" %}
If you edit the published template, keep `alarm_id` and `threshold_id` in it. Drop either one and Kentik's clear no longer matches the incident that its alarm opened, so incidents stay open until somebody resolves them by hand.
{% endhint %}

### Incident title

The title is the policy name and the alarm's description, which is what a responder needs when Spike reads it out on a phone call at 3am:

```
DDoS - Inbound Volume: Inbound traffic to 10.0.4.0/24 exceeded 5 Gbps
```

That is `policy_name` and `description` on the Custom Webhook channel, and `AlarmPolicyName` and `Description` on the JSON channel, so both channels title the same alarm the same way.

Kentik's policy names end up in every page, every Slack message and every phone call, so name them the way you want to hear them: `DDoS - Inbound Volume` rather than `policy 301`. The alarm id, the threshold id, the dimensions, the metrics and the link back to the Kentik portal all stay on the incident page instead of crowding the title.

Use a [Title Remapper](../alerts/title-remapper.md) if you would rather lead with the dimension that tripped, or with your own wording:

```handlebars
{{policy_name}} on {{dimensions.IP_dst}} ({{severity}})
```

Output: `DDoS - Inbound Volume on 10.0.4.0/24 (critical)`

Pick the Kentik integration in the Title Remapper editor to see the payload Spike holds, and write the template against the field names it shows you.

### Severity

Severity comes from the alarm's severity, on either channel — `severity` on the Custom Webhook, `AlarmSeverity` on the JSON channel:

| Kentik severity | Severity in Spike |
| --- | --- |
| `critical` | SEV1 |
| `severe` | SEV1 |
| `major` | SEV1 |
| `warning` | SEV2 |
| `minor` | SEV3 |

Casing does not matter, so `Critical` and `critical` both land on SEV1.

{% hint style="info" %}
Kentik's notification reference also lists `Minor2` and `Major2` alongside those, and neither is in the table above. An alarm carrying one of them — or a Custom Webhook template you edited to drop the `severity` line — opens the incident at your integration's default severity rather than failing. [Alert rules](../alerts/alert-rules.md) can set the severity, route the incident to another escalation policy, or suppress it entirely, and they run on every Kentik incident whatever the payload said.

Severity is set when the incident is created, so an alarm that Kentik re-scores from `minor` to `critical` while the incident is open keeps the severity it opened with. The change is still recorded on the incident.
{% endhint %}

## Prerequisites

* A Kentik user who can reach **Settings → Notifications** and edit alert policies
* A Kentik integration in Spike and its webhook URL

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Kentik**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Add the Custom Webhook channel in Kentik

{% tabs %}
{% tab title="Setup on Kentik" %}
1. **Open notification settings:**
   In the Kentik portal, go to **Settings → Notifications** and click **Add Notification Channel**.

2. **Name the channel:**
   On the **Settings** tab, give it a name — `Spike`, or the name of the service you attached the integration to — and leave **Status** enabled.

3. **Pick the type:**
   Choose **Custom Webhook** from the **Type** list.

4. **Point it at Spike:**
   Paste the webhook URL from Step 1 into **URL**. Leave **Custom Headers** empty; Spike authenticates on the token in the URL.

5. **Paste the template:**
   Copy the template below into **Custom Template**, unchanged.

6. **Save:**
   Click **Add Notification Channel**.
{% endtab %}
{% endtabs %}

### The template

```
{
  "source": "kentik",
  "alarm_id": {{ j (.Event.Details.GetValue "AlarmID") }},
  "policy_id": {{ j (.Event.Details.GetValue "AlarmPolicyID") }},
  "policy_name": {{ j (.Event.Details.GetValue "AlarmPolicyName") }},
  "threshold_id": {{ j (.Event.Details.GetValue "AlarmThresholdID") }},
  "severity": {{ j (.Event.Details.GetValue "AlarmSeverity") }},
  "is_active": {{ .Event.IsActive }},
  "type": {{ j .Event.Type }},
  "description": {{ j .Event.Description }},
  "current_state": {{ j .Event.CurrentState }},
  "previous_state": {{ j .Event.PreviousState }},
  "start_time": {{ j .Event.StartTime }},
  "end_time": {{ j .Event.EndTime }},
  "dimensions": {{ j (.Event.Details.WithTag "dimension").ToMap }},
  "metrics": {{ j (.Event.Details.WithTag "metric").PrettifiedMetrics }},
  "details_url": {{ j (.Event.Details.GetValue "DashboardAlarmURL") }}
}
```

Three things about that template are worth knowing before you edit it.

**The alarm's own fields are not dotted fields.** `IsActive`, `Type`, `Description`, `CurrentState`, `PreviousState`, `StartTime` and `EndTime` hang off `.Event` directly, but the alarm id, the policy, the threshold and the severity are *details*, and details are reached by name: `.Event.Details.GetValue "AlarmID"`. Writing `.Event.AlarmID` does not fail loudly — it simply renders nothing, and you get an integration that opens incidents which never resolve because the ids are missing. `GetValue` returns nothing when a name is absent, which is why the template is safe on every event type Kentik sends.

**Every value goes through `j`.** `j` is Kentik's `toJSON` helper, and it writes the value with its own quoting, so an alarm description containing a quotation mark cannot break the JSON body. It is also why the values in the template are not wrapped in `"…"` yourself, and why `is_active` — a genuine boolean — is the one line that goes in bare.

**Method chains need brackets.** `(.Event.Details.WithTag "dimension").ToMap` filters first and converts second. Without the brackets the template reads as something else entirely.

{% hint style="info" %}
Kentik's **Uglify JSON** toggle, on the same dialog, strips whitespace from the body before sending. Spike reads the payload either way, so leave it off — a pretty-printed body is easier to read when you are looking at a delivery in Kentik.

`.Event` is the first event in the notification. Kentik can put several events in one notification, in `.Events`, with `ActiveCount` and `InactiveCount` alongside. If you see Kentik grouping alarms, keep the policies that page your on-call in their own channel so each alarm arrives on its own.
{% endhint %}

## Step 3 — Send a test notification

Open the channel in Kentik and switch to its **Preview** tab, then press **Test**. Kentik sends a test notification through the channel, and an incident should appear in Spike within a few seconds and start escalating through the escalation policy you attached to the integration in Step 1.

Kentik does not document what its test notification carries, so the incident it creates may have a thin title and no severity. That is fine — it proves the URL, the network path and the integration. Resolve it and move on to a real alarm.

## Step 4 — Attach the channel to your policies

A notification channel sends nothing until a policy uses it. In Kentik's alerting section, open each policy you want to page on, and select the Spike channel in the notification settings of the thresholds that matter. Kentik attaches channels per threshold, which is the same granularity Spike keys incidents on, so a policy can send its critical threshold to the pager and its warning threshold to a quieter Spike service on a second integration.

Attach the channel to the alarm's clear as well as its activation if your policy lists them separately. Spike needs the clear to resolve the incident.

## Acknowledging an alarm in Kentik

Kentik tracks acknowledgement separately from whether an alarm is active: an alarm can be active and unacknowledged, active and acknowledged, or cleared and still waiting for an acknowledgement. Only active and cleared move the incident in Spike. Acknowledging an alarm in the Kentik portal does not resolve or silence the Spike incident, because the alarm is still firing — acknowledge the incident in Spike to stop the escalation, and let the clear resolve it.

The same is true of policies set to require manual clearing: the incident in Spike stays open until Kentik sends the clear, however the alarm gets cleared.

## Using the JSON channel instead

The JSON channel needs no template. Create the channel the same way, pick **JSON** as the **Type**, paste the Spike webhook URL, and save. Spike reads Kentik's fixed body and behaves exactly as it does for the Custom Webhook:

| What Spike reads | Custom Webhook | JSON channel |
| --- | --- | --- |
| Identity | `alarm_id` + `threshold_id` | `AlarmID` + `AlarmThresholdID`, which Kentik also repeats as `ThresholdID` |
| Open or resolve | `is_active` | `IsActive` |
| Title | `policy_name`: `description` | `AlarmPolicyName`: `Description` |
| Severity | `severity` | `AlarmSeverity` |

{% hint style="info" %}
Kentik's own sample for the JSON channel carries a generic description, `Alarm for <policy> Active`, so titles from that channel read as `Clients_GLOBAL_TMS: Alarm for Clients_GLOBAL_TMS Active` where the Custom Webhook gives you the alarm's own wording. That, and being able to choose what reaches Spike, is the reason to prefer Custom Webhook for anything new.
{% endhint %}

## Allowlisting Kentik

Kentik publishes where its notifications come from, which is what you need if `hooks.spike.sh` is reached through a proxy or an egress firewall you control:

* Source addresses are in `209.50.158.0/23`.
* Every request carries `User-Agent: KentikAlerting`.

Kentik documents both under its JSON channel guidance, and both channels leave the same alerting infrastructure. Nothing needs allowlisting on the Spike side — `hooks.spike.sh` is public and the token in the URL is what authenticates the delivery.

{% hint style="warning" %}
Kentik does not sign its notifications, so there is no signature for Spike to verify. Anyone holding the webhook URL can open incidents on this integration, so keep it out of shared documents and tickets. If it leaks, archive the integration and create a new one.
{% endhint %}

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

## Payload reference

The Custom Webhook template above produces this when a DDoS policy goes into alarm:

```json
{
  "source": "kentik",
  "alarm_id": "8842119",
  "policy_id": "301",
  "policy_name": "DDoS - Inbound Volume",
  "threshold_id": "1102",
  "severity": "critical",
  "is_active": true,
  "type": "alarm",
  "description": "Inbound traffic to 10.0.4.0/24 exceeded 5 Gbps",
  "current_state": "alarm",
  "previous_state": "new",
  "start_time": "2026-09-24T09:15:00Z",
  "end_time": "ongoing",
  "dimensions": { "IP_dst": "10.0.4.0/24" },
  "metrics": { "bits": "5.02 Gbit/s" },
  "details_url": "https://portal.kentik.com/v4/alerting/dashboard/767/8842119"
}
```

and this when the same alarm clears. The `alarm_id` and `threshold_id` are the same pair, which is how Spike knows which incident to resolve:

```json
{
  "source": "kentik",
  "alarm_id": "8842119",
  "policy_id": "301",
  "policy_name": "DDoS - Inbound Volume",
  "threshold_id": "1102",
  "severity": "critical",
  "is_active": false,
  "type": "alarm",
  "description": "Inbound traffic to 10.0.4.0/24 back under threshold",
  "current_state": "clear",
  "previous_state": "alarm",
  "start_time": "2026-09-24T09:15:00Z",
  "end_time": "2026-09-24T09:45:00Z",
  "dimensions": { "IP_dst": "10.0.4.0/24" },
  "metrics": { "bits": "1.14 Gbit/s" },
  "details_url": "https://portal.kentik.com/v4/alerting/dashboard/767/8842119"
}
```

`end_time` is the literal string `ongoing` while the alarm is active, which is Kentik's own wording rather than something Spike invents. Spike opens and resolves on `is_active` rather than on `current_state`, because Kentik words its states differently in different corners of the portal while the boolean is always there.

The JSON channel's body is fixed, longer, and uses Kentik's PascalCase names:

```json
{
  "AlarmID": "0192d7bf-71ff-7ab8-a494-697f532902d7",
  "AlarmPolicyID": "57187",
  "AlarmPolicyName": "Clients_GLOBAL_TMS",
  "AlarmThresholdID": "214982",
  "AlarmSeverity": "critical",
  "AlarmStart": "2024-10-29 10:08:20 UTC",
  "AlarmEnd": "ongoing",
  "AlarmState": "alarm",
  "AlarmStateOld": "new",
  "IsActive": true,
  "CurrentState": "alarm",
  "PreviousState": "new",
  "Description": "Alarm for Clients_GLOBAL_TMS Active",
  "AlertKey": [
    { "DimensionName": "IP_dst", "DimensionValue": "103.122.191.63" },
    { "DimensionName": "i_device_site_name", "DimensionValue": "SV5 San Jose" }
  ],
  "Dimensions": {
    "IP_dst": "103.122.191.63",
    "i_device_site_name": "SV5 San Jose"
  },
  "Metrics": { "bits": 1761688121.28, "packets": 164264.93 },
  "AlertValue": { "Unit": "bits", "Value": 1761688121.28 },
  "CompanyID": 24677,
  "PolicyID": "57187",
  "ThresholdID": "214982",
  "Type": "alarm",
  "Links": {
    "DashboardAlarmURL": "https://portal.kentik.com/v4/alerting/dashboard/767/0192d7bf",
    "DetailsAlarmURL": "https://portal.kentik.com/v4/alerting/0192d7bf"
  }
}
```

Everything in either body is kept on the incident and shown on the incident page, and any URL in it becomes a link on the incident, so the dimensions, the metrics, the alert values and the way back to the Kentik portal are all there for whoever picks the page up.

## Troubleshooting

<details>

<summary>No incidents show up in Spike</summary>

Work backwards from Kentik. Is the channel **Enabled**, and does its **Test** button reach Spike? A test that arrives proves the URL and the network path, which leaves the policy: a channel that no policy threshold uses is never called. If the test does not arrive either, check that the URL is the full `https://hooks.spike.sh/<your-token>/push-events` with nothing appended, and that nothing between Kentik and Spike is dropping traffic from `209.50.158.0/23`.

</details>

<details>

<summary>Incidents open but never resolve</summary>

Spike resolves on the clear, so it needs the clear to arrive on the same integration, carrying the same `alarm_id` and `threshold_id` as the alarm that opened the incident. The two usual causes are a policy that notifies the channel on activation but not on clear, and an edited template that dropped `alarm_id`, `threshold_id` or `is_active`. Paste the template above back in unchanged and clear an alarm to check.

Policies set to require manual clearing keep the alarm — and so the incident — alive until somebody clears it in Kentik. That is the setting doing its job. Add a [resolve timer](../incidents/resolve-timer.md) on the Spike integration if you would rather those incidents close on their own.

</details>

<details>

<summary>One alarm opened two incidents</summary>

That is almost always one alarm crossing two thresholds of the same policy, which Spike deliberately keeps apart: the threshold id is part of the incident's identity. Check the two incidents' payloads — same `alarm_id`, different `threshold_id` — and if you would rather be paged once, give the policy one threshold, or route the second one to a quieter service with an [alert rule](../alerts/alert-rules.md).

</details>

<details>

<summary>Titles read generically, like "Alarm for X Active"</summary>

That is the JSON channel's fixed description. Move the policy to a Custom Webhook channel with the template above, which sends the alarm's own description, or write a [Title Remapper](../alerts/title-remapper.md) that builds the title from the dimensions instead.

</details>

<details>

<summary>Severity is never set on the incident</summary>

Spike maps `critical`, `severe`, `major`, `warning` and `minor`. Anything else leaves the incident at the integration's default. Look at the incident's payload: if `severity` is empty, the template lost its `AlarmSeverity` line; if it holds a value that is not in the table above, set severity with an [alert rule](../alerts/alert-rules.md) matching on the policy name or the payload.

</details>

<details>

<summary>Kentik reports a template error, or Spike shows a mangled payload</summary>

Both usually mean the body is not valid JSON. Run the values through `j`, as the published template does, rather than quoting them yourself — a description or a dimension value carrying a quotation mark is the common cause. Bracket method chains, `(.Event.Details.WithTag "dimension").ToMap`, and remember that a misspelled dotted field renders as nothing at all rather than raising an error.

</details>
