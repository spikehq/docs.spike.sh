---
description: >-
  Send Elecard Boro stream quality notifications to Spike so an error going active pages your broadcast on-call rotation by phone, SMS, Slack or Teams, and the same error clearing resolves the incident.
---

# Integrate Spike with Elecard Boro

[Elecard Boro](https://elecard.com/products/quality-control/boro-service) runs probes against your IPTV and OTT streams and fires a trigger when a task breaks a threshold: bitrate below minimum, freeze frames, loss of audio, CC errors over the limit. Create a webhook notification profile in Boro, point it at a Spike integration URL, and every error that goes active pages your broadcast on-call rotation and then resolves itself when Boro reports the error cleared.

Nothing is installed anywhere and no request body needs writing. Boro publishes its own payload, and Spike reads it as it comes.

## What Spike does with each notification

Boro's triggers come in two kinds, and the `status` field tells you which one you are looking at. A **state trigger** notifies twice, once when the error state starts and once when it ends. An **event trigger** notifies once and never again.

| `status` | What happens in Spike |
| --- | --- |
| `Active` | Opens an incident for that error and pages your escalation policy. A repeat for an error that is already open is added to the incident already open and never pages again |
| `Cleared` | Auto-resolves the open incident. Dropped when nothing is open |
| `Event` | Opens an incident for a one-shot event. Boro never sends a `Cleared` for it, so nothing in the payload will ever close it. See Step 3 below |

### How Spike knows which incident a notification belongs to

Spike groups on **`referenceNumber`**, the id Boro uses to connect the occurrence of an error state with its completion. The `Active` and the `Cleared` for the same real-world error carry the same `referenceNumber`, which is what lets the second one resolve the incident the first one opened.

`sequenceId` is not used for this, and nothing you build should be. It is a per-message id: every delivery carries a fresh one, including the `Cleared` that ends an error state its `Active` began.

| Situation | Result in Spike |
| --- | --- |
| `Active`, then `Cleared`, same `referenceNumber` | One incident, opened and then auto-resolved |
| Two tasks under the same probe alarming at the same time | Two `referenceNumber`s, so two incidents. One per error state |
| The same error going active again after it cleared | A new `referenceNumber`, so a fresh incident and a fresh page |
| `Active` arriving repeatedly for an error still open | [Grouped](../incidents/grouping-incidents.md) onto the open incident as **Repeated N times** |

{% hint style="info" %}
Resolving the incident in Spike does not change anything in Boro, and a `Cleared` that arrives when nothing is open has nothing to close, so it is dropped. Let Boro clear the error and let that resolve the incident to keep the two sides in step.
{% endhint %}

Boro documents `referenceNumber` as an optional field. A notification that arrives without one cannot be paired with anything, so it opens an incident of its own and needs a resolve timer or a manual resolve, exactly like an `Event`.

## Incident titles

The title is the trigger that fired, the task it fired on, and the probe that saw it, so on-call can tell from a lock screen or a phone call which channel is broken and where it broke:

```
Bitrate below minimum on Channel 4 HD - Video Bitrate (Probe-Chicago-01)
```

That is `trigger`, `task_name` and `probe_name`, and nothing else. All three stay the same for the life of the task, so the `Active` and the `Cleared` of one error state produce exactly the same title, and a task that alarms twice in a night reads the same both times.

{% hint style="info" %}
`project_name`, `task_uri`, `time`, `time_end`, `duration`, `pid`, `details` and `links` are deliberately kept out of the title and shown on the incident page instead. They change between the `Active` and the `Cleared` of the same error, and a title that moves breaks the things that read it: the **Repeated N times** grouping, duplicate suppression, and any [alert rule](../alerts/alert-rules.md) matching on title text.
{% endhint %}

Use a [Title Remapper](../alerts/title-remapper.md) if you would rather lead with the project or the probe:

```handlebars
[{{data.body.project_name}}] {{data.body.trigger}} on {{data.body.task_name}}
```

Write the remapper against `trigger`, `task_name`, `probe_name`, `project_name` and `profile_name` only. A remapper that reads `time`, `duration` or `sequenceId` produces a different title on every delivery, which stops repeats grouping onto the incident already open.

## Severity

Boro sends the error's own `level`, taken from the trigger's configuration, and Spike maps it through the same table every integration uses:

| Boro `level` | Severity in Spike | Priority |
| --- | --- | --- |
| `fatal` | SEV1 | P1 |
| `major` | SEV1 | P1 |
| `error` | SEV2 | P2 |
| `warning` | SEV2 | P3 |
| `ok` | SEV3 | Left at the integration's default |

Those five are the whole set Boro documents in its trap MIB. A `level` outside them, from a newer Boro release, leaves the incident at the integration's default severity rather than failing, so the incident still opens and still pages. Matching is case-insensitive, so `major`, `Major` and `MAJOR` all land in the same place. Read more about [priority and severity](../incidents/priority-and-severity.md).

{% hint style="warning" %}
`warning` lands on **SEV2, not SEV3**. That is Spike's shared mapping for the word rather than a Boro-specific decision, and it is left alone on purpose so a Boro warning is scored the same as a warning from every other tool you send to Spike. If you want Boro's warning tier lower, add an [alert rule](../alerts/alert-rules.md) on the integration with an **Incident details** condition on the key `level` equal to `warning` and a **Mark severity as** SEV3 action.
{% endhint %}

The same rules can route an incident to another escalation policy or suppress it entirely, which is how you send scene-change events on a test channel somewhere quieter than the pager. Severity is set when the incident is created, so a `Cleared` carrying a different `level` than its `Active` does not re-score the incident it resolves.

## Prerequisites

* A Boro user who can reach **Project Settings → Notifications** on the project you want to be paged for
* An Elecard Boro integration in Spike and its webhook URL

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
   Click **Create profile** and tick **Enable Webhook notifications**.

3. **Point it at Spike:**
   Paste the webhook URL from Step 1 into the **URL** field. Boro posts `application/json`, which is what Spike expects, so nothing else needs configuring. Leave request signing, the secret key and custom headers alone unless a proxy of your own needs them, see the note below.

4. **Choose the triggers the profile covers:**
   Select the triggers this profile notifies on, and assign the profile to the tasks you want paged. Keep it to the channels somebody should be woken up for, and leave the rest on email. One profile per Spike integration is the cleanest split when different teams own different channel groups, and the profile's name arrives in the payload as `profile_name`, so [alert rules](../alerts/alert-rules.md) can route on it.

5. **Test it:**
   Click **Send test message**, confirm the incident shows up in Spike, then save the profile.
{% endtab %}
{% endtabs %}

The test message is a real POST to your integration, so it can open an incident and page whoever is on call for that escalation policy. Send it while you are watching, resolve what it opens, and warn your on-call first.

{% hint style="warning" %}
Boro can sign the request and send the result as an `Authorization: APIAuth-HMAC-SHA256 <profile id>:<signature>` header. Spike does not verify that signature today, so leave signing off and treat the token in the webhook URL as the credential: anyone holding that URL can open incidents on this integration. Keep it out of shared documents and tickets, and if it leaks, archive the integration, create a new one, and update the URL on every Boro profile pointing at it.
{% endhint %}

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

## Step 3 — Set a resolve timer for `Event` notifications

An error from a state trigger resolves itself: Boro sends the matching `Cleared` when the error state ends, and Spike closes the incident. An event trigger is different. It reports something that happened at one instant, a scene change or a stream restart, and Boro's spec has no clearing notification for it, so **nothing in the payload will ever resolve an `Event` incident.** Left alone, one stays open until somebody closes it by hand.

Give those incidents a [resolve timer](../incidents/resolve-timer.md) so they do not pile up:

1. Edit the Elecard Boro integration in Spike.
2. Scroll to **Advanced Configuration** and turn on **Resolve by Timer**.
3. Set a duration long enough that a real error state is never resolved out from under the person looking at it.

{% hint style="warning" %}
A timer set on the integration applies to every incident from it, including the `Active` ones that would have resolved themselves. Either set it comfortably longer than your longest expected error state, or keep it off them entirely with an [alert rule](../alerts/alert-rules.md): an **Incident details** condition on the key `status` equal to `Event`, with a **Resolve by Timer** action. The rule then covers exactly the incidents that have no other way to close.
{% endhint %}

If the timer fires on an `Active` incident while the error is still going, the `Cleared` that eventually arrives has nothing left to resolve and is dropped, and the next `Active` for that error opens a fresh incident and pages again.

## Payload reference

Boro posts `application/json` over POST and versions the body. Version `1.1` of an error going active looks like this:

```json
{
  "version": "1.1",
  "sequenceId": "seq-9c1d4b2f",
  "referenceNumber": "ref-8f3c2a1d",
  "project_name": "Broadcast-East",
  "probe_name": "Probe-Chicago-01",
  "task_name": "Channel 4 HD - Video Bitrate",
  "task_uri": "boro://tasks/4821",
  "trigger": "Bitrate below minimum",
  "status": "Active",
  "level": "major",
  "time": "2026-09-24T09:15:00Z",
  "time_end": "",
  "duration": "",
  "links": []
}
```

The same error clearing, seven minutes later. Note the identical `referenceNumber` and the new `sequenceId`:

```json
{
  "version": "1.1",
  "sequenceId": "seq-1a2b3c4d",
  "referenceNumber": "ref-8f3c2a1d",
  "project_name": "Broadcast-East",
  "probe_name": "Probe-Chicago-01",
  "task_name": "Channel 4 HD - Video Bitrate",
  "task_uri": "boro://tasks/4821",
  "trigger": "Bitrate below minimum",
  "status": "Cleared",
  "level": "major",
  "time": "2026-09-24T09:15:00Z",
  "time_end": "2026-09-24T09:22:00Z",
  "duration": "420",
  "links": []
}
```

An event trigger, which arrives on its own and is never followed by a `Cleared`:

```json
{
  "version": "1.1",
  "sequenceId": "seq-5e6f7a8b",
  "referenceNumber": "ref-2d3e4f5a",
  "project_name": "Broadcast-East",
  "probe_name": "Probe-Chicago-01",
  "task_name": "Channel 4 HD - Scene Change",
  "task_uri": "boro://tasks/4822",
  "trigger": "Scene change detected",
  "status": "Event",
  "level": "warning",
  "time": "2026-09-24T09:18:00Z",
  "time_end": "",
  "duration": "",
  "links": []
}
```

| Field | What Spike does with it |
| --- | --- |
| `referenceNumber` | Groups notifications. One open incident per error state. Optional in Boro's spec, and a notification without one opens an incident of its own |
| `sequenceId` | Recorded per delivery, so the notifications on one incident can be told apart. Never used for grouping |
| `status` | `Active` opens or joins, `Cleared` resolves, `Event` opens and never resolves |
| `level` | Sets the incident's severity and priority, per the table above |
| `trigger`, `task_name`, `probe_name` | The incident title, and the only three fields it is built from |
| `project_name`, `profile_name` | Shown on the incident. Useful conditions for [alert rules](../alerts/alert-rules.md) when one integration serves several projects or profiles |
| `task_uri`, `subtask_uri`, `subtask_description` | Shown on the incident, so you can open the stream or the HLS, DASH or SRT representation the error was seen on |
| `time`, `time_end`, `duration` | Shown on the incident. `time` is when the state started, `time_end` when it ended and `duration` how long it lasted, formatted by Boro. The last two are empty until the `Cleared` arrives |
| `links` | Any links Boro attaches to the notification, shown on the incident |
| `pid`, `count_by_pids` | Optional. The PID that triggered the error, and the per-PID error counts Boro sends on CC error triggers |
| `count` | Optional. The error count Boro sends on event triggers |
| `details` | Optional. Boro's own diagnostics, `curl_error`, `http_error` and `source_ip`, shown on the incident |
| `version` | Recorded, so a change in Boro's payload version is visible on the incident |

{% hint style="info" %}
Boro's documented fields, statuses and levels come from its [webhook notification guide](https://boro.elecard.com/docs/en/UserGuide/Server/Project.Settings/Notifications/Webhook.html) and its trap MIB. Fields it marks optional are simply absent when Boro has nothing to put in them, which Spike handles without dropping the notification.
{% endhint %}

## Things worth knowing

* **One incident per error state, not per notification.** An error that goes active and clears is one incident with two notifications on it, not two incidents.
* **`Event` incidents have no resolve path.** That is Boro's design, not a gap in Spike. Step 3 is how you stop them accumulating.
* **Two tasks on one probe are two incidents.** Boro gives each error state its own `referenceNumber`, so a channel that loses video and audio in the same moment pages twice, once per task. Narrow the profile's triggers, or use [alert rules](../alerts/alert-rules.md), if that is more traffic than you want.
* **Timestamps are Boro's.** `time` and `time_end` come from the probe. Incident times in Spike are shown in your own time zone, so the two can look hours apart on the same error.
* **Profiles are per project.** One Spike integration can receive notifications from as many projects, probes and tasks as you point at it, and each error state gets its own incident. Use separate integrations when different projects should page different teams.

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Use **Send test message** on the webhook profile in **Project Settings → Notifications → Webhook**. It either reaches Spike or it does not, which separates a Boro configuration problem from a quiet night.

If the test message arrives and real errors do not, the profile is not covering the triggers that are firing, or it is not assigned to those tasks. Check both, and check in Boro that the task really did cross its threshold. If nothing arrives at all, confirm **Enable Webhook notifications** is ticked, that the URL is the full `https://hooks.spike.sh/<your-token>/push-events` with no trailing characters, and that the integration has not been [archived](archive-an-integration.md).

</details>

<details>

<summary>Incidents open but never resolve</summary>

Check the `status` on what Boro sent. A `Cleared` resolves the incident; an `Event` never does, by design, because Boro sends nothing further for it.

If you are expecting a `Cleared` and the incident is still open, compare the `referenceNumber` on the notifications shown on the incident. Spike resolves the incident whose `referenceNumber` matches, so a `Cleared` carrying a different one, or none at all, has nothing to close. A `Cleared` that arrives after the incident was already resolved, by hand or by a resolve timer, is dropped too.

</details>

<details>

<summary>Every notification opens a new incident</summary>

The incident it should have joined was no longer open, usually because a resolve timer closed it between the `Active` and the repeat. Lengthen the timer as in Step 3, or move it onto an alert rule that only covers `Event` incidents.

If nothing is being resolved and you still see one incident per delivery, the notifications are carrying different `referenceNumber`s, or none. Two tasks alarming together is the normal reason, and those are meant to be separate incidents.

</details>

<details>

<summary>An error cleared in Boro but the incident is still paging</summary>

The escalation policy keeps notifying until the incident is acknowledged or resolved. A `Cleared` resolves it and stops the escalation, so look for that notification on the incident. If it is not there, Boro has not sent it: the error state is still open on the probe, or the profile was changed or unassigned after the `Active` went out.

</details>

<details>

<summary>Severity is not what we expected</summary>

Boro's `level` goes through Spike's shared mapping, so `fatal` and `major` come in as SEV1, and both `error` and `warning` come in as SEV2. `warning` landing on SEV2 rather than SEV3 is the usual surprise. Override it per integration with an [alert rule](../alerts/alert-rules.md) on the `level` detail, as described under **Severity** above.

A level Spike does not recognise, from a newer Boro release, leaves the incident at the integration's default. The incident still opens and still pages.

</details>

<details>

<summary>Titles look the same on several incidents</summary>

Titles are built from the trigger, the task and the probe, so one task alarming on the same trigger twice in a night reads identically, which is what makes repeats group onto one incident. Two incidents with the same title and different `referenceNumber`s are two separate error states on that task. Add the project or the profile with a [Title Remapper](../alerts/title-remapper.md) if you need to tell them apart at a glance.

</details>
