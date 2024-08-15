---
description: >-
   Integrate Spike with Ghost Inspector to receive real-time alerts via Phone calls, SMS, Slack, MS Teams, and more for when your automated tests fail.
---

# Integrate Spike with Ghost Inspector
<figure><img src="../.gitbook/assets/Ghost inspector integration.png" alt=""><figcaption></figcaption></figure>

## Overview
[Ghost Inspector](https://ghostinspector.com) automates testing of websites and web applications. It allows you to create and manage tests that run directly in your browser, so you know that your site functions correctly after deployments, updates, and changes. Ghost Inspector simplifies the process of testing by automating repetitive tasks and providing detailed reports on any issues detected.


With Spike’s integration, you can receive real-time alerts for various incidents detected by Ghost Inspector, including:

* **Test Failures**: Alerts when automated tests fail, indicating potential issues with your website or application.
* **Step Failures**: Notifications when specific steps within a test do not complete successfully, helping you identify exactly where issues occur.
* **Suite Run Failures**: Alerts when an entire suite of tests fails, suggesting broader problems with your site or app.

This integration helps you stay on top of any issues in your web applications, allowing for immediate response and resolution.

{% hint style="info" %}
Spike will automatically group repeated incidents and also suppress alerts while incident is open. You can set up [alert rules](https://docs.spike.sh/alerts/alert-rules) to determine incident severity and take actions accordingly. Auto-resolution is not supported.
{% endhint %}

## Set up instructions

**Step 1:** Create a Ghost Inspector integration in the Spike dashboard and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

**Step 2:**&#x20;

{% tabs %}
{% tab title="Setup on Ghost Inspector" %}
* **Access Test Settings:**
  * From your Ghost Inspector dashboard, select the test or suite you want to configure.
* **Configure Webhook Notifications:**
  * In the settings for your test or suite, find the section for Webhook Notifications.
  * **Paste the webhook URL** into the webhook field.
  * Configure any additional settings, such as when to trigger the webhook (e.g., on test failure, on suite run failure).
  * If available, set the `Content-Type` header to `"application/json"` for proper data formatting.
* **Save and Test:**
  * Save your settings and run a test (if option available)
{% endtab %}
{% endtabs %}