---
description: "Get real-time alerts when your API breaks or an end-to-end web transaction fails by connecting Checkly to Spike."
---

# Integrate Spike with Checkly

## Service and integration

With our Checkly integration make sure your API always responds quickly and with the correct payload. Monitor your web app's crucial transactions and get alerts.&#x20;

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Use our webhook on Checkly

Visit [Alert settings on Checkly](https://app.checklyhq.com/alert-settings) and create a new channel. From the list of alert channels, select Spike.

Paste your integration's copied URL and paste it on Checkly. That's it. Your integration is ready to receive incidents.

![Paste the webhook and the body](../.gitbook/assets/checkly-with-stripe-2.png)

{% hint style="success" %}
This integration auto-resolves all types of incidents except SSL warnings from Checkly
{% endhint %}
