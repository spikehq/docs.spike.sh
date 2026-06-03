---
description: An incident is any issue that needs to be investigated and resolved, often one that affects your customers.
---

# What is an incident?

An incident is any issue that needs to be investigated and resolved. When a connected monitoring tool detects a problem, Spike creates an incident and alerts the right person based on the [escalation policy](../escalations/introduction-to-escalations.md) attached to that integration.

## Examples

Common examples of incidents include:

- CPU or memory utilization crossing a critical threshold
- Database monitoring alerts
- Database backup failures
- Billing process failures
- Notification delivery failures
- Dashboard loading errors
- Website downtime

{% hint style="info" %}
You can also create incidents directly from your code using a [webhook integration](../integrations-guideline/integrating-with-webhooks.md).
{% endhint %}

## Incident statuses

Every incident has one of three statuses. See [incident statuses](incident-statuses.md) for the full breakdown.

### Triggered

A triggered incident means Spike has detected a problem and is actively alerting. Spike works through the escalation policy, sending alerts until someone acknowledges or resolves the incident. Repeat incidents are automatically suppressed to reduce [alert fatigue](../alerts/personal-alerts-management/README.md).

### Acknowledged

An acknowledged incident means someone is working on a fix. Spike stops alerting and pauses the escalation policy. You can optionally set an [acknowledge timeout](acknowledge-timeout.md): a time limit after which Spike moves the incident back to triggered and resumes alerting if it hasn't been resolved.

### Resolved

A resolved incident means the issue is fixed. Spike stops all alerts and resets the escalation policy for any future incidents on that integration.
