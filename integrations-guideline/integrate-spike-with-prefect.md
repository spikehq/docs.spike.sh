---
description: >-
   Integrate Spike with Prefect to receive real-time alerts via Phone calls, SMS, Slack, MS Teams, and more when a flow run fails or crashes.
---

# How Spike Integrates with Prefect

## Overview
[Prefect](https://www.prefect.io) is a workflow orchestration platform for building, scheduling, and monitoring data pipelines. A Prefect automation can call a webhook when its trigger fires.

With Spike's Prefect integration, an automation that fires opens an incident in Spike. Spike does not auto-resolve Prefect incidents yet: the responder resolves them in Spike.

## How it works
Spike reads these fields from the webhook body:

* `alert_id` identifies one alert: one automation on one flow run. You build it as `{{ automation.id }}:{{ event.resource.id }}`. Spike uses it to join repeats to the open incident.
* `status` is always `Triggered`, typed by you as a fixed word in the action. It opens an incident, or joins the open one with the same `alert_id`. A missing or unknown `status` also opens an incident, so a broken template still pages.
* `automation`, `flow` and `flow_run` (the automation name, the flow name and the flow run name) build the title.
* `state_message` is Prefect's sentence about the run's current state. It arrives as a JSON string, or `null` when Prefect has none. `null`, an empty string, `None` and `null` as text are ignored.
* `state`, `event`, `url` and `occurred` are shown on the incident. They are never part of the title.

An `alert_id` is usable when it is a number, or text that is not empty after trimming, has at least one letter or digit, and holds no unexpanded template variable (`{{...}}`, `{%...%}`, `$name`, `${name}` or `%name%`). Two alerts that both arrive with an unexpanded `alert_id` open two incidents. Without a usable `alert_id`, Spike matches a repeat by title.

A repeat that changes only `state`, `state_message`, `event` or `occurred` joins the open incident.

The incident title is the first of these that applies. Whitespace is collapsed.

| Case | Title |
| --- | --- |
| Usable `alert_id` and a `state_message` | `{state_message} in {flow}/{flow_run}`, with Prefect's state message as it arrived |
| Otherwise, with an `automation` | `{automation} on {flow}/{flow_run}`, for example `Nightly ETL still running after 30 minutes on warehouse-etl/crimson-fox`. This is the only form used without a usable `alert_id`, and it never contains `state`, `state_message` or `occurred`. |
| No `automation`, but `flow` or `flow_run` | `Prefect alert on {flow}/{flow_run}` |
| Nothing usable | `Prefect alert with no details` |

If only one of `flow` and `flow_run` is present, only that one is used. If both are absent, the "where" is dropped together with its `in` or `on`. A value that is an unexpanded template variable, `None` or `null` counts as absent. Titles are at most 200 characters: the "where" is kept whole and the first part is cut at a word boundary with `...`. If the "where" alone is over 100 characters, the title is cut plainly instead.

{% hint style="warning" %}
Spike does not auto-resolve Prefect incidents yet. The responder resolves the incident in Spike once the flow run is healthy again; a [resolve timer](../incidents/resolve-timer.md) can close incidents left open. Spike still groups repeated alerts into the open incident and suppresses them while it is open.
{% endhint %}

## Set up instructions

**Step 1:** Create a Prefect integration in the Spike dashboard and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

**Step 2:** Configure the webhook in Prefect.

{% tabs %}
{% tab title="Setup on Prefect" %}
**Create a Webhook block**

1. Log in to Prefect and open **Blocks** in the left menu.
2. Click **Add Block** (the **+** button) and choose **Webhook**.
3. Enter a **Block Name**, for example `spike`.
4. Set **Method** to `POST`.
5. Paste the Spike webhook URL into the **URL** field.
6. In **Headers**, enter the JSON below. This is required: Prefect sends the body without a content type, and Spike cannot read it without this header.

```json
{"Content-Type": "application/json"}
```

7. Click **Create**.

**Create the Automation**

1. Open **Automations** and click **Add Automation** (the **+** button).
2. **Trigger:** choose the trigger for the problem you want to catch, and click **Next**. For example, a **Flow run state** trigger that fires when a run stays in a state (such as **Running**) longer than a set time.
3. **Actions:** choose **Call a webhook**, select the `spike` block, and paste the payload below into the **Payload** field. Keep `"status": "Triggered"`.
4. Enter a name for the automation. This name becomes `automation` in the incident title, so write it as a sentence, for example `Nightly ETL still running after 30 minutes`. Click **Save**.

All fields are required to be present. `alert_id` and `status` decide whether the incident is opened or joined; `automation`, `flow`, `flow_run` and `state_message` build the title; `state`, `event`, `url` and `occurred` are shown on the incident.

Write `automation`, `flow`, `flow_run` and `state_message` exactly as shown, without quotes around them: the `tojson` filter adds the quotes and escapes any quote or backslash in a name, so the body stays valid JSON (a name such as `Nightly "warehouse" ETL late` would otherwise break it and Spike would reject the request). For `state_message` it also writes `null` when Prefect has no message.

```json
{
  "alert_id": "{{ automation.id }}:{{ event.resource.id }}",
  "status": "Triggered",
  "automation": {{ automation.name | tojson }},
  "event": "{{ event.event }}",
  "flow": {{ flow.name | tojson }},
  "flow_run": {{ flow_run.name | tojson }},
  "state": "{{ flow_run.state.name }}",
  "state_message": {{ flow_run.state.message | tojson }},
  "url": "{{ flow_run|ui_url }}",
  "occurred": "{{ event.occurred }}"
}
```
{% endtab %}

{% tab title="Example payload" %}
When the automation fires, Prefect sends a body like this:

```json
{
  "alert_id": "6d2a5c8e-3f1b-4b7a-9e0d-2c4f8a1b7e93:prefect.flow-run.e3755d32-cec5-42ca-9bcd-af236e308ba6",
  "status": "Triggered",
  "automation": "Nightly ETL still running after 30 minutes",
  "event": "prefect.flow-run.Running",
  "flow": "warehouse-etl",
  "flow_run": "crimson-fox",
  "state": "Running",
  "state_message": null,
  "url": "https://app.prefect.cloud/account/9b3f6c1e-2a4d-4e8b-b7c5-1f0a2d3e4c5b/workspace/4e7d2a9c-8b1f-4c3e-a6d5-7f9e0b1c2d3a/runs/flow-run/e3755d32-cec5-42ca-9bcd-af236e308ba6",
  "occurred": "2026-10-13T02:30:04.118204+00:00"
}
```

Spike opens an incident titled `Nightly ETL still running after 30 minutes on warehouse-etl/crimson-fox`.
{% endtab %}
{% endtabs %}

## Test the integration
1. Trigger the automation (for example, start a flow run that stays in the trigger's state past its time limit).
2. Confirm the automation fires and a new incident is created in Spike.
3. Resolve the incident in Spike once the run is healthy again. Spike does not auto-resolve Prefect incidents.
