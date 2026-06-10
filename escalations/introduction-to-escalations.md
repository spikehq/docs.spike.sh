---
description: Escalation policies define who gets alerted and when, so incidents don't go unacknowledged.
---

# Escalation policies

An escalation policy defines who gets alerted, through which channel, and in what order. When an incident triggers, Spike follows the policy until someone acknowledges or resolves it.

<figure><img src="../.gitbook/assets/escalations-list (2).png" alt="Escalation policies list in Spike"><figcaption><p>Escalation policies in Spike.</p></figcaption></figure>

## How escalation policies work

Each policy has one or more levels. After Spike sends alerts at the first level, it waits for a configured timeout before moving to the next. If no one acknowledges within that window, the incident escalates to the next level automatically.

You can alert multiple people at the same level, across different channels or the same one. You can configure the timeout between levels and create as many levels as you need.

<figure><img src="../.gitbook/assets/Screenshot 2020-06-24 at 10.48.37 AM.png" alt="Escalation policy with two levels in Spike"><figcaption><p>An escalation policy with two levels and a 5-minute timeout.</p></figcaption></figure>

{% hint style="info" %}
Escalations don't repeat automatically. Configure repeat escalations in your integration settings. [Learn more](repeat-escalations.md)
{% endhint %}

{% hint style="info" %}
You can create unlimited escalation policies with multiple levels.
{% endhint %}
