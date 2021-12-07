---
description: >-
  A status would determine the state of the incident among acknowledged or
  resolved
---

# Incident statuses

## What are different Incident statuses?

There are mainly 3 states -&#x20;

1. **Triggered 🔥**
2. **Acknowledged** 👩‍💻
3. **Resolved** ✅

### **1. Triggered 🔥**

Every incident which comes to Spike will be first in the **triggered** state. It would mean that someone will need to look into this and address the problem.

Alerts are sent to members as long as an incident remains in this state.&#x20;

### 2. Acknowledged 👩‍💻

An **acknowledged** state of the incident would mean that you have begun to look into the incident. Alternatively, this also means that work to resolve this incident has begun.&#x20;

In this state, repeat incidents are automatically suppressed and logged reducing alert fatigue.

{% hint style="info" %}
We highly recommend setting an acknowledge timeout for all your incidents.&#x20;
{% endhint %}

{% content-ref url="acknowledge-timeout.md" %}
[acknowledge-timeout.md](acknowledge-timeout.md)
{% endcontent-ref %}

### 3. Resolved ✅

Once an incident is fixed, you mark it as **resolved**. This is the end state for all incidents.&#x20;

If a similar incident is triggered then a new incident is created.









