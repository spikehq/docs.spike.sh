---
description: >
  Bi-directional integration with Freshdesk to sync incidents, notes, and statuses while creating or linking tickets effortlessly.
---

# Freshdesk Integration

<figure><img src="../../.gitbook/assets/helpdesk-integrations/freshdesk-cover.png" alt=""><figcaption></figcaption></figure>

Spike's Freshdesk integration helps with automatic ticket creation to syncing statuses and notes in real-time from either Spike or Freshdesk's dashboard, Whether done manually or automatically via Playbooks, this integration ensures incident details are captured in your helpdesk system efficiently.

---

## Features

{% embed url="https://www.youtube.com/watch?v=f3EnbMhmGYM" %}

- **Bi-directional Sync**: Sync incident statuses and notes between Spike and Freshdesk in real time.
- **Ticket Creation**: Automatically or manually create Freshdesk tickets from Spike using [Playbooks](../../playbooks/introduction-to-playbooks.md).
- **Link Existing Incidents**: Link existing Spike incidents to tickets on Freshdesk.

---

## Two step set up
Connecting Freshdesk and Spike requires two setups: the API connection enables creating incidents from Spike to Freshdesk, while the Spike app from the marketplace allows creating incidents from Freshdesk to Spike with real-time syncing of statuses and notes.

### Step 1. Freshdesk Marketplace App  
Install the Spike app from the Freshdesk Marketplace for enhanced functionality, including:  
- Creating incidents or linking existing ones directly from Freshdesk.
- Syncing notes and incident statuses in real-time, including status updates and changes.
- Allowing Freshdesk users (_who aren’t Spike users_) to trigger incidents.

{% tabs %}
{% tab title="Spike app on Freshdesk" %}
**Steps to Set Up**:
1. Install the Spike app from [Freshdesk Marketplace](https://www.freshworks.com/apps/spike)
2. Generate and copy a new API token from the [Spike dashboard](https://app.spike.sh/api)
3. Follow the instructions on Freshdesk to connect Spike
{% endtab %}
{% endtabs %}

### Step 2. API Connection on Spike
This method allows you to send incidents from Spike to Freshdesk by connecting with an API token and email.  

{% tabs %}
{% tab title="Setup with API token" %}
**Steps to Set Up**:
1. Go to [Settings > General > Helpdesk Integrations](https://app.spike.sh/settings/general/organisation#org--helpdesk-ticket-management).  
2. Enter your Freshdesk API token and subdomain.
{% endtab %}
{% endtabs %}

---

## How to use?

### Manual Sync

From the Spike dashboard, users can manually select one or more incidents and create Freshdesk support tickets.  

**Important Notes**:  
- Tickets created from Spike are not synced with statuses or notes.  
- For full syncing functionality, tickets must be created using the Spike app in Freshdesk.

### Sync Notes and Status  

When the Spike app is installed from the Freshdesk Marketplace, syncing notes and statuses is automatic and happens in real time. Any updates made on one platform reflect immediately on the other.

### Automatically Creating Tickets  

Spike’s **Playbooks** automate ticket creation during incident triggers. Once set up, incident details, timestamps, and other critical data are sent to Zendesk automatically.  


## How to Use?

### Manual Ticket Creation  

From the Spike dashboard, select one or more incidents and create Freshdesk tickets.  

### Automatically Creating Tickets  

Use Spike’s **Playbooks** to automate ticket creation during incident triggers. Incident details, timestamps, and other critical data are sent to Freshdesk automatically.

---

## FAQs  

<details>
<summary> Who can set up and create tickets? </summary>
Anyone in your organization can set up the integration and create tickets. No special permissions are required.
</details>
<details>
<summary> Are any extra permissions needed for automating Playbooks? </summary>
You will need the manual setup with Freshdesk to automate at [Settings > General > Helpdesk Integrations](https://app.spike.sh/settings/general/organisation#org--helpdesk-ticket-management).  Once the integration is connected, no additional setup is needed for Playbooks. Users can define whether to create tickets with an "Open" or "New" status.
</details>
<details>
<summary> Can Freshdesk users create incidents on Spike? </summary>
Yes. Make sure to install the Spike app from [Freshdesk's marketplace](https://www.freshworks.com/apps/spike/)
</details>
<details>
<summary> Can I link multiple incidents to one Freshdesk ticket? </summary>
No, each incident is linked to a unique Freshdesk ticket for better traceability.
</details>