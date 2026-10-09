---
description: >-
  Send Nobl9 alert policy notifications to Spike so an SLO burning its error budget pages your on-call rotation by phone, SMS, Slack or Teams.
---

# Integrate Spike with Nobl9

[Nobl9](https://www.nobl9.com) is an SLO platform. You define service level objectives, and an alert policy watches each SLO's error budget and notifies you when it is burning too fast, running low or has stopped receiving data.

Nobl9 delivers those notifications through alert methods. Add a webhook alert method that points at a Spike integration URL and an SLO that breaches its alert policy pages your on-call rotation straight away.

Nothing is installed anywhere. One webhook alert method, attached to the alert policies you care about, covers every SLO those policies watch.

## What Spike does with each notification

Every notification Nobl9 sends through the webhook opens an incident, or lands on the incident already open for the same alert.

Nobl9 does not send a notification when an alert policy stops firing, so **Spike never resolves a Nobl9 incident on its own.** Resolve it in Spike when the SLO has recovered, or set a [resolve timer](../incidents/resolve-timer.md) on the service.

## Incident identity

Spike identifies the incident by `alert_id`, the unique id Nobl9 gives the alert (`$alert_id`). A repeat notification carrying the same `alert_id` joins the incident that is already open instead of paging again.

If a notification arrives without a usable `alert_id`, Spike falls back to matching on the incident title. The title only holds the policy's own wording and the SLO it fired on, so it is the same every time for the same policy and SLO.

## Incident title

The title is Nobl9's own sentence about the conditions that fired, followed by where it fired:

```
Remaining error budget is 10%, Error budget would be exhausted in 15 minutes and this condition lasts for 1 hour — SLO checkout-availability in checkout
```

When Nobl9 sends no conditions sentence, Spike builds the title from the next best thing it has, in this order:

1. A no-data anomaly, when `anomaly_type` is `noData`: `No data for 15m from SLO checkout-availability in checkout`
2. The conditions array, naming the first two and counting the rest: `Remaining error budget is 10%, Error budget would be exhausted in 15 minutes +1 more — SLO checkout-availability in checkout`
3. The description you wrote on the alert policy: `Checkout availability is burning error budget too fast — SLO checkout-availability in checkout`
4. The alert policy name: `fast-burn on SLO checkout-availability in checkout`
5. `Nobl9 alert with no details` when the notification has none of the above

The part after the dash is the SLO (`slo_name`) and its service (`service_name`). When the service is missing it uses the Nobl9 project (`project_name`) instead, and missing parts are left out. Titles are capped at 200 characters and carry no ids, links or timestamps; those are on the incident page.

Use a [Title Remapper](../alerts/title-remapper.md) if your team reads Nobl9 alerts by policy name rather than by the conditions sentence:

```handlebars
{{data.body.alert_policy_name}} on {{data.body.slo_name}}
```

## Severity

Spike does not read `severity` from the Nobl9 payload. It is kept on the incident, but incidents open at your integration's default severity.

If you want Nobl9's `high`, `medium` and `low` on the badge, write an [alert rule](../alerts/alert-rules.md) on `severity`. Alert rules can also route an incident to another service or escalation policy, or suppress it. Read more about [priority and severity](../incidents/priority-and-severity.md).

## Prerequisites

* A Nobl9 account with permission to create alert methods and edit alert policies in the project you want to alert on
* A Nobl9 integration in Spike and its webhook URL
* Nothing to open on your own network. Nobl9 calls out to Spike

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Nobl9**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Add a webhook alert method in Nobl9

1. **Sign in to Nobl9** and, in the side menu, go to **Integrations → Alert Methods**.

2. **Select Add Alert Method** and choose **Webhook** as the type.

3. **Fill in the alert method:**
   * **Project** — the Nobl9 project the alert method belongs to. It can only be attached to alert policies in this project. *Required*
   * **Name** — something your team will recognise, for example `spike`. *Required*
   * **Display name** and **Description** — optional
   * **URL** — the webhook URL from Step 1. *Required*

4. **Choose the template.** Select **Custom template** and paste the body below. Every field is optional on the Spike side, but send all of them: the title and the incident identity are read from them.

```json
{
  "alert_id": "$alert_id",
  "severity": "$severity",
  "alert_policy_name": "$alert_policy_name",
  "alert_policy_description": "$alert_policy_description",
  "alert_policy_conditions": [$alert_policy_conditions[]],
  "alert_policy_conditions_text": "$alert_policy_conditions_text",
  "slo_name": "$slo_name",
  "objective_name": "$objective_name",
  "service_name": "$service_name",
  "project_name": "$project_name",
  "organization": "$organization",
  "slo_details_link": "$slo_details_link",
  "anomaly_type": "$anomaly_type",
  "no_data_alert_after": "$no_data_alert_after",
  "iso_timestamp": "$iso_timestamp"
}
```

{% hint style="warning" %}
`$alert_policy_conditions[]` is deliberately **not** wrapped in quotes. Nobl9 inserts the conditions as a list of quoted strings, so the template needs the square brackets around the variable and nothing else.
{% endhint %}

5. **Save** the alert method.

{% hint style="info" %}
If you would rather use Nobl9's standard mode and pick variables as fields, include the same names as the keys above. Spike reads `alert_id`, `alert_policy_conditions_text`, `alert_policy_conditions` (or `alert_policy_conditions[]`), `anomaly_type`, `no_data_alert_after`, `alert_policy_description`, `alert_policy_name`, `slo_name`, `service_name` and `project_name`. The rest are kept on the incident for alert rules.
{% endhint %}

## Step 3 — Attach it to your alert policies

An alert method receives nothing until an alert policy uses it.

1. In Nobl9, go to **Alerts → Alert Policies** and open an existing policy, or select **Add Alert Policy** to create one.
2. Under **Alert methods**, select the webhook alert method you created in Step 2.
3. **Save** the policy, then make sure the SLOs you want covered are attached to it.

For a no-data notification, make sure the SLO has a no-data alert enabled as well; Nobl9 sends it through the same alert methods.

## Step 4 — Confirm it end to end

Nobl9 can send a sample through the alert method. In **Integrations → Alert Methods**, open the Spike webhook and use its test option, or trigger a real alert on a test SLO. An incident opens in Spike with Nobl9's conditions sentence as the title, on the service you attached, escalating through your policy. Acknowledge and resolve it in Spike once you have seen it.

## Payload reference

Nobl9 sends the body from Step 2, and Spike keeps the whole thing on the incident, so [alert rules](../alerts/alert-rules.md) and the [Title Remapper](../alerts/title-remapper.md) can read every field as `data.body.<field>`.

A burn-rate alert, which opens the incident:

```json
{
  "alert_id": "6f1c9b52-3d7e-4a8f-b2c4-9e0d1a5f7c33",
  "severity": "high",
  "alert_policy_name": "fast-burn",
  "alert_policy_description": "Checkout availability is burning error budget too fast",
  "alert_policy_conditions": [
    "Remaining error budget is 10%",
    "Error budget would be exhausted in 15 minutes and this condition lasts for 1 hour"
  ],
  "alert_policy_conditions_text": "Remaining error budget is 10%, Error budget would be exhausted in 15 minutes and this condition lasts for 1 hour",
  "slo_name": "checkout-availability",
  "objective_name": "good-requests",
  "service_name": "checkout",
  "project_name": "payments",
  "organization": "acme-prod",
  "slo_details_link": "https://app.nobl9.com/slo/details?project=payments&name=checkout-availability",
  "anomaly_type": "",
  "no_data_alert_after": "",
  "iso_timestamp": "2026-10-09T03:12:45Z"
}
```

```
Remaining error budget is 10%, Error budget would be exhausted in 15 minutes and this condition lasts for 1 hour — SLO checkout-availability in checkout
```

## Things worth knowing

* **Nothing resolves automatically.** Nobl9 sends no recovery notification, so resolve the incident in Spike or use a resolve timer.
* **Resolving in Spike does not touch Nobl9.** The alert stays as it is in Nobl9.
* **Several Spike integrations are fine.** Create one Spike integration and one Nobl9 alert method per team, then attach each to that team's alert policies.
* **Nobl9's own notifications keep working.** The webhook is additional to any other alert method on the policy.

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Check that the URL on the alert method is the full `https://hooks.spike.sh/<your-token>/push-events` with nothing appended, and that the integration has not been archived in Spike. Then check that the alert method is selected on an alert policy and that the policy is attached to the SLO. An alert method no policy uses is never called.

</details>

<details>

<summary>The title is "Nobl9 alert with no details"</summary>

The notification carried none of the fields Spike builds a title from. Open the incident and look at the payload: if the values are literal `$alert_policy_conditions_text` style text, the template was saved with a variable misspelled. Compare it with the one in Step 2.

</details>

<details>

<summary>The same alert pages more than once</summary>

Open two of the incidents and compare `alert_id` in their payloads. If it is missing or empty, Spike can only match on the title, which is the same for the same policy and SLO but differs between policies. Check that `"alert_id": "$alert_id"` is in the template.

</details>

<details>

<summary>Incidents never resolve</summary>

Expected. Nobl9 sends no recovery notification. Resolve the incident in Spike or use a [resolve timer](../incidents/resolve-timer.md).

</details>

<details>

<summary>The severity badge ignores Nobl9's severity</summary>

Expected. Spike does not set severity from the Nobl9 payload. An [alert rule](../alerts/alert-rules.md) on `severity` can set it, route the incident or suppress it.

</details>

Disclaimer: These integration instructions are offered independently by Spike.sh, and Spike.sh is not affiliated with nor a partner of Nobl9, Inc.
