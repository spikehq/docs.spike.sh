---
description: >-
  Send IBM NS1 Connect monitoring job notifications to Spike so a job going down pages your on-call rotation by phone, SMS, Slack or Teams, and the same job coming back up resolves the incident.
---

# Integrate Spike with IBM NS1 Connect

[IBM NS1 Connect](https://www.ibm.com/products/ns1-connect) (NS1 was acquired by IBM in 2023) is managed authoritative DNS and traffic steering. To steer traffic away from something that is broken it has to know what is alive, so it runs **monitoring jobs**: a ping, TCP, HTTP or DNS check run against an endpoint you name, from NS1's own regions. A job has two states, `up` and `down`.

NS1 announces a state change through a **notify list**, and one of the notifier types is a plain **Webhook**. Point that webhook at a Spike integration URL and a job going down opens an incident and pages your escalation policy, its repeat notifications land on that same incident instead of paging again, and the job coming back up resolves it.

Nothing is installed anywhere. You create one webhook notify list in NS1 and attach it to the monitoring jobs that should page.

{% hint style="warning" %}
**Turn on failback notifications (`notify_failback`) on every monitoring job you point at Spike.** This is the one setting that decides whether anything ever resolves.

With it on, NS1 posts `state: up` when the job recovers and Spike resolves the incident. With it off, NS1 posts `down`, re-posts `down` every `notify_repeat` seconds for as long as the job stays down, and **never posts `up` at all** — no recovery notification exists, so nothing in Spike can close the incident. It stays open, and keeps collecting repeat notifications, until a human resolves it or a [resolve timer](../incidents/resolve-timer.md) does.

Nothing about the first `down` tells you the recovery will never arrive, which is why this is worth checking on each job rather than discovering it during an outage. Step 3 below is where you set it.
{% endhint %}

{% hint style="info" %}
**Setup is per monitoring job.** A notify list is attached to a job in NS1, so a job that is not attached to the Spike list sends Spike nothing, however many other jobs are wired up. This is NS1's own model, not a limit of the integration. One list can be shared by every job — see Step 3 below.
{% endhint %}

## What Spike does with each notification

Every notification carries a `state` and the whole `job_document` the check is defined by. Spike acts on the state:

| Notification | What happens in Spike |
| --- | --- |
| `state: down` for a job with nothing open | Opens an incident and pages your escalation policy |
| `state: down` again for the same job — NS1's `notify_repeat` re-send | Added as an event to the incident already open. It never pages again |
| `state: up` for that job | Auto-resolves the open incident |
| `state: up` with nothing open | Dropped. A recovery never opens an incident |
| Any other state | Recorded on the open incident if there is one, and never opens one. NS1 documents only `down` and `up` for a notify list, so an unrecognised word is not treated as an outage or as a recovery |

The state is read without regard to case, so `DOWN` and `down` are the same state and one outage stays one incident.

## Incident identity

Spike identifies the incident by **`job_document.id`**, the id NS1 gives the monitoring job. That id is the same on the `down` that opens the incident, on every `notify_repeat` re-send while the job is still failing, and on the `up` that ends it — which is why repeats group and recoveries resolve instead of piling up.

Identity is the job, not the endpoint. Two monitoring jobs checking `checkout.acme.com` are two ids and therefore two incidents. Read more about [grouping](../incidents/grouping-incidents.md) and about [suppressing duplicates](../incidents/rate-limiting-on-duplicate-incidents.md) while an incident is open.

### Regional jobs

A monitoring job runs from several NS1 regions, and the job's own **`notify_regional`** setting decides whether NS1 notifies once for the job or once per region. Spike reads that setting off each notification, so both kinds of job behave correctly on one integration:

| The job's setting | What NS1 sends | What Spike does |
| --- | --- | --- |
| `notify_regional` off (the default, and the common case) | One notification for the job, whichever region observed the change. `region` names the region that saw it, and it can differ between the `down` and the `up` | **Every region is one incident.** The region is not part of the identity, so a repeat observed from another region joins the open incident, and a recovery seen from another region resolves it |
| `notify_regional` on | One notification per region. New York failing and Los Angeles failing are two notifications, each with its own recovery | **Each region is its own incident.** The region joins the identity, so Los Angeles recovering does not close the incident New York is still raising |

This is per job, not per integration. A job with `notify_regional` on and a job with it off can both post to the same Spike integration and each is treated its own way.

{% hint style="info" %}
On a regional job, the two regions produce two incidents with the same title, because the title is built from the job's definition (see below) and the region is on the incident page rather than in the title. If your team reads incidents out of a list, put the region in the title with a [Title Remapper](../alerts/title-remapper.md) — there is an example [further down this page](#rewriting-the-title).
{% endhint %}

## Incident title

The title says what the job is called, and what it checks:

```
checkout-api health is down (http to checkout.acme.com)
```

It is built from `job_document.name`, `job_document.job_type` and the endpoint in `job_document.config` — `host`, or the host of a `url`, or a DNS job's `domain`. The recovery reads the same way with `is up`.

Every one of those fields comes from the job's definition rather than from the notification, so the title holds still for as long as the job does: the repeat NS1 sends fifteen minutes into an outage renders exactly the same title as the `down` that opened the incident.

| The payload | Incident title |
| --- | --- |
| An HTTP job named `checkout-api health` on `checkout.acme.com`, `down` | `checkout-api health is down (http to checkout.acme.com)` |
| The same job, `up` | `checkout-api health is up (http to checkout.acme.com)` |
| A DNS job named `authoritative dns for acme.com` on `ns1.acme.com` | `authoritative dns for acme.com is down (dns to ns1.acme.com)` |
| A job with no name, a ping check of `edge-01.acme.com` | `edge-01.acme.com is down (ping check)` |
| A job whose `config` names no endpoint | `legacy smtp check is down (tcp check)` |

{% hint style="info" %}
`since`, the per-region `status` map, the job id, `frequency`, `policy` and the `notify_*` settings are deliberately kept out of the title. The first two change on every notification about a single outage, and a title that moves is unrecognisable when Spike reads it out on a phone call. They are all on the incident page instead.

A job name too long to read on a lock screen — the ones that are really a sentence — is replaced by the endpoint it checks, so the title reads `checkout.acme.com is down (http check)` rather than a cut-off fragment of the name.
{% endhint %}

## Severity

**NS1 sends no severity.** The notification carries `state`, `since`, `region` and the job document, and nothing resembling a severity or a priority, so an NS1 incident arrives without a severity badge. That is a reasonable default — how loudly a given monitoring job should page is your decision, not NS1's.

Set it with an [alert rule](../alerts/alert-rules.md). An **Incident details** condition matches on any key in the payload, including nested ones, so the job's own definition is what you route on:

| Condition | Action |
| --- | --- |
| `job_document.job_type` equals `dns` | **Mark severity as** SEV1 — authoritative DNS failing is not a SEV3 |
| `job_document.name` contains `staging` | **Ignore incident**, or route it to a quieter service |
| `region` equals `nyc` | Route to the team that owns that region, or give it a wider escalation policy |

The same rules can route the incident to another service or escalation policy, suppress it, or attach a resolve timer. Read more about [priority and severity](../incidents/priority-and-severity.md).

## Prerequisites

* An NS1 Connect account with permission to manage **notify lists** and **monitoring jobs**
* At least one monitoring job to attach the notify list to
* An IBM NS1 Connect integration in Spike and its webhook URL

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → IBM NS1 Connect**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Create a Webhook notify list in NS1

In the NS1 Connect portal, go to **Monitoring → Notify Lists** and create a notify list. Give it a name your team will recognise in the monitoring job editor, for example `Spike — network on-call`.

Add a notifier to the list and choose the **Webhook** type, then fill in:

* **URL** — the webhook URL you copied in Step 1, including `/push-events`.
* **Method** — `POST`.
* **Authentication** — none. The token in the URL is the credential, which is the model every Spike integration uses. Treat the URL like a password: if it leaks, [archive the integration](archive-an-integration.md) and create a new one.

There is nothing to configure per state. NS1 posts both `down` and `up` to the same URL with the same body shape, and Spike tells them apart from `state`.

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

## Step 3 — Attach the notify list to your monitoring jobs

Open each monitoring job under **Monitoring → Monitoring Jobs** and, in its notification settings:

1. **Set its notify list** to the Spike list from Step 2.
2. **Turn on failback notifications (`notify_failback`).** Without it that job never posts a recovery and its incidents never resolve themselves — see the warning at the top of this page.
3. Optionally review **`notify_delay`** and **`notify_repeat`**. `notify_delay` is how long a failure must persist before NS1 notifies at all, which is your first line of defence against flapping. `notify_repeat` re-sends `down` while the job stays down, and those re-sends land on the open incident in Spike rather than paging again, so you can leave it wherever your team likes it.

{% hint style="warning" %}
**Repeat this for every job that should page.** A notify list only notifies the jobs that point at it. Twelve monitoring jobs can share the one Spike list, but each of the twelve has to be attached to it, and each needs failback notifications turned on for its recoveries to reach Spike.

Attaching a job halfway through an outage is worth knowing about too: Spike sees no `down` for it, and the `up` that eventually arrives has no incident to close, so it is dropped rather than opening one.
{% endhint %}

Create a second notify list pointed at a second Spike integration when different jobs should page different teams — NS1 decides which jobs go where, and Spike's [alert rules](../alerts/alert-rules.md) can split one integration further.

## Step 4 — Add a resolve timer as a backstop

Turn on **Resolve by Timer** on the integration, under **Advanced Configuration**, and give it a duration comfortably longer than a real outage takes to fix.

{% content-ref url="../incidents/resolve-timer.md" %}
[resolve-timer.md](../incidents/resolve-timer.md)
{% endcontent-ref %}

Recoveries do the resolving when failback notifications are on, so the timer never fires on a healthy setup. It is there for the jobs where somebody forgot Step 3, and for the case where NS1 cannot reach Spike at the moment the job recovers.

## Step 5 — Confirm it with a real state change

NS1 has no test-notification button for a notify list, so the confirmation is a real job changing state. The quickest way is a monitoring job you can break on purpose: point a TCP or HTTP job at an endpoint you control, take it away, and put it back.

Watch for three things:

1. An incident opens in Spike titled after the job, on the service you attached, escalating through your policy.
2. Leaving the job down until NS1 re-notifies (`notify_repeat`) adds an event to that same incident, and pages nobody a second time.
3. Restoring the endpoint resolves the incident, with an auto-resolved entry on its timeline.

If the first two work and the third does not, failback notifications on that job are the first thing to check.

## Payload reference

NS1 posts one JSON body per state change. This is a `down` on an HTTP job:

```json
{
  "state": "down",
  "since": "2026-09-24T09:15:00Z",
  "region": "nyc",
  "job_document": {
    "id": "mon-8f3c2a1d",
    "name": "checkout-api health",
    "job_type": "http",
    "frequency": "60",
    "policy": "all",
    "regions": ["nyc", "lax"],
    "notify_delay": "120",
    "notify_repeat": "900",
    "notify_failback": true,
    "notify_regional": false,
    "config": { "host": "checkout.acme.com", "path": "/health" },
    "status": { "nyc": "down", "lax": "up" }
  }
}
```

And the `up` that resolves its incident, same job, same id:

```json
{
  "state": "up",
  "since": "2026-09-24T09:22:00Z",
  "region": "nyc",
  "job_document": {
    "id": "mon-8f3c2a1d",
    "name": "checkout-api health",
    "job_type": "http",
    "frequency": "60",
    "policy": "all",
    "regions": ["nyc", "lax"],
    "notify_delay": "120",
    "notify_repeat": "900",
    "notify_failback": true,
    "notify_regional": false,
    "config": { "host": "checkout.acme.com", "path": "/health" },
    "status": { "nyc": "up", "lax": "up" }
  }
}
```

The fields Spike's behaviour depends on:

| Field | What it is |
| --- | --- |
| `state` | `down` or `up`. `down` opens or joins an incident, `up` resolves it |
| `job_document.id` | The monitoring job's id. Stable for the life of the job, and what Spike groups on |
| `job_document.notify_regional` | Whether NS1 notifies per region, and therefore whether the region is part of the identity |
| `job_document.notify_failback` | Whether NS1 ever posts an `up` for this job at all |
| `job_document.name`, `job_document.job_type`, `job_document.config` | What the incident is titled from |
| `region`, `since`, `job_document.status` | Which region observed the change, when, and the per-region picture at that moment. Shown on the incident, kept out of the title because all three move during one outage |

The whole body as NS1 sent it is stored on the incident, so every field — including `frequency`, `policy`, `notify_delay` and `notify_repeat` — is available to [alert rules](../alerts/alert-rules.md) and to the [Title Remapper](../alerts/title-remapper.md) as `data.body.<field>`.

### Rewriting the title

Point a [Title Remapper](../alerts/title-remapper.md) at the integration to build your own title from that body. This one names the region, which is what you want if you run regional jobs and read incidents out of a list:

```handlebars
{{data.body.job_document.name}} is {{data.body.state}} from {{data.body.region}}
```

A remapper replaces the whole title, including the `(http to checkout.acme.com)` part, so put back whatever your team needs to see:

```handlebars
{{data.body.job_document.name}} is {{data.body.state}} ({{data.body.job_document.job_type}} to {{data.body.job_document.config.host}}) from {{data.body.region}}
```

Open the remapper against a real NS1 incident first — the preview shows the body your own monitoring jobs produce, which is the quickest way to find the field you want.

{% hint style="warning" %}
Remap onto fields that hold still for the life of the job. `since` and the per-region `status` map change on every notification about one outage, so a title built on either moves under an open incident, which breaks the **Repeated N times** grouping and any alert rule matching on title text. Grouping itself is unaffected — it is on `job_document.id`, never on the title.
{% endhint %}

## Things worth knowing

* **Failback notifications are the whole resolution story.** There is no second webhook to configure for recoveries and nothing to switch on in Spike. NS1 either posts the `up` or it does not, and that is a per-job setting.
* **One notify list can serve every job.** The body carries the whole job document, so Spike tells the jobs apart no matter how you arrange the lists. Use several lists when different jobs should reach different Spike integrations.
* **Repeat notifications never page twice.** A `notify_repeat` re-send joins the open incident. Turning the repeat off in NS1 is not necessary and makes the incident timeline less useful.
* **Two jobs on one endpoint are two incidents.** Grouping is on the job id, so an HTTP job and a ping job against the same host page separately — which is usually right, since they are two checks with two answers.
* **Resolving in Spike does not touch NS1.** The monitoring job stays down in NS1 until the endpoint recovers, and the next `notify_repeat` re-send after you resolve opens a fresh incident.
* **NS1's usage and zone alerts are a different mechanism.** This integration covers monitoring jobs and their notify lists. Whether NS1's newer alerting can deliver to the same webhook notifier is not something we have confirmed, so treat it as unsupported here until you have tested it against a Spike integration you do not mind filling with incidents.
* **The URL is the credential.** Anybody holding it can open incidents on your service. Archive the integration and create a new one if it leaks.

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Check the notify list first: the URL has to be the full `https://hooks.spike.sh/<your-token>/push-events` with nothing appended, the method `POST`, and the notifier type **Webhook**. Then check the job — a notify list notifies only the monitoring jobs attached to it, and a job with no list set sends nothing to anywhere.

If the wiring looks right, the job may simply not have failed yet, or not for long enough: `notify_delay` holds a notification back until the failure has persisted that many seconds. Break something on purpose, as in Step 5, rather than waiting.

Finally, confirm the integration has not been archived in Spike.

</details>

<details>

<summary>Incidents open but never resolve</summary>

Failback notifications are off on that monitoring job, in almost every case. With `notify_failback` off, NS1 posts no `up` at any point, so there is nothing for Spike to resolve from. Turn it on for the job — see Step 3 — and add a [resolve timer](../incidents/resolve-timer.md) on the integration for the ones that slip through.

If failback is on and incidents still stay open, check whether the job is regional. On a job with `notify_regional` on, the recovery has to name the same region as the notification that opened the incident; a recovery whose region is missing leaves the incident for a human on purpose, rather than guessing which region's page it closes.

</details>

<details>

<summary>Every repeat notification opens a new incident</summary>

The earlier incident was already resolved — by hand, or by a resolve timer shorter than NS1's `notify_repeat` interval — and Spike only appends to an incident that is still open. Raise the timer above your repeat interval, or leave it off and let recoveries do the resolving.

If incidents pile up while the first one is still open, compare `job_document.id` on two of them. Different ids mean NS1 is notifying about different monitoring jobs, which are separate incidents by design.

</details>

<details>

<summary>One job is producing two incidents</summary>

The job has `notify_regional` on, and two regions are failing. That is deliberate: each region's failure and recovery stand alone, so Los Angeles recovering cannot close the page New York is still raising. Both incidents carry their region in the payload, and a [Title Remapper](../alerts/title-remapper.md) puts it in the title if you need to tell them apart at a glance.

Turn `notify_regional` off on the job in NS1 if you would rather have one incident for the job however many regions see it fail.

</details>

<details>

<summary>A recovery arrived but no incident was resolved</summary>

Expected when nothing was open for that job. An `up` never opens an incident — an incident announcing that everything is fine wakes somebody for no reason — so a recovery is dropped if its `down` was never delivered, if the notify list was attached mid-outage, or if the incident was already resolved in Spike.

</details>

<details>

<summary>Incidents have no severity</summary>

NS1 sends none, so there is nothing for Spike to read. Set it with an [alert rule](../alerts/alert-rules.md) on the job's own fields — `job_document.job_type`, `job_document.name` or `job_document.notify_regional` — as shown under [Severity](#severity).

</details>

Disclaimer: These integration instructions are offered independently by Spike.sh, and Spike.sh is not affiliated with nor a partner of International Business Machines Corporation.
