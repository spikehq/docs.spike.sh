---
description: >-
   Integrate Spike with Updown.io to receive real-time alerts via Phone calls, SMS, Slack, MS Teams, and more when your website goes down or experiences performance issues.
---

# Integrate Spike with Updown.io
<figure><img src="../.gitbook/assets/integrations/updownio/updown-io.png" alt=""><figcaption></figcaption></figure>

## Overview
[Updown.io](https://updown.io) is a website monitoring service that continuously checks your site’s uptime and performance. It alerts you whenever your site goes down, experiences slow response times, or fails health checks. Updown.io is lightweight, efficient, and supports monitoring over multiple regions.

With Spike’s integration, you can receive real-time alerts for various incidents detected by Updown.io, including:

* **Downtime Alerts**: Get notified immediately when your website becomes unreachable.
* **Slow Response Alerts**: Alerts when your site's response time exceeds a predefined threshold, helping you address performance issues before they impact users.
* **Status Code Failures**: Receive notifications when your site returns unexpected status codes (e.g., 500 errors).
* **SSL Expiry Alerts**: Get early warnings about upcoming SSL certificate expirations.

This integration helps you stay ahead of website issues, enabling rapid response and ensuring minimal downtime for your users.

{% hint style="info" %}
Spike will automatically group repeated incidents and also suppress alerts while incident is open. Auto-resolution is supported. You can set up [alert rules](https://docs.spike.sh/alerts/alert-rules) to determine incident severity and take actions accordingly.
{% endhint %}

## Set up instructions

**Step 1:** Create an Updown.io integration in the Spike dashboard and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

**Step 2:**&#x20;

{% tabs %}
{% tab title="Setup on Updown.io" %}
* **Access Webhook Settings:**
  * Log in to your Updown.io account.
  * From your dashboard, go to **Settings**.

* **Configure Webhook Notifications:**
  * Scroll to the **Webhooks** section.
  * Click the **+ (plus) button** to add a new webhook.
  * Provide a label for your webhook (optional).
  * **Paste the webhook URL** into the URL field.

* **Customize Webhook Triggers (Optional):**
  * Select which events should trigger the webhook (e.g., down, up, degraded).
  * If available, set the `Content-Type` header to `"application/json"`.

* **Save and Test:**
  * Click **Save** to apply your settings.
  * Run a test by clicking **Send a test webhook** in the Webhooks section.
  * Choose an event type and click **Send** to verify the webhook is working.
{% endtab %}
{% endtabs %}