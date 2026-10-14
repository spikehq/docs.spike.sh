---
description: >-
  Send ClickStack (HyperDX) saved search and chart alerts to Spike through a Generic webhook, so a firing alert pages your on-call rotation and resolves when it recovers.
---

# Integrate Spike with ClickStack

[ClickStack](https://clickhouse.com/docs/use-cases/observability/clickstack) is ClickHouse's open-source observability stack, and its UI is HyperDX. Alerts on a saved search or a dashboard chart can post to a **Generic** webhook. Point that webhook at Spike and a firing alert becomes an incident that escalates through your policy, and the recovery notification resolves it.

## What Spike does with each notification

| What HyperDX sends | What happens in Spike |
| --- | --- |
| `status` is `firing` (`state` is `ALERT`) | Opens an incident for that alert, or adds an event to the one already open |
| `status` is `resolved` (`state` is `OK`) | Auto-resolves the incident that the same alert opened. Never opens an incident |

A recovery only resolves an incident it provably belongs to. Spike matches on `eventId` when the body has one, otherwise on `alertId` together with `groupKey`. When the body carries neither, Spike falls back to the incident title.

### Incident titles

HyperDX writes a sentence about the fault in `title`, and Spike uses it without the leading emoji:

```
Alert for "Checkout API errors" - 152 lines found in checkout-api
```

The `groupKey` (the group the alert fired for) is added at the end, so a grouped alert says where it fired. A recovery reads `Alert for "Checkout API errors" resolved in checkout-api`.

If the body has an `eventId` or an `alertId`, the id is what joins repeats and resolves recoveries, so the title can carry the reading (`152 lines found`) and may change between notifications. If it has neither, Spike matches by title, so the reading is dropped and the title stays identical when the alert fires and when it resolves:

```
Alert for "Checkout API errors" in checkout-api
```

Include `eventId` or `alertId` in the body (as in Step 3) so you get the fuller title.

If `title` comes through empty, Spike builds one from `alertType`, `value`, `comparator`, `threshold` and `groupKey`, for example `Saved search alert: 152 lines found (threshold 100) in checkout-api`. That title cannot contain the alert's name, because HyperDX only puts the name in `title`. A body with nothing usable is titled `ClickStack alert with no details`.

Use the [Title Remapper](../alerts/title-remapper.md) if you want a different shape.

## Prerequisites

* A ClickStack (HyperDX) deployment where you can open **Team Settings**
* A saved search or dashboard chart to put an alert on
* A ClickStack integration in Spike and its webhook URL

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → ClickStack**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Add a Generic webhook in HyperDX

In HyperDX, open **Team Settings**, find the **Webhooks** section and choose **Add Webhook**. Fill in:

* **Service Type** (required) — pick **Generic**.
* **Webhook Name** (required) — something you will recognise when you pick it on an alert, for example `Spike - on-call`.
* **Webhook URL** (required) — the URL you copied in Step 1.
* **Webhook Body** (optional, but fill it in) — the JSON in Step 3.
* **Webhook Headers** (optional) — leave empty. The token in the URL is what authenticates the request.

## Step 3 — Paste the webhook body

HyperDX renders the body as a template. Every value is quoted, and the key names are the same as the template variables. Paste this into **Webhook Body**:

```json
{
  "title": "{{title}}",
  "body": "{{body}}",
  "link": "{{link}}",
  "state": "{{state}}",
  "status": "{{status}}",
  "eventId": "{{eventId}}",
  "alertId": "{{alertId}}",
  "alertType": "{{alertType}}",
  "comparator": "{{comparator}}",
  "threshold": "{{threshold}}",
  "thresholdMax": "{{thresholdMax}}",
  "value": "{{value}}",
  "groupKey": "{{groupKey}}",
  "startTimeISO": "{{startTimeISO}}",
  "endTimeISO": "{{endTimeISO}}",
  "note": "{{note}}"
}
```

Which of these Spike relies on:

| Field | Needed for |
| --- | --- |
| `title` | **Required in practice.** The incident title, and the alert's name |
| `status` and `state` | **Required.** Tell a firing alert from a recovery (`resolved` or `OK`) |
| `eventId`, `alertId` | Strongly recommended. Join repeats onto one incident and resolve it on recovery. Without both, Spike matches by title |
| `groupKey` | Recommended for grouped alerts. Names where it fired and separates one group from another |
| `alertType`, `comparator`, `threshold`, `thresholdMax`, `value` | Only used when `title` is empty |
| `body`, `link`, `startTimeISO`, `endTimeISO`, `note` | Kept on the incident page. Not used for the title or matching |

{% hint style="info" %}
Older or managed ClickStack versions render the newer variables (`eventId`, `alertId`, `groupKey` and so on) as empty strings. Spike copes: it falls back to matching by title. Send a test alert and check the incident to see what your deployment fills in.
{% endhint %}

If you leave **Webhook Body** blank, HyperDX sends its default, `{"text": "title | body | link | state | startTime | endTime | eventId"}`. Spike reads the title and the state from it, but cannot read the `eventId` there, so it always matches by title. Use the body above.

Save the webhook.

## Step 4 — Select the webhook on your alerts

Open a saved search, or a dashboard chart tile, and create an alert from its **Alerts** option. Set the threshold and interval as you normally would, then under **Notify** (the channel selector) choose **Webhook** and pick the webhook you created in Step 2. Save the alert.

Repeat for every alert that should page on-call.

## Step 5 — Check it works

Make the alert fire, for example by temporarily lowering its threshold. An incident should appear in Spike within a few seconds, on the right service and with the right escalation policy. When the alert goes back under the threshold, HyperDX posts the recovery and Spike resolves the incident.

## Things worth knowing

* **One incident per alert and group.** An alert grouped by service or host fires separately for each group, so each group is its own incident.
* **Repeats do not page twice.** While an alert keeps firing, further notifications are added as events on the open incident.
* **A recovery with nothing open is dropped.** If you resolved the incident in Spike first, the recovery that follows is ignored.
* **A recovery never opens an incident.**

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Open the alert in HyperDX and confirm it has the webhook selected, and that the **Webhook URL** is exactly the one from Spike. Then check the alert actually fired.

</details>

<details>

<summary>Incidents open but never resolve</summary>

Check the body in Step 3 is in the webhook, so `status`, `state` and `eventId` are sent. If your deployment sends `eventId` and `alertId` empty, Spike resolves by title, which only works when the alert's name and `groupKey` did not change between firing and recovery. If the id on the recovery differs from the one on the firing notification, Spike leaves the incident open rather than resolve the wrong one; resolve it by hand.

</details>

<details>

<summary>The title has no alert name</summary>

`title` arrived empty. Check the body has `"title": "{{title}}"`, with that exact key.

</details>
