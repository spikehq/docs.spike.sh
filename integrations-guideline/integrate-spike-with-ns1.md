---
description: >-
  Send IBM NS1 Connect monitoring job notifications to Spike so a failing ping, TCP, HTTP or DNS monitor pages your on-call rotation, and the incident resolves itself when the monitor recovers.
---

# Integrate Spike with IBM NS1 Connect

[IBM NS1 Connect](https://www.ns1.com) is a managed DNS and traffic management platform. Its monitoring jobs check an endpoint on a schedule from several regions, using a ping, TCP, HTTP or DNS check, and drive DNS failover from the result.

A monitoring job can also notify you when its status changes. Add a webhook notifier that points at a Spike integration URL, attach it to a notification list, and a failing job pages your on-call rotation. When the job comes back up, the incident resolves itself.

## What Spike does with each notification

Every notification carries a `state`, and that field decides what Spike does with it.

| `state` | What Spike does |
| --- | --- |
| `down` | Opens an incident, or adds to the one already open for this job |
| `up` | Resolves the open incident for this job |

`up` is only sent when the job has **Automatic recovery** switched on (`notify_failback` in the notification). Without it, NS1 never tells Spike the endpoint came back, and the incident stays open until someone resolves it.

{% hint style="success" %}
Auto-resolution is supported for this integration. Spike also groups repeated notifications into the open incident, so a job that has **Notify repeat** set does not page again while its incident is open.
{% endhint %}

## Incident identity

Spike identifies the incident by `job_document.id`, the id of the monitoring job. NS1 repeats it on the `down`, on every repeat and on the `up`, so one failure of one job is one Spike incident.

When the notification has a `region`, it is part of the identity too. With **Notify regional** switched on, a failure seen from one monitoring region is a separate incident from the job's overall (`global`) failure.

## Incident title

NS1 sends no sentence about the fault, so the title is built from the job:

```
edge-lb-ping is down: PING check of 203.0.113.10 failing (global)
```

A recovery reads:

```
edge-lb-ping is back up: PING check of 203.0.113.10 recovered (global)
```

The pieces come from the job's `name`, its `job_type` in upper case, the target and the `region`:

* **Target** is the URL for an HTTP job, `domain via nameserver` for a DNS job, otherwise the host, with `:port` when the job has a port (for example `db.example.com:5432`).
* **Where** is `global`, or `region <code>` for a regional notification, such as `region lga`. It is left out when the notification carries no region.
* A job without a name is titled `NS1 PING monitor` (using its type), and a notification with nothing readable is titled `NS1 Connect alert with no details`.
* A `state` other than `up` or `down` is titled `edge-lb-ping reported <state>: PING check of 203.0.113.10 (global)`.

The job's `notes` are never used in the title, since they are instructions for your team and not a description of the fault. Titles are capped at 200 characters and carry no ids or timestamps.

## Prerequisites

* An IBM NS1 Connect account that can edit monitoring jobs and notification lists
* An NS1 integration in Spike and its webhook URL
* Nothing to open on your own network. NS1 calls out to Spike

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → IBM NS1 Connect**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Add a webhook notifier in NS1 Connect

1. Sign in to the NS1 Connect portal and open **Monitoring → Notification Lists**. The menu names can differ slightly between portal versions.
2. Select **Add Notification List** (or open an existing list) and give it a name such as `Spike`.
3. Under notifiers, select **Add Notifier** and choose the **Webhook** type.
4. Paste the Spike webhook URL from Step 1 into the **URL** field. This is the only required field.
5. Save the notifier and the list.

{% hint style="info" %}
Treat the webhook URL like a password. If it leaks, archive the integration in Spike, create a new one and update the notifier URL in NS1.
{% endhint %}

## Step 3 — Attach the list to your monitoring jobs

1. Open **Monitoring → Monitoring Jobs** and edit the job you want to page on (or create one).
2. In the job's notification settings, select the notification list you created in Step 2.
3. Switch **Automatic recovery** on. Without it NS1 sends no `up` notification and Spike cannot resolve the incident.
4. Optional: set **Notify delay** to wait before notifying, **Notify repeat** to resend while the job is down, and **Notify regional** to also notify on per-region changes. Spike handles all three.
5. Save the job.

Repeat for every job that should page.

## Step 4 — Confirm it end to end

Use the notification list's **test** option if your portal offers one, but expect it to be titled `NS1 Connect alert with no details`: NS1 does not document what a test sends, and it may carry no job. Acknowledge and resolve that incident in Spike.

For a real check, point a job at an endpoint that is down and watch for:

1. An incident opens in Spike titled `<job name> is down: <TYPE> check of <target> failing (global)`.
2. Later `down` notifications from **Notify repeat** land on the same incident without paging again.
3. Bring the endpoint back and the incident resolves itself.

## Payload reference

NS1 sends its own payload and there is no template to edit. This is a reference for what lands on the incident page, and what [alert rules](../alerts/alert-rules.md) and the [Title Remapper](../alerts/title-remapper.md) can read as `data.body.<field>`.

A `down` notification, which opens the incident:

```json
{
  "state": "down",
  "since": 1759912260,
  "region": "global",
  "job_document": {
    "id": "6703f1c24d3e7b0012ab34cd",
    "name": "edge-lb-ping",
    "job_type": "ping",
    "active": true,
    "frequency": 60,
    "policy": "quorum",
    "region_scope": "fixed",
    "regions": [
      "lga",
      "sjc",
      "ams"
    ],
    "rapid_recheck": true,
    "notify_delay": 0,
    "notify_repeat": 900,
    "notify_regional": false,
    "notify_failback": true,
    "notify_list": "6703f0a14d3e7b0012ab3400",
    "notes": "Edge load balancer for api.example.com. Runbook: https://wiki.example.com/runbooks/edge-lb",
    "config": {
      "host": "203.0.113.10",
      "count": 4,
      "timeout": 2000
    },
    "status": {
      "global": {
        "status": "up",
        "since": 1759740011
      },
      "lga": {
        "status": "up",
        "since": 1759740011
      },
      "sjc": {
        "status": "up",
        "since": 1759740011
      },
      "ams": {
        "status": "up",
        "since": 1759740011
      }
    },
    "rules": []
  }
}
```

The `up` notification that resolves it has the same shape:

```json
{
  "state": "up",
  "since": 1759913460,
  "region": "global",
  "job_document": {
    "id": "6703f1c24d3e7b0012ab34cd",
    "name": "edge-lb-ping",
    "job_type": "ping",
    "active": true,
    "frequency": 60,
    "policy": "quorum",
    "region_scope": "fixed",
    "regions": [
      "lga",
      "sjc",
      "ams"
    ],
    "rapid_recheck": true,
    "notify_delay": 0,
    "notify_repeat": 900,
    "notify_regional": false,
    "notify_failback": true,
    "notify_list": "6703f0a14d3e7b0012ab3400",
    "notes": "Edge load balancer for api.example.com. Runbook: https://wiki.example.com/runbooks/edge-lb",
    "config": {
      "host": "203.0.113.10",
      "count": 4,
      "timeout": 2000
    },
    "status": {
      "global": {
        "status": "down",
        "since": 1759912260
      },
      "lga": {
        "status": "down",
        "since": 1759912200
      },
      "sjc": {
        "status": "down",
        "since": 1759912200
      },
      "ams": {
        "status": "up",
        "since": 1759740011
      }
    },
    "rules": []
  }
}
```

The fields Spike reads:

| Field | Used for |
| --- | --- |
| `state` | `down` opens or joins the incident, `up` resolves it (compared case-insensitively) |
| `region` | `global` or a monitoring region code; part of the identity and of the title |
| `job_document.id` | Identity of the incident |
| `job_document.name` | The first part of the title |
| `job_document.job_type` | `ping`, `tcp`, `http` or `dns`, shown upper-case in the title |
| `job_document.config.host` | Target of a ping or TCP job; the nameserver of a DNS job |
| `job_document.config.port` | Appended to the host as `host:port` |
| `job_document.config.url` | Target of an HTTP job |
| `job_document.config.domain` | The queried domain of a DNS job |

Spike does not read `job_document.status`. In NS1's own samples it can still show the state from before the change, so the notification's top-level `state` is what counts.
