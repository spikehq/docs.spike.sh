---
description: >-
  Send eG Enterprise alarms to Spike so an alarm on a Citrix, VDI, Java or database component pages your on-call rotation by phone, SMS, Slack or Teams, and closes its incident when eG clears the alarm.
---

# Integrate Spike with eG Enterprise

[eG Enterprise](https://www.eginnovations.com) from eG Innovations watches the whole stack behind an application: the Citrix or VDI session, the guest, the hypervisor, the JVM, the database and the host underneath them. When a test crosses a threshold, eG raises an alarm, updates it while the problem persists, and closes it when the measure comes back to normal.

eG's **Webhook Integration** posts each of those three moments as JSON. Point it at a Spike integration URL and the alarm pages your on-call rotation the moment it opens, its updates land on the same incident instead of paging again, and the incident resolves itself when eG closes the alarm.

Nothing is installed anywhere. One URL and one payload template, configured once in the eG manager, cover every alarm on every component.

## What Spike does with each alarm state

Every alarm eG delivers carries a `state`. All three are handled on purpose:

| `state` | What it means in eG | What happens in Spike |
| --- | --- | --- |
| `NEW` | The alarm was just raised | Opens an incident and pages your escalation policy |
| `UPDATED` | The alarm is still open and something about it changed — severity escalated, the descriptor moved, more detail arrived | Added as an event on the incident already open. It never pages again. Dropped when nothing is open |
| `CLOSED` | eG closed the alarm because the measure returned to normal | Auto-resolves the open incident. Dropped when nothing is open |

### Incident identity

Spike identifies the incident by `alert_id`, the unique alarm id eG's manager generates. Every `UPDATED` and the final `CLOSED` carry that same id, so an alarm that escalates twice and then clears pages your team once and closes itself.

Identity is the alarm, not the component. CPU and memory alarming at the same time on `citrix-vda-04` are two eG alarms with two `alert_id`s, so they are two incidents — which is what you want, since they are two problems to fix.

{% hint style="info" %}
An `UPDATED` or `CLOSED` that arrives with no matching open incident is dropped rather than turned into a new incident. That happens when the original `NEW` was never delivered, or when the incident was already resolved in Spike. Resolving an incident in Spike does not close the alarm in eG; close it in eG and let the `CLOSED` webhook resolve the incident to keep the two sides in step.
{% endhint %}

## Incident title

The title is eG's problem description followed by the component it is on:

```
CPU utilization on citrix-vda-04 has exceeded the critical threshold on citrix-vda-04
```

It is built from `description` (eG's `$pdesc`, already a full sentence) and `component` (`$cname`), and from nothing else. Both stay the same for the life of an alarm, so the `NEW`, the `UPDATED`s and the `CLOSED` all render the same title and group cleanly on one incident.

The layer, test, measure, descriptor, zone, service and timestamps are deliberately kept out of the title and shown on the incident page instead. Use a [Title Remapper](../alerts/title-remapper.md) if your team reads alarms by test and component rather than by description:

```handlebars
{{data.body.component}} — {{data.body.test}} / {{data.body.measure}} ({{data.body.layer}})
```

## Severity

Severity comes from the payload's `severity` field, which carries eG's alarm priority (`$prior`):

| eG severity | Severity in Spike |
| --- | --- |
| `Critical` | SEV1 |
| `Major` | SEV1 |
| `Minor` | SEV3 |
| `Normal` | Left unset |

`Normal` is the severity eG puts on a closing alarm, and a `CLOSED` alarm resolves the incident rather than opening one, so it never needs a severity.

{% hint style="info" %}
Severity is set when the incident is created. An `UPDATED` that escalates the alarm from `Minor` to `Critical` in eG is recorded on the incident but does not move the severity of an incident that is already open. [Alert rules](../alerts/alert-rules.md) can override severity, route the incident to another service or escalation policy, or suppress it entirely. Read more about [priority and severity](../incidents/priority-and-severity.md).
{% endhint %}

The payload's `severity_level` field (eG's `$customprior`, your own numeric priority scale) is kept on the incident but never sets the severity badge — only `severity` does. If your team works from the custom scale, write an [alert rule](../alerts/alert-rules.md) on `severity_level` to set the severity you want.

## Prerequisites

* An eG Enterprise manager, and an account that can reach **Settings → Manager** in the admin interface
* An eG Enterprise integration in Spike and its webhook URL
* Outbound HTTPS from the eG manager to `hooks.spike.sh`

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → eG Enterprise**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Add the webhook integration in eG

{% tabs %}
{% tab title="Setup on eG Enterprise" %}
1. **Open the integration settings:**
   In the eG admin interface, go to **Settings → Manager → ITSM/Collaboration Integration → Webhook Integration**.

2. **Add a webhook:**
   Create a new webhook integration and give it a name your team will recognise, for example `Spike`.

3. **Point it at Spike:**
   Paste the webhook URL from Step 1 into the **URL** field and set the method to **POST** with a content type of `application/json`.

4. **Set the authorization type to `None`:**
   This is correct and is not a gap. The token in the URL is the credential, the same model every other Spike integration uses. Treat the URL like a password, and if it leaks, archive the integration and create a new one.

5. **Paste the payload template:**
   Put the JSON from the next section into the payload editor exactly as written. The `$`-prefixed tokens are eG's own alarm variables and the manager substitutes them at delivery time.

6. **Choose which alarms this webhook receives:**
   eG's integration filters decide which components, layers, tests or priorities reach the webhook. Scope them to the alarms a human should be woken up for — a manager that sends every `Minor` on every test will page far more than your on-call wants.

7. **Save and wait for an alarm:**
   eG has no test-alarm button, so confirm the integration with a real alarm. See Step 3.
{% endtab %}
{% endtabs %}

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

## The payload template

Paste this into eG's payload editor. Keep the field names exactly as written — Spike reads `alert_id`, `state`, `description`, `component` and `severity` by name — and keep every other line, since those fields are what the responder reads on the incident page:

```json
{
  "source": "eg-enterprise",
  "alert_id": "$alertID",
  "state": "<ticketState>",
  "component": "$cname",
  "component_type": "$ctype",
  "layer": "$layer",
  "test": "$test",
  "measure": "$measure",
  "description": "$pdesc",
  "descriptor": "$DD",
  "info": "$info",
  "severity": "$prior",
  "severity_level": "$customprior",
  "zone": "$zone",
  "service": "$service",
  "start_time": "$starttime",
  "problem_time": "$problemtime"
}
```

{% hint style="warning" %}
`state` is the one line to check against your own manager. eG's docs name the concept "ticketState" without showing the variable that produces it, and the variable list in your payload editor is the authoritative source for it. Replace `<ticketState>` with the token your manager offers for the alarm's ticket state, send a real alarm, and confirm on the incident page that `state` arrived as `NEW`. Those are the three values Spike acts on: `NEW`, `UPDATED` and `CLOSED`, in any casing.

If `state` arrives empty or as something else, alarms still open incidents with the right title, but updates open their own incidents instead of joining, and nothing auto-resolves.
{% endhint %}

The `source` field is there so a shared payload template stays readable when several tools post to the same place. Spike does not route on it — the token in the URL decides which integration, service and escalation policy the alarm lands on.

## Step 3 — Confirm it with a real alarm

eG documents no test-alarm button, so the first real alarm is the test. The quickest one to force is a threshold you can breach on demand on a test component: lower the threshold on a CPU or memory test until the alarm raises, then put it back.

Watch for all three states:

1. An incident opens in Spike with the alarm's description and component in the title, on the service you attached, escalating through your policy.
2. Changing the alarm — letting it escalate, or letting eG refresh its detail — adds an event to that same incident without paging again.
3. Restoring the measure closes the alarm in eG and resolves the incident in Spike.

If the first step works and the other two do not, the `state` token is the thing to check first.

## Payload reference

A `NEW` alarm, which opens the incident:

```json
{
  "source": "eg-enterprise",
  "alert_id": "8f3c2a1d-91b6-4e2a-9c7f-1234567890ab",
  "state": "NEW",
  "component": "citrix-vda-04",
  "component_type": "Citrix Virtual Delivery Agent",
  "layer": "Citrix Virtualization Layer",
  "test": "CPU Utilization",
  "measure": "CPU Usage",
  "description": "CPU utilization on citrix-vda-04 has exceeded the critical threshold",
  "descriptor": "CPU_Util_%",
  "info": "Sustained CPU usage above 95% for the last 3 collection intervals",
  "severity": "Critical",
  "severity_level": "1",
  "zone": "Production-DC1",
  "service": "Citrix VDI",
  "start_time": "2026-09-24T09:15:00Z",
  "problem_time": "2026-09-24T09:15:00Z"
}
```

An `UPDATED` alarm, which carries the same `alert_id` and lands on the incident already open:

```json
{
  "source": "eg-enterprise",
  "alert_id": "8f3c2a1d-91b6-4e2a-9c7f-1234567890ab",
  "state": "UPDATED",
  "component": "citrix-vda-04",
  "component_type": "Citrix Virtual Delivery Agent",
  "layer": "Citrix Virtualization Layer",
  "test": "CPU Utilization",
  "measure": "CPU Usage",
  "description": "CPU utilization on citrix-vda-04 has exceeded the critical threshold",
  "descriptor": "CPU_Util_%",
  "info": "CPU usage now above 99% for the last 6 collection intervals",
  "severity": "Critical",
  "severity_level": "1",
  "zone": "Production-DC1",
  "service": "Citrix VDI",
  "start_time": "2026-09-24T09:15:00Z",
  "problem_time": "2026-09-24T09:30:00Z"
}
```

A `CLOSED` alarm, which resolves it:

```json
{
  "source": "eg-enterprise",
  "alert_id": "8f3c2a1d-91b6-4e2a-9c7f-1234567890ab",
  "state": "CLOSED",
  "component": "citrix-vda-04",
  "component_type": "Citrix Virtual Delivery Agent",
  "layer": "Citrix Virtualization Layer",
  "test": "CPU Utilization",
  "measure": "CPU Usage",
  "description": "CPU utilization on citrix-vda-04 has exceeded the critical threshold",
  "descriptor": "CPU_Util_%",
  "info": "CPU utilization returned to normal range",
  "severity": "Normal",
  "severity_level": "0",
  "zone": "Production-DC1",
  "service": "Citrix VDI",
  "start_time": "2026-09-24T09:15:00Z",
  "problem_time": "2026-09-24T09:45:00Z"
}
```

All three render the same title, because the description and the component do not change over an alarm's life:

```
CPU utilization on citrix-vda-04 has exceeded the critical threshold on citrix-vda-04
```

Spike keeps the whole body on the incident, so every field in the template — including anything you add to it — is available to [alert rules](../alerts/alert-rules.md) and the [Title Remapper](../alerts/title-remapper.md) as `data.body.<field>`.

## Things worth knowing

* **One webhook covers every alarm state.** There is no separate setup per state, per layer or per component type. Add the webhook once and eG sends the whole lifecycle to it.
* **Several Spike integrations are fine.** If different teams own different zones or services, create one Spike integration per team and one eG webhook per integration, then use eG's filters to decide which alarms go to which.
* **Resolving in Spike does not touch eG.** The alarm stays open in the eG console until the measure recovers or someone closes it there.
* **eG Innovations is also the name to look for.** The product is eG Enterprise; the company is eG Innovations. Both names point at this same integration in Spike.

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Check that the URL in the webhook integration is the full `https://hooks.spike.sh/<your-token>/push-events`, with nothing appended, and that the integration has not been archived in Spike. Then check the eG manager can reach `hooks.spike.sh` — an on-premise manager behind a proxy or a restrictive egress firewall is the usual cause. Finally, check the integration's filters actually match an alarm that fired; an alarm nobody is notified about never reaches the webhook.

</details>

<details>

<summary>Every update opens its own incident</summary>

The `state` field is not arriving as `UPDATED`. Open one of the extra incidents in Spike and look at the payload on the incident page: if `state` is empty, or a literal `<ticketState>`, or some other word, the template token for the alarm's ticket state is wrong. Replace it with the token from your manager's variable list and send another alarm.

If `state` is right but incidents still pile up, check `alert_id` on the incidents. Different ids mean eG raised separate alarms, which are separate incidents by design.

</details>

<details>

<summary>Incidents never resolve</summary>

Spike resolves on `CLOSED` and only while the incident is still open. Confirm that eG is closing the alarm — a threshold that stays breached keeps the alarm open indefinitely — and that the `CLOSED` delivery carries the same `alert_id` as the `NEW`. A `CLOSED` arriving after the incident was resolved by hand or by a [resolve timer](../incidents/resolve-timer.md) has nothing to act on and is dropped.

</details>

<details>

<summary>The severity badge ignores our custom priority scale</summary>

Expected. The badge is set from `severity` (eG's `$prior`), not from `severity_level` (`$customprior`). The custom value is still on the incident, so an [alert rule](../alerts/alert-rules.md) matching `severity_level` can set whatever severity you want, and can also route or suppress the incident.

</details>

<details>

<summary>The title repeats the component twice</summary>

That is eG's description, which usually names the component itself, followed by the component field Spike appends. It reads a little long but it is unambiguous on a phone call, and it means a description that names nothing still tells the responder where the problem is. A [Title Remapper](../alerts/title-remapper.md) built from `{{data.body.description}}` alone drops the suffix.

</details>

Disclaimer: These integration instructions are offered independently by Spike.sh, and Spike.sh is not affiliated with nor a partner of eG Innovations, Inc.
