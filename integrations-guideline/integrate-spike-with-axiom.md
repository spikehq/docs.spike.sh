---
description: >-
   Integrate Spike with Axiom to receive real-time alerts via Phone calls, SMS, Slack, MS Teams, and more for anomalies found in your logs
---

# Integrate Spike with Axiom
<figure><img src="../.gitbook/assets/Axiom integration.png" alt=""><figcaption></figcaption></figure>

## Overview
[Axiom](https://axiom.co) is a platform that provides powerful data management and observability solutions, allowing teams to ingest, store, and query large volumes of data effortlessly. It offers seamless integration with various data sources and helps you monitor, analyze, and act on your data in real-time. Axiom’s platform is designed to scale with your needs, making it a versatile tool for organizations handling extensive data pipelines and logs.

With Spike’s integration, you can receive real-time alerts for various data-driven incidents detected by Axiom, including:

* **Data Ingestion Failures**: Alerts when data ingestion from sources fails, ensuring you can address potential data loss immediately.
* **Query Performance Issues**: Notifications when queries take longer than expected or fail, helping you maintain the performance and reliability of your data operations.
* **Anomaly Detection**: Alerts when unusual patterns or anomalies are detected in your data, enabling proactive measures to prevent potential issues.

{% hint style="success" %}
Auto-resolution is supported for this integration. Spike will also automatically group repeated incidents and suppress alerts while incident is open.
{% endhint %}

## Set up instructions

**Step 1:** Make sure to add the Axiom integration and copy the webhook. 

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

**Step 2:**

{% tabs %}
{% tab title="Setup on Axiom" %}
* **1. Creating a New Monitor**:

  * Navigate to the 'Monitors' section in your dashboard.
  * Click on 'New monitor' to begin setting up your monitor.
  * Fill in the 'Name' field with a unique identifier for your monitor.
  * In the 'Description' field, provide a brief description of what the monitor aims to check.
  * Specify the query conditions and set the frequency of checks.

* **2. Adding a Notifier**:
  * In the 'Notification Options' section, click on 'Manage notifiers'.
  * Enter a recognizable 'Name' for your notifier.
  * Select the 'Webhook' integration.
  * Paste your 'Axiom Webhook'.
  * Save your notifier.

* **3. Linking Notifier to the Monitor**:
  * Return to your monitor's configuration page.
  * Locate the 'Notification Options' section.
  * Select the newly created notifier.
  * Save your monitor settings to finalize the setup.

* **Configure the Webhook**:
  * Enter the details for your notification, and paste the Spike.sh webhook URL
  * If you see an option for setting headers, set the `ContentType` to `"application/json"`
{% endtab %}
{% endtabs %}