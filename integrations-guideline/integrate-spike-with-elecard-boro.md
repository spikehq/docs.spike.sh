---
description: >-
  Send Elecard Boro webhook notifications to Spike so a trigger going active on an IPTV, OTT or MPEG-TS task pages your broadcast on-call rotation by phone, SMS, Slack or Teams, and resolves its incident when Boro reports the error state cleared.
---

# Integrate Spike with Elecard Boro

[Elecard Boro](https://elecard.com/products/quality-control/boro-service) runs probes against your MPEG-TS, video, audio and OTT streams and fires a trigger when a task breaks a threshold: a timestamp discontinuity, a bad source, CC errors over the limit, a rendition that stopped answering. Roughly 130 trigger names exist across its MPEG-TS, video/audio and OTT categories.

Boro's **Webhook** notification profile posts each of those as JSON. Point it at a Spike integration URL and a trigger going active pages your on-call rotation the moment Boro registers it, repeats land on the incident already open instead of paging again, and the incident resolves itself when Boro reports the same error state cleared.

Nothing is installed anywhere and there is no request body to write. Boro publishes its own payload and Spike reads it as it arrives.

## What Spike does with each notification

Every notification carries a `status`, and that field alone decides what Spike does with it:

| `status` | What it means in Boro | What happens in Spike |
| --- | --- | --- |
| `Active` | A state trigger's error state started | Opens an incident and pages your escalation policy. A repeat for an error state that is already open is [grouped](../incidents/grouping-incidents.md) onto it as **Repeated N times** and never pages again |
| `Cleared` | That same error state ended | Auto-resolves the open incident. Dropped when nothing is open |
| `Event` | An event trigger fired — a one-shot error report | Opens an incident and pages. Boro never sends a `Cleared` for it, so nothing in the payload will ever close it. See Step 3 |

Matching is case-insensitive, so `Cleared` and `CLEARED` both resolve. A `status` Spike does not recognise, and a notification with none at all, is treated as firing: the incident opens and pages rather than being dropped.

### Incident identity

Spike identifies the incident by **`referenceNumber`**, the number Boro uses to connect the occurrence of an error state with its completion. The `Active` and the `Cleared` of one real error carry the same `referenceNumber`, and that is what lets the second resolve the incident the first opened.

`sequenceId` is never used for this. It is a per-message id: every delivery carries a fresh one, including the `Cleared` that ends an error state its `Active` began.

| Situation | Result in Spike |
| --- | --- |
| `Active`, then `Cleared`, same `referenceNumber` | One incident, opened and then auto-resolved |
| `Active` arriving again while the error state is still open | Grouped onto the open incident as **Repeated N times** |
| Two tasks on the same probe alarming together | Two `referenceNumber`s, so two incidents — one per error state |
| The same error going active again after it cleared | A new `referenceNumber`, so a fresh incident and a fresh page |

{% hint style="info" %}
`referenceNumber` has to arrive as a JSON number, the way Boro sends it (`"referenceNumber": 7189705`). A quoted string, a `null` or a missing field all read as *no identity*, and Spike then falls back to matching on the incident title, as described under **Incident titles** below.
{% endhint %}

Boro documents `referenceNumber` as optional, and the field is absent from some notifications — `Event`-type triggers have no completion to connect to in the first place. Those incidents still open, still page, and still resolve on a later `Cleared` for the same trigger and task, because Spike matches them on the title instead.

Resolving an incident in Spike does not change anything in Boro, and a `Cleared` that arrives when nothing is open has nothing to close, so it is dropped. Let Boro clear the error and let that resolve the incident, to keep the two sides in step.

## Incident titles

Boro's payload has no summary, message or description field — there is no sentence in it to put on a lock screen — so Spike builds the title out of what the payload does carry: the trigger that fired, how much of it there was, and the stream it happened on.

When `referenceNumber` is present as a number, the identity is the reference number and the title is free to carry readings:

```
Timestamp Discontinuity, 3 errors on DASH AllRenditions — video(HQ_video 4 Mb/s: 1280x720, avc1.4D001F)
```

That is `trigger`, `count`, `task_name` and `subtask_description`. The pieces come and go with the payload:

* `, {count} errors` appears only when `count` is a number of 1 or more.
* When `count_by_pids` names more than one elementary stream, the two worst PIDs are named with their own error counts, worst first, and the rest are summarised: `CC Error, 7 errors on PIDs 1001 (3), 1002 (2) +1 more on Service 2 UDP`. The media representation drops out in that case, because Boro sends one `subtask_description` and a fault spread over several streams is not that one rendition.
* ` — {subtask_description}` appears when Boro sends one and only one stream is affected.
* `details.http_error`, or `details.curl_error` when there is no HTTP error, is appended as ` — 404 Not Found` when it reads as a sentence rather than a bare numeric code.

When `referenceNumber` is absent, `null` or a quoted string, Spike has no id to group on and matches the next notification on the title instead. The title then has to come out byte-for-byte identical every time, so all the readings are dropped and it is just the trigger and the stream:

```
PCR Repetition Error on Service 2 UDP
```

A `Cleared` renders as the plain recovery line, with no readings and no duration, so that it still matches the incident it has to resolve:

```
Timestamp Discontinuity on DASH AllRenditions is back to normal
```

The stream in the title — the "where" — is `task_name`, and falls back to the host and path of `task_uri` when the task has no name (`HTTP Error on cdn.example.net/live/channel5/master.m3u8 — 404 Not Found`), then to `probe_name` when there is neither. A notification with no `trigger` reads `Elecard Boro alert`, and one with nothing usable at all reads `Elecard Boro alert with no details` rather than being dropped.

{% hint style="info" %}
`sequenceId`, `referenceNumber`, `level`, `time`, `time_end`, `duration`, `project_name`, `profile_name`, `subtask_uri` and `links` are deliberately kept out of the title and shown on the incident page instead. Titles are capped at 200 characters; the media representation is cut first, then the readings, so `{trigger} on {task_name}` always survives.
{% endhint %}

Use a [Title Remapper](../alerts/title-remapper.md) if your team reads streams by project or probe rather than by task:

```handlebars
[{{data.body.project_name}}] {{data.body.trigger}} on {{data.body.task_name}}
```

Write the remapper against `trigger`, `task_name`, `task_uri`, `probe_name`, `project_name` and `profile_name` only. One that reads `time`, `duration`, `count` or `sequenceId` renders a different title on every delivery, which stops repeats grouping and stops recoveries matching for the notifications that have no `referenceNumber`.

## Severity

Spike does not set severity from the Boro payload. `level` — the severity you set on the trigger in the notification profile, `major` in Boro's own example — arrives on the incident, so an [alert rule](../alerts/alert-rules.md) with an **Incident details** condition on the key `level` sets whatever severity your team wants:

| Boro `level` | Suggested rule |
| --- | --- |
| `major` | **Mark severity as** SEV1 |
| `error` | **Mark severity as** SEV2 |
| `warning` | **Mark severity as** SEV3, or route it to a service that does not page |

The same rules can route an incident to another escalation policy or suppress it entirely, which is how you send a noisy trigger on a test channel somewhere quieter than the pager. Read more about [priority and severity](../incidents/priority-and-severity.md).

{% hint style="info" %}
Severity is set when the incident is created, so a `Cleared` carrying a different `level` than its `Active` does not re-score the incident it resolves. Boro's documentation does not enumerate the full set of `level` values — `major` is the only one in its example — so write your rules on the levels your own profiles actually send, and check the incident page for the value that arrived.
{% endhint %}

## Prerequisites

* A Boro user who can reach **Project Settings → Notifications** on the project you want to be paged for
* An Elecard Boro integration in Spike and its webhook URL
* Outbound HTTPS from Boro to `hooks.spike.sh`

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Elecard Boro**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Create the webhook notification profile in Boro

{% tabs %}
{% tab title="Setup on Elecard Boro" %}
1. **Open the project's notification settings:**
   In Boro, open the project and go to **Project Settings → Notifications → Webhook**.

2. **Create the profile:**
   Click **Create profile** and give it a name your team will recognise, for example `Spike on-call`. The name arrives in the payload as `profile_name`, so [alert rules](../alerts/alert-rules.md) can route on it.

3. **Enable it:**
   Tick **Enable** so the profile starts sending. A saved profile that is not enabled sends nothing.

4. **Point it at Spike (required):**
   Paste the webhook URL from Step 1 into the **URL** field. Boro posts `application/json` over POST, which is what Spike expects, so there is nothing else to configure about the body.

5. **Leave request signing off:**
   **Sign requests** and **Secret key** are optional, and Spike does not verify Boro's signature. Leave the checkbox clear and the **Secret key** field empty — the token in the webhook URL is the credential.

6. **Choose the triggers and tasks the profile covers:**
   Select the triggers this profile notifies on and assign it to the tasks you want paged. Keep it to the streams somebody should be woken up for and leave the rest on email; Boro has roughly 130 triggers, and a profile that sends all of them on every task will page far more than your on-call wants.

7. **Send a test message:**
   Click **Send test message**, confirm the incident appears in Spike, then save the profile.
{% endtab %}
{% endtabs %}

The test message is a real POST to your integration, so it can open an incident and page whoever is on call for that escalation policy. Send it while you are watching, resolve what it opens, and warn your on-call first.

{% hint style="warning" %}
Boro can sign the request and send the result as an `Authorization: APIAuth-HMAC-SHA256 <profile id>:<signature>` header. Spike does not verify that signature today, so treat the token in the webhook URL as the credential: anyone holding that URL can open incidents on this integration. Keep it out of shared documents and tickets, and if it leaks, archive the integration, create a new one, and update the URL on every Boro profile pointing at it.
{% endhint %}

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

## Step 3 — Set a resolve timer for `Event` notifications

A state trigger resolves itself: Boro sends the matching `Cleared` when the error state ends and Spike closes the incident. An event trigger is different. It reports an error that happened, and Boro's webhook spec has no clearing notification for it, so **nothing in the payload will ever resolve an `Event` incident.** Left alone, one stays open until somebody closes it by hand.

Give those incidents a [resolve timer](../incidents/resolve-timer.md):

1. Edit the Elecard Boro integration in Spike.
2. Scroll to **Advanced Configuration** and turn on **Resolve by Timer**.
3. Set a duration longer than your longest expected error state.

{% hint style="warning" %}
A timer set on the integration applies to every incident from it, including the `Active` ones that would have resolved themselves. Either set it comfortably long, or keep it off them entirely with an [alert rule](../alerts/alert-rules.md): an **Incident details** condition on the key `status` equal to `Event`, with a **Resolve by Timer** action. The rule then covers exactly the incidents that have no other way to close.

If a timer fires on an `Active` incident while the error state is still going, the `Cleared` that eventually arrives has nothing left to resolve and is dropped, and the next `Active` for that error opens a fresh incident and pages again.
{% endhint %}

## Event payload structure

Boro posts `application/json` over POST and versions the body. Version `1.1` of a trigger going active looks like this:

```json
{
  "version": "1.1",
  "sequenceId": 664,
  "referenceNumber": 7189705,
  "project_name": "Elecard Network",
  "probe_name": "Development probe",
  "task_uri": "http://10.10.30.53:8080/DASH/DASH.mpd",
  "task_name": "DASH AllRenditions",
  "subtask_uri": "http://10.10.30.53:8080/Match/HQ_video",
  "subtask_description": "video(HQ_video 4 Mb/s: 1280x720, avc1.4D001F)",
  "trigger": "Timestamp Discontinuity",
  "status": "Active",
  "level": "major",
  "time": "2026-10-08T16:16:38.849+07:00",
  "count": 3,
  "count_by_pids": {
    "1001": 3
  },
  "profile_name": "Spike on-call",
  "links": [
    {
      "type": "task",
      "href": "https://boro.elecard.com/task/1182"
    },
    {
      "type": "subtask",
      "href": "https://boro.elecard.com/task/1182/subtask/4"
    }
  ]
}
```

The same error state clearing. Note the identical `referenceNumber`, the new `sequenceId`, and the added `time_end` and `duration`:

```json
{
  "version": "1.1",
  "sequenceId": 666,
  "referenceNumber": 7189705,
  "project_name": "Elecard Network",
  "probe_name": "Development probe",
  "task_uri": "http://10.10.30.53:8080/DASH/DASH.mpd",
  "task_name": "DASH AllRenditions",
  "subtask_uri": "http://10.10.30.53:8080/Match/HQ_video",
  "subtask_description": "video(HQ_video 4 Mb/s: 1280x720, avc1.4D001F)",
  "trigger": "Timestamp Discontinuity",
  "status": "Cleared",
  "level": "major",
  "time": "2026-10-08T16:16:38.849+07:00",
  "time_end": "2026-10-08T16:16:39.743+07:00",
  "duration": "1 s",
  "count": 3,
  "count_by_pids": {
    "1001": 3
  },
  "profile_name": "Spike on-call",
  "links": [
    {
      "type": "task",
      "href": "https://boro.elecard.com/task/1182"
    },
    {
      "type": "subtask",
      "href": "https://boro.elecard.com/task/1182/subtask/4"
    }
  ]
}
```

Those two notifications are one incident in Spike: `Timestamp Discontinuity, 3 errors on DASH AllRenditions — video(HQ_video 4 Mb/s: 1280x720, avc1.4D001F)`, opened by the first and auto-resolved by the second.

**What Spike does with each field:**

| Field | What Spike does with it |
| --- | --- |
| `status` | `Active` opens or joins, `Cleared` resolves, `Event` opens and never resolves |
| `referenceNumber` | Groups notifications onto one incident — one per error state. Optional in Boro's spec; without it Spike matches on the title |
| `trigger` | Leads the incident title — Boro's own words for what is wrong |
| `task_name` | The stream or service in the title, kept whole |
| `count`, `count_by_pids` | How much, and on which elementary streams. In the title when there is a `referenceNumber` to group on |
| `subtask_description` | The media representation, appended to the title when only one stream is affected |
| `details` | `http_error` and `curl_error` are appended to the title when they read as sentences; `source_ip` and the rest are shown on the incident |
| `level` | Shown on the incident. Spike does not set severity from it — write an [alert rule](../alerts/alert-rules.md) on it, as described under **Severity** |
| `task_uri` | Shown on the incident, and the fallback "where" in the title when the task has no name |
| `probe_name` | The probe that registered the error, shown on the incident. Last-resort "where" in the title |
| `subtask_uri` | Shown on the incident, so you can open the HLS, SRT or DASH representation the error was seen on |
| `project_name`, `profile_name` | Shown on the incident. Useful [alert rule](../alerts/alert-rules.md) conditions when one integration serves several projects or profiles |
| `time`, `time_end`, `duration` | Shown on the incident. `time` is when the state started; the other two arrive with the `Cleared` |
| `sequenceId` | Recorded per delivery, so the notifications on one incident can be told apart. Never used for grouping |
| `links` | Boro's links back to the task, subtask and profile, shown on the incident |
| `version` | Recorded, so a change in Boro's payload version is visible on the incident |

{% hint style="info" %}
Fields Boro marks optional — `referenceNumber`, `count`, `count_by_pids`, `pid`, `subtask_uri`, `subtask_description`, `details` — are simply absent when Boro has nothing to put in them, and Spike handles that without dropping the notification. A Boro release that adds fields, such as 2.2's extended webhook content for OTT and SRT, keeps working: the extra fields are kept on the incident.
{% endhint %}

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Use **Send test message** on the profile in **Project Settings → Notifications → Webhook**. It either reaches Spike or it does not, which separates a Boro configuration problem from a quiet night.

If the test message arrives and real errors do not, the profile is not covering the triggers that are firing, or it is not assigned to the tasks that are breaking. Check both, and check in Boro that the task really did cross its threshold.

If nothing arrives at all, confirm **Enable** is ticked on the profile, that the URL is the full `https://hooks.spike.sh/<your-token>/push-events` with no trailing characters, and that the integration has not been [archived](archive-an-integration.md).

</details>

<details>

<summary>Incidents open but never resolve</summary>

Check the `status` on the notifications shown on the incident. Only `Cleared` resolves. An `Event` never does, by design, because Boro sends nothing further for it — Step 3 is how you stop those accumulating.

If you are expecting a `Cleared` and the incident is still open, compare the `referenceNumber` on the two notifications. Spike resolves the incident whose reference number matches, so a `Cleared` carrying a different one has nothing to close. For notifications with no reference number, Spike matches on the title, so a [Title Remapper](../alerts/title-remapper.md) that puts a count or a timestamp in the title will also stop recoveries matching.

A `Cleared` that arrives after the incident was already resolved, by hand or by a resolve timer, is dropped too.

</details>

<details>

<summary>Every notification opens a new incident</summary>

Most often the incident it should have joined was no longer open, because a resolve timer closed it between the `Active` and the repeat. Lengthen the timer as in Step 3, or move it onto an alert rule that only covers `Event` incidents.

Otherwise, open two of the incidents and compare the payloads on the incident page. Different `referenceNumber`s are different error states, and those are meant to be separate incidents — two tasks alarming together is the normal reason. If the reference numbers look the same but arrived quoted (`"7189705"` rather than `7189705`), Spike reads that as no identity and groups on the title instead.

</details>

<details>

<summary>An error cleared in Boro but the incident is still paging</summary>

The escalation policy keeps notifying until the incident is acknowledged or resolved. A `Cleared` resolves it and stops the escalation, so look for that notification on the incident. If it is not there, Boro has not sent it: the error state is still open on the probe, or the profile was changed or unassigned after the `Active` went out.

</details>

<details>

<summary>The severity badge ignores Boro's level</summary>

Expected. Spike does not set severity from the Boro payload. `level` is on the incident, so an [alert rule](../alerts/alert-rules.md) matching it can set whatever severity you want, and can also route or suppress the incident. See **Severity** above.

</details>

<details>

<summary>Titles look the same on several incidents</summary>

A title built without readings — `PCR Repetition Error on Service 2 UDP` — is what a notification with no `referenceNumber` gets, and that sameness is deliberate: it is what lets the repeat group and the recovery resolve. Two such incidents at once are two separate error states on that task. Add the project or the probe with a [Title Remapper](../alerts/title-remapper.md) if you need to tell them apart at a glance, but keep the remapper off anything that changes between notifications.

</details>

<details>

<summary>An incident titled "Elecard Boro alert with no details" opened</summary>

Spike could not read a trigger, a task, a task URI or a probe name from the delivery. Spike opens an incident for an unreadable delivery rather than dropping it, because the alternative is losing a real stream fault silently. Acknowledge it, resolve it, and send the payload shown on the incident page to Spike support.

</details>

Disclaimer: These integration instructions are offered independently by Spike.sh, and Spike.sh is not affiliated with nor a partner of Elecard.
