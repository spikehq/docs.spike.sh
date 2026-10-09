---
description: >-
  Send Uptycs alerts to Spike through a webhook destination so a security alert pages your on-call rotation by phone, SMS, Slack or Teams.
---

# Integrate Spike with Uptycs

[Uptycs](https://www.uptycs.com) is a security analytics platform that watches your hosts, containers and cloud accounts and raises an alert when one of its rules matches. Uptycs can deliver those alerts to an HTTP destination. Point that destination at a Spike integration URL and an Uptycs alert pages your on-call rotation the moment Uptycs raises it.

## What Spike does with each alert

Every delivery is one Uptycs alert, and it carries a `status`.

| `status` | What Spike does |
| --- | --- |
| `open` | Opens an incident and pages. A repeat of the same alert (same `id`) is added to the incident that is already open instead of paging again. |
| `closed` | Never opens a new incident. It is added to the matching open incident when there is one, and dropped otherwise. |

{% hint style="info" %}
Spike does not resolve an incident when an Uptycs alert closes. Uptycs sends no recovery, so resolve the incident in Spike when the work is done, or set a [resolve timer](../incidents/resolve-timer.md) as a backstop.
{% endhint %}

## Incident identity

Spike identifies the incident by the alert `id`. Uptycs gives each alert its own id, so one alert is one incident, and the same alert delivered again joins the open incident. Two different alerts on the same host are two incidents.

If a delivery has no usable `id` (empty or missing), Spike falls back to matching the incident by its exact title.

## Incident title

The title is Uptycs' own sentence about what is wrong (the alert rule's `description`), then how bad it is, then where:

```
Outbound connection to known malicious IP 185.220.101.4 from process /tmp/kworkerd (high) on prod-api-07
```

* When `description` is empty, the alert `code` is used instead, for example `Outbound connection to threat IOC (high) on prod-api-07`.
* ` (severity)` and ` on host` are left out when `severity` or `assetHostName` is empty.
* An alert with a severity or a value but no description, code or host is titled from what it does carry, for example `High-severity alert on 10.0.0.1 (no description in payload)`. A body with none of those is titled `Uptycs alert with no details`.
* Titles are capped at 200 characters. The alert id, asset id, link and time are not in the title; they are on the incident page.

Use a [Title Remapper](../alerts/title-remapper.md) if your team reads alerts by rule code rather than by sentence:

```handlebars
{{data.body.code}} on {{data.body.assetHostName}}
```

## Severity

Spike shows `severity` in the title but does not read it for the severity badge. Write an [alert rule](../alerts/alert-rules.md) on `severity` to set the badge, route to another service or escalation policy, or suppress an alert. Read more about [priority and severity](../incidents/priority-and-severity.md).

## Prerequisites

* An Uptycs account that is allowed to create destinations and alert rules
* An Uptycs integration in Spike and its webhook URL
* Nothing to open on your network. Uptycs calls out to Spike

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Uptycs**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Add a webhook destination in Uptycs

1. Sign in to your Uptycs console and open **Configuration → Destinations**.
2. Select **Add Destination** and choose the **Webhook** (HTTP) type.
3. Give the destination a name your team will recognise, for example `Spike`.
4. Set the destination **URL** to the webhook URL from Step 1, and the method to `POST` with a `Content-Type` of `application/json`.
5. In the destination's **Template** (the request body), paste the body shown below, then save.

Send exactly this JSON body. Replace each value with the matching variable from the Uptycs template editor:

```json
{
  "id": "7c1e5a92-3b4d-4f0e-9a61-2d8f0b6c4e13",
  "code": "OUTBOUND_CONNECTION_TO_THREAT_IOC",
  "description": "Outbound connection to known malicious IP 185.220.101.4 from process /tmp/kworkerd",
  "severity": "high",
  "status": "open",
  "grouping": "Threat Intel",
  "key": "remote_address",
  "value": "185.220.101.4",
  "alertTime": "2026-10-09T03:12:44.000Z",
  "assetId": "984d4a7a-9f3a-580a-a3ef-2841a561669b",
  "assetHostName": "prod-api-07",
  "url": "https://acme.uptycs.io/ui/alerts/7c1e5a92-3b4d-4f0e-9a61-2d8f0b6c4e13"
}
```

