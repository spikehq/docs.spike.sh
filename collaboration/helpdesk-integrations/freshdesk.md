---
description: >
  Integrate Spike with Freshdesk to seamlessly create support tickets from incidents.
---

# Freshdesk Integration

<figure><img src="../../.gitbook/assets/helpdesk-integrations/freshdesk-cover.png" alt=""><figcaption></figcaption></figure>

Spike’s Freshdesk integration is a simple, one-way setup that allows you to create Freshdesk tickets from incidents on Spike. Whether done manually or automatically via Playbooks, this integration ensures incident details are captured in your helpdesk system efficiently.

---

## Features

- **One-Way Integration**: Create tickets in Freshdesk from Spike incidents.  
- **Automated Ticket Creation**: Use [Playbooks](../../playbooks/introduction-to-playbooks.md) to automate ticket creation.  
- **Manual Ticket Creation**: Select one or more incidents from the Spike dashboard and create tickets in Freshdesk.  

---

## One-Step Setup

This straightforward setup connects Spike to Freshdesk using an API token.

**Steps to Set Up**:  
{% tabs %}
{% tab title="Setup with API token" %}
1. Go to [Settings > General > Helpdesk Integrations](https://app.spike.sh/settings/general/organisation#org--helpdesk-ticket-management).  
2. Enter your Freshdesk API token and subdomain.  
3. Save the configuration to start sending incidents to Freshdesk.  
{% endtab %}
{% endtabs %}

---

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
<summary> Are there any extra permissions needed for Playbooks? </summary>
Once the integration is set up, no additional permissions are needed for Playbooks. Users can define whether to create tickets with an "Open" or "New" status.
</details>
<details>
<summary> Can Freshdesk users create incidents on Spike? </summary>
Not yet. Currently, this is a one-way integration from Spike to Freshdesk. Bi-directional sync is under development.
</details>
<details>
<summary> Can I link multiple incidents to one Freshdesk ticket? </summary>
No, each incident is linked to a unique Freshdesk ticket for better traceability.
</details>