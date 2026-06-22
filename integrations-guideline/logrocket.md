---
description: >-
  Integrate Spike with LogRocket to receive real-time alerts via Phone calls,
  SMS, Slack, MS Teams, and more for user session anomalies, performance issues,
  and error tracking, ensuring quick incident r
---

# Integrate Spike with LogRocket

<figure><img src="../.gitbook/assets/xitoring integration.png" alt=""><figcaption></figcaption></figure>

[LogRocket](https://logrocket.com) is a session replay and monitoring tool that helps you understand and improve the user experience by capturing and replaying user sessions. It also provides insights into frontend performance, error tracking, and other key metrics, enabling you to identify and resolve issues before they impact your users.

## Incident alerts from LogRocket

By integrating LogRocket with Spike, you can receive real-time alerts for various user experience and performance-related incidents, including:

* Frontend Errors: Alerts when JavaScript errors or other frontend issues are detected, helping you quickly address user-facing problems.
* Performance Issues: Notifications when performance metrics, such as load times or resource usage, exceed predefined thresholds, ensuring optimal application performance.
* User Session Anomalies: Alerts for unusual user session behaviors, such as unexpected page crashes or navigation issues, allowing you to proactively resolve user experience issues.

{% hint style="info" %}
Spike will automatically group repeated incidents and also suppress alerts while incident is open. You can set up [alert rules](https://docs.spike.sh/alerts/alert-rules) to determine incident severity and take actions accordingly. Auto-resolution is not supported.
{% endhint %}

## Set up instructions

**Step 1:** Add LogRocket integration in Spike and copy the webhook

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

**Step 2:**

{% tabs %}
{% tab title="Setup on LogRocket" %}
* Go to the Metrics section in LogRocket and proceed to edit the chart for the metric you want to monitor.
* Click on the Add Alert button and choose the Webhook option.
* Paste the Spike webhook URL into the provided field and set the webhook method to POST.
{% endtab %}
{% endtabs %}
