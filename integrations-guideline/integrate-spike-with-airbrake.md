---
description: >-
  Integrate Spike with Airbrake.io to receive real-time alerts on Phone calls, SMS, Slack, MS Teams, and more for application error monitoring, ensuring faster incident response.
---

# Integrate Spike with Airbrake.io

<figure><img src="../.gitbook/assets/Airbrake integration.png" alt=""><figcaption></figcaption></figure>

### Overview

[Airbrake.io](https://airbrake.io) offers detailed error monitoring and performance management for your applications, helping teams detect, diagnose, and resolve issues in real-time. With detailed error reports, Airbrake.io helps maintain application's optimal performance and reliability.

### Incident alerts from Airbrake.io

With the Spike integration, you can receive real-time alerts for various incidents detected by Airbrake.io. They include

* Application errors
* Performance issues
* Exception handling problems
* and much more

This integration allows you to stay alert to all incidents triggered by [Airbrake.io](https://airbrake.io) for immediate incident response and resolution.

{% hint style="info" %}
Auto-resolution is supported for this integration. Spike will also automatically group repeated incidents and suppress alerts while incident is open.
{% endhint %}

***

## Set up instructions

**Step 1:** Create an Airbrake.io integration on [Spike dashboard](https://app.spike.sh/integrations) and Copy the webhook URL for your integrartion.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

**Step 2:**&#x20;

{% tabs %}
{% tab title="Setup on Airbrake.io" %}
* **Navigate to Integrations**:
  * Go to **Project's Settings > Select Integrations**.
* **Add a Webhook**:
  * Scroll through the available integrations and **select Webhooks**.
  * Click on **Add Integration**
* **Configure the Webhook**:
  * Set your reset condition (this will automatically resolve the incident on Spike).
* **Configure Trigger Actions**:
  * Paste the Spike integration webhook URL into the field.
  * If applicable, adjust the triggering conditions and other settings based on your requirements.
  * If you see an option for setting headers, set the `ContentType` to `"application/json"`
  * Save the integration to enable real-time alerting.
{% endtab %}
{% endtabs %}
