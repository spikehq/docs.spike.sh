---
description: >-
  Send Kentik alarms to Spike so a threshold policy firing pages your on-call rotation by phone, SMS, Slack or Teams, and the incident resolves itself when Kentik clears the alarm.
---

# Integrate Spike with Kentik

[Kentik](https://www.kentik.com) is network observability: it ingests flow, SNMP, streaming telemetry and synthetic test results from your routers, hosts and cloud VPCs, and raises an alarm when a threshold policy you wrote is crossed — a DDoS signature on a destination prefix, a transit link saturating, a peer disappearing, a synthetic test failing.

Kentik ships a built-in **JSON** notification channel. Point it at a Spike integration URL and the alarm pages your on-call rotation the moment Kentik activates it, every later state change on that same alarm lands on the incident already open instead of paging again, and the incident resolves itself when Kentik clears the alarm.

Nothing is installed anywhere. One notification channel, created once in Kentik's portal and attached to the policies you care about, covers every alarm those policies raise.

## What Spike does with each notification

Kentik POSTs one flat JSON body per alarm state change. Spike reads the alarm's current state from that body and does one of two things.

| State in the body | What Spike does |
| --- | --- |
| `CurrentState` (or `AlarmState`) is `alarm`, or anything other than `clear` | Opens an incident and pages, or lands on the incident already open for that alarm |
| `CurrentState` (or `AlarmState`) is `clear`, or `IsActive` is `false` | Resolves the incident Spike opened for that alarm |

Only `clear` resolves. Any other state Kentik sends — including an acknowledgement — is treated as still firing, so nothing silently closes an incident while the problem is still there. A clear that arrives with no matching open incident is dropped rather than turned into a new incident.

Spike reads the state from `CurrentState` first, then `AlarmState`, then `IsActive`. Kentik's JSON channel sends all three and they agree; a custom template may carry only one of them. The comparison is case-insensitive, so `clear`, `Clear` and `CLEAR` all resolve.

## Incident identity

Spike identifies the incident by `AlarmID`, the UUID Kentik gives one alarm. Kentik repeats it on the activation, on every state change in between and on the clear, so one alarm's whole life reads as one Spike incident: it pages once, the repeats land on it, and the clear resolves it.

Identity is the alarm, not the policy. The same policy firing on two destination prefixes is two alarms with two `AlarmID`s, so it is two incidents — which is what you want, since each one is a separate thing to go and look at.

{% hint style="info" %}
A body with no `AlarmID` — a custom-template webhook that does not pass it through, or Kentik's older `CHALERT` webhook shape — is matched by incident title instead. Spike then keeps the title free of anything that moves between notifications (no readings, no baseline figures), so that the repeat and the clear still find the incident the activation opened. Use the built-in JSON channel and this never applies.
{% endhint %}

## Incident title

Kentik writes its own sentence about the fault in `Description`, so that sentence is the title, followed by the reading that crossed the threshold and the dimension values the alarm is about:

```
Alarm for Clients_GLOBAL_TMS Active — 1,761,688,121 bits on 103.122.191.63 / FL-HK2-GRE-ipv4 +1 more
```

The reading comes from `AlertValue` (and from `Metrics` when the body carries no `AlertValue`). The "where" is the first two `DimensionValue`s from `AlertKey`, in Kentik's own order, with `+N more` when there are more than two; `Dimensions` is used when `AlertKey` is absent, and a synthetic test's `TestName` when there are no dimensions at all.

When the policy was baselined rather than set to a static threshold, the title says how far from the baseline the reading is:

```
Alarm for Clients_GLOBAL_TMS Active — 1,761,688,121 bits (47% above baseline) on 103.122.191.63 / FL-HK2-GRE-ipv4 +1 more
Alarm for Edge_Packet_Loss Active — 0.17 percent on 103.122.191.63 / FL-HK2-GRE-ipv4 +1 more
```

A policy that sets `Baseline` to `0` — which is what Kentik sends for a static threshold, alongside `AlarmBaselineDescription` — gets no baseline clause, and neither does a change under 1%.

When Kentik sends no `Description`, the policy name is the title instead:

```
Clients_GLOBAL_TMS — 1,761,688,121 bits on 103.122.191.63 / FL-HK2-GRE-ipv4 +1 more
```

The clear is written as a recovery, in Kentik's own words, and never carries a reading:

```
Alarm for Clients_GLOBAL_TMS Cleared on 103.122.191.63 / FL-HK2-GRE-ipv4 +1 more
Clients_GLOBAL_TMS is clear on 103.122.191.63 / FL-HK2-GRE-ipv4 +1 more
```

Titles are capped at 200 characters and carry no `AlarmID`, no portal URL and no timestamps. Those are all on the incident page. A body Spike can read nothing out of is titled `Kentik alert with no details` rather than dropped.

{% hint style="info" %}
A clear reads differently from the notification that opened the incident, and that is on purpose — the person scanning an event list needs to know which of their open incidents went away. It still resolves the right incident, because matching is done on `AlarmID` and never on the title.
{% endhint %}

Use a [Title Remapper](../alerts/title-remapper.md) if your team reads Kentik alarms by policy and dimension rather than by Kentik's sentence:

```handlebars
{{data.body.AlarmPolicyName}} on {{data.body.Dimensions.IP_dst}}
```

## Severity

Spike does not read a severity from the Kentik payload. `AlarmSeverity` and `ActivateSeverity` are kept on the incident but do not set the severity badge, so incidents open at your integration's default.

If you want Kentik's levels on the badge, write an [alert rule](../alerts/alert-rules.md) on `AlarmSeverity`. Alert rules can also route an incident to another service or escalation policy, or suppress it entirely. Read more about [priority and severity](../incidents/priority-and-severity.md).

## Prerequisites

* A Kentik account with permission to manage notification channels and alert policies — Kentik restricts both to administrators
* A Kentik integration in Spike and its webhook URL
* Nothing to open on your own network. Kentik calls out to Spike

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Kentik**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Add Spike as a JSON notification channel in Kentik

1. **Sign in to the Kentik portal** at [https://portal.kentik.com](https://portal.kentik.com) and go to **Settings → Notifications**. The page lists the notification channels your organization already has.

2. **Select Add Notification Channel** and choose **JSON** as the channel type. This is Kentik's own JSON webhook channel; it posts a fixed body that Spike already understands, so there is no template to write.

3. **Fill in the channel.** The fields that matter:
   * **Name** — something your team will recognise, for example `Spike`. Required
   * **Status** — set to **Enabled**. A disabled channel is saved but never posts
   * **URL** — the webhook URL from Step 1. Required
   * **Description** — optional, and ignored by Spike

4. **Save the channel.**

{% hint style="info" %}
Use the **JSON** channel type rather than a custom notification template. The JSON channel sends `AlarmID`, `CurrentState`, `AlarmState`, `IsActive`, `Description`, `AlertValue` and `AlertKey` — everything Spike needs to open the right incident, title it and resolve it. A custom template sends only the fields you put in it, and one that omits `AlarmID` costs you alarm-level matching (see the note under [Incident identity](#incident-identity)).

Treat the webhook URL like a password. If it leaks, archive the integration in Spike and create a new one, then update the URL on the channel in Kentik.
{% endhint %}

## Step 3 — Attach the channel to your policies

A notification channel receives nothing until a policy points at it. This is the step that decides which Kentik alarms reach Spike.

1. Go to **Alerting → Policies** and open the policy you want to page on, or create one.
2. Open the threshold you want to notify on, and find **Activate & Clear Settings**.
3. In the **Notification Channels** multi-select, select the `Spike` channel you created in Step 2.
4. **Save** the threshold and the policy, and repeat for every policy that should page your rotation.

{% hint style="warning" %}
Kentik notifies the channels on a threshold for both the activation and the clear. If your rotation gets paged by a Kentik alarm and the incident then stays open after the network recovers, the channel is attached to a policy Spike never saw clear — confirm the clear arrives for one alarm before you roll the channel out across your policies, and keep a [resolve timer](../incidents/resolve-timer.md) as a backstop rather than as a replacement.
{% endhint %}

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

## Step 4 — Confirm it end to end

Kentik has no "send me a sample alarm" button, so the first real alarm is the test. Lower a threshold on a policy you can safely trip — a bits-per-second threshold on a quiet interface is the usual choice — and watch for both moments:

1. Kentik activates the alarm and an incident opens in Spike with Kentik's own sentence as the title, on the service you attached, escalating through your policy.
2. The condition goes away, Kentik clears the alarm, and the incident resolves itself with the cleared wording on the event list.

If the first works and the second does not, the channel is attached to the policy but the clear is not reaching Spike. Open the incident in Spike, check the events on it, and raise the threshold back before you leave it.

## Payload reference

Kentik's JSON channel sends its own body and there is no template to edit, so this section is a reference for what lands on the incident page, and for what [alert rules](../alerts/alert-rules.md) and the [Title Remapper](../alerts/title-remapper.md) can read as `data.body.<field>`.

The activation, which opens the incident:

```json
{
  "ActivateSeverity": "critical",
  "AlarmBaselineDescription": "A static threshold was used (no baselining).",
  "AlarmEnd": "ongoing",
  "AlarmID": "0192d7bf-71ff-7ab8-a494-697f532902d7",
  "AlarmPolicyApplication": "core",
  "AlarmPolicyID": "57187",
  "AlarmPolicyName": "Clients_GLOBAL_TMS",
  "AlarmSeverity": "critical",
  "AlarmStart": "2024-10-29 10:08:20 UTC",
  "AlarmState": "alarm",
  "AlarmStateOld": "new",
  "AlarmThresholdID": "214982",
  "AlertBaselineSource": "0",
  "AlertDimensions": [
    "IP_dst",
    "c_ddos_ghost",
    "i_device_site_name"
  ],
  "AlertKey": [
    {
      "DimensionName": "IP_dst",
      "DimensionValue": "103.122.191.63"
    },
    {
      "DimensionName": "c_ddos_ghost",
      "DimensionValue": "FL-HK2-GRE-ipv4"
    },
    {
      "DimensionName": "i_device_site_name",
      "DimensionValue": "SV5 San Jose"
    }
  ],
  "AlertPolicyName": "Clients_GLOBAL_TMS",
  "AlertValue": {
    "Unit": "bits",
    "Value": 1761688121.2877295
  },
  "AlertValueSecond": {
    "Unit": "packets",
    "Value": 164264.93744145698
  },
  "AlertValueThird": {
    "Unit": "unique_src_ip",
    "Value": 89
  },
  "Baseline": 0,
  "CompanyID": 24677,
  "CurrentState": "alarm",
  "Description": "Alarm for Clients_GLOBAL_TMS Active",
  "Dimensions": {
    "IP_dst": "103.122.191.63",
    "c_ddos_ghost": "FL-HK2-GRE-ipv4",
    "i_device_site_name": "SV5 San Jose"
  },
  "EndTime": "ongoing",
  "EventType": "alarm",
  "IsActive": true,
  "Links": {
    "DashboardAlarmURL": "https://portal.kentik.com/v4/alerting/dashboard/767/0192d7bf-71ff-7ab8-a494-697f532902d7",
    "DetailsAlarmURL": "https://portal.kentik.com/v4/alerting/0192d7bf-71ff-7ab8-a494-697f532902d7"
  },
  "Metrics": {
    "bits": 1761688121.2877295,
    "packets": 164264.93744145698,
    "unique_src_ip": 89
  },
  "PolicyID": "57187",
  "PreviousState": "new",
  "RuleID": "01907943-df74-7d64-8537-57ff8a11894f",
  "StartTime": "2024-10-29 10:08:20 UTC",
  "ThresholdID": "214982",
  "Type": "alarm",
  "issue": [],
  "statistic": {}
}
```

It opens an incident titled:

```
Alarm for Clients_GLOBAL_TMS Active — 1,761,688,121 bits on 103.122.191.63 / FL-HK2-GRE-ipv4 +1 more
```

The clear for the same alarm, which resolves it. Note that `AlarmID` is the one the activation carried — that is what joins the two — and that `CurrentState`, `AlarmState` and `IsActive` have all flipped:

```json
{
  "ActivateSeverity": "critical",
  "AlarmBaselineDescription": "A static threshold was used (no baselining).",
  "AlarmEnd": "2024-10-29 10:41:05 UTC",
  "AlarmID": "0192d7bf-71ff-7ab8-a494-697f532902d7",
  "AlarmPolicyApplication": "core",
  "AlarmPolicyID": "57187",
  "AlarmPolicyName": "Clients_GLOBAL_TMS",
  "AlarmSeverity": "critical",
  "AlarmStart": "2024-10-29 10:08:20 UTC",
  "AlarmState": "clear",
  "AlarmStateOld": "alarm",
  "AlarmThresholdID": "214982",
  "AlertBaselineSource": "0",
  "AlertDimensions": [
    "IP_dst",
    "c_ddos_ghost",
    "i_device_site_name"
  ],
  "AlertKey": [
    {
      "DimensionName": "IP_dst",
      "DimensionValue": "103.122.191.63"
    },
    {
      "DimensionName": "c_ddos_ghost",
      "DimensionValue": "FL-HK2-GRE-ipv4"
    },
    {
      "DimensionName": "i_device_site_name",
      "DimensionValue": "SV5 San Jose"
    }
  ],
  "AlertPolicyName": "Clients_GLOBAL_TMS",
  "AlertValue": {
    "Unit": "bits",
    "Value": 41552308.117
  },
  "Baseline": 0,
  "CompanyID": 24677,
  "CurrentState": "clear",
  "Description": "Alarm for Clients_GLOBAL_TMS Cleared",
  "Dimensions": {
    "IP_dst": "103.122.191.63",
    "c_ddos_ghost": "FL-HK2-GRE-ipv4",
    "i_device_site_name": "SV5 San Jose"
  },
  "EndTime": "2024-10-29 10:41:05 UTC",
  "EventType": "alarm",
  "IsActive": false,
  "Links": {
    "DashboardAlarmURL": "https://portal.kentik.com/v4/alerting/dashboard/767/0192d7bf-71ff-7ab8-a494-697f532902d7",
    "DetailsAlarmURL": "https://portal.kentik.com/v4/alerting/0192d7bf-71ff-7ab8-a494-697f532902d7"
  },
  "Metrics": {
    "bits": 41552308.117
  },
  "PolicyID": "57187",
  "PreviousState": "alarm",
  "RuleID": "01907943-df74-7d64-8537-57ff8a11894f",
  "StartTime": "2024-10-29 10:08:20 UTC",
  "ThresholdID": "214982",
  "Type": "alarm",
  "issue": [],
  "statistic": {}
}
```

It resolves the incident, and the event reads:

```
Alarm for Clients_GLOBAL_TMS Cleared on 103.122.191.63 / FL-HK2-GRE-ipv4 +1 more
```

### Fields Spike reads

| Field | What Spike does with it |
| --- | --- |
| `AlarmID` | Identifies the incident. Every notification about one alarm carries the same value |
| `CurrentState` | The alarm's state. `clear` resolves; anything else is still firing. Read first |
| `AlarmState` | The same state under a second name. Read when `CurrentState` is absent |
| `IsActive` | `false` resolves. Read when neither state field is readable |
| `Description` | Kentik's own sentence about the fault. The title |
| `AlarmPolicyName` | The policy name, used as the title when `Description` is empty |
| `AlertPolicyName` | The second spelling of the policy name. Read when `AlarmPolicyName` is empty |
| `AlertValue.Value` and `AlertValue.Unit` | The reading in the title, for example `1,761,688,121 bits` |
| `Metrics` | The reading, when the body carries no `AlertValue` |
| `Baseline` | Adds `(N% above baseline)` to the title when it is a non-zero number |
| `AlertKey` | Its `DimensionValue`s are the "where" of the title, in Kentik's order |
| `Dimensions` | The "where", when `AlertKey` is absent |
| `TestName` | The "where" for a Kentik Synthetics alarm, which carries no dimensions |
| `Events` | Unwrapped first, when a custom template wraps the alarm in an `Events` array |

Every other field — `AlarmSeverity`, `AlarmPolicyID`, `Links`, `AlarmStart`, `AlertValueSecond`, `AlertValueThird` and the rest — is kept on the incident and available to alert rules and the Title Remapper, but does not change what Spike does.

## Things worth knowing

* **One channel covers every policy.** There is no setup per policy beyond selecting the channel. Create the channel once and attach it to as many policies as you want.
* **Several Spike integrations are fine.** If different teams own different parts of the network, create one Spike integration per team and one Kentik notification channel per integration, then attach each channel to that team's policies.
* **Resolving in Spike does not touch Kentik.** The alarm stays active in Kentik's alerting dashboard until the condition clears there.
* **Kentik Synthetics alarms work the same way.** They carry `AlarmID` and `Description` like any other alarm, and are titled by Kentik's sentence with the test name as the "where", for example `Synthetics Test CHATGPT failed`.
* **Custom notification templates still work, with a caveat.** If you already use one — Kentik's custom notification templates, or a template another vendor supplies — Spike unwraps an `Events` array and reads the same field names out of the first event. Make sure your template passes `AlarmID` and `CurrentState` through, or Spike loses alarm-level matching.
* **Kentik's own email and Slack notifications are separate.** Anything you have already set up in Kentik keeps working; the Spike channel is additional, not a replacement.

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Check three things in order. First, that the channel's **URL** is the full `https://hooks.spike.sh/<your-token>/push-events` with nothing appended, and that the integration has not been archived in Spike.

Second, that the channel's **Status** is **Enabled**. A saved but disabled channel posts nothing.

Third, that at least one policy threshold has the channel selected under **Activate & Clear Settings → Notification Channels**. A channel no policy points at receives nothing at all, and this is the step most often missed.

</details>

<details>

<summary>Incidents never resolve</summary>

Spike resolves on the clear, and only while the incident is still open. Open the incident in Spike and look at the events on it: if the clear arrived, it carries `"CurrentState": "clear"`.

If no clear arrived, the Spike channel is attached to the policy's activation but Kentik never notified it on the clear — confirm the channel is still selected on the threshold, and that the alarm actually cleared in **Alerting → Alerting Dashboard** rather than still being active.

If the clear arrived and the incident is still open, check whether the two bodies carry the same `AlarmID`. Different ids are different alarms.

</details>

<details>

<summary>Every repeat opens its own incident</summary>

Open two of the incidents in Spike and compare the payloads on the incident page. If `AlarmID` differs, Kentik raised separate alarms, and separate alarms are separate incidents by design — one policy firing on two destination prefixes is two alarms.

If there is no `AlarmID` in the payload at all, you are sending a custom notification template that does not pass it through, or the older `CHALERT` webhook shape. Switch the channel to the built-in **JSON** type, or add `AlarmID` to your template.

</details>

<details>

<summary>An incident titled "Kentik alert with no details" opened</summary>

Spike could not read a `Description`, a policy name or any dimension out of the body. A custom notification template whose tokens did not substitute is the usual cause. Acknowledge it, resolve it, and if you are on the built-in JSON channel, the payload on the incident page is what to send to Spike support.

</details>

<details>

<summary>The title has no reading in it</summary>

Expected in two cases. A clear never carries a reading, because the number at the moment of recovery is not what the responder needs. And a body with no `AlarmID` gets a plain title with no reading, because Spike then has to match the repeat and the clear by title, and a number that moves between notifications would break that.

</details>

<details>

<summary>The severity badge ignores Kentik's severity</summary>

Expected. Spike does not set severity from the Kentik payload. `AlarmSeverity` is on the incident, so an [alert rule](../alerts/alert-rules.md) matching it can set whatever severity you want, and can also route or suppress the incident.

</details>

Disclaimer: These integration instructions are offered independently by Spike.sh, and Spike.sh is not affiliated with nor a partner of Kentik, Inc.
