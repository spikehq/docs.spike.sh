---
description: >-
   Integrate Spike with Paessler PRTG to receive real-time alerts via Phone calls, SMS, Slack, MS Teams, and more when your sensors detect issues in your network, servers, or applications.
---

# Integrate Spike with Paessler PRTG
<figure><img src="../.gitbook/assets/paessler-prtg.png" alt="PRTG integration with Spike"><figcaption></figcaption></figure>

## Overview
[Paessler PRTG Network Monitor](https://www.paessler.com/prtg) is an all-in-one monitoring solution for IT infrastructure, covering networks, servers, databases, applications, cloud services, and IoT devices. PRTG uses sensors to continuously check system performance and availability, alerting you when thresholds are breached or failures occur.

With Spike’s integration, you can receive real-time alerts whenever PRTG detects an issue, including:

* **Sensor Alarms**: Notifications when a sensor enters a down, error, or warning state.  
* **Device Failures**: Alerts when monitored servers, routers, or switches are unreachable.  
* **Threshold Breaches**: Notifications when CPU, memory, disk, or bandwidth usage exceeds defined limits.  
* **Recovery Events**: Auto-resolve incidents in Spike when sensors return to an “Up/OK” state.  

This integration ensures that your NOC or on-call team responds instantly to PRTG incidents, reducing downtime and improving system reliability.  

{% hint style="info" %}
Spike automatically **groups repeated incidents** from the same PRTG sensor, and **suppresses duplicate alerts** while an incident is open. You can configure [alert rules](https://docs.spike.sh/alerts/alert-rules) to fine-tune severity, escalation, and resolution workflows.  
{% endhint %}

---

## Set up instructions

**Step 1:** Create a Paessler PRTG integration in the Spike dashboard and copy the webhook URL.  

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

**Step 2:** Configure Notifications in PRTG  

{% tabs %}
{% tab title="Setup on PRTG" %}
1. **Log in to PRTG:**  
   Open your PRTG web interface with admin privileges.  

2. **Create a New Notification Template:**  
   - Go to **Setup → Account Settings → Notification Templates**.  
   - Click **Add Notification Template**.  
   - Give it a name (e.g., “Spike Integration”).  

3. **Add an HTTP Action (Webhook):**  
   - In the template, click **Add Notification Method**.  
   - Select **Execute HTTP Action**.  
   - **URL:** Paste the webhook URL from Spike.  
   - **Method:** Select `POST`.  

4. **Add Payload:**  
   Paste the following into the body field:  

   ```json
   colorofstate=%colorofstate&company=%company&comments=%comments&commentssensor=%commentssensor&commentsdevice=%commentsdevice&commentsgroup=%commentsgroup&commentsprobe=%commentsprobe&coverage=%coverage&cumsince=%cumsince&date=%date&datetime=%datetime&device=%device&deviceid=%deviceid&down=%down&downtime=%downtime&elapsed_lastcheck=%elapsed_lastcheck&elapsed_lastdown=%elapsed_lastdown&elapsed_lastup=%elapsed_lastup&group=%group&groupid=%groupid&history=%history&home=%home&host=%host&iconofstate=%iconofstate&lastcheck=%lastcheck&lastdown=%lastdown&lastmessage=%lastmessage&laststatus=%laststatus&lastup=%lastup&lastvalue=%lastvalue&linkprobe=%linkprobe&linkgroup=%linkgroup&linkdevice=%linkdevice&linksensor=%linksensor&location=%location&message=%message&name=%name&nodename=%nodename&objecttags=%objecttags&parenttags=%parenttags&prio=%prio&priority=%priority&probe=%probe&probeid=%probeid&programname=%programname&programversion=%programversion&sensor=%sensor&sensorid=%sensorid&server=%server&serviceurl=%serviceurl&settings=%settings&shortname=%shortname&since=%since&sitename=%sitename&statesince=%statesince&status=%status&systemdatetime=%systemdatetime&tags=%tags&time=%time&timezone=%timezone&uptime=%uptime
   ```
    This payload automatically generates meaningful incident titles in Spike and supports auto-resolution when PRTG reports recovery.
5. **Assign the Notification Template:**
    - Go to a device, group, or sensor in PRTG.
    - Click **Notifications** and assign the Spike template for When sensor state is Warning/Error/Down and also for When sensor recovers.
6. **Save and Test:**
    - Save the template and assignment.
    - Trigger a test (e.g., pause/unpause a sensor, simulate threshold breach) to confirm alerts appear in Spike.
{% endtab %}
{% endtabs %}

## FAQs
<details> 
<summary>Will incidents in Spike auto-resolve when a sensor recovers?</summary> 
Yes. The JSON payload includes `%status` and `%message`. When PRTG reports recovery, Spike automatically resolves the incident. The status needs to be either `up`, `resolve`, or `ok` for auto-resolution to work.
</details> 
<details> 
<summary>Do I need to create multiple notification templates for different sensors?</summary>
No. A single template with the Spike webhook can be assigned to multiple devices, groups, or sensors. You only need one template per Spike integration. 
</details>
<details>
<summary>Does Spike group repeated PRTG alerts?</summary>
Yes. Spike groups repeated incidents from the same sensor and suppresses duplicate alerts while an incident is open. 
</details>
<details>
<summary>Can I customize the incident title in Spike?</summary>
Yes. The JSON payload can include additional PRTG placeholders like `%host`, `%priority`, or `%down` to add more context to the title or description. 
</details>