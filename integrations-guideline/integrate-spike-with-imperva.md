---
description: >-
  Send Imperva Cloud WAF (Incapsula) notifications to Spike so a DDoS attack, BGP session loss or degraded connection pages your on-call rotation by phone, SMS, Slack or Teams, and resolves its incident when Imperva reports recovery.
---

# Integrate Spike with Imperva Cloud WAF

[Imperva Cloud WAF](https://www.imperva.com) (formerly Incapsula) sits in front of your websites and networks, filtering attacks, absorbing DDoS traffic and monitoring the connections that carry your traffic. Imperva can send each of its account notifications to a webhook.

Point a webhook connection at a Spike integration URL and an Imperva DDoS attack, BGP session loss or connection performance problem pages your on-call rotation the moment Imperva raises it. Repeats of the same alert land on the incident already open, and the incident resolves itself when Imperva sends the matching recovery notification.

Nothing is installed. One webhook connection and a notification policy, configured once in the Imperva console, cover the whole account.

{% hint style="warning" %}
Imperva does not publish a sample webhook payload. The field names and `event_type` values on this page come from partner documentation and have not been checked against a live Imperva account. Send a test from the console (Step 3) and compare it with the payload below before you rely on it.
{% endhint %}

## What Spike does with each event

Every delivery carries `event_metadata.event_type`, and that field decides what Spike does with it.

### Events that open an incident and page

| `event_type` | What happened |
| --- | --- |
| `WebsiteDdosStart` | DDoS attack on a protected website |
| `WebsiteProtectNetworkTrafficDdosStart` | DDoS attack on a website group (network traffic protection) |
| `SingleIpDdosStart` | DDoS attack on a single protected IP |
| `IpRangeDdosStart` | DDoS attack on a protected IP range |
| `BgpDown` | BGP session to Imperva is down |
| `PerformanceDegraded` | A connection's performance is degraded |
| `MonitoringAttackStartCritical` | Critical attack detected |
| `TrafficStartDivert` | Traffic diverted to Imperva |

### Events that resolve an incident

| `event_type` | Resolves |
| --- | --- |
| `WebsiteDdosStop` | `WebsiteDdosStart` |
| `WebsiteProtectNetworkTrafficDdosStop` | `WebsiteProtectNetworkTrafficDdosStart` |
| `SingleIpDdosStop` | `SingleIpDdosStart` |
| `IpRangeDdosStop` | `IpRangeDdosStart` |
| `BgpUp` | `BgpDown` |
| `PerformanceRestored` | `PerformanceDegraded` |

`MonitoringAttackStartCritical` and `TrafficStartDivert` are one-shot: they open an incident and Imperva sends no matching recovery, so you resolve them in Spike.

### Everything else

Any other `event_type`, such as a new site being added, expected overage or a certificate expiry, opens an incident matched by its title and is never resolved automatically. `HelloWorldTest`, which the console's **Test Webhook** button sends, creates nothing.

{% hint style="info" %}
A recovery that arrives with no matching open incident is dropped rather than turned into a new incident. That happens when the opening notification was not selected in the policy, or when the incident was already resolved in Spike.
{% endhint %}

## Incident identity

Spike identifies the incident by the Imperva asset the event is about, `event_metadata.asset_id`, within the Imperva account in `event_metadata.account_id`. The asset id is the same on an attack's start and its stop, so one attack reads as one Spike incident: it pages once, repeats join it, and the stop resolves it. Two websites under attack at once are two incidents. A DDoS start and a BGP down on the same asset are separate incidents too, because the kind of event is part of the identity.

If an event carries no `asset_id`, Spike falls back to the first of `extended_parameters.site_name`, `range`, `ip_range` with `slice_name`, or `connection_name`. `account_id` is there because one Spike integration can receive events from several Imperva accounts or sub-accounts.

## Incident title

The title is Imperva's own sentence, `event_title`, with HTML stripped and whitespace collapsed, capped at 200 characters:

```
DDoS attack started on checkout.acme.com
```

When `event_title` is empty, the title is the first sentence of `event_details.event_body`. When both are empty it is built from the event type and where it happened:

```
Website group DDoS attack started on EU edge (192.0.2.0/24)
Connection performance restored on xconnect-ams
```

An event with nothing usable at all is titled `Imperva alert with no details`. Titles carry no ids, URLs, dates or traffic readings; those are on the incident page.

A stop event is shown with its own sentence, for example `DDoS attack ended on checkout.acme.com`. It still resolves the right incident, because matching is by identity and never by title.

## Severity

Spike does not read a severity from the Imperva payload, so incidents open at your integration's default. To route by attack type or site, write an [alert rule](../alerts/alert-rules.md). Read more about [priority and severity](../incidents/priority-and-severity.md).

## Prerequisites

* An Imperva account with permission to manage account settings and webhook connections
* An Imperva integration in Spike and its webhook URL
* Nothing to open on your own network. Imperva calls out to Spike

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Imperva Cloud WAF**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Add a webhook connection in Imperva

1. Sign in to the Imperva Cloud Security Console and go to **Account → Account Management → Webhook Connections**.
2. Select **Add webhook connection** and fill in the name and URL. Both are required:
   * **Name**: something your team will recognise, for example `Spike`
   * **URL**: the webhook URL from Step 1
3. Leave authentication empty. Imperva can add a secure code to the webhook header, but Spike does not check it; the token in the URL is the credential. Treat the URL like a password. If it leaks, archive the integration in Spike, create a new one and update the URL in Imperva.
4. Save the connection.

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

## Step 3 — Choose the notifications that feed it

1. In the same console, open the account's **Notification Settings** and create or edit a notification policy.
2. Select the events to send, for example the DDoS attack, BGP and connection performance notifications.
3. Choose the webhook connection from Step 2 as the destination and save.
4. Back on **Webhook Connections**, select **Test Webhook**.

Always select the stop or recovery notification that matches each start you select. A DDoS start without its stop pages your rotation and leaves the incident open until somebody resolves it by hand. A [resolve timer](../incidents/resolve-timer.md) is a reasonable backstop, not a replacement.

The test delivery has `event_type` `HelloWorldTest`. Spike accepts it and opens nothing, so a quiet incident list after the test is the expected result. Confirm it arrived under the integration's request log in Spike.

## Step 4 — Confirm it end to end

Imperva cannot fabricate an attack, so replay the payloads below against your webhook URL to see all three moments:

```bash
curl -X POST "https://hooks.spike.sh/<your-token>/push-events" \
  -H "Content-Type: application/json" \
  -d @imperva-start.json
```

1. The start payload opens an incident titled `DDoS attack started on checkout.acme.com`, on your service, escalating through your policy.
2. Sending it again with different readings lands on the same incident without paging again.
3. The stop payload resolves it, and `DDoS attack ended on checkout.acme.com` appears on the event list.

## Payload reference

Imperva sends its own payload and there is no template to edit. Spike receives one event per request. Fields are readable in [alert rules](../alerts/alert-rules.md) and the [Title Remapper](../alerts/title-remapper.md) as `data.body.<field>`.

| Field | Used for |
| --- | --- |
| `event_metadata.event_type` | Decides whether the event opens, resolves or is ignored |
| `event_metadata.account_id` | Scopes the identity to one Imperva account |
| `event_metadata.asset_id` | The asset the event is about; the incident identity |
| `event_title` | The incident title |
| `event_details.event_body` | The title when `event_title` is empty |
| `extended_parameters.site_name` | Website DDoS events: where, and identity fallback |
| `extended_parameters.range` | IP and IP range DDoS events: where, and identity fallback |
| `extended_parameters.ip_range` | Website group DDoS events: where, and identity fallback |
| `extended_parameters.slice_name` | Website group DDoS events: paired with `ip_range` |
| `extended_parameters.connection_name` | BGP and performance events: where, and identity fallback |
| `extended_parameters.network_prefix` | One-shot events: where in a built title |

Other fields, such as `sub_type`, `main_category`, `event_date`, `webhook_id`, the attack readings and the dashboard links, are kept on the incident page but not read. `account_id` and `asset_id` may be numbers or strings.

An attack start, which opens the incident:

```json
{
  "event_metadata": {
    "event_type": "WebsiteDdosStart",
    "sub_type": "Website DDoS",
    "main_category": "Application Security",
    "account_id": 1873245,
    "asset_id": 94016621,
    "event_date": "2026-10-08T02:14:37Z",
    "webhook_id": 5521
  },
  "event_title": "DDoS attack started on checkout.acme.com",
  "event_details": {
    "event_body": "Imperva has detected a DDoS attack on checkout.acme.com and is mitigating it. Blocked traffic peaked at 1.8 Gbps (412,000 packets per second)."
  },
  "extended_parameters": {
    "site_name": "checkout.acme.com",
    "attack_duration": "00:03:12",
    "max_blocked_bps": 1834000000,
    "max_blocked_pps": 412000,
    "dashboard_link": "https://management.service.imperva.com/my/sites/94016621/dashboard",
    "attack_report_link": "https://management.service.imperva.com/my/attacks/8f3c2a1d"
  }
}
```

The matching stop, which resolves it:

```json
{
  "event_metadata": {
    "event_type": "WebsiteDdosStop",
    "sub_type": "Website DDoS",
    "main_category": "Application Security",
    "account_id": 1873245,
    "asset_id": 94016621,
    "event_date": "2026-10-08T02:33:19Z",
    "webhook_id": 5521
  },
  "event_title": "DDoS attack ended on checkout.acme.com",
  "event_details": {
    "event_body": "The DDoS attack on checkout.acme.com has ended after 18 minutes 42 seconds. Imperva blocked up to 2.3 Gbps (515,000 packets per second)."
  },
  "extended_parameters": {
    "site_name": "checkout.acme.com",
    "attack_duration": "00:18:42",
    "max_blocked_bps": 2310000000,
    "max_blocked_pps": 515000,
    "dashboard_link": "https://management.service.imperva.com/my/sites/94016621/dashboard",
    "attack_report_link": "https://management.service.imperva.com/my/attacks/8f3c2a1d"
  }
}
```
