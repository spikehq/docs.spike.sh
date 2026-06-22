---
description: >-
  Integrate Spike with MongoDB Atlas to receive real-time alerts via Phone calls, SMS, Slack, MS Teams, and more for when your database triggers alerts or events.
---

# MongoDB Atlas Integration
<figure><img src="../.gitbook/assets/integrations/mongodb-atlas/mongodb-atlas.png" alt="MongoDB Atlas Cover"><figcaption></figcaption></figure>

## Overview
[MongoDB Atlas](https://mongodb.com/atlas) is a fully managed cloud database service that simplifies deployment, management, and scaling of MongoDB clusters. It continuously monitors database performance, cluster health, and operational metrics, helping you maintain reliability and efficiency across your systems.

With Spike’s integration, you can receive real-time alerts for various incidents detected by MongoDB Atlas, including:

* **Cluster Alerts**: Notifications when your cluster experiences performance degradation, high CPU usage, or other health issues.
* **Replication and Node Failures**: Alerts for primary or secondary node failures, elections, or replication lag.
* **Storage and Memory Issues**: Alerts when disk space, connections, or memory thresholds are breached.
* **Backup or Snapshot Failures**: Notifications for issues related to backups or snapshots that may affect data reliability.

This integration helps you stay on top of any issues in your MongoDB Atlas Data, allowing for immediate response and resolution.

{% hint style="info" %}
Spike will automatically group repeated incidents and also suppress alerts while incident is open. You can set up [alert rules](https://docs.spike.sh/alerts/alert-rules) to determine incident severity and take actions accordingly. Auto-resolution is not supported.
{% endhint %}

## Set up instructions

**Step 1:** Create a MongoDB Atlas integration in the Spike dashboard and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

**Step 2:**&#x20;
{% tabs %}
{% tab title="Setup on MongoDB Atlas" %}

* **Access Webhook Settings:**

  * In your MongoDB Atlas project, go to **Integrations** from the left sidebar.
  * Select **Webhook** from the list of available integrations.
  * **Paste the Spike webhook URL** copied from Step 1 into the webhook URL field.
  * Click **Activate** to enable the webhook.

* **Attach the Webhook to Alerts:**

  * Navigate to **Alerts → Alert Settings** in your project.
  * To use an existing alert, click the three-dot menu → **Edit**.
    To create a new alert, click **Create Alert**.
  * Under **Add Notification Method**, choose **Webhook** and select the webhook you just activated.
  * Adjust settings such as **Recurrence** and **Notification Frequency**, then **Save**.

* **Select Alert Triggers:**
  * Select an Alert trigger
  * Customize thresholds and filters per alert type.

* **Save and Test:**

  * Save your configuration.
  * Use the **Send Test Alert** option (if available) or temporarily lower a threshold to trigger a test alert.
  * Verify that the alert appears in Spike as a new incident.
{% endtab %}
{% endtabs %}
