---
description: >-
  Integrate Spike with SolarWinds Orion to get real-time alerts on Phone calls,
  SMS, Slack, MS Teams and more for network, server, and application incidents,
  for faster incident response.
---

# Integrate Spike with Solarwinds Orion

<figure><img src="../.gitbook/assets/Solarwinds Orion integration brigh.png" alt="Solarwinds incident response"><figcaption></figcaption></figure>

### Overview

[Solarwinds Orion ](https://www.solarwinds.com/)offers detailed insights into network performance, server and application monitoring, and storage resource management. They help monitor hybrid IT environments and helps teams maintain optimal performance and reliability across their IT assets.

### Incident alerts from Solarwinds Orion

With the Spike integration, you can receive real-time alerts for various incidents detected by SolarWinds Orion. They include

* Network outages
* Server failures
* Application performance issues
* and much more

This integration helps you stay alert on all incidents triggering from Orion for immediate incident response and resolution.

{% hint style="info" %}
This integration automatically detects and sets Critical severity. It also auto-resolves relevant incidents if configured on Orion.
{% endhint %}

***

## Set up instructions

**Step 1:** Create a Solarwinds Orion integration on [Spike dashboard](https://app.spike.sh/integrations) and Copy the webhook URL for your integrartion.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

**Step 2:**&#x20;

{% tabs %}
{% tab title="Setup on Solarwinds Orion" %}
* **Navigate to Settings**:
  * Go to **Settings > All Settings**.
* **Manage Alerts**:
  * Click on **Alerts and Reports > Manage Alerts**.
  * Add a new alert and enable it with your desired trigger conditions.
* **Set Reset Condition**:
  * Set your reset condition (this will automatically resolve the incident on Spike).
* **Configure Trigger Actions**:
  * Under **Trigger Actions**, select either **GET** or **POST** request.
  * Paste your integration webhook from Spike.
  * If you see an option for setting headers, set the `ContentType` to `"application/json"`
{% endtab %}
{% endtabs %}
