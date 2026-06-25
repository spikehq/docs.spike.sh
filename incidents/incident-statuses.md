---
description: Every incident on Spike has one of three statuses: triggered, acknowledged, or resolved. The status determines what Spike does next.
---

# Incident statuses

Every incident on Spike moves through three statuses: triggered, acknowledged, and resolved. The current status determines whether Spike is actively alerting, paused while someone works on a fix, or closed.

## Triggered

An incident enters the triggered state the moment it's triggered. This means no one has looked at it yet and the problem is unresolved.

In this state, Spike works through the [escalation policy](../escalations/introduction-to-escalations.md) attached to the integration and sends alerts to the designated responders. Alerts continue until someone acknowledges or resolves the incident. Repeat incidents from the same integration are suppressed and logged rather than creating new ones.

## Acknowledged

An acknowledged incident means someone is actively working on a fix. Spike pauses the escalation policy and stops escalating alerts.

Repeat incidents remain suppressed in this state to reduce [alert fatigue](../alerts/personal-alerts-management/README.md). You can set an [acknowledge timeout](acknowledge-timeout.md) for each integration. If the incident isn't resolved within that window, Spike moves it back to triggered and resumes alerting. You can also manually move an acknowledged incident back to triggered at any time.

## Resolved

A resolved incident means the issue is fixed. Spike stops all alerts and resets the escalation policy.

If the same integration triggers a new incident after resolution, Spike treats it as a fresh incident and starts the process from the beginning. See [incident lifecycle](incident-lifecycle.md) for the full flow.
