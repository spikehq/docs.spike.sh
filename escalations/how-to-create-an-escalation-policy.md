---
description: Create an escalation policy to define who gets alerted and when during an incident.
---

# How to create an escalation policy

{% stepper %}
{% step %}
### Go to Escalations

Navigate to the [Escalations section](https://app.spike.sh/escalations) on the dashboard and click **New escalation**.

<figure><img src="../.gitbook/assets/howto-1.png" alt="Escalations section on the Spike dashboard"><figcaption><p>Select Escalations from the sidebar.</p></figcaption></figure>
{% endstep %}
{% step %}
### Configure the policy

1. Give the policy a clear, identifiable name.
2. Add one or more escalation levels.
3. Set a timeout for each level. This is how long Spike waits before escalating to the next level if the incident isn't acknowledged or resolved.

<figure><img src="../.gitbook/assets/howto-2 (1).png" alt="An example escalation policy in Spike"><figcaption><p>An example escalation policy with two levels.</p></figcaption></figure>

{% hint style="info" %}
Leave the time interval blank on the last escalation step.
{% endhint %}
{% endstep %}
{% step %}
### Save

Click **Save** to activate the policy.
{% endstep %}
{% endstepper %}

## Simultaneous alerts

To alert multiple people or channels at the same time, add them as separate alerts within the same escalation level. Avoid creating a new escalation level with a 0-minute interval. This is not the same as simultaneous alerting.

<figure><img src="../.gitbook/assets/simultaneous-alerts-wrong.png" alt="Incorrect: separate escalation level with 0-minute interval"><figcaption><p>Incorrect: a separate level with 0-minute interval.</p></figcaption></figure>

<figure><img src="../.gitbook/assets/simultaneous-alerts-right.png" alt="Correct: multiple alerts within the same escalation level"><figcaption><p>Correct: multiple alerts within one escalation level.</p></figcaption></figure>