| Field | Uptycs alert field | Required | Used for |
| --- | --- | --- | --- |
| `id` | Alert ID | Yes | Joins repeats to the open incident |
| `description` | Alert rule description | Yes | The title |
| `code` | Alert code | Recommended | Title when `description` is empty |
| `severity` | Severity (`low`, `medium`, `high`, `critical`) | Recommended | The title |
| `assetHostName` | Asset host name | Recommended | The title, always last |
| `status` | Alert status | Yes, `open` | Only `open` opens an incident |
| `grouping` | Alert grouping | No | Shown on the incident |
| `key` | Alert key | No | Shown on the incident |
| `value` | Alert value | No | Shown on the incident |
| `alertTime` | Time the alert was raised | No | Shown on the incident |
| `assetId` | Asset ID | No | Shown on the incident |
| `url` | Link to the alert in the Uptycs console | No | Shown on the incident |

{% hint style="warning" %}
Uptycs does not publish the exact template syntax or variable names for HTTP destinations, and the body keys above are Spike's choice, named after the Uptycs alert API fields. Use the variable picker or the field list in the Uptycs template editor to find the variable for each field and confirm it renders before you rely on it. Uptycs does not document a variable for the link to the alert, so `url` is optional: build it from your console address and the alert id if there is no variable. Keep the key names exactly as shown.
{% endhint %}

## Step 3 — Send alerts to the destination

A destination receives nothing until an alert rule points at it.

1. Open **Configuration → Alert Rules** and open the rule you want paged, or create one.
2. Under the rule's destinations or notifications, add the `Spike` destination.
3. Save the rule.

Start with the rules for your high and critical alerts. Every alert from a rule that points at the destination becomes a Spike incident, so keep low-value rules off it.

## Step 4 — Confirm it end to end

Trigger an alert from a rule you attached, or use the destination's test option if your console has one. An incident should open in Spike on the service you attached, titled with the Uptycs sentence, and escalate through your policy. Open the incident page and check that `id` and `assetHostName` are filled in; an empty field means the template variable did not render.

## Things worth knowing

* **Several Spike integrations are fine.** Create one Spike integration and one Uptycs destination per team and point each team's alert rules at its own destination.
* **Resolving in Spike does not touch Uptycs.** The alert stays as it is in the Uptycs console.
* **Only single alerts are covered.** Uptycs detections forwarded through detection forwarding rules have a different shape and are not part of this integration.
* **Spike keeps the whole body** on the incident, so every field is available to [alert rules](../alerts/alert-rules.md) and the [Title Remapper](../alerts/title-remapper.md) as `data.body.<field>`.

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Check that the destination URL is the full `https://hooks.spike.sh/<your-token>/push-events`, that the integration is not archived in Spike, and that at least one alert rule points at the destination.

</details>

<details>

<summary>The title is "Uptycs alert with no details" or the host is missing</summary>

The template variables did not render, so Spike received empty fields. Open the incident page, look at the body, and fix the variable for each empty field in the Uptycs template.

</details>

<details>

<summary>Every repeat opens its own incident</summary>

Compare `id` on two of the incidents. If it differs, Uptycs gave each notification a new id and Spike treats them as separate alerts. If `id` is empty, Spike matches on the exact title instead, so check that the template fills `id`.

</details>

<details>

<summary>A closed alert did not open an incident</summary>

Expected. Only `status` `open` opens an incident.

</details>

Disclaimer: These integration instructions are offered independently by Spike.sh, and Spike.sh is not affiliated with nor a partner of Uptycs, Inc.
