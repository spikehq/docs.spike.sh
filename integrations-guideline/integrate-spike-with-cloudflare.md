---
description: >-
  Integrate Spike with Cloudflare to receive real-time alerts via Phone calls,
  SMS, Slack, MS Teams, and more for security events, DDoS attacks, DNS changes,
  and other critical incidents. Ensure faster
---

# Integrate Spike with Cloudflare

<figure><img src="../.gitbook/assets/Cloudflare integration.png" alt=""><figcaption></figcaption></figure>

## Overview

[Cloudflare](https://cloudflare.com) is a leading web infrastructure and website security company, offering services such as content delivery network (CDN), DDoS mitigation, internet security, and distributed domain name server (DNS) services. It helps improve the performance and security of your websites, applications, and APIs, ensuring they remain fast and secure globally.

### Incident alerts from Cloudflare

With Spike’s integration, you can receive real-time alerts from Cloudflare for a variety of incidents, such as:

* DDoS attacks detected and mitigated
* Web Application Firewall (WAF) events
* SSL/TLS certificate expiration warnings
* Network performance issues
* DNS changes and errors

{% hint style="success" %}
Auto-resolution is supported for this integration. Spike will also automatically group repeated incidents and suppress alerts while incident is open.
{% endhint %}

## Set up instructions

**Step 1**: To start, add a Cloudflare integration in Spike and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

{% hint style="info" %}
This feature is only available if your Cloudflare account has at least one zone on a Professional or higher plan. For more information, visit [Cloudflare](https://developers.cloudflare.com/fundamentals/notifications/create-notifications/configure-webhooks/)
{% endhint %}

**Step 2:**

{% tabs %}
{% tab title="Setup on Cloudflare" %}
* **Navigate to Notifications**:
  * From the side menu in your Cloudflare dashboard, navigate to the **Notifications > new notification**
* **Choose Events to Monitor**:
  * Select the events for which you want to receive alerts for.
* **Configure the Webhook**:
  * Set your reset condition (this will automatically resolve the incident on Spike).
* **Configure the Webhook**:
  * Enter the details for your notification, and paste the Spike.sh webhook URL
  * If you see an option for setting headers, set the `ContentType` to `"application/json"`
{% endtab %}
{% endtabs %}
