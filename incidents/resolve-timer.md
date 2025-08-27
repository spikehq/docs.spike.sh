---
description: >-
  Resolved by Timer resolves incidents after a specified time period.
---

<figure><img src="../.gitbook/assets/resolve-timer/cover.png" alt=""><figcaption></figcaption></figure>

## Introduction
**Resolved by Timer** lets you automatically resolve incidents after a fixed duration. Once an incident is triggered, a countdown starts. If the incident hasn’t been manually resolved by the time the countdown ends, Spike will mark it as Resolved with Timer.

You’ll see a badge on the incident row and incident page, along with a visual indicator showing the timer. You can cancel the timer at any point from the incident view.

<figure><img src="../.gitbook/assets/resolve-timer/resolve-badge.png" alt=""><figcaption></figcaption></figure>

Resolve Timer can be set up in multiple ways:

**Integration-level**: apply the same timer to all incidents from an integration.

**Alert rules**: apply timers only when certain conditions are met (e.g., based on severity or service).

**Playbooks**: apply timers as part of your playbook.


{% hint style="success" %}
Resolve Timer is available on **all plans**.
{% endhint %}

---

## How it works?

![Incident with resolve timer](../.gitbook/assets/resolve-timer/timer-different-states.png)

When an incident is triggered, a countdown begins automatically. This timer runs in the background while the incident behaves like any other — it can be acknowledged, updated with notes, or manually resolved at any time.

If the countdown finishes and the incident is still open, Spike marks it as Resolved with Timer. A badge and countdown indicator appear on the incident row and detail page, making it clear when and how the resolution happened.

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

Example: Setting 24 hours will automatically resolve all incidents from this integration after 24 hours.

![How to setup resolve timer with integration](../.gitbook/assets/setup%20resolve%20timer%20(integration).png)

## Setup Alert Rule-based Resolve timer
Use this for granular control over which incidents to set a timer for.

{% stepper %}
{% step %}
While **Editing**/**Creating** an alert rule, set up your alert conditions to define which incidents should trigger this rule.
{% endstep %}
{% step %}
In **Actions** select **Resolve After**. Enter the time value, select the unit, then **Save** or **Update** the rule.
{% endstep %}
{% endstepper %}

Example: Database incidents automatically resolve after 2 hours if not manually handled.

![How to setup resolve timer with Alert rules](../.gitbook/assets/setup%20resovle%20timer%20(alert%20rules).png)

## Setup Resolve timer in Playbooks
Use this to set timer as part of your response playbook

{% stepper %}
{% step %}
While **editing** or **creating** a playbook, add an action to apply a Resolve Timer.  
{% endstep %}
{% step %}
You can choose when the timer should start — for example, immediately on trigger or when the incident status changes (e.g., to **Acknowledged**).  
{% endstep %}
{% endstepper %}

![How to setup resolve timer with Alert rules](../.gitbook/assets/setup%20resovle%20timer%20(alert%20rules).png)

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