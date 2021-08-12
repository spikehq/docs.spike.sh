---
description: Learn the basics of an incident.
---

# What is an incident?

Incident is any issue that needs to be worked upon and resolved. Many a times, these incidents often affects your customers. When we get an incident, we alert and assign the incident to the right person using escalation policy attached to that integration.

## Examples

1. Monitoring CPU utilization - alerts at high utilization at say, 80%
2. Monitoring Memory consumption - alerts at high consumption at say, 90%
3. DB monitoring alerts 
4. DB backup fails
5. Billing fails
6. Sending notification fails
7. Errors on loading dashboard
8. Website down monitored with uptime monitoring

_and many more ...._

{% hint style="info" %}
You can use a simple webhook integration and create incidents from your code too. [Know more here.](https://docs.spike.sh/integrations-guideline/integrating-with-webhooks)
{% endhint %}

## Understanding incident statuses

Incidents can have one of the below statuses - 

1. **Triggered**
2. **Acknowledged**
3. **Resolved**

### Triggered

When an incident is **triggered**, Spike loads the escalation policy attached to the integration and sends an alert. _We continue to send automated alerts based on the escalation policy until the incident is acknowledged_. Once the person has received the alert, they choose to acknowledge or resolve. We do not send alerts when incidents are acknowledged and resolved. In this state, repeat incidents are automatically suppressed and logged reducing alert fatigue.

### Acknowledged

An **acknowledged** incident would mean that the work for the resolution of incident is ongoing. In this state, we **do not** send any alerts and stop the escalation policy to where it stands. You can customise the settings to have a timeout for amount of time the incident remains in acknowledged state and does not get resolved. Once this timeout reaches, we change the status to triggered and start sending alerts again. _The acknowledge timeout setting is optional._ In this state, repeat incidents are automatically suppressed and logged reducing alert fatigue

### Resolved

Once incident has been fixed, you can mark it as **resolved**. In this case, no alerts are sent and escalation policy resets in case if there is a new incident again.

