---
description: >-
  Send Metoro's Kubernetes alerts to Spike so a firing alert pages your on-call team by phone, SMS, Slack or Teams, and Metoro's own recovery event resolves the incident.
---

# Integrate Spike with Metoro

[Metoro](https://metoro.io) watches your Kubernetes clusters with eBPF, so it sees pod restarts, latency and saturation without you instrumenting anything. Its webhook destination posts JSON when an alert fires and again when that same alert recovers, which is everything Spike needs to page the on-call rotation on the first event and close the incident on the second.

Nothing is installed anywhere. You create a webhook destination in Metoro pointing at a Spike integration URL, select it on the alerts that should page someone, and the two stay in sync from there.

{% hint style="danger" %}
**Select the Spike webhook for both the trigger and the recovery destination on every alert.** Metoro picks destinations separately for firing and for recovery. An alert that only has Spike on the trigger side pages your team and then never sends the `resolved` event, so the incident stays open until somebody closes it by hand. **Step 3** below is the one step in this guide you cannot skip.
{% endhint %}

## What Spike does with each event

| `alert_state` | What happens in Spike |
| --- | --- |
| `firing` | Opens an incident for that firing and pages your escalation policy |
| `firing` again for the same `alert_fire_uuid` | Added to the incident already open. It never pages a second time |
| `resolved` | Auto-resolves that incident |
| `resolved` with nothing open | Dropped. There is no incident left to close |

## One incident per firing, not per alert rule

Metoro sends two ids and they are not interchangeable:

| Field | What it identifies |
| --- | --- |
| `alert_uuid` | The alert *rule*, the thing you configured once in Metoro. Every firing of that rule carries the same value |
| `alert_fire_uuid` | One *firing* of that rule. A new value every time the rule starts firing, and the same value on the recovery event for it |

Spike groups on `alert_fire_uuid`. That is what makes a `CrashLoopBackOff` rule watching a whole namespace behave the way on-call expects: `checkout-worker` crash looping and `payments-api` crash looping are two firings of one rule, so they are two incidents, each paging and resolving on its own. Grouping on `alert_uuid` instead would have folded the second pod into the first pod's incident and then resolved both when either recovered.

The recovery event repeats the `alert_fire_uuid` of the firing it closes, which is how Spike matches it to the right incident.

## How incidents are titled

The title is the alert, the workload and the environment, in that order, so it reads cold on a lock screen or when Spike reads it out on a phone call:

```
Pod CrashLoopBackOff on checkout-worker in production
```

That comes from `alert_name`, `service` and `environment`. An alert that carries no `service` or no `environment` drops that part of the title rather than printing an empty one, so a cluster-wide alert with neither reads as `Pod CrashLoopBackOff` on its own.

{% hint style="info" %}
The breaching value, the metric, the attributes and the deep link back to Metoro are deliberately kept out of the title. `value` changes on every firing, and a title that moves breaks the things that read it: **Repeated N times** grouping, duplicate suppression, and any [alert rule](../alerts/alert-rules.md) matching on title text. All of it is on the incident page instead.
{% endhint %}

### Title Remapper sample

A [Title Remapper](../alerts/title-remapper.md) on the Metoro integration replaces the default title with one you write against the payload, which is how you fold in the metric, the breaching value or the Kubernetes attributes:

```handlebars
{{data.body.alert_name}} — {{data.body.metric}} at {{data.body.value}} on {{data.body.service}}
```

Output: `Pod CrashLoopBackOff — kube_pod_status_restarts_total at 12 on checkout-worker`

Write the remapper against the fields that stay the same for the life of one firing, `alert_name`, `service`, `environment`, `metric`. A title built on `value` or on `fired_at` changes between the firing and the recovery event, which stops repeats grouping onto the incident already open.

## Severity

Metoro has no severity of its own. There is no field in the payload that says how bad an alert is, and Metoro's own webhook docs suggest putting one in the body template yourself, the same way its Rootly example hard-codes a `priority`.

That works on Spike too. Spike reads a literal `severity` key from the body, so adding one line to the body template of an alert gives every incident from that alert a severity:

```json
{
  "source": "metoro",
  "severity": "sev1",
  "alert_state": "$alert_state",
  "alert_name": "$alert_name",
  "alert_fire_uuid": "$alert_fire_uuid"
}
```

The value is fixed per alert, because the template is per alert. Tier your alerts by editing each one's template: `sev1` on the ones that should wake somebody, `sev2` on the ones that can wait for the morning. Spike accepts the values it accepts everywhere else, so `sev1`, `SEV1`, `S1`, `critical`, `high` and `1` all land on SEV1.

| In the template | Severity in Spike |
| --- | --- |
| `"severity": "sev1"`, `"critical"`, `"high"` | SEV1 |
| `"severity": "sev2"`, `"warning"`, `"medium"` | SEV2 |
| `"severity": "sev3"`, `"info"`, `"low"` | SEV3 |
| No `severity` key | Left unset |

{% hint style="info" %}
[Alert rules](../alerts/alert-rules.md) do the same job from the Spike side, and can key off any field in the payload rather than only off the alert the event came from. Use them when severity should follow `environment` or `service` rather than the alert, when you would rather not edit a template per alert, or when the same rule should also route the incident to another escalation policy or suppress it entirely. Read more about [priority and severity](../incidents/priority-and-severity.md).
{% endhint %}

## Prerequisites

* A Metoro account with permission to edit alerts and integrations
* A Metoro integration in Spike and its webhook URL

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Metoro**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Add the webhook destination in Metoro

{% tabs %}
{% tab title="Setup on Metoro" %}
1. **Open the webhook settings:**
   In Metoro, go to **Settings → Integrations → Webhooks**.

2. **Create the webhook:**
   Add a webhook and paste the Spike URL from Step 1 into the **URL** field. Use `POST` and `application/json` if Metoro asks.

3. **Name it after the Spike service:**
   You pick this webhook by name on every alert, and you pick it twice per alert, so a name like `Spike — k8s-ops` beats `webhook 2`. Teams that page different rotations create one webhook per Spike integration and name each one after its service.

4. **Leave the body template alone for now:**
   Metoro's default body already carries everything Spike needs. Come back to it only if you want the hard-coded severity from **Severity** above.

5. **Save.**
{% endtab %}
{% endtabs %}

## Step 3 — Select the webhook on the alert, for both trigger **and** recovery

This is the step that decides whether your incidents ever close.

1. Open an alert in Metoro and edit its notification destinations.
2. Under the **trigger** destination, select the Spike webhook from Step 2.
3. Under the **recovery** destination, select **the same** Spike webhook again.
4. Save the alert, and repeat for every alert that should page your team.

{% hint style="warning" %}
Metoro keeps the two selectors independent on purpose, so an alert can page one place and announce its recovery somewhere else. For Spike they must be the same webhook. Without the recovery selector, Spike never receives an event carrying `alert_state: resolved` for that firing, nothing auto-resolves, and your team wakes up to yesterday's incidents still open.
{% endhint %}

If you cannot set the recovery destination for some alerts, give the Metoro integration in Spike a [resolve timer](../incidents/resolve-timer.md) as a backstop: **Edit integration → Advanced Configuration → Resolve by Timer**. It closes incidents after a duration you choose, which is a poor substitute for a real recovery event but better than an incident list nobody trusts.

## Step 4 — Fire a test alert

Trigger one real alert, or lower a threshold on a cheap one until it fires. The incident shows up in Spike within a few seconds, titled after the alert, the service and the environment. Put the threshold back, wait for Metoro to send the recovery event, and confirm the incident resolves itself. An incident that opens but never closes means Step 3's recovery destination is not set.

## The default body

Customers who never touch the body template are on the default, and it works exactly the same. The template in Metoro's docs is that default written out with its `$variables` visible, so the shape Spike receives is the same either way:

```json
{
  "source": "metoro",
  "alert_state": "$alert_state",
  "alert_uuid": "$alert_uuid",
  "alert_fire_uuid": "$alert_fire_uuid",
  "alert_name": "$alert_name",
  "alert_description": "$alert_description",
  "metric": "$metric_name",
  "value": "$breaching_datapoint_value",
  "attributes": "$attributes",
  "environment": "$environment",
  "service": "$service",
  "fired_at": "$fired_at",
  "resolved_at": "$resolved_at",
  "link": "$deep_link"
}
```

Customise the body only when you want something Metoro does not send by default, such as the hard-coded `severity` above or a team name. Keep `alert_state` and `alert_fire_uuid` in whatever you write: `alert_state` is how Spike tells a firing from a recovery, and `alert_fire_uuid` is how it tells one firing from another. An alert whose template drops them pages on every event and resolves on none.

## Payload reference

Metoro posts `application/json`. A firing alert looks like this:

```json
{
  "source": "metoro",
  "alert_state": "firing",
  "alert_uuid": "9c1d-alert-def-crashloop",
  "alert_fire_uuid": "f7e2a1b8-91c6-4d3e-8a2f-1234567890ab",
  "alert_name": "Pod CrashLoopBackOff",
  "alert_description": "checkout-worker-7d9f8 is in CrashLoopBackOff",
  "metric": "kube_pod_status_restarts_total",
  "value": "12",
  "attributes": "pod=checkout-worker-7d9f8,namespace=checkout",
  "environment": "production",
  "service": "checkout-worker",
  "fired_at": "2026-09-24T09:15:00Z",
  "resolved_at": "",
  "link": "https://app.metoro.io/alerts/f7e2a1b8"
}
```

The recovery event repeats the same `alert_fire_uuid` and fills in `resolved_at`:

```json
{
  "source": "metoro",
  "alert_state": "resolved",
  "alert_uuid": "9c1d-alert-def-crashloop",
  "alert_fire_uuid": "f7e2a1b8-91c6-4d3e-8a2f-1234567890ab",
  "alert_name": "Pod CrashLoopBackOff",
  "alert_description": "checkout-worker-7d9f8 has stabilized",
  "metric": "kube_pod_status_restarts_total",
  "value": "0",
  "attributes": "pod=checkout-worker-7d9f8,namespace=checkout",
  "environment": "production",
  "service": "checkout-worker",
  "fired_at": "2026-09-24T09:15:00Z",
  "resolved_at": "2026-09-24T09:32:00Z",
  "link": "https://app.metoro.io/alerts/f7e2a1b8"
}
```

| Field | What Spike does with it |
| --- | --- |
| `alert_state` | `firing` opens or joins an incident, `resolved` closes it |
| `alert_fire_uuid` | Groups events. One incident per firing |
| `alert_uuid` | Shown on the incident. Never used for grouping |
| `alert_name`, `service`, `environment` | The incident title, and the only three fields it is built from |
| `alert_description` | Shown on the incident, with the pod or workload Metoro named |
| `metric`, `value` | Shown on the incident. `value` is the breaching datapoint, as a string |
| `attributes` | The Kubernetes labels for the firing, as a comma-separated `key=value` list. Shown on the incident |
| `fired_at`, `resolved_at` | Shown on the incident. `resolved_at` is empty on a firing event |
| `link` | The deep link back to the alert in Metoro, opened from the incident |
| `severity` | Not sent by Metoro. Read if you add it to the template yourself |

You can replay either payload with `curl` while you are setting things up:

```bash
curl --request POST \
  --header 'Content-Type: application/json' \
  --data '{"source":"metoro","alert_state":"firing","alert_fire_uuid":"f7e2a1b8-91c6-4d3e-8a2f-1234567890ab","alert_name":"Pod CrashLoopBackOff","service":"checkout-worker","environment":"production"}' \
  "https://hooks.spike.sh/<your-token>/push-events"
```

## Things worth knowing

* **The recovery event is the only thing that closes an incident.** Resolving the incident in Spike does not clear the alert in Metoro, and clearing it in Metoro without the recovery destination set does not close the incident in Spike.
* **One incident per firing.** A rule watching a namespace produces one incident per workload that trips it, because each firing carries its own `alert_fire_uuid`.
* **A re-firing after a recovery is a new incident.** Metoro issues a fresh `alert_fire_uuid` when the rule starts firing again, so a flapping alert that recovers and trips again pages your team again. That is the behaviour you want for a problem that came back.
* **The URL is the credential.** Metoro sends no signature Spike verifies, so treat the webhook URL as a secret. If it leaks, archive the integration in Spike, create a new one and update the URL on the Metoro webhook.
* **One Spike integration can serve many alerts.** Every alert pointing at the same webhook lands on the same service and escalation policy. Use separate integrations when different alerts should page different teams, or keep one and split with [alert rules](../alerts/alert-rules.md).

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

## Troubleshooting

<details>

<summary>Incidents open but never resolve</summary>

The recovery destination on the alert is not set to the Spike webhook. Metoro selects trigger and recovery destinations separately, and an alert with Spike on the trigger side only never sends a `resolved` event at all, so there is nothing for Spike to act on.

Open the alert in Metoro, set the recovery destination to the same webhook as the trigger, and save. It applies from the next firing onward, so incidents already open still need closing by hand. If some alerts genuinely cannot have a recovery destination, turn on **Resolve by Timer** on the integration as described in **Step 3** of the setup.

</details>

<details>

<summary>Nothing arrives in Spike at all</summary>

Check that the alert actually fired in Metoro, then that the webhook it points at carries the full `https://hooks.spike.sh/<your-token>/push-events` URL with no trailing characters. The `curl` above posts a firing payload straight at your integration: if that opens an incident, the Spike side is fine and the problem is the destination selection on the alert.

</details>

<details>

<summary>Two pods tripping the same alert opened two incidents</summary>

That is by design. Each firing carries its own `alert_fire_uuid`, and each one pages and resolves independently, so the pod that recovers first closes its own incident and leaves the other open. If you would rather have one incident for the lot, write the alert in Metoro against the workload rather than the pod so it fires once.

</details>

<details>

<summary>One firing opened several incidents</summary>

Usually a body template that drops `alert_fire_uuid`, which leaves Spike nothing to group on. Put it back. The other cause is the incident being resolved between events, by hand or by a resolve timer shorter than the alert's own lifetime, since Spike only appends to an incident that is still open.

</details>

<details>

<summary>Every incident comes in without a severity</summary>

Expected. Metoro does not send one. Either hard-code a `severity` key into the alert's body template or set severity from [alert rules](../alerts/alert-rules.md), both described under **Severity** above.

</details>

<details>

<summary>The title is missing the service or the environment</summary>

The alert did not send those fields. `service` and `environment` come from what Metoro knows about the workload that tripped the alert, and a cluster-level alert has neither, so the title falls back to the alert name on its own. A [Title Remapper](../alerts/title-remapper.md) can build the title from `attributes` instead, which carries the namespace and pod for those alerts.

</details>
