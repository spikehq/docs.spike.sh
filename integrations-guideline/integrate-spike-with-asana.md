---
description: >-
  Turn an Asana task into a Spike incident, and resolve the incident when the task is marked complete, by forwarding the task from Zapier, Make or a script.
---

# Integrate Spike with Asana

[Asana](https://asana.com) is a work management platform where teams track tasks and projects. Many teams file a task when something is wrong in production, and the task is completed when it is fixed.

With this integration, a task that is forwarded to Spike opens an incident, and the incident resolves when the same task is forwarded again as completed. The incident title is the task name, so write the task name as a sentence about what is wrong.

{% hint style="warning" %}
Asana does not send this request by itself. Native Asana webhooks are **not supported**: Asana's webhook handshake needs the `X-Hook-Secret` header echoed back, which the Spike webhook URL does not do, and the events Asana sends contain only ids, with no task name or completed value. Instead, use an automation tool (Zapier, Make or your own script) to send the task to Spike.
{% endhint %}

## What Spike does with each request

Spike identifies a task by `gid`. Send the task fields at the top level of the body.

| Request | What Spike does |
| --- | --- |
| `completed` is `false`, missing, or anything other than `true` | Opens an incident, or joins the open incident with the same `gid`, or reopens a resolved one. |
| `completed` is `true` | Resolves the open incident with the same `gid`. A completion never opens an incident. |

`completed` may be the boolean `true` or the string `"true"` in any case, because some no-code tools send every value as text.

A repeat of the same task that changes only `modified_at`, `notes`, `assignee.name`, `assignee.gid` or `priority` joins the open incident.

### Incident titles

| Request | Title |
| --- | --- |
| Open | `<name>` |
| Open, `name` empty | `Asana task in <projects[0].name>`, or `Asana task with no details` when there is no project either |
| Completed | `<name> marked complete`, or `Asana task marked complete` with no name |

For example, `Checkout API returning 502 errors for EU customers`, and on completion `Checkout API returning 502 errors for EU customers marked complete`.

* Whitespace in the name is collapsed, and the name is cut at a word so that the title is at most 200 characters. On a completion the name is cut so that ` marked complete` stays whole within 200.
* A completion also carries the open title, so a completion without a usable `gid` still resolves the open incident with the same name.
* The title never holds a gid, URL, timestamp, note, assignee or priority.

A usable `gid` is a number, or text that is not empty after trimming and is not an unexpanded template variable such as `$gid`, `${gid}`, `{{gid}}`, `{{1.gid}}`, `%gid%` or `<gid>`. Spike matches the value exactly as sent. Without a usable `gid`, Spike matches on the title instead.

## Fields

| Field | Required | Used for |
| --- | --- | --- |
| `gid` | Yes | The Asana task id. Matches the completion to the incident that the task opened. Send it as a quoted string: 16-digit ids lose precision as JSON numbers. |
| `completed` | Yes | `false` opens an incident, `true` resolves it |
| `name` | Yes | The title |
| `projects[0].name` | No | The fallback title `Asana task in <project>` when `name` is empty |
| `priority` | No | Your own value for a "Priority" custom field. Not an Asana task field; Spike lifts a top-level `priority` onto the incident |
| `permalink_url` | No | Added to the incident as a link to the task |

`resource_type`, `notes`, `completed_at`, `created_at`, `modified_at` and `assignee.name` are kept on the incident for your team to read, but Spike does not act on them.

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
2. **Add the request step.** In Zapier add **Webhooks by Zapier → Custom Request**, not the plain **POST** action: **POST** only takes flat key/value fields and cannot build the nested `assignee` and `projects` objects. Set **Method** to `POST`, **URL** to your Spike webhook URL, **Data** to the raw JSON below with the Asana fields mapped in, and add the header `Content-Type: application/json` under **Headers**. In Make add **HTTP → Make a request**, set the URL to your Spike webhook URL, the method to `POST`, the body type to **Raw** and the content type to **JSON (application/json)**.
3. **Build the body** so that it has exactly the shape below, filling the fields from the Asana task. Send `"completed": false` from the new-task automation and `"completed": true` from the completed-task automation. If a variable is left unexpanded, Spike treats it as missing.

A task body that opens an incident:

```json
{
  "gid": "1209876543210123",
  "resource_type": "task",
  "name": "Checkout API returning 502 errors for EU customers",
  "notes": "Error rate on checkout-api in eu-west-1 jumped to 12% at 02:10 UTC. Card payments are failing for EU customers.",
  "completed": false,
  "completed_at": null,
  "created_at": "2026-10-13T02:14:07.512Z",
  "modified_at": "2026-10-13T02:14:07.512Z",
  "permalink_url": "https://app.asana.com/1/1201234567890001/project/1209876543200001/task/1209876543210123",
  "assignee": {
    "gid": "1201234567890456",
    "name": "Priya Raman"
  },
  "projects": [
    {
      "gid": "1209876543200001",
      "name": "Production Incidents"
    }
  ],
  "priority": "High"
}
```

The same task when it is completed, which resolves the incident:

```json
{
  "gid": "1209876543210123",
  "resource_type": "task",
  "name": "Checkout API returning 502 errors for EU customers",
  "notes": "Error rate on checkout-api in eu-west-1 jumped to 12% at 02:10 UTC. Card payments are failing for EU customers. Rolled back release 2026.10.12-3; error rate back to 0.1%.",
  "completed": true,
  "completed_at": "2026-10-13T03:02:41.208Z",
  "created_at": "2026-10-13T02:14:07.512Z",
  "modified_at": "2026-10-13T03:02:41.208Z",
  "permalink_url": "https://app.asana.com/1/1201234567890001/project/1209876543200001/task/1209876543210123",
  "assignee": {
    "gid": "1201234567890456",
    "name": "Priya Raman"
  },
  "projects": [
    {
      "gid": "1209876543200001",
      "name": "Production Incidents"
    }
  ],
  "priority": "High"
}
```

Type `completed` as `false` or `true` without quotes, and quote `gid`. Spike also accepts `"true"` as text, in case your tool sends it that way.

If you flatten `assignee` or `projects` in your tool, the incident still works, but the project fallback title is lost.

From a script, `POST` the same JSON to the webhook URL with the header `Content-Type: application/json`.

## Step 3 — Test it

1. In Asana, create a task named like the example, in the project your automation watches.
2. Within a minute or two, an incident titled `Checkout API returning 502 errors for EU customers` should open in Spike.
3. Mark the task complete in Asana. The incident resolves, and an event titled `Checkout API returning 502 errors for EU customers marked complete` appears on it.

## Good to know

* **Rename the task before it is completed** and the completion still resolves the right incident, because Spike matches on `gid`. If your tool does not send a usable `gid`, Spike matches on the title instead, so the name must not change in between, or a second incident opens.
* **Severity** is not read from Asana. Use an [alert rule](../alerts/alert-rules.md) to set severity, route to another service, or suppress incidents from certain projects.
* Spike groups repeats of the same task and suppresses new alerts while its incident is open.
