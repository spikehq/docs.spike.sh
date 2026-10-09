---
description: >-
  Turn an Asana task into a Spike incident, and resolve the incident when the task is marked complete, by forwarding the task from Zapier, Make or a script.
---

# Integrate Spike with Asana

[Asana](https://asana.com) is a work management platform where teams track tasks and projects. Many teams file a task when something is wrong in production, and the task is closed when it is fixed.

With this integration, a task that is forwarded to Spike opens an incident, and the incident resolves when the same task is forwarded again as complete. The incident title is the task name, so write the task name as a sentence about what is wrong.

{% hint style="warning" %}
Asana does not send this request by itself. Native Asana webhooks are **not supported**: Asana's webhook handshake needs the `X-Hook-Secret` header echoed back, which the Spike webhook URL does not do, and the events Asana sends contain only ids, with no task name. Instead, use an automation tool (Zapier, Make or your own script) to send the task to Spike.
{% endhint %}

## What Spike does with each request

| Request | What Spike does |
| --- | --- |
| `data.completed` is `false` or missing | Opens an incident titled with the task name. A repeat for the same `data.gid` joins the open incident. |
| `data.completed` is `true` | Resolves the open incident for the same `data.gid`. The event is titled `Completed: <task name>`. |

`data.completed` may be the boolean `true` or the string `"true"` (any case), because some no-code tools send every value as text. Anything else counts as not completed.

Incident title:

1. `data.name`, with whitespace collapsed and cut at 200 characters
2. If the task has no name, `Unnamed Asana task in <first project name>`
3. If there is no project either, `Asana task with no details`

## Fields

| Field | Required | Used for |
| --- | --- | --- |
| `data.gid` | Yes | The Asana task id. Matches the completion to the incident that the task opened. Without it, Spike falls back to matching on the title. |
| `data.name` | Yes | The incident title |
| `data.completed` | Yes | `false` opens an incident, `true` resolves it |
| `data.projects[0].name` | No | Only used in the title when the task has no name |

The other fields in the example below are kept on the incident for your team to read, but Spike does not act on them.

## Prerequisites

* An Asana account that can view the tasks you want to forward
* An account on Zapier or Make, or a script that can send an HTTP `POST` request
* An Asana integration in Spike and its webhook URL

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Asana**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Send the task from your automation tool

Create two automations, one for a new task and one for a completed task. Both send a `POST` request to the webhook URL from Step 1 with the header `Content-Type: application/json`.

1. **Trigger on the Asana task.** In Zapier choose the **Asana** app as the trigger and pick the project's new-task event for the first automation and the task-completed event for the second. In Make, add an **Asana** module that watches tasks in the project.
2. **Add the request step.** In Zapier add **Webhooks by Zapier → POST**. In Make add **HTTP → Make a request**. Set the URL to your Spike webhook URL, the method to `POST`, and the body type to JSON.
3. **Build the body** so that it has exactly the shape below, filling `gid`, `name`, `completed` and the project name from the Asana task. Send `"completed": false` from the new-task automation and `"completed": true` from the completed-task automation.

A task body that opens an incident:

```json
{
  "data": {
    "gid": "1209876543210123",
    "resource_type": "task",
    "resource_subtype": "default_task",
    "name": "Checkout returns 500 for EU customers after the payment step",
    "notes": "Support has 14 tickets since 02:10 UTC. Stripe webhooks are succeeding; the error is on our confirm-order call.",
    "completed": false,
    "completed_at": null,
    "assignee": {
      "gid": "1201122334455667",
      "resource_type": "user",
      "name": "Priya Raman"
    },
    "projects": [
      {
        "gid": "1209000000000001",
        "resource_type": "project",
        "name": "Production Incidents"
      }
    ],
    "due_on": "2026-10-09",
    "permalink_url": "https://app.asana.com/1/1201000000000000/project/1209000000000001/task/1209876543210123",
    "workspace": {
      "gid": "1201000000000000",
      "resource_type": "workspace",
      "name": "Acme Engineering"
    }
  }
}
```

The same task when it is marked complete, which resolves the incident:

```json
{
  "data": {
    "gid": "1209876543210123",
    "resource_type": "task",
    "resource_subtype": "default_task",
    "name": "Checkout returns 500 for EU customers after the payment step",
    "notes": "Support has 14 tickets since 02:10 UTC. Stripe webhooks are succeeding; the error is on our confirm-order call.",
    "completed": true,
    "completed_at": "2026-10-09T04:37:12.512Z",
    "assignee": {
      "gid": "1201122334455667",
      "resource_type": "user",
      "name": "Priya Raman"
    },
    "projects": [
      {
        "gid": "1209000000000001",
        "resource_type": "project",
        "name": "Production Incidents"
      }
    ],
    "due_on": "2026-10-09",
    "permalink_url": "https://app.asana.com/1/1201000000000000/project/1209000000000001/task/1209876543210123",
    "workspace": {
      "gid": "1201000000000000",
      "resource_type": "workspace",
      "name": "Acme Engineering"
    }
  }
}
```

From a script, `POST` the same JSON to the webhook URL with the header `Content-Type: application/json`. Asana's `GET /tasks/{task_gid}` returns a task in this same shape.

## Step 3 — Test it

1. In Asana, create a task named like the example, in the project your automation watches.
2. Within a minute or two, an incident with the task name as its title should open in Spike.
3. Mark the task complete in Asana. The incident resolves, and an event titled `Completed: <task name>` appears on it.

## Good to know

* **Rename the task before it is completed** and the completion still resolves the right incident, because Spike matches on `data.gid`. If your tool does not send `gid`, Spike matches on the title instead, so the name must not change in between.
* **Severity** is not read from Asana. Use an [alert rule](../alerts/alert-rules.md) to set severity, route to another service, or suppress incidents from certain projects.
* Spike groups repeats of the same task and suppresses new alerts while its incident is open.
