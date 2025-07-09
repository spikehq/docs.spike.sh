---
description: >-
   Integrate Spike with Twilio to receive real-time alerts via Phone calls, SMS, Slack, MS Teams, and more for usage anomalies and debugger errors.
---

# Integrate Spike with Twilio
<figure><img src="../.gitbook/assets/integrations/twilio/twilio-cover.png" alt=""><figcaption></figcaption></figure>

## Overview

[Twilio](https://twilio.com) provides cloud communication services for messaging, voice, and more. It also offers tools like Debugger and Usage Triggers to monitor usage spikes, errors, and anomalies in your Twilio account.

With Spike’s integration, you can receive real-time alerts for Twilio events, such as:

* **Usage Triggers:** Alerts for predefined usage thresholds (e.g., sudden spikes in API usage or spending).
* **Debugger Alerts:** Notifications for issues identified by Twilio's Debugger tool.

This integration enables your team to respond immediately to critical events and usage patterns in your Twilio services.

{% hint style="info" %}
Spike will automatically group repeated incidents and suppress alerts while an incident is open. You can set up [alert rules](https://docs.spike.sh/alerts/alert-rules) to control incident severity and customize actions. Auto-resolution is not supported.
{% endhint %}

## Set up instructions

**Step 1:** Create a Twilio integration in the Spike dashboard and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

**Step 2:**&#x20;

{% tabs %}
   {% tab title="Alarms in Twilio" %}
   **Setup:**
      * Go to your Twilio Console and navigate to **Monitor > Alarms > Manage Alarms**.
      * Create a new alarm, configure your metrics at the top of the page.
      * Scroll down, enable webhook and paste your Spike webhook URL here.
   **Save and Test:**
      * Save the configuration and, if possible, trigger a test to verify the webhook is working.
   {% endtab %}
   {% tab title="Errors, Debuggers, and Usage triggers" %}
      **Setup:**
         * Go to your Twilio Console and navigate to **Monitor > Logs > Errors**.
         * Create a new webhook, paste your Spike webhook URL here.
         * Configure the threshold and parameters for the trigger in Error logs section.
      **Save and Test:**
         * Save the configuration and, if possible, trigger a test to verify the webhook is working.
   {% endtab %}
{% endtabs %}

## FAQ
<details> 
<summary>Does Spike use this integration to make calls from my Twilio account?</summary>
No. This integration does not allow Spike to make calls or send messages from your Twilio account.
</details>

<details> 
<summary>What is this integration mainly used for?</summary>
This integration is meant to notify you about issues or unusual activities in your Twilio account, such as usage spikes or debugger errors. It helps you create and track incidents related to your Twilio services in real time.
</details>
