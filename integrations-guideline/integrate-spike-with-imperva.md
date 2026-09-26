---
description: >-
  Send Imperva Cloud WAF webhook notifications to Spike so a DDoS attack, a dropped BGP connection or degraded origin performance pages your on-call rotation, and the matching stop event resolves the incident.
---

# Integrate Spike with Imperva Cloud WAF

[Imperva Cloud WAF](https://www.imperva.com/products/web-application-firewall-waf/) (part of Thales, and still called Incapsula in a few places) can post its account notifications straight to a URL through a **Webhook Connection**. Point that connection at a Spike integration and an Imperva event that means something is wrong right now opens an incident and escalates through your policy, while the event that says it is over closes the incident again.

Nothing is installed anywhere. You create the webhook connection in Imperva, attach it to a notification policy, and the two sides stay in sync from there.

{% hint style="info" %}
In Spike the integration is listed as **Imperva Cloud WAF**. If your team knows this product by its old name, searching for **Incapsula** finds the same integration — both names lead to one webhook URL and one parser.
{% endhint %}

## What Spike does with each event

Spike branches on `event_metadata.event_type`. Four event families arrive as a start and a stop, and each pair is handled end to end: the start opens an incident and pages, the stop resolves the incident Spike opened for it.

| Start event | Opens at | Stop event | Paired by |
| --- | --- | --- | --- |
| `WebsiteDdosStart` | SEV1 | `WebsiteDdosStop` | `event_metadata.asset_id` |
| `IpRangeDdosStart`, and the single-IP DDoS start | SEV1 | `IpRangeDdosStop` | `extended_parameters.range` |
| `BgpDown` | SEV1 | `BgpUp` | `extended_parameters.connection_name` |
| `PerformanceDegraded` | SEV2 | `PerformanceRestored` | `event_metadata.asset_id` |

There is no incident id anywhere in an Imperva payload, so the pairing is done on the field in the last column. That field is the one Imperva repeats on both halves of a pair: a website DDoS stop carries the same `asset_id` as its start, a BGP recovery carries the same `connection_name` as the drop, and an IP range DDoS stop carries the same `range`.

A stop event that arrives with no matching incident open in Spike is dropped rather than opening one, so a recovery on its own never pages anybody.

### Two problems on one site are two incidents

`WebsiteDdosStart` and `PerformanceDegraded` both identify their asset with `event_metadata.asset_id`, so the family is part of the identity too. A site that is under a DDoS attack and serving slowly from its origin at the same time gets **two** incidents in Spike, and each one resolves on its own stop event:

* `WebsiteDdosStart` on `site-9c1d4b2f` → incident A, SEV1. `WebsiteDdosStop` on `site-9c1d4b2f` resolves incident A and leaves B open.
* `PerformanceDegraded` on `site-9c1d4b2f` → incident B, SEV2. `PerformanceRestored` on `site-9c1d4b2f` resolves incident B.

That is deliberate. The attack and the slow origin are two different problems on one site, they are usually fixed at different times, and folding them into one incident would resolve one of them early.

### Everything else is acknowledged and dropped

Imperva's notification policies also carry one-shot announcements: a site was added, bandwidth overage is expected, a security policy changed, a certificate is approaching expiry, and so on. None of them describe an ongoing problem that a stop event would later close, so Spike answers them with `200` and creates neither an event nor an incident.

| Event | What happens in Spike |
| --- | --- |
| The start and stop events in the table above | Open or resolve an incident |
| `HelloWorldTest`, sent by the **Test Webhook** button | Answered `200`. Nothing is created |
| `AddSite`, `OverageExpected`, `SecurityPolicyChanged` and the other one-shot notifications | Answered `200`. Nothing is created |

{% hint style="info" %}
Clicking **Test Webhook** in Imperva and then seeing nothing in Spike is the successful result, not a failure. The test delivery confirms the URL is reachable and that Imperva got a `200` back; it deliberately does not leave a phantom incident behind for somebody to resolve. Imperva shows you the response it got — a `200` there means the connection is good.
{% endhint %}

If you do want to know about a one-shot notification, send it to an email subscriber on the same notification policy in Imperva. Skipping them in Spike keeps the pager for the events that have an end.

## Incident titles

The title is Imperva's own `event_title`, verbatim, because Imperva already writes it as a sentence that names the asset:

```
DDoS attack detected on checkout.acme.com
```

Nothing is prefixed or reworded, so the title reads correctly when Spike speaks it on a phone call. `event_details.event_body`, the whole of `extended_parameters` — including the attack report link, the blocked bits and packets per second and the attack duration — and every `event_metadata` field stay on the payload and show up on the incident page.

Use a [Title Remapper](../alerts/title-remapper.md) if your team wants a different shape, for example leading with the category and the site:

```handlebars
[{{data.body.event_metadata.main_category}}] {{data.body.event_title}} ({{data.body.event_metadata.asset_id}})
```

## Severity

Imperva sends no severity field, so Spike sets it from the event type:

| Event | Severity in Spike |
| --- | --- |
| `WebsiteDdosStart`, `IpRangeDdosStart`, single-IP DDoS start | SEV1 |
| `BgpDown` | SEV1 |
| `PerformanceDegraded` | SEV2 |

A DDoS attack and a dropped BGP session are taking traffic away from you now, which is what SEV1 is for. Degraded performance is worth waking someone up for but is a step below an outage, so it opens at SEV2.

{% hint style="info" %}
Severity is set when the incident is created. [Alert routing rules](../alerts/alert-rules.md) can override it, send the incident to a different service or escalation policy, or suppress it entirely — which is how you keep, say, performance degradation on a staging site off the pager. Read more about [priority and severity](../incidents/priority-and-severity.md).
{% endhint %}

## Prerequisites

* An Imperva Cloud Security Console account with permission to manage account settings and notification policies
* An Imperva Cloud WAF integration in Spike and its webhook URL

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Imperva Cloud WAF**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Create the webhook connection in Imperva

{% tabs %}
{% tab title="Setup on Imperva" %}
1. **Open the webhook connections screen:**
   In the Imperva Cloud Security Console, go to **Account → Account Management → Webhook Connections**.

2. **Add a connection:**
   Click **Add Connection**, and fill in the fields listed below.

3. **Save the connection:**
   It is now available to every notification policy on the account, and it sends nothing at all until you attach it to one, which is Step 3.
{% endtab %}
{% endtabs %}

| Field | What to put in it |
| --- | --- |
| Name | `Spike` — this is the name you pick when attaching the connection to a notification policy |
| Endpoint URL | The Spike webhook URL from Step 1, in full, including the token and the `/push-events` suffix |
| Custom headers | Leave empty. Spike authenticates on the token in the URL |

## Step 3 — Attach the connection to a notification policy

A webhook connection on its own delivers nothing. Imperva decides what to send from the **notification policy**, so this step is the one that actually turns events on.

1. Go to **Account → Account Management → Notifications** and open the notification policy that covers the sites or networks you want paged on — or create one.
2. Add your `Spike` connection as a **subscriber** on that policy, alongside any email subscribers already there.
3. In the policy's event list, select the events Spike should receive. At a minimum, select the DDoS, BGP and performance events from the table above — each pair needs **both** halves, or the incident opens and never resolves.
4. Scope the policy to the assets it should cover, then save.

{% hint style="warning" %}
Select the stop half of every pair you select the start half of. A policy that sends `WebsiteDdosStart` but not `WebsiteDdosStop` opens incidents in Spike that nobody in Imperva will ever close, and the on-call has to resolve them by hand.
{% endhint %}

One policy per team works well when different teams own different sites: give each its own Spike integration and its own connection, and each policy pages its own escalation policy.

## Step 4 — Send a test delivery

Open the connection in Imperva and press **Test Webhook**. Imperva posts a `HelloWorldTest` event and shows you the response code it received.

* A `200` means the URL is right and the integration is live.
* Nothing appears in Spike, and nothing should. See the note above — the test event is answered and dropped on purpose.
* Anything other than a `200` means the URL is wrong or the integration has been archived. Re-copy the webhook URL from the integration in Spike.

To see a real incident before you need one, wait for the first genuine event, or ask your Imperva contact which of the pairs is testable on your account. A BGP or performance pair is usually easier to exercise safely than a DDoS attack.

## Things worth knowing

* **Resolving in Spike does not change anything in Imperva.** The two are not linked in that direction. Imperva's own state stays whatever the Cloud Security Console says it is.
* **A stop event that finds nothing open is dropped.** If your team resolved the incident by hand before Imperva sent the stop event, that stop event simply has nothing left to close.
* **Imperva has no webhook signature.** There is no HMAC and no shared secret to verify, so the token in the URL is what authenticates the delivery. Keep the URL out of shared documents and tickets, and if it leaks, archive the integration and create a new one.
* **Single-IP and IP range DDoS events share handling.** Both pair with `IpRangeDdosStop` on `extended_parameters.range`, so a single protected IP behaves exactly like a range with one address in it.
* **Repeats are grouped.** A second `WebsiteDdosStart` for a site that already has an open DDoS incident is [grouped](../incidents/grouping-incidents.md) onto it rather than opening a second one.

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

## Payload reference

Imperva posts `application/json`. Every event has the same envelope, with the per-event detail in `extended_parameters`:

```json
{
  "event_metadata": {
    "event_type": "<type>",
    "sub_type": "<sub type>",
    "main_category": "<category>",
    "account_id": "<id>",
    "asset_id": "<id>",
    "event_date": "<date>",
    "webhook_id": "<id>"
  },
  "event_title": "<title>",
  "event_details": { "event_body": "<text>" },
  "extended_parameters": {}
}
```

A website DDoS attack starting:

```json
{
  "event_metadata": {
    "event_type": "WebsiteDdosStart",
    "sub_type": "volumetric",
    "main_category": "DDoS",
    "account_id": "acc-4821",
    "asset_id": "site-9c1d4b2f",
    "event_date": "2026-09-24T09:15:00Z",
    "webhook_id": "wh-8f3c2a1d"
  },
  "event_title": "DDoS attack detected on checkout.acme.com",
  "event_details": { "event_body": "Volumetric DDoS attack started" },
  "extended_parameters": {
    "range": "checkout.acme.com",
    "attack_duration": "",
    "max_blocked_bps": "1200000000",
    "max_blocked_pps": "850000",
    "attack_report_link": "https://my.imperva.com/attacks/8f3c2a1d"
  }
}
```

The same attack ending, with the same `asset_id`, which is what resolves the incident:

```json
{
  "event_metadata": {
    "event_type": "WebsiteDdosStop",
    "sub_type": "volumetric",
    "main_category": "DDoS",
    "account_id": "acc-4821",
    "asset_id": "site-9c1d4b2f",
    "event_date": "2026-09-24T09:45:00Z",
    "webhook_id": "wh-8f3c2a1d"
  },
  "event_title": "DDoS attack ended on checkout.acme.com",
  "event_details": { "event_body": "Volumetric DDoS attack stopped" },
  "extended_parameters": {
    "range": "checkout.acme.com",
    "attack_duration": "1800",
    "max_blocked_bps": "1200000000",
    "max_blocked_pps": "850000",
    "attack_report_link": "https://my.imperva.com/attacks/8f3c2a1d"
  }
}
```

The test delivery, which Spike answers `200` and drops:

```json
{
  "event_metadata": {
    "event_type": "HelloWorldTest",
    "sub_type": "",
    "main_category": "Test",
    "account_id": "acc-4821",
    "asset_id": "",
    "event_date": "2026-09-24T09:00:00Z",
    "webhook_id": "wh-8f3c2a1d"
  },
  "event_title": "Test Webhook",
  "event_details": { "event_body": "This is a test message" },
  "extended_parameters": {}
}
```

What each family carries, and the field Spike pairs its start and stop on:

| Family | Identity field | Other fields it carries |
| --- | --- | --- |
| Website DDoS | `event_metadata.asset_id` | `range`, `attack_duration`, `max_blocked_bps`, `max_blocked_pps`, `attack_report_link` |
| IP range and single-IP DDoS | `extended_parameters.range` | `attack_duration`, `max_blocked_bps`, `max_blocked_pps`, `attack_report_link` |
| BGP | `extended_parameters.connection_name` | The connection's own details, as Imperva sends them |
| Performance | `event_metadata.asset_id` | The performance detail Imperva sends for the asset |

Imperva may add fields to any of these. Spike keeps the whole body on the incident, so anything extra is available to alert rules and to the Title Remapper as `data.body.<field>`.

## Troubleshooting

<details>

<summary>The test webhook returns 200 but no incident shows up in Spike</summary>

That is the expected result. `HelloWorldTest` is answered and dropped so that verifying your setup does not leave an incident behind. The `200` is the confirmation you are looking for. To see a real incident, wait for a genuine event on a notification policy that has the Spike connection attached.

</details>

<details>

<summary>Nothing arrives at all, not even the test delivery</summary>

Check the endpoint URL on the webhook connection: it must be the full `https://hooks.spike.sh/<your-token>/push-events`, with no trailing characters, and the integration must not be archived in Spike. Imperva shows the response it got from the last delivery on the connection, which tells you whether the request left Imperva at all.

</details>

<details>

<summary>The test works but real events never arrive</summary>

The webhook connection is only a destination. Until it is added as a subscriber on a notification policy, and that policy has the DDoS, BGP or performance events selected and covers the right assets, Imperva sends nothing to it. Step 3 is the one to re-check.

</details>

<details>

<summary>Incidents open but never resolve</summary>

Almost always a notification policy that has the start event selected and not the stop event. Open the policy in Imperva and confirm that `WebsiteDdosStop`, `IpRangeDdosStop`, `BgpUp` and `PerformanceRestored` are selected alongside their starts. If both halves are selected and the incident still does not resolve, the stop event arrived without the field its family is paired on — an `IpRangeDdosStop` with no `extended_parameters.range`, or a `BgpUp` with no `connection_name`, has nothing to match on.

</details>

<details>

<summary>One site produced two incidents</summary>

Expected when the events came from two different families — a DDoS attack and a performance degradation on the same `asset_id` are two problems and get one incident each. Two incidents from the *same* family usually means the first was already resolved, by hand or by Imperva's stop event, before the second start arrived.

</details>

<details>

<summary>Nothing happens when a site is added, or when an overage is expected</summary>

Those are one-shot notifications, and Spike skips them by design — there is no end to them for a stop event to signal, so they would only create incidents that somebody has to close. Add an email subscriber to the same notification policy in Imperva if you want to hear about them.

</details>

Disclaimer: These integration instructions are offered independently by Spike, and Spike is not affiliated with nor a partner of Imperva, Inc. or Thales.
