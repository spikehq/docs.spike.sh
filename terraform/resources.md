---
description: >-
  The six Spike records the Terraform provider creates and owns: services,
  escalation policies, integrations, alert routing rules, outbound webhooks and
  on-call schedules.
---

# Resources

A resource is a record Terraform creates, updates and owns. Each one belongs to a team: set `team_id` to the team's 24-character id, or omit it to use the provider's default team.

{% hint style="warning" %}
Destroying any of these archives it rather than deleting it, and the Spike API cannot undo an archive. Restore from the Spike dashboard. See [Destroying archives, it does not delete](README.md#destroying-archives-it-does-not-delete).
{% endhint %}

The full argument reference for every resource lives on the [Terraform Registry](https://registry.terraform.io/providers/spikehq/spike/latest/docs). This page is a tour of what each resource is for and how the pieces fit together.

## How the pieces fit

A typical setup connects four resources:

1. A **service** names a part of your system that incidents are attributed to.
2. An **escalation policy** decides who gets paged, how, and in what order.
3. An **integration** is where a monitoring tool sends alerts. It names one service and one escalation policy.
4. An **alert routing rule** changes incidents as they arrive, for example raising priority or routing after hours.

Reference ids between resources rather than pasting them. Terraform then creates records in the right order and destroys them in reverse.

## spike\_service

A service is a part of your system that incidents are attributed to, such as `Checkout API`. A service has no routing of its own. Routing is configured on the integration that names the service.

Key arguments:

* `name` (required): shown on incidents and in notifications.
* `description`, `team_id` (optional).

```terraform
resource "spike_service" "checkout" {
  name        = "Checkout API"
  description = "Card authorisation and capture for web and mobile checkout."
}
```

Changing `team_id` replaces the service. Because an integration left pointing at an archived service drops every event, add `lifecycle { create_before_destroy = true }` when you expect the team to change.

[Full reference](https://registry.terraform.io/providers/spikehq/spike/latest/docs/resources/service)

## spike\_escalation\_policy

An escalation policy decides who Spike pages for an incident, how, and in which order. Each step pages all of its targets at once. If nobody acknowledges, the next step fires after `escalate_after_minutes`. Integrations and alert routing rules point incidents at a policy by its id.

Key arguments:

* `name` (required).
* `steps` (required): an ordered list. Each step has `targets` and an optional `escalate_after_minutes`.
* Each target sets `via` (`phone`, `sms`, `email`, `whatsapp`, `telegram`, `push-notification`, `slack`, `msteams` or `discord`) and the field that goes with it, such as `user_id`, `oncall_schedule_id`, `channel_id` or `webhook_url`.
* `delay_minutes`, `description`, `archive_replacement_policy_id`, `team_id` (optional).

```terraform
resource "spike_escalation_policy" "checkout" {
  name = "Checkout primary"

  steps = [
    {
      escalate_after_minutes = 5
      targets = [
        { via = "push-notification", oncall_schedule_id = data.spike_oncall_schedule.payments_primary.id },
        { via = "slack", channel_id = "C0123ABCD", channel_name = "#checkout-alerts", mention = "here" },
      ]
    },
    {
      targets = [{ via = "phone", user_id = data.spike_user.ada.id }]
    },
  ]
}
```

{% hint style="info" %}
Set `escalate_after_minutes` to at least `1` on every step but the last. The Spike dashboard will not save a policy where an earlier step omits it or sets `0`, and Terraform then reports that as drift.
{% endhint %}

To let Terraform archive a policy that integrations or rules still use, set `archive_replacement_policy_id` to an active policy of the same team. Spike moves everything to that policy before archiving this one.

[Full reference](https://registry.terraform.io/providers/spikehq/spike/latest/docs/resources/escalation_policy)

## spike\_integration

An integration is where alerts enter Spike. A monitoring tool sends events to the integration's `webhook_url` (or, for the `email` type, to `email_address`), and Spike turns them into incidents on the integration's service, paged through its escalation policy.

Key arguments:

* `slug` (required): the integration type, such as `webhook`, `email`, `datadog` or `prometheus`. List the types with the `spike_integration_types` data source.
* `service_id` (required) and `escalation_policy_id` (required).
* `name`, `description`, `ack_timeout_minutes`, `repeat_escalation`, `auto_resolve`, `disable_incident_suppression`, `enabled`, `team_id` (optional).

```terraform
resource "spike_integration" "checkout_datadog" {
  slug                 = "datadog"
  name                 = "Checkout - Datadog monitors"
  service_id           = spike_service.checkout.id
  escalation_policy_id = spike_escalation_policy.checkout.id

  ack_timeout_minutes = 15
  repeat_escalation   = true

  auto_resolve = {
    after = 1
    unit  = "days"
  }
}
```

The `webhook_url`, `email_address` and `token` are read-only and sensitive: they embed a secret token that lets anyone create incidents. Read them back with `terraform output -raw`.

{% hint style="warning" %}
Changing `team_id` replaces the integration, and the replacement gets a new token and webhook URL. Give the monitoring tool the new `webhook_url` when that happens.
{% endhint %}

[Full reference](https://registry.terraform.io/providers/spikehq/spike/latest/docs/resources/integration)

## spike\_alert\_routing\_rule

An alert routing rule (called an *alert rule* in the dashboard) changes incidents as they arrive. When an incident from the integrations it covers matches its `condition_groups`, Spike runs its `actions` in order.

Key arguments:

* `name` (required).
* `condition_groups` (required): the rule matches when any group matches, and a group matches when all of its conditions do.
* `actions` (required): what the rule does, in order, such as set priority or severity, reassign, change the escalation policy, call an outbound webhook, resolve on a timer, or route to another team.
* `integration_ids`, `service_ids`, `description`, `enabled`, `team_id` (optional).

```terraform
resource "spike_alert_routing_rule" "checkout_after_hours" {
  name            = "Checkout failures after hours"
  integration_ids = [spike_integration.checkout_datadog.id]

  condition_groups = [
    {
      conditions = [
        { type = "incidentMessage", comparator = "contains", text = "checkout" },
        { type = "incidentTiming", start = "20:00", end = "08:00", timezone = "Europe/London" },
      ]
    },
  ]

  actions = [
    { type = "priority", priority = "p1" },
    { type = "reassignIncident", user_id = data.spike_user.ada.id },
  ]
}
```

Omit `integration_ids` to cover every integration of the team. `service_ids` narrows the rule further and needs `integration_ids` alongside it.

[Full reference](https://registry.terraform.io/providers/spikehq/spike/latest/docs/resources/alert_routing_rule)

## spike\_outbound\_webhook

An outbound webhook is an HTTP endpoint Spike calls with incident details. It fires only when something triggers it: an alert routing rule or playbook action, a responder in Slack, Teams or the dashboard, or an on-call schedule's shift notifications. Reference its id from those.

Key arguments:

* `name` (required).
* `url` (required, sensitive).
* `method` (`GET` or `POST`, default `GET`), `content_type` (`json` or `url-encoded`, default `json`), `headers`, `description`, `team_id` (optional).

```terraform
resource "spike_outbound_webhook" "incident_relay" {
  name   = "Incident relay"
  url    = "https://automation.example.com/hooks/spike"
  method = "POST"

  headers = {
    Authorization = "Bearer ${var.relay_token}"
  }
}
```

Only a `POST` carries the incident as the request body. `headers` are sent with incident deliveries but not with shift notifications, and Spike stores their values in plain text, so protect your Terraform state.

[Full reference](https://registry.terraform.io/providers/spikehq/spike/latest/docs/resources/outbound_webhook)

## spike\_oncall\_schedule

An on-call schedule is one or more ordered rotation `layers` that decide who is on call at any moment. A later layer overrides an earlier one. Escalation policies page a schedule's current on-call person by referencing its id.

Key arguments:

* `name` (required).
* `layers` (required): each layer has `users` (in rotation order), a `rotation` (`length` and `unit`, with an optional `handoff` and `handoff_day`), and an optional `restriction` that limits it to certain hours.
* `timezone`, `team_id` (optional).

```terraform
resource "spike_oncall_schedule" "payments_primary" {
  name     = "Payments primary"
  timezone = "Europe/London"

  layers = [
    {
      users    = [data.spike_user.ada.id, data.spike_user.ben.id]
      rotation = { length = 1, unit = "weeks", handoff = "09:00", handoff_day = "monday" }
    },
    {
      users    = [data.spike_user.ada.id]
      rotation = { length = 1, unit = "days" }
      restriction = {
        type    = "weekly"
        windows = [{ from_day = "monday", from_time = "09:00", to_day = "friday", to_time = "18:00" }]
      }
    },
  ]
}
```

{% hint style="warning" %}
This resource needs two Spike API routes (`GET /on-calls/:id/config` and `DELETE /on-calls/:id`) that older deployments do not have yet. Against an older Spike API, reads and destroys fail with a clear "unknown route" error. Until the routes are available, reference a schedule you created in the dashboard with the [`spike_oncall_schedule` data source](data-sources.md#spike-oncall-schedule) instead.
{% endhint %}

Editing, adding or removing a layer makes Spike regenerate that layer's shifts, which pages whoever the layer currently has on call. Terraform warns which layers a plan will regenerate. Terraform cannot express rotation gaps or a layer with a fixed start or end date, so manage schedules that rely on those in the dashboard.

[Full reference](https://registry.terraform.io/providers/spikehq/spike/latest/docs/resources/oncall_schedule)

## Importing existing records

Every resource supports `terraform import`, so you can bring records you created in the dashboard under Terraform. Most import by id, which is the 24-character value at the end of the record's dashboard URL:

```bash
terraform import spike_service.checkout 6a1f0c2b9d8e7f6a5b4c3d2e
```

A few accept a `<team_id>/<id>` form or a counter for records in another team. The import syntax for each resource is on its registry page.
