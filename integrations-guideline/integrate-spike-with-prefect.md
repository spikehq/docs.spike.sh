---
description: >-
   Integrate Spike with Prefect to receive real-time alerts via Phone calls, SMS, Slack, MS Teams, and more when a flow run fails or crashes.
---

# How Spike Integrates with Prefect

## Overview
[Prefect](https://www.prefect.io) is a workflow orchestration platform for building, scheduling, and monitoring data pipelines. A Prefect automation can call a webhook when its trigger fires, and again when the trigger resolves.

With Spike's Prefect integration, an automation that fires opens an incident, and the same automation resolving closes it.

## How it works
Spike reads these fields from the webhook body:

* `alert_id` identifies one alert across firing and recovery: one automation on one flow run. You build it as `{{ automation.id }}:{{ event.resource.id }}`. Spike uses it to join repeats to the open incident and to resolve it.
* `status` is typed by you as a fixed word in each action: `Triggered` in the action that runs when the automation fires, and `Resolved` in the copy that runs when it resolves. It is trimmed and not case-sensitive.
  * `Triggered` opens an incident, or joins the open one with the same `alert_id`.
  * `Resolved` never opens an incident. It joins the open incident with the same `alert_id`, which Spike then resolves. If nothing is open, it is dropped.
  * A missing or unknown `status` opens an incident and never resolves one, so a broken template still pages.
* `automation`, `flow` and `flow_run` (the automation name, the flow name and the flow run name) build the title.
* `state_message` is Prefect's sentence about the run's current state. It arrives as a JSON string, or `null` when Prefect has none. `null`, an empty string, `None` and `null` as text are ignored.
* `state`, `event`, `url` and `occurred` are shown on the incident. They are never part of the title.

An `alert_id` is usable when it is a number, or text that is not empty after trimming, has at least one letter or digit, and holds no unexpanded template variable (`{{...}}`, `{%...%}`, `$name`, `${name}` or `%name%`). Two alerts that both arrive with an unexpanded `alert_id` open two incidents. Without a usable `alert_id`, Spike matches a repeat by title, and a `Resolved` delivery does not close anything.

A repeat that changes only `state`, `state_message`, `event` or `occurred` joins the open incident.

The incident title is the first of these that applies. Whitespace is collapsed.

| Case | Title |
| --- | --- |
| `status` is `Resolved` | `{automation} resolved on {flow}/{flow_run}`, for example `Nightly ETL still running after 30 minutes resolved on warehouse-etl/crimson-fox` |
| Usable `alert_id` and a `state_message` | `{state_message} in {flow}/{flow_run}`, for example `Flow run failed after 3 retries. in warehouse-etl/crimson-fox` |
| Otherwise, with an `automation` | `{automation} on {flow}/{flow_run}`, for example `Nightly ETL still running after 30 minutes on warehouse-etl/crimson-fox`. This is the only form used without a usable `alert_id`, and it never contains `state`, `state_message` or `occurred`. |
| No `automation`, but `flow` or `flow_run` | `Prefect alert on {flow}/{flow_run}` |
| Nothing usable | `Prefect alert with no details` |

If only one of `flow` and `flow_run` is present, only that one is used. If both are absent, the "where" is dropped together with its `in` or `on`. A value that is an unexpanded template variable, `None` or `null` counts as absent. Titles are at most 200 characters: the "where" is kept whole and the first part is cut at a word boundary with `...`. If the "where" alone is over 100 characters, the title is cut plainly instead.

{% hint style="success" %}
Auto-resolution is supported for this integration. Spike will also automatically group repeated incidents and suppress alerts while an incident is open.
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

Create one automation. Its action when it fires and its action when it resolves use the same payload, apart from `status`.

1. Open **Automations** and click **Add Automation** (the **+** button).
2. **Trigger:** choose the trigger for the problem you want to catch, and click **Next**. Pick a trigger that can resolve, so that Prefect can send a recovery. For example, a **Flow run state** trigger that fires when a run stays in a state (such as **Running**) longer than a set time resolves when the run leaves that state.
3. **Actions:** choose **Call a webhook**, select the `spike` block, and paste the payload below into the **Payload** field. Keep `"status": "Triggered"`.
4. Add the same **Call a webhook** action to the automation's on-resolve actions, with the same payload but `"status": "Resolved"`.
5. Enter a name for the automation. This name becomes `automation` in the incident title, so write it as a sentence, for example `Nightly ETL still running after 30 minutes`. Click **Save**.

If your Prefect version does not show on-resolve actions in the automation form, create the automation with the same two action lists (`actions_on_trigger` and `actions_on_resolve`) through the Prefect API or Python SDK. Without a `Resolved` delivery, Spike never closes the incident.

All fields are required to be present. `alert_id` and `status` decide whether the incident is opened, joined or resolved; `automation`, `flow`, `flow_run` and `state_message` build the title; `state`, `event`, `url` and `occurred` are shown on the incident.

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

When the automation resolves, the body looks like this:

```json
{
  "alert_id": "6d2a5c8e-3f1b-4b7a-9e0d-2c4f8a1b7e93:prefect.flow-run.e3755d32-cec5-42ca-9bcd-af236e308ba6",
  "status": "Resolved",
  "automation": "Nightly ETL still running after 30 minutes",
  "event": "prefect.flow-run.Completed",
  "flow": "warehouse-etl",
  "flow_run": "crimson-fox",
  "state": "Completed",
  "state_message": "All states completed.",
  "url": "https://app.prefect.cloud/account/9b3f6c1e-2a4d-4e8b-b7c5-1f0a2d3e4c5b/workspace/4e7d2a9c-8b1f-4c3e-a6d5-7f9e0b1c2d3a/runs/flow-run/e3755d32-cec5-42ca-9bcd-af236e308ba6",
  "occurred": "2026-10-13T03:07:41.502913+00:00"
}
```

Spike resolves the open incident with the same `alert_id`. The recovery title is `Nightly ETL still running after 30 minutes resolved on warehouse-etl/crimson-fox`.
{% endtab %}
{% endtabs %}

## Test the integration
1. Trigger the automation (for example, start a flow run that stays in the trigger's state past its time limit).
2. Confirm the automation fires and a new incident is created in Spike.
3. Let the run leave that state, so that the automation resolves.
4. Confirm Spike auto-resolves the incident.
