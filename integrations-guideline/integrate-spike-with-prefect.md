---
description: >-
   Integrate Spike with Prefect to receive real-time alerts via Phone calls, SMS, Slack, MS Teams, and more when a flow run fails or crashes.
---

# How Spike Integrates with Prefect

## Overview
[Prefect](https://www.prefect.io) is a workflow orchestration platform for building, scheduling, and monitoring data pipelines. Prefect Automations can call a webhook when a flow run changes state.

With Spike’s Prefect integration, a failed, timed out, crashed or late flow run opens an incident, and a later completed run of the same deployment resolves it.

## How it works
Spike reads the state of the flow run from the webhook body:

* `alert_id` identifies one alert across firing and recovery. It is the deployment the flow run belongs to, or the flow when the run has no deployment. It is not the run id: every scheduled run gets a new run id, so a run-id key would open a new incident each night and never resolve.
* `state_name` (trimmed, not case-sensitive) decides what happens:
  * `Failed`, `TimedOut`, `Crashed` and `Late` open an incident, or join the one already open with the same `alert_id`.
  * `Completed` and `Cached` resolve the open incident with the same `alert_id`.
  * `Scheduled`, `AwaitingRetry`, `AwaitingConcurrencySlot`, `Resuming`, `Pending`, `Submitting`, `InfrastructurePending`, `Running`, `Retrying`, `Paused`, `Suspended`, `Cancelling`, `Cancelled` and `RolledBack` neither open nor resolve anything.
  * A missing, empty or unknown `state_name` is treated as firing, so a broken template still pages.
* An `alert_id` is usable when it is a non-empty value that is not `None` and not an unexpanded template variable (text containing `{{` or `}}`, or written as `$name`, `${name}` or `%name%`). Two alerts that both arrive with an unexpanded `alert_id` open two incidents. Without a usable `alert_id`, Spike matches a repeat by title and does not auto-resolve a recovery.
* `state_message` is Prefect's sentence about what went wrong. A message that is empty, `None` or an unexpanded variable is ignored.

The incident title depends on the body:

| Body | Title |
| --- | --- |
| Firing with an `alert_id` and a usable `state_message` | `{state_message} in {flow_name}/{deployment_name}`, for example `Flow run encountered an exception: KeyError: 'customer_id' in nightly-orders-etl/production`. Whitespace is collapsed. Over 200 characters, `state_message` is shortened with an ellipsis and ` in {flow_name}/{deployment_name}` is kept whole. |
| Firing with an `alert_id` and no usable `state_message` | `Flow run {state_name} in {flow_name}/{deployment_name}`, for example `Flow run Late in hourly-sync` |
| Firing without a usable `alert_id` | Always `Flow run {state_name} in {flow_name}/{deployment_name}`, never the message, so a repeat gets the same title and joins the open incident |
| Recovery (`Completed` or `Cached`) | `Flow run completed in {flow_name}/{deployment_name}` |
| No `flow_name` and no `deployment_name` | `Prefect flow run {state_name}` |
| Nothing usable | `Prefect alert with no details` |

If only one of `flow_name` and `deployment_name` is present, only that one is used. A missing `state_name` reads `failed`. Titles are at most 200 characters. Run names, run ids, URLs and timestamps are never part of a title. A recovery is resolved by `alert_id` only, so its title may differ from the title of the incident it closes.

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
2. **Trigger:** choose **Flow run state**. Select the flows you want to monitor (or all flows), choose the states **Failed**, **Crashed**, **TimedOut**, **Late** and **Completed**, and set it to trigger **Immediately**. Click **Next**.
3. **Actions:** choose **Call a webhook**, select the `spike` block, and paste the payload below into the **Payload** field. Click **Next**.
4. Enter a name, for example `Spike - flow run state`, and click **Save**.

Prefect sends one webhook per state change. Spike opens an incident for Failed, TimedOut, Crashed and Late runs and resolves it on a later Completed run of the same deployment (or flow, when there is no deployment).

All fields in the payload are required to be present. `alert_id` and `state_name` decide whether the incident is opened, grouped or resolved; `state_message`, `flow_name` and `deployment_name` build the title; `flow_run_name`, `flow_run_id`, `state_timestamp` and `flow_run_url` are shown on the incident.

`alert_id` uses the deployment id and falls back to the flow id, so that a run without a deployment is still grouped and resolved correctly.

```json
{
  "alert_id": "{{ flow_run.deployment_id or flow_run.flow_id }}",
  "state_name": "{{ flow_run.state.name }}",
  "state_message": "{{ flow_run.state.message }}",
  "flow_name": "{{ flow.name }}",
  "deployment_name": "{{ deployment.name }}",
  "flow_run_name": "{{ flow_run.name }}",
  "flow_run_id": "{{ flow_run.id }}",
  "state_timestamp": "{{ flow_run.state.timestamp }}",
  "flow_run_url": "{{ flow_run|ui_url }}"
}
```
{% endtab %}

{% tab title="Example payload" %}
When a flow run fails, Prefect sends a body like this:

```json
{
  "alert_id": "3f6c2a9e-1b7d-4e85-a0c4-92d17be5f0a3",
  "state_name": "Failed",
  "state_message": "Flow run encountered an exception: KeyError: 'customer_id'",
  "flow_name": "nightly-orders-etl",
  "deployment_name": "production",
  "flow_run_name": "crimson-otter",
  "flow_run_id": "0671a3c2-58e4-7b1f-8000-4c9e2d7a1f36",
  "state_timestamp": "2026-10-13T02:14:07.512338+00:00",
  "flow_run_url": "https://app.prefect.cloud/account/9b1e6d4a-2c37-4f80-b5a1-7e3d0c8f2a91/workspace/c4a87e10-6f2b-4d93-8e5c-1a0b9d3f7e62/runs/flow-run/0671a3c2-58e4-7b1f-8000-4c9e2d7a1f36"
}
```

Spike opens an incident titled `Flow run encountered an exception: KeyError: 'customer_id' in nightly-orders-etl/production`.

When a later run completes, the body looks like this:

```json
{
  "alert_id": "3f6c2a9e-1b7d-4e85-a0c4-92d17be5f0a3",
  "state_name": "Completed",
  "state_message": "None",
  "flow_name": "nightly-orders-etl",
  "deployment_name": "production",
  "flow_run_name": "amber-heron",
  "flow_run_id": "0671f8d9-0e27-7a64-8000-b13c5e8f2d90",
  "state_timestamp": "2026-10-14T02:09:51.208114+00:00",
  "flow_run_url": "https://app.prefect.cloud/account/9b1e6d4a-2c37-4f80-b5a1-7e3d0c8f2a91/workspace/c4a87e10-6f2b-4d93-8e5c-1a0b9d3f7e62/runs/flow-run/0671f8d9-0e27-7a64-8000-b13c5e8f2d90"
}
```

Spike resolves the open incident with the same `alert_id`. The recovery title would be `Flow run completed in nightly-orders-etl/production`.
{% endtab %}
{% endtabs %}

## Test the integration
1. Run a flow that fails (for example, raise an exception in a test flow).
2. Confirm the automation fires and a new incident is created in Spike.
3. Run the same deployment again and let it complete.
4. Confirm Spike auto-resolves the incident for that deployment.
