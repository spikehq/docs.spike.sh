---
description: >-
   Integrate Spike with Rollbar to receive real-time alerts via Phone calls, SMS, Slack, MS Teams, and more for application errors
---

# Integrate Spike with Rollbar
<figure><img src="../.gitbook/assets/Rollbar integration.png" alt=""><figcaption></figcaption></figure>

## Overview
[Rollbar](https://spike.sh) is a real-time error tracking and monitoring tool for web and mobile applications. It helps development teams identify, prioritize, and resolve errors faster by providing detailed insights into application issues. Rollbar integrates seamlessly with various programming languages and frameworks, allowing teams to maintain high application quality and stability.

## Incident alerts from Rollbar
By integrating Rollbar with Spike, you can receive real-time alerts for various application errors and issues, including:

* Error Occurrences: Alerts when new errors occur or when the frequency of known errors increases, helping you quickly address critical issues.
* Critical and High-Severity Errors: Notifications for errors categorized as critical or high severity, ensuring immediate attention to the most impactful problems.
* Deploy-Related Errors: Alerts for errors that occur after deployments, allowing you to identify and resolve issues introduced by new code changes.

This integration ensures that you stay informed about application issues as they happen, enabling fast response and minimizing the impact on users.

{% hint style="info" %}
Spike will automatically group repeated incidents and also suppress alerts while incident is open. You can set up [alert rules](https://docs.spike.sh/alerts/alert-rules) to determine incident severity and take actions accordingly. Auto-resolution is not supported.
{% endhint %}

## Set up instructions

**Step 1:** Create a Rollbar integration on [Spike dashboard](https://app.spike.sh/integrations) and copy the webhook

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

**Step 2:**

{% tabs %}
{% tab title="Setup on Rollbar" %}
* **Navigate to Notifications**:
  * visit Settings > Notifications and select **Webhook**
  * Paste the webhook from Spike. You can reuse the same webhook or add more for various rules on Rollbar.
{% endtab %}
{% endtabs %}