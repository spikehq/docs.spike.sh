---
description: >-
  Turn an Asana task into a Spike incident, and resolve the incident when the task is marked complete, by forwarding the task from Zapier, Make or a script.
---

# Integrate Spike with Asana

[Asana](https://asana.com) is a work management platform where teams track tasks and projects. Many teams file a task when something is wrong in production, and the task is completed when it is fixed.

With this integration, a task that is forwarded to Spike opens an incident, and the incident resolves when the same task is forwarded again as completed. The incident title is the task name, so write the task name as a sentence about what is wrong.

{% hint style="warning" %}
Asana does not send this request by itself. Native Asana webhooks are **not supported**: Asana's webhook handshake needs the `X-Hook-Secret` header echoed back, which the Spike webhook URL does not do. Asana's events are also compact. They name the task that changed but not whether it is completed, and Asana expects you to fetch the task for its details. Instead, use an automation tool (Zapier, Make or your own script) to send the task to Spike.
{% endhint %}

## What Spike does with each request

Spike identifies a task by `gid`. Send the task fields at the top level of the body.

| Request | What Spike does |
| --- | --- |
| `completed` is `false`, missing, or any value not listed in the next row | Opens an incident, or joins the open incident with the same `gid`, or reopens a resolved one. |
| `completed` is `true`, `1`, `"true"`, `"1"` or `"yes"` | Resolves the open incident with the same `gid`. A completion never opens an incident. |

Some no-code tools send every value as text, so `completed` counts as completed when it is the boolean `true`, the number `1`, or the text `"true"`, `"1"` or `"yes"` in any case, ignoring surrounding spaces. Anything else, such as `false`, `0`, `"false"` or `"no"`, opens an incident.

A repeat of the same task that changes only `modified_at`, `notes`, `assignee.name`, `assignee.gid` or `priority` joins the open incident.

### Incident titles

| Request | Title |
| --- | --- |
| Open | `<name>` |
| Open, `name` empty | `Asana task in <projects[0].name>`, or `Asana task with no details` when there is no project either |
| Completed | `<name> marked complete`; with no name, `Asana task in <projects[0].name> marked complete`, or `Asana task marked complete` when there is no project either |

For example, `Checkout API returning 502 errors for EU customers`, and on completion `Checkout API returning 502 errors for EU customers marked complete`.

* Whitespace in the name is collapsed, and the name is cut at a word so that the title is at most 200 characters. On a completion the name is cut so that ` marked complete` stays whole within 200.
* A completion also carries the open title, so a completion without a usable `gid` resolves an open incident with the same name that was also opened without a usable `gid`. A completion without a `gid` never closes an incident whose task sent one.
* The title never holds a gid, URL, timestamp, note, assignee or priority.

A usable `gid` is a number other than `0`, or text that is not empty after trimming, is not an unexpanded template variable such as `$gid`, `${gid}`, `{{gid}}`, `{{1.gid}}`, `%gid%` or `<gid>`, and is not a word such as `null` or `undefined`. Spike matches the value as sent, ignoring surrounding spaces. Without a usable `gid`, Spike matches on the title, and only against incidents that were also opened without one.

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

Create two automations, one for a new task and one for a completed task. Both send a `POST` request with a JSON body to the webhook URL from Step 1.

Let your tool build the JSON from fields you map. Do not paste mapped values into JSON you write by hand. Task names often contain quotes, and notes often contain line breaks. Pasted unescaped, they make the body invalid JSON. Spike then rejects the request and no incident opens.

### Zapier

1. **Trigger.** Choose the **Asana** app. Use **New Task** for the first Zap and **Completed Task** for the second.
2. **Action.** Add **Webhooks by Zapier** with the **POST** event. Set **URL** to your Spike webhook URL and **Payload Type** to `json`.
3. **Data.** Add one row per field and map each value from the Asana trigger:

| Key | Value |
| --- | --- |
| `gid` | The task's gid (ID) |
| `name` | The task name |
| `completed` | Type `false` in the New Task Zap and `true` in the Completed Task Zap |
| `permalink_url` | The task's permalink URL |
| `notes` | The task notes |
| `assignee__name` | The assignee's name |

Zapier encodes these values for you. A double underscore in a key nests the value, so `assignee__name` arrives as `"assignee": {"name": …}`. Zapier sends every value as text, which Spike accepts: the gid arrives as a quoted string, and `"true"` resolves the incident.

Do not use **Custom Request** for this. It sends the **Data** box exactly as you type it and does not escape mapped values, so a task name with a `"` or notes with a line break produce invalid JSON. Custom Request adds only one thing: a `projects` array, which Spike uses for the `Asana task in <project>` title when a task has no name. If you need that, first pass `name` and `notes` through a Formatter step that escapes quotes and line breaks, or leave `notes` out.

### Make

1. **Trigger.** Start the first scenario with **Asana → Watch New Tasks**. Start the second with **Asana → Watch Tasks or Subtasks**, and set **Watch** to completed tasks.
2. **Action.** Add **HTTP → Make a request**. Set **URL** to your Spike webhook URL, **Method** to `POST`, **Body content type** to `application/json`, and **Body input method** to **Data structure**.
3. **Data structure.** Add the keys of the body below (`gid`, `name`, `notes`, `completed`, `permalink_url`, an `assignee` collection with `name`, and a `projects` array of collections with `name`), and map each one from the Asana module. Make escapes quotes and line breaks in mapped values. Avoid the **JSON string** input method, which sends mapped values unescaped.

### A script

`POST` the body below with the header `Content-Type: application/json`. Build it with your language's JSON encoder, for example `JSON.stringify` or `json.dumps`, not by joining strings.

### The body Spike reads

Send `completed: false` from the new-task automation and `completed: true` from the completed-task automation. If a variable is left unexpanded, Spike treats it as missing.

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

From Make or a script, send `completed` as `false` or `true` without quotes, and quote `gid`. Spike also accepts `completed` as text, as Zapier sends it.

Without `projects`, as from a Zapier **POST**, the incident still works. Only the `Asana task in <project>` title for a task with no name is lost.

## Step 3 — Test it

1. In Asana, create a task named like the example, in the project your automation watches.
2. Once your Zapier or Make plan's polling interval has passed, an incident titled `Checkout API returning 502 errors for EU customers` should open in Spike.
3. Mark the task complete in Asana. The incident resolves, and an event titled `Checkout API returning 502 errors for EU customers marked complete` appears on it.

## Good to know

* **Rename the task before it is completed** and the completion still resolves the right incident, because Spike matches on `gid`. If your tool does not send a usable `gid`, Spike matches on the title instead, so the name must not change in between, or the incident stays open. Send the `gid` from both automations: a completion without one never closes an incident whose task sent one.
* **Severity** is not read from Asana. Use an [alert rule](../alerts/alert-rules.md) to set severity, route to another service, or suppress incidents from certain projects.
* Spike groups repeats of the same task and suppresses new alerts while its incident is open.
