---
description: >-
   Integrate Spike with Cronitor.io to receive real-time alerts via Phone calls, SMS, Slack, MS Teams, and more for uptime monitoring, cron job monitoring, and heartbeat checks.
---

# Integrate Spike with Cronitor
<figure><img src="../.gitbook/assets/Cronitor integration.png" alt=""><figcaption></figcaption></figure>

## Overview
[Cronitor.io](https://cronitor.io) is a monitoring tool designed to track the health and performance of your scheduled jobs, uptime, and heartbeat signals. Set up this integration to get instantly phone call and other alerts when things go wrong.

### Incident Alerts from Cronitor.io

With Spike’s integration, you can receive real-time alerts for various incidents monitored by Cronitor.io, including:

* **Uptime Monitoring**: Alerts when your websites or services go down, ensuring prompt response to minimize downtime.
* **Cron Job Monitoring**: Notifications when scheduled jobs fail to run, take too long, or run at unexpected times.
* **Heartbeat Monitoring**: Alerts when expected heartbeat signals from your services or applications are missed, indicating potential failures or issues.

This integration allows you to stay on top of any disruptions in your scheduled jobs, uptime, and heartbeat signals, ensuring quick action and resolution.

{% hint style="success" %}
Auto-resolution is supported for this integration. Spike will also automatically group repeated incidents and suppress alerts while incident is open.
{% endhint %}

## Set up instructions

**Step 1**: To start, add a Cronitor integration in Spike and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}



{% tabs %}
{% tab title="Setup on Cronitor" %}
* **Select a Monitor:**
  * From the Cronitor dashboard, choose the monitor you want to configure.
* **Configure the Monitor:**
  * Adjust the monitor settings according to your requirements
* **Set Up the Webhook:**
  * In the Alert Recipients panel, select the **Webhook option**.
  * Paste the Spike.sh webhook URL into the provided field.
  * If available, set the `Content-Type` header to `application/json` for proper data formatting.
{% endtab %}
{% endtabs %}