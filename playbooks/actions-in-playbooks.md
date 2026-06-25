---
description: All actions available in Spike Playbooks, with examples of how to use them.
---

# Actions in Playbooks

Each Playbook can include one or more of the following actions. Actions run in the order you define.

## Actions

- **Add responder** — Add one or more team members to the incident.
- **Mark priority as** — Set the incident priority from P1 to P5.
- **Mark severity as** — Set the incident severity from SEV1 to SEV3.
- **Trigger outbound webhook** — Send the incident payload to an external endpoint to trigger scripts or workflows.
- **Use Title remapper** — Rewrite the incident title using a predefined template.
- **Execute playbook** — Trigger another Playbook as part of this one.
- **Create a War room** — Start a video conference on Google Meet or Zoom for team collaboration.
- **Create a task on** — Log the incident as a task in Jira, Linear, or ClickUp.
- **Create a support ticket on** — Open a ticket in Zendesk, Freshdesk, or Supportpal.
- **Resolve incident** — Mark the incident as resolved.
- **Acknowledge incident** — Mark the incident as acknowledged.
- **Add links** — Attach static links to the incident, such as runbooks, PRs, or deploy pipelines.
- **Create incident on status page** — Publish the incident to your status page and notify subscribers.
- **Resolve incidents on status page** — Mark the status page incident as resolved.
- **Resolve by timer after** — Automatically resolve the incident after a set duration.

## Examples

### Critical incident response

**Conditions:** Payload contains high severity indicators, or the incident has occurred more than `x` times in the last `y` minutes.

1. Add responder — bring in senior engineers
2. Mark priority as P1
3. Mark severity as SEV1
4. Create a War room — start a Google Meet for immediate discussion
5. Create a task on Jira — log the incident for tracking

### Low severity auto-resolution

**Conditions:** Payload contains low severity indicators.

1. Mark severity as SEV3
2. Mark priority as P5
3. Resolve incident

### Status page update

1. Create incident on status page — notify subscribers
2. Resolve incidents on status page — update subscribers on resolution

### Payment system glitch

1. Resolve incident
2. Create a support ticket on Zendesk — document the issue for customer outreach

### Auto-resolve with external trigger

1. Trigger outbound webhook — run custom analysis or alert external systems
2. Resolve incident
