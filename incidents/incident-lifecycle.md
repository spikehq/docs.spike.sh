---
description: The incident lifecycle covers the stages an incident moves through, from the moment it's triggered to when it's resolved.
---

# Incident lifecycle

Every incident on Spike moves through a defined set of stages. Understanding this flow helps you configure escalation policies, acknowledge timeouts, and alert channels to match how your team actually responds.

<figure><img src="../.gitbook/assets/Incident lifecycle.png" alt="Incident lifecycle on Spike"><figcaption><p>The stages of an incident on Spike.</p></figcaption></figure>

## 1. Incident creation

An incident is created when a connected integration sends a webhook to Spike. Before creating a new incident, Spike checks whether an open incident already exists for that integration.

- If one exists, Spike logs the new event under the existing incident instead of creating a duplicate.
- If no open incident exists, Spike creates a new one and starts the escalation process.

{% hint style="info" %}
Only open incidents (triggered or acknowledged) are checked for duplicates. Resolved incidents are ignored.
{% endhint %}

## 2. Incident escalation

Once an incident is created, Spike works through the [escalation policy](../escalations/introduction-to-escalations.md) attached to that integration. Alerts go out to the first set of responders in the policy. Spike waits for the duration configured in the escalation policy. If no one acknowledges or resolves the incident in that time, Spike moves to the next level and alerts the next set of responders.

Each integration can have its own escalation policy. This lets you set different alert priorities across services.

## 3. Incident acknowledgment

When a responder acknowledges the incident, Spike pauses the escalation policy and stops escalating alerts. You can set an [acknowledge timeout](acknowledge-timeout.md) for each integration: a time limit that moves the incident back to triggered and resumes alerting if it hasn't been resolved in time. You can also manually move an acknowledged incident back to triggered at any time.

## 4. Incident resolution

Once the issue is fixed, mark the incident as resolved. Spike stops all alerts and resets the escalation policy. If a new incident comes in for the same integration, the process starts again from the beginning.

See [incident statuses](incident-statuses.md) for a full reference on each status.
