---
description: Automatically resolve incidents after a specified time to keep your dashboard clean and focused.
---

# Resolve Timer

## Introduction
Resolve Timer automatically resolves incidents after a specified time period. Timer starts when the incident is triggered. When it reaches your configured duration, the incident is automatically marked as resolved.

{% hint style="info" %}
Resolve Timer is available on **all paid plans**.
{% endhint %}

---

## Setup Resolve timer on integration level
Use this when you want every incident from a specific integration to resolve after a set time.

{% stepper %}
{% step %}
When **Editing**/**Creating** your integration scroll to **Advanced Configuration** and locate the **Resolve Timer** toggle.
{% endstep %}
{% step %}
Toggle **Resolve Timer** to **ON**, enter your time value, select the unit (**Minutes**, **Hours**, or **Days**), and click **Save**.
{% endstep %}
{% endstepper %}

**Example**: Setting 24 hours will automatically resolve all incidents from this integration after 24 hours.

![How to setup resolve timer with integration](../.gitbook/assets/setup%20resolve%20timer%20(integration).png)

## Setup Alert Rule-based Resolve timer
Use this for granular control over which incidents get automatically resolved.

{% stepper %}
{% step %}
While **Editing**/**Creating** set up your alert conditions to define which incidents should trigger this rule.
{% endstep %}
{% step %}
In **Actions** select **Resolve After**. Enter the time value, select the unit, then **Save** or **Update** the rule.
{% endstep %}
{% endstepper %}

**Example**: Database incidents automatically resolve after 2 hours if not manually handled.

![How to setup resolve timer with Alert rules](../.gitbook/assets/setup%20resovle%20timer%20(alert%20rules).png)


---
Once configured trigger an incident to check the timer.

![Incident with resolve timer](../.gitbook/assets/resolve%20timer%20on%20triggered%20incident.png)



---

## FAQ

<details>
<summary>Can I Remove Timer for specific incidents?</summary>
Yes, You can remove it from the incident by clicking on the remove timer button.
</details>

<details>
<summary>Can I set different times for different severity levels?</summary>
Yes, using alert rules you can create different configurations based on incident severity, service, or other conditions.
</details>

<details>
<summary>What's the minimum resolution time?</summary>
1 minute, though we recommend at least 15-30 minutes for most use cases.
</details>

<details>
<summary>Will I get notified when incidents resolve by timer?</summary>
This depends on your notification settings. You can configure to get alerts on resolve incidents
</details>

---

*If you need help setting up Resolve Timer, reach out to [support@spike.sh](mailto:support@spike.sh).*