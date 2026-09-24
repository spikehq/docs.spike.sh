---
description: >-
  Send Edge Delta monitor alerts to Spike so your observability on-call rotation is paged by phone, SMS, Slack or Teams, and the recovery notification resolves the incident.
---

# Integrate Spike with Edge Delta

[Edge Delta](https://www.edgedelta.com/) runs your telemetry pipelines and watches the data that comes out of them with backend monitors. Its **Legacy Integrations → Webhooks** setup posts a JSON body you write yourself, so a monitor that breaches its threshold opens an incident in Spike and pages your escalation policy, and the recovery notification for the same monitor auto-resolves it.

Nothing is installed anywhere. You create two webhooks in Edge Delta, both pointed at the same Spike URL, and reference them from a monitor's notification text.

## How the two webhooks work

Edge Delta sends a monitor's notification to whichever integrations the monitor's notification text names, and it renders that text differently depending on whether the monitor is firing or recovering. That is the whole mechanism here:

* A webhook named **`spike`** carries `"state": "alert"` and is referenced inside `{{#is_alert}}...{{/is_alert}}`, so it fires only when the monitor breaches.
* A webhook named **`spike-resolve`** carries `"state": "recovery"` and is referenced inside `{{#is_recovery}}...{{/is_recovery}}`, so it fires only when the monitor goes back under its threshold.

Both point at the same Spike webhook URL. Spike reads the `state` field in the body, not the name of the webhook, so the two names only have to match what the notification text references.

| Payload | What happens in Spike |
| --- | --- |
| `state: alert` | Opens an incident for that monitor and pages the escalation policy, or adds an event to the one already open |
| `state: recovery` | Auto-resolves the open incident. Dropped when nothing is open |

{% hint style="warning" %}
Both webhooks have to exist **and** be named in the monitor's notification text. A monitor that only names `@spike` pages your team and then keeps the incident open forever, because the recovery notification has nowhere to go. Step 3 has the exact text to paste.
{% endhint %}

## How incidents are grouped and titled

The title is the monitor's own title, with the group appended when the monitor groups its data:

```
Error rate above threshold — service:checkout-api
```

A monitor with no group-by reads as just `Error rate above threshold`. Spike identifies the incident by that same pair, title and group, so a monitor that keeps breaching lands on the one incident, and the recovery notification for it resolves that incident rather than opening a new one.

The detail line, the metric, the query, the evaluated value, the status and the link back to Edge Delta stay in the payload and show up on the incident page. Use a [Title Remapper](../alerts/title-remapper.md) if you would rather see the value or the metric in the title:

```handlebars
{{payload.title}} on {{payload.group}} at {{payload.value}}
```

{% hint style="info" %}
Spike does not group on `event_id`. Edge Delta's webhook reference does not say whether `$EVENT_ID` is the same id for a monitor's alert and its recovery, and identity that guesses wrong would leave every incident open, so the id is kept on the incident for reference instead of being matched on.
{% endhint %}

### Two monitors with the same title

Title and group are all Edge Delta gives that is stable across an alert and its recovery. Two monitors that share a title and carry no group therefore share an identity, and the second one's alert joins the first one's incident instead of opening its own.

Give each monitor a title that says what it watches — `Checkout API error rate above 5%` rather than `Error rate above threshold` — or add a group-by to the monitor so `$EVENT_GROUP_ALL` distinguishes them. Monitors that already group by service, host or dataset are unaffected.

## Severity

Edge Delta monitors carry no severity field. Its thresholds are alert and warning, and a notification does not say which tier it came from, so incidents come in at your integration's default severity. Set severity with [alert rules](../alerts/alert-rules.md), which can also route the incident to another escalation policy or suppress it entirely.

If you want warning-tier breaches to arrive as SEV2 while alert-tier breaches page as SEV1, add a third webhook that marks itself, and let an alert rule read that mark. Create a webhook named `spike-warning` with the same URL and the body from Step 2, with one field added:

```json
{
  "source": "edgedelta",
  "state": "alert",
  "tier": "warning",
  "event_id": "$EVENT_ID",
  "title": "$EVENT_TITLE",
  "detail": "$EVENT_MSG",
  "type": "$EVENT_TYPE",
  "status": "$EVENT_STATUS",
  "metric": "$EVENT_METRIC",
  "query": "$EVENT_QUERY",
  "value": "$EVENT_EVALUATED_VALUE",
  "group": "$EVENT_GROUP_ALL",
  "url": "$EVENT_URL",
  "date": "$EVENT_DATE"
}
```

Then reference it from the notification text of the monitors whose warning threshold should page, and write an [alert rule](../alerts/alert-rules.md) on `tier` equal to `warning` that sets SEV2. This is a setup you assemble in Edge Delta; Spike does not derive a warning tier on its own.

{% hint style="warning" %}
Keep `"state": "alert"` in that third body. `alert` is what opens an incident and `recovery` is what resolves one; a body that says `"state": "warning"` is neither, so nothing would be paged. The tier goes in its own field.
{% endhint %}

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Edge Delta**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Create the two webhooks in Edge Delta

In Edge Delta, go to **Admin → Legacy Integrations → Webhooks** and create these two, one at a time.

**The alert webhook**

1. Click **Add Webhook**.
2. **Name:** `spike`. Lower case, no spaces. The notification text references this name exactly.
3. **URL / Endpoint:** the webhook URL from Step 1.
4. **Method:** `POST`. **Content type:** `application/json`.
5. **Body / Payload:** paste this template. The `$EVENT_*` tokens are Edge Delta's own; it fills them in when the monitor fires.

```json
{
  "source": "edgedelta",
  "state": "alert",
  "event_id": "$EVENT_ID",
  "title": "$EVENT_TITLE",
  "detail": "$EVENT_MSG",
  "type": "$EVENT_TYPE",
  "status": "$EVENT_STATUS",
  "metric": "$EVENT_METRIC",
  "query": "$EVENT_QUERY",
  "value": "$EVENT_EVALUATED_VALUE",
  "group": "$EVENT_GROUP_ALL",
  "url": "$EVENT_URL",
  "date": "$EVENT_DATE"
}
```

**The recovery webhook**

1. Click **Add Webhook** again.
2. **Name:** `spike-resolve`.
3. **URL / Endpoint:** the same webhook URL from Step 1. Both webhooks post to one Spike integration on purpose; that is how the recovery finds the incident the alert opened.
4. **Body / Payload:** the same template with `"state": "recovery"` in place of `"state": "alert"`:

```json
{
  "source": "edgedelta",
  "state": "recovery",
  "event_id": "$EVENT_ID",
  "title": "$EVENT_TITLE",
  "detail": "$EVENT_MSG",
  "type": "$EVENT_TYPE",
  "status": "$EVENT_STATUS",
  "metric": "$EVENT_METRIC",
  "query": "$EVENT_QUERY",
  "value": "$EVENT_EVALUATED_VALUE",
  "group": "$EVENT_GROUP_ALL",
  "url": "$EVENT_URL",
  "date": "$EVENT_DATE"
}
```

{% hint style="info" %}
`state` is the only line that differs between the two bodies, and it is the line Spike acts on. If you copy the alert webhook to create the second one, change that field before saving.
{% endhint %}

Leave any signing secret or extra header field blank. Your webhook URL carries a token that only your integration has, which is the model every Spike integration uses. If the URL leaks, archive the integration and create a new one.

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

## Step 3 — Point your monitors at both webhooks

Open a monitor in Edge Delta, go to its **Notifications** step, and put both webhooks in the notification text using Edge Delta's conditionals. Paste this exactly:

```handlebars
{{#is_alert}}@spike{{/is_alert}} {{#is_recovery}}@spike-resolve{{/is_recovery}}
```

`{{#is_alert}}` renders when the monitor breaches its threshold and `{{#is_recovery}}` when it goes back under, so each block reaches exactly one of the two webhooks. Any message you want a human to read goes inside the same blocks, next to the name:

```handlebars
{{#is_alert}}@spike Checkout API error rate is above threshold{{/is_alert}}
{{#is_recovery}}@spike-resolve Checkout API error rate has recovered{{/is_recovery}}
```

Repeat this on every monitor that should page. A monitor with an empty notification text notifies nobody.

{% hint style="warning" %}
The three things that have to agree are the webhook names in Edge Delta, the `@names` in this text, and the conditional each one sits inside. `@spike-resolve` inside `{{#is_alert}}` resolves the incident the moment it is created, and `@spike` inside `{{#is_recovery}}` opens a fresh incident every time a monitor recovers. Getting the pair the wrong way round is the one mistake that looks like the integration working.
{% endhint %}

## Step 4 — Send a test

Use **Test Notification** on the webhook or on the monitor in Edge Delta. A test that renders the alert body opens an incident in Spike within a few seconds, titled after the monitor, and pages your escalation policy.

Then let a real monitor cycle, or lower a threshold on a test monitor so it breaches and recovers. The recovery resolves the incident it opened. An alert that opens an incident and a recovery that closes it is the whole integration working.

{% hint style="info" %}
A test notification may leave the `$EVENT_*` tokens empty or filled with placeholder text, depending on where you trigger it from. An incident that comes in with a generic title rather than the monitor's is a body that arrived with no `$EVENT_TITLE` in it, which is normal for a bare webhook test and not a sign that the template is wrong.
{% endhint %}

## Payload reference

Edge Delta posts the body you wrote, with the tokens filled in. An alert looks like this:

```json
{
  "source": "edgedelta",
  "state": "alert",
  "event_id": "ed-8f3c2a1d",
  "title": "Error rate above threshold",
  "detail": "Error rate 8.2% exceeds 5% threshold",
  "type": "threshold",
  "status": "triggered",
  "metric": "error_rate",
  "query": "sum(rate(errors[5m]))",
  "value": "8.2",
  "group": "service:checkout-api",
  "url": "https://app.edgedelta.com/monitors/8f3c2a1d",
  "date": "2026-09-24T09:15:00Z"
}
```

The recovery for it repeats the same `title` and `group`, which is how it finds the incident:

```json
{
  "source": "edgedelta",
  "state": "recovery",
  "event_id": "ed-9c1d4b2f",
  "title": "Error rate above threshold",
  "detail": "Error rate back under threshold",
  "type": "threshold",
  "status": "resolved",
  "metric": "error_rate",
  "query": "sum(rate(errors[5m]))",
  "value": "2.1",
  "group": "service:checkout-api",
  "url": "https://app.edgedelta.com/monitors/8f3c2a1d",
  "date": "2026-09-24T09:45:00Z"
}
```

What each token carries:

| Field | Edge Delta token | Used for |
| --- | --- | --- |
| `state` | written by you, per webhook | Opens the incident (`alert`) or resolves it (`recovery`) |
| `title` | `$EVENT_TITLE` | The incident title, and half of its identity |
| `group` | `$EVENT_GROUP_ALL` | Appended to the title, and the other half of its identity. Empty on a monitor with no group-by |
| `detail` | `$EVENT_MSG` | Shown on the incident |
| `event_id` | `$EVENT_ID` | Recorded on the incident. Not used for grouping |
| `type` | `$EVENT_TYPE` | Recorded on the incident |
| `status` | `$EVENT_STATUS` | Recorded on the incident. Spike acts on `state`, not on this |
| `metric`, `query`, `value` | `$EVENT_METRIC`, `$EVENT_QUERY`, `$EVENT_EVALUATED_VALUE` | Shown on the incident, and available to [alert rules](../alerts/alert-rules.md) and [Title Remappers](../alerts/title-remapper.md) |
| `url` | `$EVENT_URL` | The link back to the monitor in Edge Delta |
| `date` | `$EVENT_DATE` | Recorded on the incident |

{% hint style="info" %}
Edge Delta's own webhook examples wrap these tokens in a PagerDuty-shaped envelope, with `routing_key` and `event_action` fields. Spike does not need any of that. Use the flat body above, which is the same body the `spike` and `spike-resolve` webhooks send.
{% endhint %}

### The pipeline Webhook Destination node

Edge Delta also has a **Webhook Destination** node inside a pipeline, which sends edge-side signals with Go templates over `.item.signal.*`. That is a different payload shape and it is not supported by this integration today. Send monitor notifications through the two webhooks above; if you need pipeline-node signals in Spike, use a [generic webhook integration](integrating-with-webhooks.md) or [talk to us](mailto:support@spike.sh).

## Troubleshooting

<details>

<summary>No incidents show up in Spike</summary>

Check the monitor's notification text actually names `@spike` inside `{{#is_alert}}`, and that a webhook named exactly `spike` exists under **Admin → Legacy Integrations → Webhooks**. Edge Delta matches the name in the notification text to the integration by name, so a webhook called `Spike` or `spike ` is not the one the text is asking for.

Then confirm the URL on the webhook is the full `https://hooks.spike.sh/<your-token>/push-events` with no trailing characters, and use **Test Notification** on the webhook itself to take the monitor out of the picture.

</details>

<details>

<summary>Incidents open but never resolve</summary>

The recovery half is not wired up. Three things to check, in this order:

1. A webhook named `spike-resolve` exists and its body says `"state": "recovery"`. A copy of the alert webhook that still says `"state": "alert"` opens a second event on the incident instead of resolving it.
2. Its URL is the same Spike URL as `spike`. A recovery sent to a different Spike integration has no incident to resolve and is dropped.
3. The monitor's notification text names `@spike-resolve` inside `{{#is_recovery}}`.

If all three are right, check whether the monitor's title or group changed between the alert and the recovery. Identity is title plus group, so renaming a monitor while its incident is open leaves that incident for a human to resolve.

</details>

<details>

<summary>A recovery resolved the wrong incident</summary>

Two monitors sharing a title and carrying no group share an identity in Spike. Give them distinct titles, or add a group-by so `$EVENT_GROUP_ALL` tells them apart. See [Two monitors with the same title](#two-monitors-with-the-same-title) above.

</details>

<details>

<summary>Incidents resolve the instant they are created</summary>

`@spike-resolve` is sitting inside `{{#is_alert}}`, or the `spike` webhook's body says `"state": "recovery"`. Both send a recovery at alert time, which resolves the incident that the same notification just opened. Compare the monitor's notification text against the block in Step 3.

</details>

<details>

<summary>Titles do not name the monitor</summary>

The body arrived with no `title` in it. That happens on a bare webhook test, and on a body where `$EVENT_TITLE` was mistyped or quoted differently. Paste the template from Step 2 again, keeping the `$EVENT_*` tokens inside their quotes.

</details>

<details>

<summary>Warning-threshold breaches page as loudly as alerts</summary>

Expected. Edge Delta does not tell a webhook which threshold tier fired, so every notification that reaches Spike arrives the same way. Add the `spike-warning` webhook from the [Severity](#severity) section and an alert rule on its `tier` field, or keep warning thresholds off the monitors that page.

</details>
