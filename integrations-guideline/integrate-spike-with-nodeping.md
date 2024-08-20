---
description: >-
  Integrate Spike with Nodeping.io to receive real-time alerts via Phone calls, SMS, Slack, MS Teams, and more for uptime monitoring, server health, and network performance, for fast quick incident response.
---

# Integrate Spike with Nodeping
<figure><img src="../.gitbook/assets/nodeping integration.png" alt=""><figcaption></figcaption></figure>

[Nodeping](https://nodeping.com) is an uptime monitoring service designed to monitor the availability and performance of websites, servers, and other critical infrastructure. Nodeping provides a range of monitoring options, including HTTP, DNS, SSL, and TCP checks, so your systems remain online and perform optimally. With customizable alerting and detailed reporting, Nodeping's integration with Spike allows teams to quickly detect and respond to downtime and other performance issues.

## Incident alerts from Xitoring

By integrating Xitoring with Spike, you can receive real-time alerts for various monitoring-related incidents, including:

* Server Downtime: Alerts when a server goes down, allowing you to minimize downtime.
* Performance Issues: Notifications when performance metrics, such as CPU usage or memory load, exceed predefined thresholds, helping you maintain optimal system performance.
* Uptime Checks: Alerts when uptime checks fail, so you are on top of all downtimes for websites and services.

This integration keeps you informed about critical issues with your infrastructure, enabling you to take immediate action to resolve them.

{% hint style="success" %}
Auto-resolution is supported for this integration. Spike will also automatically group repeated incidents and suppress alerts while incident is open.
{% endhint %}

### Service and Integration

**Step 1:** Create a Nodeping integration and copy the unique webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

{% tabs %}
{% tab title="Setting up on Nodeping" %}
* On Nodeping, find Contacts > Add new contact
* **Adding a contact**
  * Set type to Webhook. The webhook options will appear.
  * Set the type to POST.
  * Paste in the Spike webhook URL
  * *Query strings - [leave blank]*
  * In Headers, set `content-type` = `application/json`
  * **Body:** enter the below JSON
```
{
    "title": "Host {label} : {type} is {event}",
    "status":"{if success}resolve{else}fail{/if}" // this will help auto-resolve on Spike
}
```
  * Access Level = Notifications Only
  * Click Save
  * Once added you can return to the new NodePing UI and add the contact to checks as needed
{% hint style="warning" %}
Switch to Legacy UI on Nodeping if you have trouble adding contact.
{% endhint %}
{% endtab %}
{% endtabs %}