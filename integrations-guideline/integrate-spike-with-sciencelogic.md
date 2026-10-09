---
description: >-
  Send ScienceLogic Skylar One (SL1) events to Spike so an active event pages your on-call rotation by phone, SMS, Slack or Teams, and resolves its incident when SL1 clears the event.
---

# Integrate Spike with ScienceLogic Skylar One (SL1)

[ScienceLogic Skylar One](https://sciencelogic.com) (SL1) monitors devices, networks, cloud and applications, and turns what it finds into events: a threshold crossed, an interface down, a service not answering. An event stays active until the condition goes away, and SL1 then clears it.

SL1's run book automation can call an HTTP endpoint when an event becomes active and again when it is cleared. Point two automation policies at a Spike integration URL and an active SL1 event pages your on-call rotation, a repeat of the same event lands on the incident already open instead of paging again, and the incident resolves itself when SL1 clears the event.

Nothing is installed on the monitored devices. One action and two automation policies, configured once in SL1, cover every event you scope them to.

## What Spike does with each payload

Every payload carries a `status` that you type into it. That one field decides what Spike does:

| `status` | Sent by | What happens in Spike |
| --- | --- | --- |
| `active` | The automation policy whose **Policy Type** is **Active Events** | Opens an incident and pages your escalation policy. Joins the incident already open for the same event instead of paging again |
| `cleared` | The automation policy whose **Policy Type** is **Cleared Events** | Resolves the open incident. Dropped when nothing is open |

SL1 has no run book variable that says whether an event is active or cleared, so `status` is a literal you type into each policy's payload. The comparison ignores surrounding spaces and letter case.

### Incident identity

Spike identifies the incident by `event_id`, filled from SL1's `%e` (**Event ID**). The Active Events run and the Cleared Events run for one event carry the same id, so an event that fires, repeats and clears pages your team once and closes itself.

Identity is the event, not the device. Two different events on `db-prod-03` are two incidents, which is what you want, since they are two problems to fix.

{% hint style="info" %}
A `cleared` payload that arrives with no matching open incident is dropped rather than turned into a new incident. That happens when the incident was already resolved in Spike, or when the Active Events policy never ran for that event. Resolving an incident in Spike does not clear the event in SL1; clear it in SL1 and let the Cleared Events policy resolve the incident to keep the two sides in step.
{% endhint %}

If `event_id` is missing, empty, or still the raw `%e` token because SL1 did not substitute it, Spike falls back to matching on the incident title. Keep `event_id` in both payloads so matching does not depend on the title.

## Incident title

The title is SL1's own sentence about the fault, taken from `event_message`:

```
Physical Memory has exceeded threshold: (90%) currently (96%)
```

It is whitespace-collapsed and capped at 200 characters. When `event_message` is empty, the title is the policy and the device:

```
Host Resource: Physical Memory Utilization Exceeded Threshold on db-prod-03
```

A recovery is written as a recovery, naming the policy and the device:

```
Host Resource: Physical Memory Utilization Exceeded Threshold cleared on db-prod-03
```

When a payload has no usable `event_id`, the title is always the plain `event_policy_name` on `entity_name` form for both the firing and the recovery payload, because the title is then the only thing that ties the two together and SL1's sentence carries readings that change between runs.

Any field SL1 left as a raw token such as `%M` is treated as empty. The device name is always kept whole; a long policy name is shortened instead. If nothing usable remains, the title is `ScienceLogic SL1 alert with no details`.

{% hint style="info" %}
A recovery reads differently from the notification that opened the incident, on purpose: the person scanning an event list needs to know which of their open incidents went away. It still resolves the right incident, because matching is done on `event_id` and never on the title.
{% endhint %}

Use a [Title Remapper](../alerts/title-remapper.md) if your team reads events by device and policy rather than by SL1's sentence:

```handlebars
{{data.body.entity_name}}: {{data.body.event_policy_name}}
```

## Severity

Spike does not set the severity badge from SL1's `severity`. The value is kept on the incident, so incidents open at your integration's default.

If you want SL1's levels on the badge, write an [alert rule](../alerts/alert-rules.md) on `severity`. Alert rules can also route an incident to another service or escalation policy, or suppress it entirely. Read more about [priority and severity](../incidents/priority-and-severity.md).

## Prerequisites

* An SL1 (Skylar One) account that can manage **Run Book** automation: actions and automation policies
* The **Make an HTTP Request** action type available in your SL1. It comes from the HTTP Action Type PowerPack; if it is missing from the action type list, install that PowerPack first
* A ScienceLogic SL1 integration in Spike and its webhook URL
* Outbound HTTPS from the SL1 system that runs the automation to `hooks.spike.sh`

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → ScienceLogic SL1**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Create the run book actions in SL1

You create two actions, one for each status. They differ only in the `status` line of the payload.

1. **Open the Action Policy Manager:**
   In SL1, go to **Registry → Run Book → Action Policy Manager** (in the classic interface, **Registry > Run Book > Actions**) and select **Create** to add a new action.

2. **Name it and choose the action type:**
   Give the action a name your team will recognise, for example `Spike - event active`, and set **Action Type** to **Make an HTTP Request**.

3. **Fill in the request.** Required fields:
   * **HTTP Method** — `POST`
   * **URL** — the webhook URL from Step 1, with nothing appended
   * **Headers** — `Content-Type: application/json`
   * **Payload** — the JSON from the next section, with `"status": "active"`

   The token in the URL is the credential, so no username, password or authorization header is needed. Treat the URL like a password, and if it leaks, archive the integration and create a new one.

4. **Save the action,** then repeat for a second action named `Spike - event cleared`, using the same URL and the payload with `"status": "cleared"`.

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

## The payload

Paste this into the **Payload** field of the active action. Keep the field names exactly as written, and keep every field, since each is what the responder reads on the incident page. The `%`-prefixed tokens are SL1 run book variables and SL1 substitutes them each time the policy runs; keep them in quotes.

```json
{
  "status": "active",
  "event_id": "%e",
  "event_message": "%M",
  "severity": "%S",
  "entity_name": "%X",
  "event_policy_name": "%_event_policy_name",
  "organization": "%O",
  "ip_address": "%a",
  "url_to_event": "%H"
}
```

| Field | SL1 variable | Used for |
| --- | --- | --- |
| `status` | typed literal: `active` or `cleared` | Tells Spike whether to open or resolve. **Required** |
| `event_id` | `%e` (Event ID) | Identity of the incident. **Required**: without it matching falls back to the title |
| `event_message` | `%M` (Event message) | The firing title. **Required** |
| `event_policy_name` | `%_event_policy_name` | The policy name in the fallback and recovery titles. **Required** |
| `entity_name` | `%X` (Entity name) | The device in the fallback and recovery titles. **Required** |
| `severity` | `%S` (Severity) | Shown on the incident. Optional |
| `organization` | `%O` (Organization) | Context for MSPs. Optional |
| `ip_address` | `%a` (IP address) | Shown on the incident. Optional |
| `url_to_event` | `%H` (URL link to event) | Link back to the event in SL1. Optional |

For the cleared action, the payload is the same with the first line changed:

```json
{
  "status": "cleared",
  "event_id": "%e",
  "event_message": "%M",
  "severity": "%S",
  "entity_name": "%X",
  "event_policy_name": "%_event_policy_name",
  "organization": "%O",
  "ip_address": "%a",
  "url_to_event": "%H"
}
```

{% hint style="warning" %}
Depending on your SL1 version, the action's input parameters may take the payload as a JSON object or as a JSON-encoded string. If SL1 shows the payload as a string field, paste the JSON as it is shown above and check on the first real event that the incident page shows the fields separately rather than one long string.
{% endhint %}

## Step 3 — Create the automation policies

An automation policy decides which events run which action. You create two.

1. **Open the Automation Policy Manager:**
   Go to **Registry → Run Book → Automation Policy Manager** (classic: **Registry > Run Book > Automation**) and select **Create**.

2. **Active Events policy:**
   * **Policy Name** — `Spike - active events`
   * **Policy Type** — **Active Events**
   * **Aligned Actions** — the `Spike - event active` action
   * **Event matching** — scope the policy with the event criteria, organizations, severities and devices that a human should be woken up for. A policy that matches every event on every device pages far more than your on-call wants

3. **Cleared Events policy:**
   Create a second policy named `Spike - cleared events` with **Policy Type** set to **Cleared Events**, the `Spike - event cleared` action aligned, and **the same event matching** as the first. SL1 runs a Cleared Events policy once, when the event is cleared.

4. **Save both policies** and make sure they are enabled.

{% hint style="info" %}
If you give the Active Events policy a **Repeat Time**, SL1 resends the payload while the event stays active. Each resend carries the same `event_id`, so it joins the open incident and does not page again.
{% endhint %}

## Step 4 — Confirm it with a real event

SL1 has no test button for an automation policy, so the first real event is the test. The quickest one to force is a threshold you can breach on demand on a test device: lower a threshold until the event goes active, then put it back.

Watch for both statuses:

1. An incident opens in Spike with SL1's event message as the title, on the service you attached, escalating through your policy.
2. Clearing the event in SL1 runs the Cleared Events policy and resolves that incident.

If the first step works and the second does not, check `event_id` on the cleared payload first.

## Payload reference

An active event, which opens the incident:

```json
{
  "status": "active",
  "event_id": "1874532",
  "event_message": "Physical Memory has exceeded threshold: (90%) currently (96%)",
  "severity": "Critical",
  "entity_name": "db-prod-03",
  "event_policy_name": "Host Resource: Physical Memory Utilization Exceeded Threshold",
  "organization": "Acme Corp",
  "ip_address": "10.20.4.13",
  "url_to_event": "https://sl1.acme.example/em7/index.em7?exec=events&q_type=aid&q_arg=1874532"
}
```

The same event cleared, which resolves it:

```json
{
  "status": "cleared",
  "event_id": "1874532",
  "event_message": "Physical Memory has exceeded threshold: (90%) currently (96%)",
  "severity": "Critical",
  "entity_name": "db-prod-03",
  "event_policy_name": "Host Resource: Physical Memory Utilization Exceeded Threshold",
  "organization": "Acme Corp",
  "ip_address": "10.20.4.13",
  "url_to_event": "https://sl1.acme.example/em7/index.em7?exec=events&q_type=aid&q_arg=1874532"
}
```

They produce these titles:

```
Physical Memory has exceeded threshold: (90%) currently (96%)
Host Resource: Physical Memory Utilization Exceeded Threshold cleared on db-prod-03
```

Spike keeps the whole body on the incident, so every field is available to [alert rules](../alerts/alert-rules.md) and the [Title Remapper](../alerts/title-remapper.md) as `data.body.<field>`.

## Things worth knowing

* **Two actions, two policies.** SL1 cannot tell the payload whether the event is active or cleared, so the two statuses need their own action each.
* **Several Spike integrations are fine.** If different teams own different organizations or device groups, create one Spike integration per team and a pair of policies per integration, scoped to that team's events.
* **Resolving in Spike does not touch SL1.** The event stays active in SL1 until the condition recovers or someone clears it there.
* **Skylar One and SL1 are the same product.** ScienceLogic renamed SL1 to Skylar One; both names point at this integration.

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Check that the URL in the action is the full `https://hooks.spike.sh/<your-token>/push-events`, with nothing appended, and that the integration has not been archived in Spike. Then check that both policies are enabled, that the event matches their criteria, and that the SL1 system running the automation can reach `hooks.spike.sh`. The action log on the event in SL1 shows whether the request was made and what Spike answered.

</details>

<details>

<summary>The incident never resolves</summary>

Spike resolves on `status` `cleared` and only while the incident is still open. Confirm that the event actually clears in SL1, that the Cleared Events policy matches the same events as the Active Events policy, and that the cleared payload carries the same `event_id` as the active one. If `event_id` arrives empty or as a literal `%e`, matching falls back to the title and a recovery will not find the incident.

</details>

<details>

<summary>The fields show up as literal %-tokens</summary>

SL1 did not substitute that variable. Spike treats a raw token as empty, so the title falls back to the policy and device. Check the variable spelling in the payload against the table above, and that the variable exists in your SL1 version. If `%_event_policy_name` is not substituted, the title falls back to SL1's event message when there is an id.

</details>

<details>

<summary>The webhook is rejected or the JSON looks broken</summary>

An event message containing a double quote or a line break can produce invalid JSON once SL1 has substituted it into the payload. Keep the fields quoted exactly as shown. If a particular event message breaks the request, drop `event_message` from the payload: the title then falls back to the policy name and the device.

</details>

<details>

<summary>The severity badge ignores SL1's severity</summary>

Expected. The badge is not set from `severity`. The value is still on the incident, so an [alert rule](../alerts/alert-rules.md) matching `severity` can set whatever severity you want, and can also route or suppress the incident.

</details>

Disclaimer: These integration instructions are offered independently by Spike.sh, and Spike.sh is not affiliated with nor a partner of ScienceLogic, Inc.
