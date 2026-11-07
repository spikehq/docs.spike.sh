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

If `event_id` is missing, empty, or still the unsubstituted run book variable `%e` (SL1's run book variables are `%` and one letter or digit, or `%_` and a name), Spike treats the payload as having no id and falls back to matching on the incident title. A number counts as an id (`0` too). Keep `event_id` in both payloads so matching does not depend on the title.

Spike uses the id exactly as SL1 sends it. When it compares the Active Events and Cleared Events ids it ignores surrounding spaces. A `cleared` payload resolves the open incident only when the ids match, or when neither side has a usable id and the title matches instead.

## Incident title

With a usable `event_id`, the title is SL1's own sentence about the fault, followed by the device:

```
Physical memory usage has exceeded threshold: (90%) currently (95.3%) on db-prod-03
```

` on <entity_name>` is added only when the sentence does not already name the device as a whole word. The title is whitespace-collapsed and capped at 200 characters; when the sentence has to be cut, it is cut at a word boundary and the device stays whole. If `event_message` is empty, the title falls back to `event_policy_name` on `entity_name`, then `event_policy_name`, then `ScienceLogic event on <entity_name>`, then `ScienceLogic event with no details`.

Because the id is what ties a repeat to its incident, the title is display only. A repeat that changes the reading in `event_message`, `last_occurrence` or `event_count` joins the open incident.

A recovery is written as a recovery, naming the policy and the device:

```
Linux: Physical Memory Usage Exceeded Threshold on db-prod-03 cleared
```

It falls back to `ScienceLogic event on <entity_name> cleared`, then `ScienceLogic event cleared`.

When a payload has no usable `event_id`, the title is the plain `event_policy_name` on `entity_name` form (then `event_policy_name`, `ScienceLogic event on <entity_name>`, `ScienceLogic event with no details`), because the title is then the only thing that ties the firing and the recovery together and `event_message` carries readings that change between runs. A recovery with no id resolves the incident that has that plain title.

Any field SL1 left as an unsubstituted run book variable such as `%M` or `%_event_policy_name` is treated as empty.

{% hint style="info" %}
A recovery reads differently from the notification that opened the incident, on purpose: the person scanning an event list needs to know which of their open incidents went away. It still resolves the right incident, because matching is done on `event_id` and not on the title.
{% endhint %}

Use a [Title Remapper](../alerts/title-remapper.md) if your team reads events by device and policy rather than by SL1's sentence:

```handlebars
{{data.body.entity_name}}: {{data.body.event_policy_name}}
```

## Severity

The `severity` field (SL1's `%S`, documented as "Severity (HEALTHY - CRITICAL)") is read as text and shown on the incident's severity badge. SL1's severities are Critical, Major, Minor, Notice and Healthy. Spike maps them as follows:

| SL1 severity | Spike severity badge |
| --- | --- |
| Critical | SEV1 |
| Major | SEV1 |
| Minor | SEV3 |
| Notice | SEV3 |
| Healthy | none (the badge is left unset) |

To set a different level, write an [alert rule](../alerts/alert-rules.md) on `severity` to set the level you want. Alert rules can also route an incident to another service or escalation policy, or suppress it entirely. Read more about [priority and severity](../incidents/priority-and-severity.md).

## Prerequisites

* An SL1 (Skylar One) account that can manage **Run Book** automation: actions and automation policies
* The **HTTP Action Type PowerPack, version 102 or later**, installed in your SL1. It provides the **Make an HTTP Request** action type. ScienceLogic's v102 release notes say "Substitution characters are now correctly processed for the "payload" and "relative_url" parameters", so on an older version the run book variables can arrive as the literal text `%e`, `%M`, `%X`. Update the PowerPack first if you are on an older version
* A ScienceLogic SL1 integration in Spike and its webhook URL
* Outbound HTTPS from the SL1 system that runs the automation to `hooks.spike.sh`

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → ScienceLogic Skylar One (SL1)**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Create the run book actions in SL1

You create two actions, one for each status. They differ only in the `status` line of the payload.

1. **Open the HTTP Action Template:**
   In SL1, go to **Registry > Run Book > Actions** and click the wrench icon for the **HTTP Action Template** action that the PowerPack installed. The Action Policy Editor opens with **Action Type** already set to **Make an HTTP Request**.

2. **Name it and enable it:**
   Change the **Action Name** to one your team will recognise, for example `Spike - event active`, and set **Action State** to **Enabled**.

3. **Fill in the Input Parameters.** The **Make an HTTP Request** action takes one **Input Parameters** JSON document rather than separate method, URL and header fields. Enter the JSON below, replacing the URL with the webhook URL from Step 1 (nothing appended) and using the payload from the next section with `"status": "active"`:

   ```json
   {
     "credential_id": 0,
     "url_override": "https://hooks.spike.sh/<your-token>/push-events",
     "payload_type": "json",
     "payload": { ... the payload from the next section ... }
   }
   ```

   * `credential_id` — `0`. SL1 requires this when `url_override` is used, and it is correct: the token in the URL is the credential, so no username, password or authorization header is needed.
   * `url_override` — the Spike webhook URL. Treat it like a password, and if it leaks, archive the integration and create a new one.
   * `payload_type` — `json`. ScienceLogic's documentation says to use `json` "if you are sending payloads to webhooks directly through this action using the payload field".
   * `payload` — the JSON body from the next section.

4. **Click Save As,** so the template stays untouched and the action is saved under its new name. Then repeat from the template for a second action named `Spike - event cleared`, with the same `credential_id`, `url_override` and `payload_type` and the payload with `"status": "cleared"`.

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

## The payload

Use this as the `payload` value in the Input Parameters of the active action. Keep the field names exactly as written, and keep every field, since each is what the responder reads on the incident page. The `%`-prefixed tokens are SL1 run book variables and SL1 substitutes them each time the policy runs; keep them in quotes.

```json
{
  "status": "active",
  "event_id": "%e",
  "event_message": "%M",
  "severity": "%S",
  "entity_name": "%X",
  "organization": "%O",
  "event_policy_name": "%_event_policy_name",
  "first_occurrence": "%D",
  "last_occurrence": "%d",
  "event_count": "%c",
  "event_url": "%H"
}
```

| Field | SL1 variable | Used for |
| --- | --- | --- |
| `status` | typed literal: `active` or `cleared` | Tells Spike whether to open or resolve. **Required** |
| `event_id` | `%e` (Event ID) | Identity of the incident. **Required**: without it matching falls back to the title |
| `event_message` | `%M` (Event message) | The firing title. **Required** |
| `event_policy_name` | `%_event_policy_name` | The subject of the recovery and no-id titles. **Required** |
| `entity_name` | `%X` (Entity name) | The device in every title. **Required** |
| `severity` | `%S` (Severity) | Severity badge. Optional |
| `organization` | `%O` (Organization) | Context for MSPs. Display only. Optional |
| `first_occurrence` | `%D` (Date/time of first occurrence) | Display only. Optional |
| `last_occurrence` | `%d` (Date/time of last occurrence) | Display only. Optional |
| `event_count` | `%c` (Event counter) | Display only. Optional |
| `event_url` | `%H` (URL link to event) | Link back to the event in SL1. Display only. Optional |

For the cleared action, the payload is the same with the first line changed:

```json
{
  "status": "cleared",
  "event_id": "%e",
  "event_message": "%M",
  "severity": "%S",
  "entity_name": "%X",
  "organization": "%O",
  "event_policy_name": "%_event_policy_name",
  "first_occurrence": "%D",
  "last_occurrence": "%d",
  "event_count": "%c",
  "event_url": "%H"
}
```

{% hint style="warning" %}
Check on the first real event that the incident page shows the fields separately and that the values are real (an event id and a device name), not the literal tokens `%e` and `%X`. Literal tokens mean SL1 did not substitute the variables; check that the HTTP Action Type PowerPack is v102 or later.

If every event carries literal tokens, all of them share one title and one open incident, so later faults do not page and the first cleared delivery closes it.
{% endhint %}

## Step 3 — Create the automation policies

An automation policy decides which events run which action. You create two.

1. **Open the Automation Policy Manager:**
   Go to **Registry > Run Book > Automation** and click **Create**. The Automation Policy Editor opens.

2. **Active Events policy:**
   * **Policy Name** — `Spike - active events`
   * **Policy Type** — **Active Events**
   * **Policy State** — **Enabled**
   * **Organization**, **Criteria Logic** (severity and the other conditions), and the **Aligned Devices** or **Aligned Events** — scope the policy to the events a human should be woken up for. A policy that matches every event on every device pages far more than your on-call wants
   * **Aligned Actions** — the `Spike - event active` action

3. **Cleared Events policy:**
   Create a second policy named `Spike - cleared events` with **Policy Type** set to **Cleared Events**, the `Spike - event cleared` action aligned, and **the same organization, devices and events** as the first. SL1 runs a Cleared Events policy once, when the event is cleared, and hides the **Repeat Time** field for it.

4. **Save both policies** and make sure their **Policy State** is **Enabled**.

{% hint style="info" %}
If you give the Active Events policy a **Repeat Time**, SL1 resends the payload while the event stays active. Each resend carries the same `event_id`, so it joins the open incident and does not page again.
{% endhint %}

## Step 4 — Confirm it with a real event

ScienceLogic documents no test notification for an automation policy, so a real event is the test. The quickest one to force is a threshold you can breach on demand on a test device: lower a threshold until the event goes active, then put it back.

Watch for both statuses:

1. An incident opens in Spike with SL1's event message as the title, on the service you attached, escalating through your policy.
2. Clearing the event in SL1 runs the Cleared Events policy and resolves that incident.

If the first step works and the second does not, check `event_id` on the cleared payload first.

## Payload reference

An active event, which opens the incident:

```json
{
  "status": "active",
  "event_id": "482913",
  "event_message": "Physical memory usage has exceeded threshold: (90%) currently (95.3%)",
  "severity": "MAJOR",
  "entity_name": "db-prod-03",
  "organization": "Acme Corp",
  "event_policy_name": "Linux: Physical Memory Usage Exceeded Threshold",
  "first_occurrence": "2026-10-13 03:02:11",
  "last_occurrence": "2026-10-13 03:12:11",
  "event_count": "3",
  "event_url": "https://sl1.acme.example/em7/index.em7?exec=events&q_id=482913"
}
```

The same event cleared, which resolves it:

```json
{
  "status": "cleared",
  "event_id": "482913",
  "event_message": "Physical memory usage has exceeded threshold: (90%) currently (95.3%)",
  "severity": "MAJOR",
  "entity_name": "db-prod-03",
  "organization": "Acme Corp",
  "event_policy_name": "Linux: Physical Memory Usage Exceeded Threshold",
  "first_occurrence": "2026-10-13 03:02:11",
  "last_occurrence": "2026-10-13 03:41:11",
  "event_count": "6",
  "event_url": "https://sl1.acme.example/em7/index.em7?exec=events&q_id=482913"
}
```

They produce these titles:

```
Physical memory usage has exceeded threshold: (90%) currently (95.3%) on db-prod-03
Linux: Physical Memory Usage Exceeded Threshold on db-prod-03 cleared
```

Spike keeps the whole body on the incident, so every field is available to [alert rules](../alerts/alert-rules.md) and the [Title Remapper](../alerts/title-remapper.md) as `data.body.<field>`.

## Things worth knowing

* **Two actions, two policies.** SL1 cannot tell the payload whether the event is active or cleared, so the two statuses need their own action each.
* **Several Spike integrations are fine.** If different teams own different organizations or device groups, create one Spike integration per team and a pair of policies per integration, scoped to that team's events.
* **Resolving in Spike does not touch SL1.** The event stays active in SL1 until the condition recovers or someone clears it there.
* **Skylar One and SL1 are the same product.** ScienceLogic's documentation now calls SL1 Skylar One; both names point at this integration.
* **Acknowledging in SL1 does not acknowledge in Spike.** SL1 can match acknowledged events in a policy's criteria, but no run book variable carries the acknowledgement, and this setup sends only `active` and `cleared`. A payload with any other `status` is treated like `active`: with the same `event_id` it joins the open incident and never resolves it.

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Check that the URL in the action is the full `https://hooks.spike.sh/<your-token>/push-events`, with nothing appended, and that the integration has not been archived in Spike. Then check that both policies are enabled, that the event matches their criteria, and that the SL1 system running the automation can reach `hooks.spike.sh`. The **Event Actions Log** in SL1 shows the response to each request, labelled with the URL (or the action's `command_label`).

</details>

<details>

<summary>The incident never resolves</summary>

Spike resolves on `status` `cleared` and only while the incident is still open. Confirm that the event actually clears in SL1, that the Cleared Events policy matches the same events as the Active Events policy, and that the cleared payload carries the same `event_id` as the active one. If `event_id` arrives empty or as an unexpanded token on only one of the two payloads, the ids do not agree and the recovery does not resolve the incident. If it is missing on both, matching falls back to the title.

</details>

<details>

<summary>The fields show up as literal %-tokens</summary>

SL1 did not substitute that variable. If all of them are literal tokens, the HTTP Action Type PowerPack is older than v102: update it. Spike treats a raw token as empty, so the title falls back to the policy and device. Check the variable spelling in the payload against the table above, and that the variable exists in your SL1 version. If `%_event_policy_name` is not substituted, a firing event with an id still uses SL1's event message, and a recovery falls back to `ScienceLogic event on <entity_name> cleared`.

</details>

<details>

<summary>The severity badge ignores SL1's severity</summary>

Spike reads `severity` as the text SL1 sends and maps it as the table under Severity shows. Healthy sets no badge. The value is still on the incident, so an [alert rule](../alerts/alert-rules.md) matching `severity` can set whatever severity you want, and can also route or suppress the incident.

</details>

Disclaimer: These integration instructions are offered independently by Spike.sh, and Spike.sh is not affiliated with nor a partner of ScienceLogic, Inc.
