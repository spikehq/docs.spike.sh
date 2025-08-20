---
description: >-
   Integrate Spike with N-able N-central to receive real-time alerts via Phone calls, SMS, Slack, MS Teams, and more when your monitored systems or devices encounter issues.
---

# Integrate Spike with N-able N-central
<figure><img src="../.gitbook/assets/n-able-integration.png" alt="N-able N-central integration with Spike"><figcaption></figcaption></figure>

## Overview
[N-able N-central](https://www.n-able.com/products/n-central) is a remote monitoring and management (RMM) platform used by MSPs and IT teams to monitor servers, networks, endpoints, and applications. It provides proactive monitoring, patch management, and alerting to keep infrastructure running smoothly.

With Spike’s integration, you can receive real-time alerts whenever N-central detects issues, including:

* **Device Status Changes**: Alerts when a server, workstation, or network device goes offline or becomes unreachable.
* **Service Failures**: Notifications for failed services, applications, or monitoring checks.
* **Threshold Breaches**: Alerts when performance thresholds (CPU, memory, disk, etc.) are exceeded.
* **Security & Patch Alerts**: Notifications for antivirus, backup, or patching failures.

This integration ensures that your operations or on-call teams are instantly informed of N-central incidents, enabling faster response and reduced downtime.

{% hint style="info" %}
Spike will automatically group repeated incidents and suppress duplicate alerts while an incident is open. You can configure [alert rules](https://docs.spike.sh/alerts/alert-rules) to define severity levels, escalation policies, and auto-resolve behavior.
{% endhint %}

---

## Set up instructions

**Step 1:** Create an N-able N-central integration in the Spike dashboard and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

**Step 2:**  

{% tabs %}
{% tab title="Setup on N-central" %}
1. **Log in to N-central:**  
   Open your N-central console with admin privileges.  

2. **Navigate to Notifications:**  
   Go to **Administration → Notifications → Notification Profiles**.  

3. **Create or Edit a Profile:**  
   Either edit an existing notification profile or create a new one for Spike.  

4. **Add a Webhook (HTTP Recipient):**  
   * In the profile settings, select **Delivery Methods**.  
   * Choose **HTTP Recipient (Webhook)**.  
   * **Paste the webhook URL** from Spike into the URL field.  
   * Select `POST` method and set **Content-Type** to `application/json`.  

5. **Configure Payload:**  
   Paste the following JSON payload into the body field:  

   ```json
   {
     "device": {
       "name": "$DEVICENAME$",
       "uri": "$DEVICEURI$",
       "customer": "$CUSTOMERNAME$",
       "site": "$SITENAME$"
     },
     "service": {
       "name": "$SERVICENAME$",
       "task": "$TASKIDENT$"
     },
     "state": {
       "new": "$QUALITATIVENEWSTATE$",
       "old": "$QUALITATIVEOLDSTATE$",
       "details": "$QUANTITATIVENEWSTATE$"
     },
     "alert": {
       "id": "$ACTIVENOTIFICATIONTRIGGERID$",
       "time": "$TIMEOFSTATECHANGE$"
     },
     "ncentral": {
       "uri": "$NCENTRALURI$",
       "probe": "$PROBEURI$"
     }
   }
   ```
    This payload automatically generates clear incident titles in Spike and supports auto-resolution when the issue returns to normal.
6. Assign Triggers:
    Choose the events or alerts you want to send to Spike (e.g., device down, service failure).
    Assign the profile to devices, services, or groups.
7. Save and Test:
    Save the profile.
    Trigger a test event (e.g., stop/start a monitored service) to verify alerts reach Spike.
{% endtab %}
{% endtabs %}

## FAQs
<details>
<summary>Can I select which alerts from N-central go to Spike?</summary>
Yes. When configuring the Notification Profile in N-central, you can choose which devices, services, and events should trigger the webhook. Only those alerts will be sent to Spike.
</details> 
<details>
<summary>Will incidents auto-resolve in Spike when the issue is cleared in N-central?</summary>
Yes. The provided JSON payload includes both the new and old state values. When N-central reports that a device or service has returned to normal, Spike will automatically resolve the incident. 
</details>
<details>
<summary>Do I need to modify the JSON payload?</summary>
No. You can copy and paste the payload exactly as provided. It already includes all required variables from N-central to generate incident titles, details, and auto-resolution.
</details> 
<details> 
<summary>What if no incidents show up in Spike after setup?</summary>
Check that: - The webhook URL in N-central is correct. - The method is set to `POST` and `Content-Type` is `application/json`. - The Notification Profile is assigned to the correct devices/services. - You triggered a test event (e.g., stopping a monitored service). 
</details> 
<details>
<summary>Does Spike deduplicate repeated alerts from N-central?</summary>
Yes. Spike automatically groups repeated alerts into a single incident until it is resolved, reducing alert fatigue.
</details>