---
description: Playbooks automate incident response by running predefined actions manually or based on conditions.
---

# Playbooks

A Playbook is a sequence of response steps Spike runs on an incident. Set one up once, then trigger it manually or configure it to run automatically.

{% hint style="info" %}
Actions run in the exact order you define. Spike does not reorder them.
{% endhint %}

## What Playbooks can do

- Add responders based on severity or incident type
- Set incident priority and severity
- Create war rooms for team collaboration
- Generate tickets in Jira, Linear, or ClickUp
- Create support tickets in Zendesk or Freshdesk
- Trigger external workflows via outbound webhooks

## How Playbooks run

### Manual runs

Run any Playbook from an incident with a single click. Use this when you need to kick off a response sequence on demand.

### Automatic runs

Set conditions on a Playbook and Spike runs it automatically on every incident that matches. Conditions can target severity, integration, or other incident properties.

## Permissions

All team members can create, edit, and delete Playbooks by default. Advanced permission settings are available for teams that need granular control over read, write, and execution rights.

## Example use cases

- **Critical incident response:** Add a response team, assign severity, and create a ticket in one click.
- **Low severity management:** Set the incident to low priority and resolve it automatically.
- **External communication:** Create a status page incident and notify subscribers automatically.
- **Custom integrations:** Trigger scripts or external processes via outbound webhooks.
- **Ticket triage:** Assign incidents to the right responders and set priorities based on keywords.
- **Security breach:** Acknowledge the incident, open a high-priority support ticket, and trigger isolation protocols via webhook.
