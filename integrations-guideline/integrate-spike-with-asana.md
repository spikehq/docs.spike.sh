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
| `completed` is `false` or missing | Opens an incident titled with the task name. A repeat for the same `gid` joins the open incident. |
| `completed` is `true` | Resolves the open incident for the same `gid`. The event is titled `<task name> (marked complete)`. |

`completed` may be the boolean `true` or the string `"true"` (any case, spaces ignored), because some no-code tools send every value as text. Anything else counts as not completed.

Incident title:

1. `name`, with whitespace collapsed and cut at 200 characters
2. If `name` is empty, the first non-empty line of `notes`, with the same rules
3. If that is empty too, `Asana task in <projects[0].name>`
4. If nothing is usable, `Asana task with no details`

## Fields

| Field | Required | Used for |
| --- | --- | --- |
| `gid` | Yes | The Asana task id. Matches the completion to the incident that the task opened. Send it as a quoted string: 16-digit ids lose precision as JSON numbers. Without a usable id (empty, or an unexpanded template such as `{{task.gid}}`), Spike falls back to matching on the title. |
| `name` | Yes | The incident title |
| `completed` | Yes | `false` opens an incident, `true` resolves it |
| `notes` | No | Title only when `name` is empty |
| `projects[0].name` | No | Title only when both `name` and `notes` are empty |

`completed_at`, `due_on`, `permalink_url`, `assignee.name` and `workspace.name` are kept on the incident for your team to read, but Spike does not act on them.

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
3. **Build the body** so that it has exactly the shape below, filling `gid`, `name`, `notes`, `completed` and the project name from the Asana task. Send `"completed": false` from the new-task automation and `"completed": true` from the completed-task automation.

A task body that opens an incident:

```json
{
  "gid": "1209876543210123",
  "name": "Checkout returns HTTP 500 for EU customers after the 14:05 deploy",
  "notes": "Customers in eu-west report card payments failing at the final step.\nError rate on /api/checkout jumped to 12% since the 14:05 UTC release.",
  "completed": false,
  "completed_at": null,
  "due_on": "2026-10-14",
  "permalink_url": "https://app.asana.com/1/1201234567890123/task/1209876543210123",
  "assignee": {
    "gid": "1201111111111111",
    "name": "Priya Raman"
  },
  "projects": [
    {
      "gid": "1202222222222222",
      "name": "Production Incidents"
    }
  ],
  "workspace": {
    "gid": "1201234567890123",
    "name": "Acme Corp"
  }
}
```

The same task when it is marked complete, which resolves the incident:

```json
{
  "gid": "1209876543210123",
  "name": "Checkout returns HTTP 500 for EU customers after the 14:05 deploy",
  "notes": "Customers in eu-west report card payments failing at the final step.\nError rate on /api/checkout jumped to 12% since the 14:05 UTC release.",
  "completed": true,
  "completed_at": "2026-10-13T15:42:10.512Z",
  "due_on": "2026-10-14",
  "permalink_url": "https://app.asana.com/1/1201234567890123/task/1209876543210123",
  "assignee": {
    "gid": "1201111111111111",
    "name": "Priya Raman"
  },
  "projects": [
    {
      "gid": "1202222222222222",
      "name": "Production Incidents"
    }
  ],
  "workspace": {
    "gid": "1201234567890123",
    "name": "Acme Corp"
  }
}
```

From a script, `POST` the same JSON to the webhook URL with the header `Content-Type: application/json`.

## Step 3 — Test it

1. In Asana, create a task named like the example, in the project your automation watches.
2. Within a minute or two, an incident with the task name as its title should open in Spike.
3. Mark the task complete in Asana. The incident resolves, and an event titled `<task name> (marked complete)` appears on it.

## Good to know

* **Rename the task before it is completed** and the completion still resolves the right incident, because Spike matches on `gid`. If your tool does not send a usable `gid`, Spike matches on the title instead, so the name must not change in between.
* **Severity** is not read from Asana. Use an [alert rule](../alerts/alert-rules.md) to set severity, route to another service, or suppress incidents from certain projects.
* Spike groups repeats of the same task and suppresses new alerts while its incident is open.
