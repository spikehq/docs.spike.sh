---
description: >-
  Send Monte Carlo data observability alerts to Spike so your data on-call rotation is paged by phone, SMS, Slack or Teams, and incidents resolve themselves when the alert is fixed.
---

# Integrate Spike with Monte Carlo

[Monte Carlo](https://www.montecarlodata.com) watches your warehouse for freshness, volume and schema anomalies and for custom rule breaches. Its Webhook notification channel posts a JSON payload when an alert opens and again every time somebody works on that alert, so Spike can page the data on-call rotation on the first anomaly and close the incident when the alert is marked fixed in Monte Carlo.

Nothing is installed anywhere. You create an audience in Monte Carlo, point its Webhook channel at a Spike integration URL, and the two stay in sync from there.

## What Spike does with each webhook

| Webhook | What happens in Spike |
| --- | --- |
| `type: open_anomaly_incident` | Opens an incident for that alert and pages the escalation policy |
| `type: open_custom_rule_anomaly_incident` | Opens an incident for the rule breach and pages the escalation policy |
| Alert status set to `fixed`, `expected`, `no_action_needed` or `false_positive` | Auto-resolves the open incident. Dropped when nothing is open |
| Alert acknowledged, or status set to `investigating`, `work_in_progress` or `no_status` | Added as an event on the open incident. Escalation continues |
| Owner changed, alert marked or unmarked as an incident, external ticket attached | Added as an event on the open incident. They never page anyone |

Spike identifies the incident by `payload.incident_id`, the same id Monte Carlo puts in the alert URL. Every update for that alert lands on the one incident, so an alert that is acknowledged, reassigned, escalated to SEV-1 and finally resolved pages your team once.

{% hint style="info" %}
Resolving the incident in Spike does not change the alert in Monte Carlo, and an update that arrives once the incident is closed has nothing left to attach to and is dropped. Set the alert status in Monte Carlo and let it resolve the incident in Spike to keep the two sides in step.
{% endhint %}

## Incident titles

Titles come from the alert itself, so they stay readable when Spike reads them out on a phone call:

* Anomaly: `Has 42 rows vs. 101 expected on artemis`, built from `event_list[0].event_details` and `event_list[0].table_name`
* Custom rule breach: the rule description, for example `Orders row count must stay above 49`

The alert URL, the group id, the table and the rule comparisons stay in the payload and show up on the incident page. Use a [Title Remapper](../alerts/title-remapper.md) if you would rather see the warehouse or the domain in the title:

```handlebars
{{payload.event_list.0.table_name}} — {{payload.event_list.0.event_details}}
```

## Severity

Monte Carlo only sends `declared_alert_severity` once somebody marks the alert as an incident, so most alerts open with no severity and pick one up later:

| `declared_alert_severity` | Severity in Spike |
| --- | --- |
| `SEV-1` | SEV1 |
| `SEV-2` | SEV2 |
| `SEV-3` | SEV3 |
| `SEV-4` | SEV3 |
| `null` or absent | Left unset |

Spike has three severities and Monte Carlo has four, which is why `SEV-4` lands on SEV3. Read more about [priority and severity](../incidents/priority-and-severity.md).

{% hint style="info" %}
[Alert rules](../alerts/alert-rules.md) can override the severity, route the incident to another escalation policy, or suppress it entirely. That is the place to send freshness alerts on a staging dataset somewhere quieter than the pager.
{% endhint %}

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Monte Carlo**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Create the audience in Monte Carlo

{% tabs %}
{% tab title="Setup on Monte Carlo" %}
1. **Open notification settings:**
   Go to [**Settings → Notifications**](https://getmontecarlo.com/settings/notifications) in Monte Carlo.

2. **Create the audience:**
   Click **Create audience** and select **Webhook** from the **Channel** drop down.

3. **Point it at Spike:**
   Paste the webhook URL from Step 1 into the **URL** field. Leave **Secret** blank, see the note below.

4. **Choose what the audience covers:**
   Pick the alert types, domains, tables or monitors this audience should notify on. An audience scoped to your production domain keeps development noise out of the pager, and you can create a second audience for a second Spike integration when different teams own different domains.

5. **Save and test:**
   Save the audience, then use **Send test notification** if the channel offers it. Otherwise wait for the next real alert, or trigger a custom rule against a test table. The incident shows up in Spike within a few seconds.
{% endtab %}
{% endtabs %}

{% hint style="warning" %}
Monte Carlo sends webhooks from a fixed set of public IP addresses listed on your **Account information** page. If egress to `hooks.spike.sh` runs through a proxy you control, nothing needs allowlisting on the Spike side.
{% endhint %}

## Which events to send

The Webhook channel has no per-event switch. Once an audience notifies on an alert, Monte Carlo sends the alert creation and every later update for it: acknowledgement, status change, owner change, external ticket attached, marked or unmarked as an incident, and resolution. Spike pages on the creation, resolves on the resolving statuses, and records the rest on the incident, so there is nothing to turn off.

The audience filters are therefore the only knob that matters. Scope the audience to the alerts a human should be woken up for.

## The webhook secret

Monte Carlo can sign the body with a secret and send the result in an `x-mcd-signature` header. Spike does not verify that header today, so leave **Secret** blank. Your webhook URL carries a token that only your integration has, which is the same model every other Spike integration uses. If the URL leaks, archive the integration and create a new one.

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

## Payload reference

Monte Carlo sends `application/json` over POST, version `v0.1`. An anomaly alert opens with:

```json
{
  "account": { "id": "9a59c6f1-203a-4c72-8cd7-132db7f21b92" },
  "action": "incident",
  "type": "open_anomaly_incident",
  "version": "v0.1",
  "payload": {
    "incident_id": "f83867b6-8f25-428b-807c-08518f63384c",
    "group_id": "zeus:ares",
    "url": "https://getmontecarlo.com/incidents/f83867b6-8f25-428b-807c-08518f63384c",
    "event_list": [
      { "event_details": "Has 42 rows vs. 101 expected", "table_name": "artemis" }
    ]
  }
}
```

A custom rule breach carries `type: open_custom_rule_anomaly_incident` and a `rule` object instead of the table level details:

```json
{
  "account": { "id": "9a59c6f1-203a-4c72-8cd7-132db7f21b92" },
  "action": "incident",
  "type": "open_custom_rule_anomaly_incident",
  "version": "v0.1",
  "payload": {
    "incident_id": "f83867b6-8f25-428b-807c-08518f63384c",
    "url": "https://getmontecarlo.com/incidents/f83867b6-8f25-428b-807c-08518f63384c",
    "event_list": [
      {
        "data": {
          "metric_display_name": "custom_metric_1234",
          "rule_comparisons": [
            { "metric": "custom_metric_1234", "operator": ">", "threshold": "49.0" }
          ],
          "hits": [{ "measurement_timestamp": "Jan 15, 06:10PM", "value": "50.0" }]
        }
      }
    ],
    "rule": {
      "uuid": "0c8e06aa-a44b-4f2d-8a37-5ed3f394431d",
      "description": "Orders row count must stay above 49",
      "rule_type": "custom_sql",
      "comparisons": [
        { "metric": "custom_metric_1234", "operator": "GT", "threshold": 49.0 }
      ]
    }
  }
}
```

An update repeats `incident_id` and adds the fields that changed:

| Field | Values | Sent when |
| --- | --- | --- |
| `alert_feedback` | `investigating` | The alert is acknowledged, or its status is set to investigating |
| `alert_feedback` | `work_in_progress`, `no_status` | The status is updated and the alert stays open |
| `alert_feedback` | `fixed`, `expected`, `no_action_needed`, `false_positive` | The alert is resolved. Spike resolves the incident |
| `declared_alert_severity` | `SEV-1`, `SEV-2`, `SEV-3`, `SEV-4` | The alert is marked as an incident |
| `declared_alert_severity` | `null` | The alert is unmarked as an incident |
| `owner` | An email address | The alert owner changes |

{% hint style="info" %}
Monte Carlo documents these update fields in a table rather than as a sample payload. Spike reads them whether they arrive at the top level or inside `payload`, so an update resolves the right incident either way.
{% endhint %}

## Troubleshooting

<details>

<summary>No incidents show up in Spike</summary>

Check that the audience is enabled and that its filters actually match an alert that fired. An audience scoped to a domain or a set of tables only notifies on alerts for those assets, and a Monte Carlo alert that nobody is notified about never reaches the Webhook channel at all. Confirm the URL in the channel is the full `https://hooks.spike.sh/<your-token>/push-events`, with no trailing characters.

</details>

<details>

<summary>Incidents open but never resolve</summary>

Spike resolves on `fixed`, `expected`, `no_action_needed` and `false_positive`. Setting an alert to `investigating` or `work_in_progress` keeps the incident open on purpose, so the escalation stays alive while somebody digs into the anomaly. If your team resolves alerts in the Monte Carlo UI but incidents stay open in Spike, check that the same audience is still attached to the alert, since the resolution follows the same channel as the creation.

</details>

<details>

<summary>One alert opened several incidents</summary>

Spike groups on `payload.incident_id`. Two incidents for what looks like the same problem usually means Monte Carlo opened two alerts, for example a freshness alert and a volume alert on the same table, each carrying its own id. That is one incident per alert by design. Repeats of the same alert are [grouped](../incidents/grouping-incidents.md) under the incident already open.

</details>

<details>

<summary>Titles read as the rule id instead of a description</summary>

Custom rules with no description fall back to what the payload has. Give the rule a description in Monte Carlo, or write a [Title Remapper](../alerts/title-remapper.md) that builds the title from `payload.rule.comparisons`.

</details>

<details>

<summary>Severity never gets set</summary>

Monte Carlo only sends `declared_alert_severity` when somebody marks the alert as an incident, which is usually after Spike has already paged. Set severity from [alert rules](../alerts/alert-rules.md) if you want it on the incident from the first page.

</details>
