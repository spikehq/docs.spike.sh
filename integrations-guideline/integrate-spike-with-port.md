---
description: >-
  Send Port automation webhooks to Spike so a degraded catalog entity pages your on-call rotation, and the incident resolves when the entity recovers.
---

# Integrate Spike with Port

[Port](https://www.port.io) is an internal developer portal. Its software catalog holds your services, repositories and other entities, and its automations can call a webhook when an entity changes.

Create two automations that call a Spike integration URL: one that detects the degradation and one that detects the recovery. The first pages your on-call rotation. The second resolves the incident.

{% hint style="info" %}
Spike groups repeated alerts for the same `alert_id` into one incident and suppresses new alerts while it is open. You can set up [alert rules](https://docs.spike.sh/alerts/alert-rules) to decide severity and actions.
{% endhint %}

## What Spike does with each event

The `status` field, which you type into each automation, decides what Spike does with a delivery.

| `status` | What Spike does |
| --- | --- |
| `firing` | Opens an incident, or joins the open one with the same `alert_id`. |
| `resolved` | Resolves the open incident with the same `alert_id`. If none is open, the delivery is dropped. |
| Anything else, or missing | Treated as `firing`, so an unexpected value still pages. |

`status` is compared after trimming and ignoring case. Port has no `status` field of its own: this one is Spike's, and you write it as a literal in each automation's body.

## Set up instructions

**Step 1:** Create a Port integration in the Spike dashboard and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

**Step 2:**

{% tabs %}
{% tab title="Setup on Port" %}

**Prerequisites:**
* A Port account where you can create automations.
* The blueprint whose entities you want to watch, and a clear condition for "degraded" and for "recovered" (for example a `status` property that changes between `Healthy` and `Unhealthy`).

**Create the firing automation:**

1. In Port, open the **Automations** page (`https://app.port.io/settings/automations`).
2. Click **+ Automation** in the top-right corner.
3. On the **Basic Details** tab, give it a title, for example `Page Spike when service health degrades`.
4. On the **Trigger** tab, choose **Entity update** and select your blueprint.
5. At the bottom of the **Trigger** tab, add a **Condition** that fires only on the change into the degraded state, not on every update while it stays degraded:

```json
{
  "type": "JQ",
  "expressions": [
    ".diff.before.properties.status != \"Unhealthy\"",
    ".diff.after.properties.status == \"Unhealthy\""
  ],
  "combinator": "and"
}
```

6. On the **Backend** tab, choose **Webhook**.
7. Set **Endpoint URL** to the Spike webhook URL copied in Step 1.
8. Leave **Method** as `POST`.
9. Set **Body** to the JSON below. Port renders each `{{ ... }}` template when the automation runs. Type `status`, `rule` and `severity` as literal text; adjust the `summary` path to your blueprint's properties.

```json
{
  "status": "firing",
  "alert_id": "{{ .event.context.blueprintIdentifier }}/{{ .event.context.entityIdentifier }}",
  "summary": "{{ .event.diff.after.title }} changed from {{ .event.diff.before.properties.status }} to {{ .event.diff.after.properties.status }}",
  "rule": "Service health degraded",
  "entity": "{{ .event.diff.after.title }}",
  "blueprint": "{{ .event.context.blueprintIdentifier }}",
  "severity": "critical",
  "triggered_at": "{{ .trigger.at }}"
}
```

10. Save the automation.

**Create the recovery automation:** repeat the steps above with a title such as `Resolve Spike incident when service health recovers`, a **Condition** that fires only on the change out of the degraded state, and the same body with `"status": "resolved"` and your own `rule` text, for example `Service health recovered`. Keep `alert_id` identical in both automations.

```json
{
  "type": "JQ",
  "expressions": [
    ".diff.before.properties.status == \"Unhealthy\"",
    ".diff.after.properties.status != \"Unhealthy\""
  ],
  "combinator": "and"
}
```

**Fields:**

| Field | Required | What it holds |
| --- | --- | --- |
| `status` | Yes | `firing` in the degradation automation, `resolved` in the recovery automation. Typed as a literal. |
| `alert_id` | Yes | Identifies one alert across firing and recovery, for example `service/checkout-api`. It must be the same in both automations. |
| `summary` | Recommended | Your sentence saying what is wrong. It becomes the incident title. |
| `rule` | Recommended | The name of the automation, typed as a literal. Used in the title when `summary` is empty. |
| `entity` | Recommended | The display title of the entity. Used in the title when `summary` is empty. |
| `blueprint` | Optional | The blueprint of the entity. Shown on the incident page only. |
| `severity` | Optional | `critical`, `high`, `warning` or `info`. Sets the severity badge. |
| `triggered_at` | Optional | When Port fired the automation. Different on every delivery and never part of the title. |

{% hint style="warning" %}
Send exactly these fields and do not rename them, as Spike reads them by these names. Do not add a top-level `message` key.
{% endhint %}

{% hint style="info" %}
`alert_id` only counts as an id when it is non-empty, has no unexpanded template such as `{{ ... }}`, `$alert_id`, `${alert_id}` or `%alert_id%`, and has no empty or `null` part on either side of the `/`. Without a usable id, a repeat can still join the open incident when its title matches, but a recovery cannot be matched to the incident, so you have to resolve that incident by hand in Spike.
{% endhint %}

**Test the Integration:**
* Trigger the degradation on a test entity, or run the firing automation against it.
* Verify an incident appears in Spike titled with your `summary`, for example `Checkout API changed from Healthy to Unhealthy`.
* Trigger the recovery and verify the incident resolves.

{% endtab %}
{% endtabs %}

## Event payload structure

When the entity degrades, Port sends:

```json
{
  "status": "firing",
  "alert_id": "service/checkout-api",
  "summary": "Checkout API changed from Healthy to Unhealthy",
  "rule": "Service health degraded",
  "entity": "Checkout API",
  "blueprint": "service",
  "severity": "critical",
  "triggered_at": "2026-10-13T03:12:45.512Z"
}
```

When it recovers, the recovery automation sends:

```json
{
  "status": "resolved",
  "alert_id": "service/checkout-api",
  "summary": "Checkout API changed from Unhealthy to Healthy",
  "rule": "Service health recovered",
  "entity": "Checkout API",
  "blueprint": "service",
  "severity": "critical",
  "triggered_at": "2026-10-13T03:41:07.208Z"
}
```

## Incident title

The title is your `summary`, with whitespace collapsed and cut to 200 characters. When `summary` is empty or still contains an unexpanded template, Spike uses the first of these that has a value:

1. `{rule} on {entity}`, for example `Service health degraded on Checkout API`
2. `{rule}`
3. `{entity}`
4. `Port alert with no details`

Over 200 characters, ` on {entity}` is kept whole and the rest is cut at a word boundary.

## Limitations

* A deletion automation (trigger **Entity deletion**) has no `.event.diff.after`, so `summary` and `entity` can be empty and the title falls back as above.
* Spike does not verify Port's request signature.
* This format is Spike's own, built from Port's JQ templating. If a template renders empty or as the text `null`, check the path against your blueprint.

{% hint style="success" %}
This integration supports auto-resolution. When the recovery automation sends `status: resolved`, the incident with the same `alert_id` is resolved in Spike.
{% endhint %}
