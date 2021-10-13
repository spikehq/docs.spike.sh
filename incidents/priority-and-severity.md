---
description: >-
  Determine and set incident's priority to indicate urgency and severity to
  indicate possible damage
---

# Priority and Severity

Not all incidents are critical or need to be resolved immediately. To help understand an incident better, we bring you two critical components to every incident - **Priority, and Severity**. 

## Priority

Assign a priority to your incident to indicate the urgency to resolve it. If the incident repeats itself, the set priority will be automatically assigned.

Available priorities are - 

* **P1** - Urgent
* **P2** - High
* **P3** - Medium
* **P4** - Low
* **P5** - Info 

Setting priority is a great way to indicate to your team the urgency to fix it. Additionally, you can setup alert rules to take actions automatically when the incident repeats itself. \
\
**Example:**\
****P1** **- Billing service downtime\
****P2** **- DB server running out of storage space

## Severity

Assign severity to indicate the severity of damage to your systems. 

Available severities are -

* **SEV1** - High
* **SEV2** - Medium
* **SEV3** - Low

Data leaks / Website service down is a good example of SEV1 - High severity.

{% hint style="success" %}
Once set, we will remember the severity and priority when the incident occurs in the future.
{% endhint %}

## Setting priority and severity

There are multiple ways to assign these properties to an incident. 

### From dashboard

Select incidents and the options for priority, severity, and mute will be available for you. 



![Set priority on multiple incidents](<../.gitbook/assets/Priority on dashboard.png>)

### From Incident page

You will find these options on the incident page for both priority and severity. 

![Setting priority from the incident page](<../.gitbook/assets/image (81).png>)

### From integrations (automated)

Integrations like Azure send priority and severity with their incident details. We will acknowledge this and overwrite your incident's priority and severity.

{% hint style="success" %}
You can also send priority and severity with webhook integration. [Learn more](https://docs.spike.sh/integrations-guideline/integrating-with-webhooks)
{% endhint %}

## F.A.Q

### Should I set both priority and severity?

It's recommended to do so, at least for critical incidents. However, if you would like, you can choose to only use one. 

### Who has access to set and unset?

Everyone. There is no access control because we believe tackling incidents is a team effort. 
