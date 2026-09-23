---
description: "Step-by-step guide to connect Oh Dear to Spike and receive Phone, SMS, and Slack alerts for uptime and site health issues."
---

# Integrate Spike with Oh-Dear

### Service and integration

Make sure to add the Oh-Dear integration and copy the webhook. 

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

### Use the Webhook on Oh-Dear

### Step 1

Open Settings and select the **Notification** tab.

![Oh-Dear Dashboard](<../.gitbook/assets/Group 1 (3).png>)



### Step 2

Select Webhooks from the left menu. Paste the Spike webhook URL and update.

![Paste the Webhook](<../.gitbook/assets/Group 2 (3).png>)

{% hint style="success" %}
This integration auto resolves incidents for Site down, Mixed content and Broken links only.
{% endhint %}

Also, we do not create incidents when a new site is added to your Ohdear account. 
