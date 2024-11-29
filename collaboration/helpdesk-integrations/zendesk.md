---
description: >-
  Bi-directional integration with Zendesk to sync incidents, notes, and statuses while creating or linking tickets effortlessly.
---

# Zendesk Integration

<figure><img src="../.gitbook/assets/helpdesk-integrations/zendesk cover.png" alt=""><figcaption></figcaption></figure>

Spike's Zendesk integration connects your incident management system with your helpdesk platform, enabling seamless collaboration between support and other teams. From automatic ticket creation to syncing statuses and notes in real-time, this integration bridges the gap between incident response and customer support.

---

## Features

- **Bi-directional Sync**: Sync incident statuses and notes between Spike and Zendesk in real time.  
- **Automatic Ticket Creation**: Automatically create Zendesk tickets from Spike using Playbooks.  
- **Link Existing Incidents**: Link existing Spike incidents to Zendesk tickets for unified tracking.  
- **Real-Time Updates**: Notes and resolutions are automatically synced across platforms.

---

## Two step set up
Connecting Zendesk and Spike requires two setups: the API connection enables creating incidents from Spike to Zendesk, while the Spike app allows creating incidents from Zendesk to Spike with real-time syncing of statuses and notes.

### 1. API Connection  
This method allows you to send incidents from Spike to Zendesk by connecting with an API token and email.  

{% tabs %}
{% tab title="Setup with API token" %}
**Steps to Set Up**:  
1. Go to [Settings > General > Helpdesk Integrations](https://app.spike.sh/settings/general/organisation#org--helpdesk-ticket-management).  
2. Enter your Zendesk API token and Zendesk subdomain.
{% endtab %}
{% endtabs %}
---

### 2. Zendesk Marketplace App  
Install the Spike app from the Zendesk Marketplace for enhanced functionality, including:  
- Creating incidents or linking existing ones directly from Zendesk.  
- Syncing notes and statuses in real time.  
- Allowing Zendesk users (who aren’t Spike users) to trigger incidents seamlessly.

**Steps to Set Up**:  
{% tabs %}
{% tab title="Spike app on Zendesk" %}
1. Install the Spike app from [Zendesk Marketplace](https://www.zendesk.com/in/marketplace/apps/support/1084861/spike/?queryID=97f8205f39b71c03f3bb6c8512a8e67a)
2. Generate and copy a new API token from the [Spike dashboard](https://app.spike.sh/api)
3. Follow the instructions on Zendesk to connect Spike
{% endtab %}
{% endtabs %}
---

## Manual Sync  

From the Spike dashboard, users can manually select one or more incidents and create Zendesk support tickets.  

**Important Notes**:  
- Tickets created from Spike are not synced with statuses or notes.  
- For full syncing functionality, tickets must be created using the Spike app in Zendesk.

---

## Sync Notes and Status  

When the Spike app is installed from the Zendesk Marketplace, syncing notes and statuses is automatic and happens in real time. Any updates made on one platform reflect immediately on the other.

---

## Automatically Creating Tickets  

Spike’s **Playbooks** automate ticket creation during incident triggers. Once set up, incident details, timestamps, and other critical data are sent to Zendesk automatically.  

---

## FAQs  
<details>
<summary> Permissions on Who Can Set Up and Create  </summary>
Anyone in your organization can set up the integration and create or sync tickets with incidents. No special permissions are required.
</details>
<details>
<summary> Are any extra permissions needed for automating Playbooks? </summary>
You will need the manual setup with Zendesk to automate at [Settings > General > Helpdesk Integrations](https://app.spike.sh/settings/general/organisation#org--helpdesk-ticket-management).  Once the integration is connected, no additional setup is needed for Playbooks. Users can define whether to create tickets with an "Open" or "New" status.
</details>
<details>
<summary> Can I link multiple incidents to one Zendesk ticket? </summary>
No, each incident is linked to a unique Zendesk ticket for better traceability.
</details>

---