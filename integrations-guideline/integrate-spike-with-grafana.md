---
description: >-
   Integrate Spike with Grafana to receive real-time alerts via Phone calls, SMS, Slack, MS Teams, and more for your app's metrics, logs, and traces. 
---

# Integrate Spike with Grafana
<figure><img src="../.gitbook/assets/Grafana integration.png" alt=""><figcaption></figcaption></figure>

## Overview
[Grafana](https://grafana.com) is a popular open-source platform for monitoring and observability. It allows you to visualize metrics, logs, and traces from various data sources. It provides rich, interactive dashboards and alerting capabilities that help teams monitor the health and performance of their systems and infrastructure in real-time.

### Service and integration
By integrating Grafana with Spike, you can receive real-time alerts for various incidents, including:

* **Threshold Breaches**: Alerts when metrics exceed defined thresholds, helping you respond to potential issues before they escalate.
* **Query Failures**: Notifications when Grafana queries fail, indicating possible issues with data sources or infrastructure.
* **No Data Alerts**: Alerts when expected data is missing, which could signify disruptions in data collection or connectivity issues.

This integration ensures you’re immediately informed about critical system and infrastructure issues, enabling quick and effective responses.

{% hint style="success" %}
Auto-resolution is supported for this integration. Spike will also automatically group repeated incidents and suppress alerts while incident is open.
{% endhint %}

## Set up instructions

**Step 1:** Add the Grafana integration in Spike and copy the webhook.&#x20;

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

**Step 2:**

{% tabs %}
{% tab title="Setup on Grafana" %}

* **Access Alerting Settings:**
  * From your Grafana dashboard, navigate to the Alerting section and select Notification Channels.
  * Click on Add channel to create a new notification channel.
* **Configure the Webhook:**
  * Set the type to Webhook and paste the Spike.sh webhook URL into the URL field.
  * Set the content type to application/json.
  * Select the alert conditions and events that should trigger notifications, such as threshold breaches or data loss.
{% endtab %}
{% endtabs %}