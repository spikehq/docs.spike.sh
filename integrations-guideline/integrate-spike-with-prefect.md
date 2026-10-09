---
description: >-
   Integrate Spike with Prefect to receive real-time alerts via Phone calls, SMS, Slack, MS Teams, and more when a flow run fails or crashes.
---

# How Spike Integrates with Prefect

## Overview
[Prefect](https://www.prefect.io) is a workflow orchestration platform for building, scheduling, and monitoring data pipelines. Prefect Automations can call a webhook when a flow run changes state.

With Spike’s Prefect integration, a failed or crashed flow run opens an incident, and a later completed run of the same flow and deployment resolves it.

## How it works
Spike reads the state of the flow run from the webhook body:

* `state_type` of `FAILED` or `CRASHED` opens an incident (or joins the one already open).
* `state_type` of `COMPLETED` resolves the open incident for the same flow and deployment.
* Any other state (`CANCELLED`, `RUNNING`, `SCHEDULED`, `PENDING`, `PAUSED`, `CANCELLING`) neither opens nor resolves an incident.
* If `state_type` is empty, Spike falls back to `state`: `Failed`, `TimedOut` and `Crashed` open an incident, `Completed` resolves it.
* Incidents are grouped by `flow_id` and `deployment_id`, so repeated failures of one flow do not create duplicate incidents, and a recovery of one deployment does not resolve another.
* The incident title is Prefect's own sentence in `message`, followed by the flow and deployment, for example `Flow run encountered an exception: ConnectionError: Snowflake warehouse ANALYTICS_WH is suspended in nightly-etl on nightly-etl-prod`.

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
6. In **Headers**, add `Content-Type` with the value `application/json`. This header is required.
7. Click **Create**.

**Create the Automations**

Create two automations, one for failures and one for recoveries.

1. Open **Automations** and click **Add Automation** (the **+** button).
2. **Trigger:** choose **Flow run state**. Select the flows you want to monitor (or all flows), set the state to **Failed**, **Crashed** and **TimedOut**, and set it to trigger **Immediately**. Click **Next**.
3. **Actions:** choose **Call a webhook**, select the `spike` block, and paste the payload below into the **Payload** field. Click **Next**.
4. Enter a name, for example `Spike - flow run failed`, and click **Save**.
5. Repeat the steps for recoveries: choose **Flow run state**, set the state to **Completed**, call the same webhook with the same payload, and name it `Spike - flow run completed`.

All fields in the payload are used by Spike. `state_type`, `state`, `flow_id` and `deployment_id` are required for the incident to be opened, grouped and resolved correctly; the rest are shown on the incident or used in its title.

```json
{
  "state_type": "{{ flow_run.state.type.value }}",
  "state": "{{ flow_run.state.name }}",
  "message": {{ flow_run.state.message | tojson }},
  "flow_id": "{{ flow_run.flow_id }}",
  "deployment_id": "{{ flow_run.deployment_id or '' }}",
  "flow_name": {{ flow.name | tojson }},
  "deployment_name": {{ deployment.name | tojson if deployment else '""' }},
  "flow_run_id": "{{ flow_run.id }}",
  "flow_run_name": {{ flow_run.name | tojson }},
  "flow_run_url": "{{ flow_run|ui_url }}",
  "timestamp": "{{ flow_run.state.timestamp }}"
}
```
{% endtab %}

{% tab title="Example payload" %}
When a flow run fails, Prefect sends a body like this:

```json
{
  "state_type": "FAILED",
  "state": "Failed",
  "message": "Flow run encountered an exception: ConnectionError: Snowflake warehouse ANALYTICS_WH is suspended\n",
  "flow_id": "5c1e8a3e-9b0f-4d2a-a7c1-3f6e2b9d4a10",
  "deployment_id": "b7d2f4c9-61e3-4a8b-9f05-2c4d7e8a1b36",
  "flow_name": "nightly-etl",
  "deployment_name": "nightly-etl-prod",
  "flow_run_id": "0e9a4c71-2d5b-4f38-8e16-a9c3b7d50f24",
  "flow_run_name": "crimson-otter",
  "flow_run_url": "https://app.prefect.cloud/account/3f1c2a9e-7b44-4c1d-9e2a-5d8b6f0c7a13/workspace/8a6e1d2c-4b9f-4e37-a1c5-0d7f3b2e9c48/runs/flow-run/0e9a4c71-2d5b-4f38-8e16-a9c3b7d50f24",
  "timestamp": "2026-10-09T03:12:44.381920+00:00"
}
```

When a later run completes, the body looks like this:

```json
{
  "state_type": "COMPLETED",
  "state": "Completed",
  "message": null,
  "flow_id": "5c1e8a3e-9b0f-4d2a-a7c1-3f6e2b9d4a10",
  "deployment_id": "b7d2f4c9-61e3-4a8b-9f05-2c4d7e8a1b36",
  "flow_name": "nightly-etl",
  "deployment_name": "nightly-etl-prod",
  "flow_run_id": "7a3f9e12-c4d8-4b61-9a2e-5f0b8d7c3e91",
  "flow_run_name": "amber-heron",
  "flow_run_url": "https://app.prefect.cloud/account/3f1c2a9e-7b44-4c1d-9e2a-5d8b6f0c7a13/workspace/8a6e1d2c-4b9f-4e37-a1c5-0d7f3b2e9c48/runs/flow-run/7a3f9e12-c4d8-4b61-9a2e-5f0b8d7c3e91",
  "timestamp": "2026-10-09T04:02:19.104377+00:00"
}
```
{% endtab %}
{% endtabs %}

## Test the integration
1. Run a flow that fails (for example, raise an exception in a test flow).
2. Confirm the automation fires and a new incident is created in Spike.
3. Run the same flow and deployment again and let it complete.
4. Confirm Spike auto-resolves the incident for that flow and deployment.
