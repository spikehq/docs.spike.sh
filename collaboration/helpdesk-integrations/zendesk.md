---
description: Connect Zendesk to Spike for bidirectional sync of incidents, tickets, notes, and statuses.
---

<figure><img src="../../.gitbook/assets/helpdesk-integrations/zendesk-cover.png" alt="Zendesk integration with Spike"><figcaption></figcaption></figure>

# Zendesk

Connect Spike with Zendesk for two-way incident and ticket management. Create tickets, sync notes and statuses, and trigger incidents without leaving Zendesk.

## Set up

Zendesk can be connected to Spike in two ways.

The first is an API connection. Use this to send incidents from Spike to Zendesk and create tickets.

The second is the Spike app from the Zendesk Marketplace. This adds full bidirectional sync. Incidents, notes, and statuses flow between both platforms. Zendesk users can also trigger incidents without a Spike account.

### API connection

1. Go to [Settings > General > Helpdesk Integrations](https://app.spike.sh/settings/general/organisation#org--helpdesk-ticket-management)
2. Enter your Zendesk API token and Zendesk subdomain

### Zendesk Marketplace app

1. Install the Spike app from [Zendesk Marketplace](https://www.zendesk.com/in/marketplace/apps/support/1084861/spike/?queryID=97f8205f39b71c03f3bb6c8512a8e67a)
2. Generate and copy a new API token from the [Spike dashboard](https://app.spike.sh/api)
3. Follow the instructions on Zendesk to connect Spike

## How to use

### Create tickets manually

From the incidents table, select one or more incidents and create a Zendesk ticket.

{% hint style="info" %}
Tickets created this way are not synced with statuses or notes. For full sync, use the Spike app in Zendesk (Zendesk Marketplace app).
{% endhint %}

### Automate ticket creation with Playbooks

Use [Playbooks](../../playbooks/introduction-to-playbooks.md) to automate ticket creation when an incident triggers. Incident details and timestamps are sent to Zendesk automatically.

## FAQs

### Who can set up the integration and create tickets?

Anyone in your organization can set up the integration and create or sync tickets with incidents. No special permissions are required.

### Can I link multiple incidents to one Zendesk ticket?

Yes. Multiple incidents can be linked to a single Zendesk ticket.
