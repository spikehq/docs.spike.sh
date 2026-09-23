---
description: >-
  The eight lookups the Terraform provider offers for referencing teams, users
  and existing Spike records by id, whether Terraform manages them or you
  created them in the dashboard.
---

# Data sources

A data source looks up a record that already exists and reads it, without creating or changing anything. Use one to reference a team, a user, or a record you manage in the dashboard, so you can pass its id to a resource.

You reference a data source's result as `data.<type>.<name>.<attribute>`, for example `data.spike_team.payments.id`. Looking a record up this way, rather than pasting an id, keeps your configuration readable and survives a record being recreated.

The full attribute reference for every data source is on the [Terraform Registry](https://registry.terraform.io/providers/spikehq/spike/latest/docs). This page covers what each one is for.

## spike\_team

Looks up a team by `name`, `uid` or `id`, and returns its id along with its description, default and private flags, and member ids. Most configurations start here, because `team_id` arguments take a team's 24-character id and this is how you get it without pasting.

```terraform
data "spike_team" "payments" {
  name = "Payments"
}
```

A team's `uid` (the short slug in dashboard URLs) is not an id and is not accepted by `team_id`. Prefer `id` for lasting references.

[Full reference](https://registry.terraform.io/providers/spikehq/spike/latest/docs/data-sources/team)

## spike\_user

Looks up a user by `email` or `id`, and returns their id, name, role, team ids and time zone. Use it to page a person from an escalation policy or to reassign incidents from an alert routing rule.

```terraform
data "spike_user" "ada" {
  email = "ada@example.com"
}
```

`email` is matched in full but ignores case. The user must be an active member of the organisation.

[Full reference](https://registry.terraform.io/providers/spikehq/spike/latest/docs/data-sources/user)

## spike\_service

Looks up a service by `id`, by `name` within a team, or by `counter_id` within a team. Use it to reference a service you created in the dashboard from an integration or an alert routing rule.

```terraform
data "spike_service" "checkout" {
  name    = "Checkout API"
  team_id = data.spike_team.payments.id
}
```

Spike allows duplicate names, so a lookup by `name` fails when more than one service in the team matches. Look up by `id` when that happens.

[Full reference](https://registry.terraform.io/providers/spikehq/spike/latest/docs/data-sources/service)

## spike\_escalation\_policy

Looks up an escalation policy by `id` or by `name` within a team, and returns its id, delay and description. Use it to point an integration or an alert routing rule at a policy you manage in the dashboard.

```terraform
data "spike_escalation_policy" "checkout_night" {
  name    = "Checkout night shift"
  team_id = data.spike_team.payments.id
}
```

[Full reference](https://registry.terraform.io/providers/spikehq/spike/latest/docs/data-sources/escalation_policy)

## spike\_integration

Looks up an integration by `id` or by `name` within a team, and returns its settings along with its sensitive `token`, `webhook_url` and (for the email type) `email_address`.

```terraform
data "spike_integration" "checkout_datadog" {
  name    = "Checkout - Datadog monitors"
  team_id = data.spike_team.payments.id
}
```

The `id` this returns is not the token. Alert routing rules match on integration ids, so this is how you scope a rule to an integration you created in the dashboard.

[Full reference](https://registry.terraform.io/providers/spikehq/spike/latest/docs/data-sources/integration)

## spike\_integration\_types

Lists every integration type Spike supports, sorted by slug, each with its `slug`, display `name`, description and setup-guide URL. Use it to find the `slug` value that `spike_integration` needs.

```terraform
data "spike_integration_types" "all" {}

output "integration_slugs" {
  value = [for type in data.spike_integration_types.all.types : type.slug]
}
```

[Full reference](https://registry.terraform.io/providers/spikehq/spike/latest/docs/data-sources/integration_types)

## spike\_outbound\_webhook

Looks up an outbound webhook by `id` or by `name` within a team, and returns its url, method, content type and headers. Use it to call, from an alert routing rule, a webhook you created in the dashboard. An alert routing rule can only call a webhook of its own team.

```terraform
data "spike_outbound_webhook" "incident_relay" {
  name    = "Incident relay"
  team_id = data.spike_team.payments.id
}
```

[Full reference](https://registry.terraform.io/providers/spikehq/spike/latest/docs/data-sources/outbound_webhook)

## spike\_oncall\_schedule

Looks up an on-call schedule by `id` or by `name` within a team, and returns its id, teams and time zone. This is the way to reference a schedule from an escalation policy target while you manage the schedule itself in the dashboard.

```terraform
data "spike_oncall_schedule" "payments_primary" {
  name    = "Payments primary"
  team_id = data.spike_team.payments.id
}
```

{% hint style="info" %}
The data source works against every Spike deployment. The [`spike_oncall_schedule` resource](resources.md#spike-oncall-schedule) needs two newer API routes, so until those are available this data source is the way to bring a schedule into your configuration.
{% endhint %}

[Full reference](https://registry.terraform.io/providers/spikehq/spike/latest/docs/data-sources/oncall_schedule)
