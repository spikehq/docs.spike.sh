---
description: >-
  Integrate Spike with Xitoring to receive real-time alerts via Phone calls,
  SMS, Slack, MS Teams, and more for server monitoring, uptime checks, and
  system performance, ensuring quick incident response
---

# Integrate Spike with Xitoring

<figure><img src="../.gitbook/assets/xitoring integration.png" alt=""><figcaption></figcaption></figure>

[Xitoring](https://xitoring.com) is a comprehensive monitoring platform designed to help teams keep track of server health, uptime, and overall system performance. With Xitoring, you can monitor the availability and performance of your servers, applications, and websites, receiving instant notifications when something goes wrong. This ensures that you can quickly respond to and resolve issues, maintaining the reliability and performance of your infrastructure.

## Incident alerts from Xitoring

By integrating Xitoring with Spike, you can receive real-time alerts for various monitoring-related incidents, including:

* Server Downtime: Alerts when a server goes down, allowing you to respond promptly and minimize downtime.
* Performance Issues: Notifications when performance metrics, such as CPU usage or memory load, exceed predefined thresholds, helping you maintain optimal system performance.
* Uptime Checks: Alerts when uptime checks fail, ensuring that your websites and services remain accessible.

This integration keeps you informed about critical issues with your infrastructure, enabling you to take immediate action to resolve them.

{% hint style="success" %}
Auto-resolution is supported for this integration. Spike will also automatically group repeated incidents and suppress alerts while incident is open.
{% endhint %}

### Service and Integration

**Step 1:** Create a Xitoring integration and copy the unique webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

**Step 2:**

{% tabs %}
{% tab title="Setting up on Xitoring" %}
* **Navivate to Notification**
  * Visit [Notification Roles](https://app.xitoring.com/ui/notificationRoles)
  * Click Spike.sh > Paste webhook

<figure><img src="../.gitbook/assets/xitoring-spike.png" alt="Spike.sh on Xitoring"><figcaption></figcaption></figure>
{% endtab %}
{% endtabs %}
