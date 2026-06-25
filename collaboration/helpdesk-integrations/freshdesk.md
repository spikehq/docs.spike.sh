---
description: Connect Freshdesk to Spike to create tickets from incidents and manage them directly from Freshdesk.
---

<figure><img src="../../.gitbook/assets/helpdesk-integrations/freshdesk-cover.png" alt="Freshdesk integration with Spike"><figcaption></figcaption></figure>

# Freshdesk

Spike's Freshdesk integration creates tickets from incidents. Freshdesk users can also check and act on incidents without leaving Freshdesk.

{% embed url="https://www.youtube.com/watch?v=f3EnbMhmGYM" %}

## Set up

Freshdesk can be connected to Spike in two ways.

The first is an API connection. Use this to create tickets in Freshdesk from Spike incidents. This is one-way and does not sync statuses or notes.

The second is the Spike app from the Freshdesk Marketplace. This allows Freshdesk users to check incidents and take action from Freshdesk.

### API connection

1. Go to [Settings > General > Helpdesk Integrations](https://app.spike.sh/settings/general/organisation#org--helpdesk-ticket-management)
2. Enter your Freshdesk API token and subdomain

### Freshdesk Marketplace app

1. Install the Spike app from [Freshdesk Marketplace](https://www.freshworks.com/apps/spike)
2. Generate and copy a new API token from the [Spike dashboard](https://app.spike.sh/api)
3. Follow the instructions on Freshdesk to connect Spike

## How to use

### Create tickets manually

From the incidents table, select one or more incidents and create a Freshdesk ticket.

{% hint style="info" %}
Tickets created this way are not synced with statuses or notes. To act on incidents from Freshdesk, use the Spike app (Freshdesk Marketplace app).
{% endhint %}

### Automate ticket creation with Playbooks

Use [Playbooks](../../playbooks/introduction-to-playbooks.md) to automate ticket creation when an incident triggers. Incident details and timestamps are sent to Freshdesk automatically.

## FAQs

### Who can set up the integration and create tickets?

Anyone in your organization can set up the integration and create tickets. No special permissions are required.

### Can I link multiple incidents to one Freshdesk ticket?

Yes. Multiple incidents can be linked to a single Freshdesk ticket.
