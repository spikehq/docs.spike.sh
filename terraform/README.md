---
description: >-
  Manage your Spike configuration as code with the official Terraform provider:
  escalation policies, services, integrations, alert routing rules, outbound
  webhooks and on-call schedules.
---

# Terraform provider

The Spike Terraform provider lets you keep your incident-management setup in version control and apply it with Terraform. You describe your escalation policies, services, integrations, alert routing rules, outbound webhooks and on-call schedules in configuration files, and Terraform creates and updates them for you through the Spike API.

It is published on the Terraform Registry as [`spikehq/spike`](https://registry.terraform.io/providers/spikehq/spike/latest). The registry page holds the full reference for every resource and data source; this section covers what the provider is, how to install it, and how it maps to Spike.

{% hint style="info" %}
The provider authenticates with an organisation API key. Every resource belongs to one team. Resources that do not set their own `team_id` use the team you configure on the provider.
{% endhint %}

## What you can manage

The provider has two kinds of building blocks.

**Resources** are the things Terraform creates and owns:

* `spike_service`
* `spike_escalation_policy`
* `spike_integration`
* `spike_alert_routing_rule`
* `spike_outbound_webhook`
* `spike_oncall_schedule`

**Data sources** look up records that already exist so you can reference them by id, whether Terraform manages them or you created them in the dashboard:

* `spike_team`
* `spike_user`
* `spike_service`
* `spike_escalation_policy`
* `spike_integration`
* `spike_integration_types`
* `spike_outbound_webhook`
* `spike_oncall_schedule`

See [Resources](resources.md) and [Data sources](data-sources.md) for what each one does.

## Requirements

* Terraform 1.0 or later, or OpenTofu.
* A Spike organisation API key. Create one under **Settings → API** in the [Spike dashboard](https://app.spike.sh).

## Install

Add the provider to your configuration's `required_providers` block and run `terraform init`. Terraform downloads it from the registry.

```terraform
terraform {
  required_providers {
    spike = {
      source  = "spikehq/spike"
      version = "~> 0.1"
    }
  }
}
```

## Authenticate

The provider needs an API key and, unless your organisation has a single team, the team that resources belong to by default. Pass the key through the `SPIKE_API_KEY` environment variable rather than writing it into a file that goes into version control.

```terraform
provider "spike" {
  # Reads SPIKE_API_KEY from the environment. You can set api_key here instead,
  # but keep the key out of configuration you commit.

  # The team that resources without their own team_id belong to. Use the team's
  # 24-character id, not its short uid. You can also set SPIKE_TEAM_ID.
  team_id = "64f1c2a9e4b0a1b2c3d4e5f6"
}
```

Export the key before you run Terraform:

```bash
export SPIKE_API_KEY="your-api-key"
```

To find a team's id without pasting it, look it up by name with the `spike_team` data source and reference `data.spike_team.<name>.id`.

{% hint style="info" %}
When your organisation has one team, `team_id` is optional: the provider uses that team. When you have several teams and one is marked default, the provider uses the default. When you have several teams and none is default, every resource must set `team_id`.
{% endhint %}

The provider reads these settings, each with an environment-variable fallback:

| Setting | Environment variable | Default |
| --- | --- | --- |
| `api_key` | `SPIKE_API_KEY` | none, required |
| `team_id` | `SPIKE_TEAM_ID` | the single or default team |
| `base_url` | `SPIKE_API_URL` | `https://api.spike.sh` |
| `hooks_url` | `SPIKE_HOOKS_URL` | `https://hooks.spike.sh` |

You only change `base_url` and `hooks_url` to point at a different Spike environment, and you change them together.

## Your first apply

This configuration creates a service, an escalation policy that pages a user, and a Datadog integration that ties them together. Look up the user by email with a data source, and reference the service and policy from the integration so Terraform creates them in the right order.

```terraform
data "spike_user" "ada" {
  email = "ada@example.com"
}

resource "spike_service" "checkout" {
  name        = "Checkout API"
  description = "Card authorisation and capture."
}

resource "spike_escalation_policy" "checkout" {
  name = "Checkout primary"

  steps = [
    {
      escalate_after_minutes = 5
      targets                = [{ via = "phone", user_id = data.spike_user.ada.id }]
    },
  ]
}

resource "spike_integration" "checkout_datadog" {
  slug                 = "datadog" # see the spike_integration_types data source
  name                 = "Checkout - Datadog monitors"
  service_id           = spike_service.checkout.id
  escalation_policy_id = spike_escalation_policy.checkout.id
}

# The URL to paste into Datadog. It embeds a secret token, so it is sensitive.
output "checkout_webhook_url" {
  value     = spike_integration.checkout_datadog.webhook_url
  sensitive = true
}
```

Run it:

```bash
terraform init
terraform plan
terraform apply
```

Read the secret webhook URL back with `terraform output -raw checkout_webhook_url` and paste it into Datadog.

## Destroying archives, it does not delete

Spike never hard-deletes configuration. When Terraform destroys a resource, the provider archives it, and the Spike API cannot undo an archive. Restore an archived record from the Spike dashboard.

Because a destroy is a soft archive, a few things follow that are worth knowing before your first `terraform destroy`:

* Archiving a record still emails the people concerned, the same as archiving it in the dashboard. Each resource page says who is emailed.
* Some records refuse to archive while others still point at them. An escalation policy will not archive while integrations or rules route to it, and an integration left pointing at an archived service rejects every event. Reference ids between resources (for example `spike_service.checkout.id`) so Terraform orders creates and destroys correctly.
* Archiving an `spike_oncall_schedule` hard-deletes its rotation layers, so that destroy is final.

## Where to go next

* [Resources](resources.md): the six records Terraform creates and owns.
* [Data sources](data-sources.md): the eight lookups for referencing existing records.
* [`spikehq/spike` on the Terraform Registry](https://registry.terraform.io/providers/spikehq/spike/latest/docs): the full argument-by-argument reference, generated from the provider.

Still stuck? Email [support@spike.sh](mailto:support@spike.sh).
