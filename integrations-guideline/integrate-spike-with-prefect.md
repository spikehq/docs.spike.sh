---
description: >-
   Integrate Spike with Prefect to receive real-time alerts via Phone calls, SMS, Slack, MS Teams, and more when a flow run fails or crashes.
---

# How Spike Integrates with Prefect

## Overview
[Prefect](https://www.prefect.io) is a workflow orchestration platform for building, scheduling, and monitoring data pipelines. Prefect Automations can call a webhook when a flow run changes state.

With Spike’s Prefect integration, a failed or crashed flow run opens an incident, and a later completed run of the same deployment resolves it.

## How it works
Spike reads the state of the flow run from the webhook body:

* `state_name` of `Completed` is a recovery: it never opens an incident and resolves the open incident with the same `deployment_id`.
* `Cached` and `RolledBack` neither open nor resolve an incident.
* Every other state (for example `Failed`, `Crashed`, `TimedOut`, `Cancelled`, `Late`, `Running`) opens an incident, or joins the one already open for the same `deployment_id`. A missing or unknown `state_name` also opens or joins. Choose the states in your automation trigger, so only the ones you care about reach Spike.
* Incidents are grouped by `deployment_id`, so repeated failures of one deployment do not create duplicate incidents, and a recovery of one deployment does not resolve another. A `deployment_id` is usable when it is not empty, not `None`, `null` or `undefined`, and has no unexpanded `{{ }}` template text. Runs without a deployment have no usable id; Spike then matches them by title.

The incident title depends on the body:

| Body | Title |
| --- | --- |
| Firing with a `deployment_id` | `{state_message} ({flow_name}/{deployment_name})`, for example `Flow run encountered an exception: KeyError: 'customer_id' (nightly-orders-etl/production)`. Whitespace is collapsed and the title is capped at 200 characters by shortening `state_message`, never the part in brackets. If `deployment_name` is empty, only `{flow_name}` is in the brackets. |
| Firing with a `deployment_id` and no `state_message` | `Flow run {state_name} in {flow_name}/{deployment_name}` |
| Recovery with a `deployment_id` | `{flow_name}/{deployment_name} recovered (flow run Completed)` |
| Firing without a usable `deployment_id` | `Prefect flow {flow_name} failed` |
| Recovery without a usable `deployment_id` | `Prefect flow {flow_name} recovered` (resolves `Prefect flow {flow_name} failed`) |
| No `flow_name` and no `state_message` | `Prefect alert with no details` |

Flow run ids, URLs and timestamps are never part of a title.

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
6. In **Headers**, enter the JSON below. This header is required: without it Spike cannot read the body.

```json
{"Content-Type": "application/json"}
```

7. Click **Create**.

**Create the Automations**

Create one automation that handles both failures and recoveries.

1. Open **Automations** and click **Add Automation** (the **+** button).
2. **Trigger:** choose **Flow run state**. Select the flows you want to monitor (or all flows), set **Flow run enters** / expect the states **Failed**, **Crashed**, **TimedOut** and **Completed**, and set it to trigger **Immediately**. Click **Next**.
3. **Actions:** choose **Call a webhook**, select the `spike` block, and paste the payload below into the **Payload** field. Click **Next**.
4. Enter a name, for example `Spike - flow run state`, and click **Save**.

Prefect sends one webhook per state change. Spike opens an incident for Failed, Crashed and TimedOut runs and resolves it on a later Completed run of the same deployment.

All fields in the payload are used by Spike. `state_name` and `deployment_id` are required for the incident to be opened, grouped and resolved correctly; `state_message`, `flow_name` and `deployment_name` build the title; the rest are shown on the incident.

`deployment_name` uses `default(none)` so that a run without a deployment (for example `python flow.py`) renders `null` instead of making Prefect fail the action with a template error; without it no webhook is sent for such runs.

```json
{
  "state_name": "{{ flow_run.state.name }}",
  "state_message": {{ flow_run.state.message | tojson }},
  "flow_name": {{ flow.name | tojson }},
  "deployment_name": {{ deployment.name | default(none) | tojson }},
  "deployment_id": "{{ flow_run.deployment_id }}",
  "flow_id": "{{ flow.id }}",
  "flow_run_id": "{{ flow_run.id }}",
  "flow_run_name": "{{ flow_run.name }}",
  "flow_run_url": "{{ flow_run|ui_url }}",
  "state_timestamp": "{{ flow_run.state.timestamp }}"
}
```
{% endtab %}

{% tab title="Example payload" %}
When a flow run fails, Prefect sends a body like this:

```json
{
  "state_name": "Failed",
  "state_message": "Flow run encountered an exception: KeyError: 'customer_id'",
  "flow_name": "nightly-orders-etl",
  "deployment_name": "production",
  "deployment_id": "0b6d5a7e-3c1f-4f7e-9a51-2d8e6c4b9f13",
  "flow_id": "5e2a9c41-7d3b-4b8a-8f0e-1c6d2e9a7b55",
  "flow_run_id": "9f1c2d3e-4a5b-4c6d-8e7f-0a1b2c3d4e5f",
  "flow_run_name": "crimson-fox",
  "flow_run_url": "https://app.prefect.cloud/account/3c2b1a09-8f7e-4d6c-b5a4-0e9d8c7b6a51/workspace/7a6b5c4d-3e2f-4a1b-9c8d-7e6f5a4b3c21/runs/flow-run/9f1c2d3e-4a5b-4c6d-8e7f-0a1b2c3d4e5f",
  "state_timestamp": "2026-10-13T02:14:07.512000+00:00"
}
```

Spike opens an incident titled `Flow run encountered an exception: KeyError: 'customer_id' (nightly-orders-etl/production)`.

When a later run completes, the body looks like this:

```json
{
  "state_name": "Completed",
  "state_message": "All states completed.",
  "flow_name": "nightly-orders-etl",
  "deployment_name": "production",
  "deployment_id": "0b6d5a7e-3c1f-4f7e-9a51-2d8e6c4b9f13",
  "flow_id": "5e2a9c41-7d3b-4b8a-8f0e-1c6d2e9a7b55",
  "flow_run_id": "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
  "flow_run_name": "amber-heron",
  "flow_run_url": "https://app.prefect.cloud/account/3c2b1a09-8f7e-4d6c-b5a4-0e9d8c7b6a51/workspace/7a6b5c4d-3e2f-4a1b-9c8d-7e6f5a4b3c21/runs/flow-run/1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
  "state_timestamp": "2026-10-14T02:09:51.004000+00:00"
}
```

Spike resolves the open incident for the same `deployment_id` (`nightly-orders-etl/production recovered (flow run Completed)`).
{% endtab %}
{% endtabs %}

## Test the integration
1. Run a flow that fails (for example, raise an exception in a test flow).
2. Confirm the automation fires and a new incident is created in Spike.
3. Run the same deployment again and let it complete.
4. Confirm Spike auto-resolves the incident for that deployment.
