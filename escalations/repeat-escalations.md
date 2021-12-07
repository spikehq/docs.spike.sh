---
description: >-
  Alerts can be missed sometimes. This is the reason you can set your
  escalations to repeat itself for every integration
---

# Repeat escalations

### Basics of repeating escalation policies

Repeat your escalation policy a.k.a keep alerts going from the top if none of the members invovled in the policy take any action for an incident. &#x20;

Let's take a simple example. Consider the below policy.&#x20;

When a new incident is created -&#x20;

**Step 1:** Alert on #incidents Slack channel

**Step 2:** Email Jay Ramirez

**Step 3:** Phone call to Jay Ramirez&#x20;

![Example escalation policy](<../.gitbook/assets/image (48).png>)

In this case, if noone on the Slack channel takes an action and Jay also misses out on it, then the alerts will continue from **Step 1 after a default interval of 10 minutes.**&#x20;

This is handy as some incidents can just not be ignored.

{% hint style="info" %}
By default, escalation policy will only be repeated 5 times.
{% endhint %}

### How to setup repeating escalations?

At Spike.sh, you can choose to configure repeating escalations on an integration basis and not on a central level. We designed this so you can choose exactly which integrations are critical to never miss an alert.

To setup, you can configure this while adding or editing an integration. Select **Repeat escalation checkbox** and save / update integration.

![Configure repeat escalations for any integration](<../.gitbook/assets/image (49).png>)

&#x20;

### What actions would stop from repeating escalations?

If you **acknowledge or resolve** an incident then escalations will stop repeating itself and alerts will stop automatically.&#x20;

{% content-ref url="../incidents/how-to-change-incident-status.md" %}
[how-to-change-incident-status.md](../incidents/how-to-change-incident-status.md)
{% endcontent-ref %}

### If no action is taken, wouldn't the escalations repeat continuously?

This is a valid problem. For this reason, by default, **we repeat escalations 5 times**. After which, no alerts will be sent.

