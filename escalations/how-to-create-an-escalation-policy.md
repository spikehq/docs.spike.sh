---
description: Creating an escalation policy on Spike.sh is super simple and intuitive.
---

# How to create an escalation policy?

Here's how to create an escalation policy on Spike.sh.

**Step 1:** Head over the [escalations section](https://app.spike.sh/escalations) on the dashboard and click on new escalation

![Select escalations from sidebar](../.gitbook/assets/howto-1.png)

**Step 2:**

1. Make sure to give a good identifiable name based on the team members in it.
2. Add multiple escalation levels
3. Add a **time to wait** before automatically escalating if incident is open (not acknowledged or resolved)
4. Save

{% hint style="info" %}

{% endhint %}

![An example escalation policy ](<../.gitbook/assets/howto-2 (1).png>)

{% hint style="info" %}
Avoid adding any time interval for the last step where escalation ends.&#x20;
{% endhint %}

## Caveats

### Simultaneous alerts

If you would like to receive simultaneous alerts for either you, your team or Slack, Teams, etc then we highly recommend adding multiple alerts in one escalation step vs creating another step with 0 minutes as interval.&#x20;

![Avoid 0 minutes interval](../.gitbook/assets/simultaneous-alerts-wrong.png)

![](../.gitbook/assets/simultaneous-alerts-right.png)
