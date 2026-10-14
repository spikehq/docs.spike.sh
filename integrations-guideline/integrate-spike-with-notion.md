---
description: >-
  Send a Notion database automation to Spike so a task landing in your tasks database pages your on-call rotation, and resolves its incident when the task is marked Done.
---

# Integrate Spike with Notion

[Notion](https://www.notion.com) is a workspace where many teams keep their tasks in a database. A Notion database automation can send a webhook whenever a page in that database is added or changed.

Point that automation at a Spike integration URL and a task that reaches your trigger pages your on-call rotation, with the task's title as the incident title. When the task's **Status** is set to **Done**, a second automation resolves the incident.

Nothing is installed. One webhook URL and two database automations cover a whole tasks database.

## How Spike reads the webhook

* **Identity:** `data.id`, the id of the Notion task page. It is the same on the firing delivery and the recovery, so the recovery resolves the incident the firing opened, and a repeat firing for the same task joins the open incident instead of paging again.
* **Title:** the task's title property. Its name is yours to choose (`Name`, `Task name`, ...), so Spike finds it by its type, joins the text segments, collapses whitespace and caps it at 200 characters. If the title is empty the incident is titled `Notion task with no title`.
* **Recovery:** read from the first property whose type is **Status**. The names `done`, `complete`, `completed`, `resolved` and `closed`, in any letter case, resolve the incident. Any other status, such as `Not started` or `In progress`, is a firing. Older databases whose **Status** is a **Select** property named exactly `Status` are read the same way.

Incident titles:

```
Checkout API returning 500s for EU customers
Checkout API returning 500s for EU customers marked Done
```

The first opens the incident and the second is the recovery. Titles carry no ids, URLs or timestamps.

{% hint style="info" %}
A recovery for a task with no open incident is dropped rather than turned into a new incident. That happens when the firing automation never ran for the task, or when the incident was already resolved in Spike.
{% endhint %}

## Prerequisites

* A Notion database of tasks with a **Title** property and a **Status** property
* Permission to create automations on that database (Notion requires a paid plan for database automations and the **Send webhook** action)
* A Notion integration in Spike and its webhook URL

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Notion**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Create the automation that pages

1. Open your tasks database in Notion and select the **lightning bolt** (**Automations**) icon at the top right, then **New automation**.
2. Under **When**, choose the trigger that should page your team, for example **Page added**, or **Status** is set to **Not started**. Add a filter if only some tasks should page, such as **Priority** is **High**.
3. Under **Do**, select **Add action** and choose **Send webhook**.
4. In the **URL** field paste the Spike webhook URL from Step 1.
5. Under **Properties**, select **Title** and **Status**. Both are required: the title becomes the incident title, and the status tells Spike whether the task is open or done. Other properties are optional and are kept on the incident.
6. Name the automation, for example `Spike - task opened`, and save it.

## Step 3 — Create the automation that resolves

1. In the same database, select **Automations → New automation**.
2. Under **When**, choose **Status** is set to **Done** (or the completed option your database uses).
3. Under **Do**, choose **Send webhook** and paste the same Spike webhook URL.
4. Under **Properties**, select **Title** and **Status**, name it `Spike - task done` and save it.

{% hint style="warning" %}
Notion pauses an automation when its webhook fails. If tasks stop paging, check that the automation is still turned on and that the integration in Spike has not been archived.
{% endhint %}

## Step 4 — Confirm it end to end

1. Create a task that matches your first trigger. An incident opens in Spike titled with the task's title.
2. Set that task's **Status** to **Done**. The incident resolves, and the event reads `<task title> marked Done`.

## Payload reference

Notion sends its own payload and there is no template to edit. This is what the **Send webhook** action delivers, and what [alert rules](../alerts/alert-rules.md) and the [Title Remapper](../alerts/title-remapper.md) can read as `data.body.<field>`. Properties you did not select in the automation are not sent.

The firing, which opens the incident:

```json
{
  "source": {
    "type": "automation",
    "automation_id": "1c7e2f4a-9b3d-80f2-a1c4-00a3b5d6e7f8",
    "action_id": "1c7e2f4a-9b3d-8011-b2d5-00c4d6e7f8a9",
    "event_id": "8f2d6c1e-4a7b-4e3c-9d5f-2b1a0c9e8d7f",
    "attempt": 1
  },
  "data": {
    "object": "page",
    "id": "1f3e8d2a-7b4c-80a1-9c2e-d4f5a6b7c8e9",
    "created_time": "2026-10-09T02:14:00.000Z",
    "last_edited_time": "2026-10-09T02:14:00.000Z",
    "created_by": {
      "object": "user",
      "id": "c7c11cca-1d73-471d-9b6e-bdef51470190"
    },
    "last_edited_by": {
      "object": "user",
      "id": "c7c11cca-1d73-471d-9b6e-bdef51470190"
    },
    "cover": null,
    "icon": null,
    "parent": {
      "type": "database_id",
      "database_id": "0ef104cd-477e-80e1-8571-cfd10e92339a"
    },
    "archived": false,
    "in_trash": false,
    "url": "https://www.notion.so/Checkout-API-returning-500s-for-EU-customers-1f3e8d2a7b4c80a19c2ed4f5a6b7c8e9",
    "properties": {
      "Task name": {
        "id": "title",
        "type": "title",
        "title": [
          {
            "type": "text",
            "text": {
              "content": "Checkout API returning 500s for EU customers",
              "link": null
            },
            "annotations": {
              "bold": false,
              "italic": false,
              "strikethrough": false,
              "underline": false,
              "code": false,
              "color": "default"
            },
            "plain_text": "Checkout API returning 500s for EU customers",
            "href": null
          }
        ]
      },
      "Status": {
        "id": "stat",
        "type": "status",
        "status": {
          "id": "330aeafb-598c-4e1c-bc13-1148aa5963d3",
          "name": "Not started",
          "color": "default"
        }
      },
      "Priority": {
        "id": "prio",
        "type": "select",
        "select": {
          "id": "ff8e9269-9579-47f7-8f6e-83a84716863c",
          "name": "High",
          "color": "red"
        }
      }
    }
  }
}
```

The recovery for the same task, which resolves it. Note that `data.id` is the one the firing carried, which is what joins the two:

```json
{
  "source": {
    "type": "automation",
    "automation_id": "1c7e2f4a-9b3d-80f2-a1c4-00a3b5d6e7f8",
    "action_id": "1c7e2f4a-9b3d-8011-b2d5-00c4d6e7f8a9",
    "event_id": "5a9c3e7b-2d4f-4b8a-8c1e-7f6d5b4a3c2e",
    "attempt": 1
  },
  "data": {
    "object": "page",
    "id": "1f3e8d2a-7b4c-80a1-9c2e-d4f5a6b7c8e9",
    "created_time": "2026-10-09T02:14:00.000Z",
    "last_edited_time": "2026-10-09T03:02:00.000Z",
    "created_by": {
      "object": "user",
      "id": "c7c11cca-1d73-471d-9b6e-bdef51470190"
    },
    "last_edited_by": {
      "object": "user",
      "id": "9a4b2c1d-3e5f-4a6b-8c7d-0e1f2a3b4c5d"
    },
    "cover": null,
    "icon": null,
    "parent": {
      "type": "database_id",
      "database_id": "0ef104cd-477e-80e1-8571-cfd10e92339a"
    },
    "archived": false,
    "in_trash": false,
    "url": "https://www.notion.so/Checkout-API-returning-500s-for-EU-customers-1f3e8d2a7b4c80a19c2ed4f5a6b7c8e9",
    "properties": {
      "Task name": {
        "id": "title",
        "type": "title",
        "title": [
          {
            "type": "text",
            "text": {
              "content": "Checkout API returning 500s for EU customers",
              "link": null
            },
            "annotations": {
              "bold": false,
              "italic": false,
              "strikethrough": false,
              "underline": false,
              "code": false,
              "color": "default"
            },
            "plain_text": "Checkout API returning 500s for EU customers",
            "href": null
          }
        ]
      },
      "Status": {
        "id": "stat",
        "type": "status",
        "status": {
          "id": "9d1e7a52-6c3b-4f8e-a0d4-2b5c8e1f7a63",
          "name": "Done",
          "color": "green"
        }
      },
      "Priority": {
        "id": "prio",
        "type": "select",
        "select": {
          "id": "ff8e9269-9579-47f7-8f6e-83a84716863c",
          "name": "High",
          "color": "red"
        }
      }
    }
  }
}
```

## Things worth knowing

* **One webhook URL, two automations.** Both automations send to the same URL. Spike tells them apart by the task's status.
* **Resolving in Spike does not change the task.** The task keeps its status in Notion.
* **The title property can have any name.** Spike finds it by its type, not by `Task name`.
* **Custom statuses.** Only the names listed above resolve an incident. A status called `Shipped` is read as a firing, so use one of those names for your completed option.
* **Notion does not document this payload.** The shape above is based on Notion's page object. Open the incident in Spike and check the payload if something does not match.

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Check that the automation is turned on and not paused, that the **URL** is the full `https://hooks.spike.sh/<your-token>/push-events`, and that the integration has not been archived in Spike.

</details>

<details>

<summary>The incident does not resolve</summary>

Check that the resolving automation sends **Title** and **Status**, that the status name is one of `Done`, `Complete`, `Completed`, `Resolved` or `Closed`, and that the incident is still open.

</details>

<details>

<summary>An incident titled "Notion task with no title" opened</summary>

The automation did not include the **Title** property, or the task has no title. Select **Title** under **Properties** in the automation.

</details>

Disclaimer: These integration instructions are offered independently by Spike.sh, and Spike.sh is not affiliated with nor a partner of Notion Labs, Inc.
