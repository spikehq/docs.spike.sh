---
description: Set up Playbooks to run automatically when an incident matches conditions you define.
---

# Automating Playbooks

Automated Playbooks run on every incident that matches the conditions you define. No manual trigger needed.

## Setting up automation

### Step 1: Choose your trigger event

The trigger is an incoming incident.

### Step 2: Select integrations and services

Choose whether the automation applies to all integrations and services or only specific ones.

### Step 3: Define conditions (optional)

- **Incident title** — match by keyword or regex
- **Incident details** — match by payload key/value pairs or regex
- **Incident occurrences** — trigger based on how many times an incident has occurred within a timeframe
- **Priority or severity** — match by P1–P5 or SEV1–SEV3

Combine multiple conditions using AND/OR logic. For example: run the Playbook if the incident is P1 priority OR contains "Down" in its title.

### Step 4: Select incident status condition

**Run on any incident:** Runs for every incident matching your conditions, on any status change — triggered, acknowledged, or resolved.

**Run when all incidents:** Runs when all incidents in a set reach a specific status. Useful for coordinated actions across multiple incidents.

## Example use cases

### When an incident is triggered

1. **Automatic service recovery:** Trigger an outbound webhook to restart servers, run diagnostics, or scale resources.
2. **Keyword detection:** Detect severity from keywords in the incident title, alert teams, and update your status page.
3. **Critical integration incident:** For SEV1 incidents on a specific integration, set priority to P1, launch a War room, and run external scripts via outbound webhook.
4. **Customer-facing outage:** Acknowledge the incident, create a Zendesk ticket, and prepare customer support for communication.
5. **Service self-recovery:** Auto-acknowledge or resolve incidents triggered by service restart attempts.
6. **Performance degradation:** Trigger diagnostics via outbound webhook when performance metrics fall below thresholds.

### When incidents are acknowledged or resolved

1. **Post-incident review:** Trigger an outbound webhook to schedule a review once all incidents are resolved.
2. **System health recheck:** After acknowledging connectivity issues, run an automated health check via outbound webhook.
3. **Customer communication:** Update the status page and send resolution summaries when incidents are resolved.
4. **Resource scaling:** Initiate resource optimization after high-usage incidents are resolved.
5. **Infrastructure restoration:** Automate service restoration and backup checks following database incidents.
