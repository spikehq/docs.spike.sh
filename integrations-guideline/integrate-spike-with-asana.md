---
description: >-
  Turn an Asana task into a Spike incident, and resolve the incident when the task is marked complete, by forwarding the task from Zapier, Make or a script.
---

# Integrate Spike with Asana

[Asana](https://asana.com) is a work management platform where teams track tasks and projects. Many teams file a task when something is wrong in production, and the task is completed when it is fixed.

With this integration, a task that is forwarded to Spike opens an incident, and the incident resolves when the same task is forwarded again as completed. The incident title is the task name followed by its project, so write the task name as a sentence about what is wrong.

{% hint style="warning" %}
Asana does not send this request by itself. Native Asana webhooks are **not supported**: Asana's webhook handshake needs the `X-Hook-Secret` header echoed back, which the Spike webhook URL does not do, and the events Asana sends contain only ids, with no task name or completed value. Instead, use an automation tool (Zapier, Make or your own script) to send the task to Spike.
{% endhint %}

## What Spike does with each request

Spike identifies a task by `data.gid`. Every request carries the task under a `data` object.

| Request | What Spike does |
| --- | --- |
| `data.completed` is `false`, missing, or anything other than `true` | Opens an incident, or joins the open incident with the same `data.gid`. |
| `data.completed` is `true` | Resolves the open incident with the same `data.gid`. A completion never opens an incident. |

`data.completed` may be the boolean `true` or the string `"true"` in any case, because some no-code tools send every value as text.

A repeat of the same task that changes only `data.notes`, `data.assignee.name`, `data.assignee.gid`, `data.due_on` or `data.modified_at` joins the open incident.

### Incident titles

| Request | Title |
| --- | --- |
| Firing | `<data.name> (<data.projects[0].name>)` |
| Completed, with a usable `data.gid` | `Completed: <data.name> (<data.projects[0].name>)` |
| Completed, without a usable `data.gid` | Exactly the firing title, because Spike then matches by title |

For example, `Checkout API returning 500s for EU customers (Production Incidents)`.

* Whitespace is collapsed in the name and the project. The parentheses are left out when the project is empty.
* If `data.name` is empty and `data.gid` is usable, the title uses the first sentence of `data.notes` instead. If `data.gid` is not usable, the title is `Asana task with no details`, followed by the project when there is one.
* The title is at most 200 characters including the project. The project is cut to 80 characters first, then the name is cut with `…` so the project stays whole.
* The title never holds a gid, URL or timestamp.

A usable `data.gid` is a number, or text that is not empty after trimming and is not an unexpanded template variable such as `$gid`, `${gid}`, `{{gid}}`, `{{1.gid}}` or `%gid%`. Spike matches the value exactly as sent.

## Fields

| Field | Required | Used for |
| --- | --- | --- |
| `data.gid` | Yes | The Asana task id. Matches the completion to the incident that the task opened. Send it as a quoted string: 16-digit ids lose precision as JSON numbers. Without a usable id, Spike matches on the title instead. |
| `data.completed` | Yes | `false` opens an incident, `true` resolves it |
| `data.name` | Yes | The title |
| `data.projects[0].name` | No | The project shown in parentheses after the name |
| `data.notes` | No | Title only, when `data.name` is empty and `data.gid` is usable |

`data.resource_type`, `data.completed_at`, `data.assignee.name`, `data.due_on`, `data.permalink_url`, `data.created_at` and `data.modified_at` are kept on the incident for your team to read, but Spike does not act on them.

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

1. **Trigger on the Asana task.** In Zapier choose the **Asana** app as the trigger and pick the new-task event for the first automation and the completed-task event for the second. In Make, add an **Asana** module that watches tasks in the project.
2. **Add the request step.** In Zapier add **Webhooks by Zapier → Custom Request**, not the plain **POST** action: **POST** only takes flat key/value fields and cannot build the nested `data` object. Set **Method** to `POST`, **URL** to your Spike webhook URL, **Data** to the raw JSON below with the Asana fields mapped in, and add the header `Content-Type: application/json` under **Headers**. In Make add **HTTP → Make a request**, set the URL to your Spike webhook URL, the method to `POST`, the body type to **Raw** and the content type to **JSON (application/json)**.
3. **Build the body** so that it has exactly the shape below, filling the fields from the Asana task. Send `"completed": false` from the new-task automation and `"completed": true` from the completed-task automation. If a variable is left unexpanded, Spike treats it as missing.

A task body that opens an incident:

```json
{
  "data": {
    "gid": "1209876543210123",
    "resource_type": "task",
    "name": "Checkout API returning 500s for EU customers",
    "notes": "Error rate on /api/checkout jumped to 12% right after the 14:05 deploy. Rollback not attempted yet.",
    "completed": false,
    "completed_at": null,
    "assignee": {
      "gid": "1201111111111111",
      "name": "Priya Raman"
    },
    "projects": [
      {
        "gid": "1205555555555555",
        "name": "Production Incidents"
      }
    ],
    "due_on": "2026-10-14",
    "permalink_url": "https://app.asana.com/1/1201234567890123/task/1209876543210123",
    "created_at": "2026-10-13T14:12:08.512Z",
    "modified_at": "2026-10-13T14:12:08.512Z"
  }
}
```

The same task when it is completed, which resolves the incident:

```json
{
  "data": {
    "gid": "1209876543210123",
    "resource_type": "task",
    "name": "Checkout API returning 500s for EU customers",
    "notes": "Error rate on /api/checkout jumped to 12% right after the 14:05 deploy. Rolled back to v2.41.3; error rate back under 0.1%.",
    "completed": true,
    "completed_at": "2026-10-13T15:03:47.201Z",
    "assignee": {
      "gid": "1201111111111111",
      "name": "Priya Raman"
    },
    "projects": [
      {
        "gid": "1205555555555555",
        "name": "Production Incidents"
      }
    ],
    "due_on": "2026-10-14",
    "permalink_url": "https://app.asana.com/1/1201234567890123/task/1209876543210123",
    "created_at": "2026-10-13T14:12:08.512Z",
    "modified_at": "2026-10-13T15:03:47.201Z"
  }
}
```

If a task belongs to several projects, your tool may give you the project names as one comma-joined text; that text is shown as the project in the title.

From a script, `POST` the same JSON to the webhook URL with the header `Content-Type: application/json`.

## Step 3 — Test it

1. In Asana, create a task named like the example, in the project your automation watches.
2. Within a minute or two, an incident titled `Checkout API returning 500s for EU customers (Production Incidents)` should open in Spike.
3. Mark the task complete in Asana. The incident resolves, and an event titled `Completed: Checkout API returning 500s for EU customers (Production Incidents)` appears on it.

## Good to know

* **Rename the task before it is completed** and the completion still resolves the right incident, because Spike matches on `data.gid`. If your tool does not send a usable `data.gid`, Spike matches on the title instead, so the name must not change in between, or a second incident opens.
* **Severity** is not read from Asana. Use an [alert rule](../alerts/alert-rules.md) to set severity, route to another service, or suppress incidents from certain projects.
* Spike groups repeats of the same task and suppresses new alerts while its incident is open.
