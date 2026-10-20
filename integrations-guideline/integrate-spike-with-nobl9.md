---
description: >-
  Send Nobl9 alert policy notifications to Spike so an SLO burning its error budget pages your on-call rotation by phone, SMS, Slack or Teams.
---

# Integrate Spike with Nobl9

[Nobl9](https://www.nobl9.com) is an SLO platform. You define service level objectives, and an alert policy watches each SLO's error budget and notifies you when it is burning too fast, running low or has stopped receiving data.

Nobl9 delivers those notifications through alert methods. Add a webhook alert method that points at a Spike integration URL and an SLO that breaches its alert policy pages your on-call rotation straight away.

Nothing is installed anywhere. One webhook alert method, attached to the alert policies you care about, covers every SLO those policies watch.

## What Spike does with each notification

Every notification Nobl9 sends through the webhook opens an incident, or lands on the incident already open for the same alert. The webhook only receives alerts that have triggered.

Nobl9 does not send resolutions to webhook alert methods, so **Spike never resolves a Nobl9 incident on its own.** Resolve it in Spike when the SLO has recovered, or set a [resolve timer](../incidents/resolve-timer.md) on the service.

## Incident identity

Spike identifies the incident by `alert_id`, the unique id Nobl9 gives the alert (`$alert_id`). A repeat notification carrying the same `alert_id` joins the incident that is already open instead of paging again.

If a notification arrives without a usable `alert_id` (empty, or an unexpanded variable such as `$alert_id`, `${alert_id}` or `{{alert_id}}`), Spike falls back to matching on the incident title. In that case the title holds no readings, thresholds, ids or timestamps, so it is the same every time for the same policy and SLO (see the table below).

## Incident title

The title is the description you wrote on the alert policy, followed by the SLO and its service:

```
Checkout API is burning its error budget more than 5x faster than allowed (checkout-api-availability in checkout)
```

Other shapes, used when the description is empty or the alert is a no-data alert:

| When | Title |
| --- | --- |
| The policy has no description and the notification has a usable `alert_id` | `fast-burn: Average burn rate is ≥ 5 and this condition lasts for 5 minutes (checkout-api-availability in checkout)` |
| The policy has no description and there is no usable `alert_id` | `fast-burn: Error budget burning (checkout-api-availability in checkout)` |
| The policy has no description and no conditions text | `fast-burn (checkout-api-availability in checkout)` |
| `anomaly_type` is `noData` | `No data from SLO for 15m (checkout-api-availability in checkout)` |
| `anomaly_type` is `noData` and `no_data_alert_after` is empty | `No data from SLO (checkout-api-availability in checkout)` |
| Nothing usable in the notification | `Nobl9 alert with no details` |

Without a usable `alert_id`, Spike matches repeats on the title, so the conditions text, which holds the thresholds, is replaced by the kind of condition it describes: `Error budget burning`, `Error budget running out` or `Error budget running low`. Editing a threshold on the policy then keeps the same title and the same incident. Conditions text that names none of these is left out, giving `fast-burn (checkout-api-availability in checkout)`.

A trailing full stop on the description is removed. The ` in checkout` part is left out when `service_name` is empty, and with no SLO name the part reads `(checkout)`. The parentheses are left out when both `slo_name` and `service_name` are empty. An empty value or an unexpanded variable such as `$slo_name` counts as missing. Titles are capped at 200 characters. The description is shortened first; the SLO and service part is shortened only when it alone would leave fewer than 40 characters for the description. The project, objective, severity and timestamp are on the incident page, not in the title.

Use a [Title Remapper](../alerts/title-remapper.md) if your team reads Nobl9 alerts by policy name rather than by description:

```handlebars
{{data.body.alert_policy_name}} on {{data.body.slo_name}}
```

## Severity

Spike's integration code does not read `severity`, but Spike lifts a `severity` field from the payload and maps it to a severity badge, so Nobl9's `High`, `Medium` and `Low` can show on the incident. The casing Nobl9 renders is not documented; the match ignores case.

[Alert rules](../alerts/alert-rules.md) can override severity, route the incident to another service or escalation policy, or suppress it. Read more about [priority and severity](../incidents/priority-and-severity.md).

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

1. **Sign in to Nobl9** and go to **Integrations > Alert methods**.

2. **Click the + button**, then select **Webhook**.

3. **Fill in the alert method:**
   * **Project** — the Nobl9 project the alert method belongs to. It can only be attached to alert policies in this project. *Required*
   * **Name** — something your team will recognise, for example `spike`. *Required*
   * **Display name** and **Description** — optional
   * **URL** — the webhook URL from Step 1. It must start with `https://`. *Required*

4. **Under Notification details, select Custom** and paste the body below exactly as written. Spike reads `alert_id`, `alert_policy_description`, `alert_policy_name`, `alert_policy_conditions_text`, `slo_name`, `service_name`, `anomaly_type` and `no_data_alert_after`; `severity` becomes the badge. Nothing is rejected if a field is missing, but the title and the incident identity come from these, so send all of them. The rest is kept on the incident for responders and alert rules.

```json
{
  "alert_id": "$alert_id",
  "alert_policy_name": "$alert_policy_name",
  "alert_policy_description": "$alert_policy_description",
  "alert_policy_conditions_text": "$alert_policy_conditions_text",
  "severity": "$severity",
  "slo_name": "$slo_name",
  "objective_name": "$objective_name",
  "service_name": "$service_name",
  "project_name": "$project_name",
  "organization": "$organization",
  "slo_details_link": "$slo_details_link",
  "iso_timestamp": "$iso_timestamp",
  "anomaly_type": "$anomaly_type",
  "no_data_alert_after": "$no_data_alert_after"
}
```

5. **Click Add alert method.**

{% hint style="danger" %}
**Do not add a top-level `message` key to the template,** even though Nobl9's own webhook example has one. The body above is the one Spike builds titles from.
{% endhint %}

{% hint style="info" %}
If you would rather select the **Nobl9** option under Notification details and pick fields from Nobl9's predefined list, select the same fields as the keys above. `alert_id` must be among them, or Spike cannot tell one alert from another.
{% endhint %}

## Step 3 — Attach it to your alert policies

An alert method receives nothing until an alert policy uses it.

1. In Nobl9, go to **Alerts** and click the **+** button to open the alert policy wizard, or open an existing policy to edit it.
2. In the wizard's alert methods step, select the webhook alert method you created in Step 2.
3. Click **Create alert policy** (or save your changes to an existing one), then make sure the SLOs you want covered are attached to it.

4. **Attach it to no-data alerts too.** No-data notifications are not sent by alert policies. Edit the SLO. In Step 5 of the SLO wizard, select **No data anomaly alert**, set how long the SLO waits for data before notifying, and select the same webhook alert method.

## Step 4 — Confirm it end to end

Trigger a real alert on a test SLO, for example by attaching the policy to an SLO with a low threshold. An incident opens in Spike with the policy description and SLO as the title, on the service you attached, escalating through your policy. Acknowledge and resolve it in Spike once you have seen it.

## Payload reference

Nobl9 sends the body from Step 2, and Spike keeps the whole thing on the incident, so [alert rules](../alerts/alert-rules.md) and the [Title Remapper](../alerts/title-remapper.md) can read every field as `data.body.<field>`.

A burn-rate alert, which opens the incident:

```json
{
  "alert_id": "8f3b1c52-6d4e-4a7b-9c21-5e0f7a9d3b64",
  "alert_policy_name": "fast-burn",
  "alert_policy_description": "Checkout API is burning its error budget more than 5x faster than allowed",
  "alert_policy_conditions_text": "Average burn rate is ≥ 5 and this condition lasts for 5 minutes",
  "severity": "High",
  "slo_name": "checkout-api-availability",
  "objective_name": "ok",
  "service_name": "checkout",
  "project_name": "payments",
  "organization": "acme-prod",
  "slo_details_link": "https://app.nobl9.com/slo/details?project=payments&name=checkout-api-availability",
  "iso_timestamp": "2026-10-13T03:12:45Z",
  "anomaly_type": "",
  "no_data_alert_after": ""
}
```

```
Checkout API is burning its error budget more than 5x faster than allowed (checkout-api-availability in checkout)
```

The values above are illustrative; only the field names come from Nobl9's template variables.

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

The notification carried none of the fields Spike builds a title from. Open the incident and look at the payload: if the values are literal `$alert_policy_name` style text, the template was saved with a variable misspelled. Compare it with the one in Step 2.

</details>

<details>

<summary>The same alert pages more than once</summary>

Open two of the incidents and compare `alert_id` in their payloads. If it is missing or empty, Spike can only match on the title, which is the same for the same policy and SLO. Check that `"alert_id": "$alert_id"` is in the template.

</details>

<details>

<summary>Incidents never resolve</summary>

Expected. Nobl9 sends no recovery notification. Resolve the incident in Spike or use a [resolve timer](../incidents/resolve-timer.md).

</details>

<details>

<summary>The severity badge is missing or wrong</summary>

Open the incident and check the `severity` value in the payload. If it is empty or a literal `$severity`, fix the template. If it holds something other than `High`, `Medium` or `Low`, an [alert rule](../alerts/alert-rules.md) on `severity` can set the badge you want.

</details>

Disclaimer: These integration instructions are offered independently by Spike.sh, and Spike.sh is not affiliated with nor a partner of Nobl9, Inc.
