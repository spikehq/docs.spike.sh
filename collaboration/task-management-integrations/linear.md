---
description: >-
  Send your incident data to Linear to plan, collaborate, and add to your next
  cycle
---

# Linear
The Spike integration for Linear automates the flow of incidents, status updates, and comments between both platforms, providing a centralized approach to managing incidents. It streamlines your incident response process, helping resolve incidents faster while keeping everyone in sync.

Main use cases -

1. Incident status is synced with Linear issue status
2. Comments on either platforms are synced
3. Issues can be created either manually or automatically

## How it works
The Spike integration for Linear allows incidents to be sent directly from Spike to Linear, creating a seamless connection between your incident response system and task management. Once an incident is triggered in Spike, it automatically appears as an issue in Linear, where it can be tracked and addressed.

Status synchronization is key to this integration. When an issue is marked as "Done" in Linear, Spike automatically updates the corresponding incident to "Resolved." Likewise, when an issue is moved to "In Progress" in Linear, Spike pauses alerts by marking the incident as "Acknowledged." This bidirectional sync ensures smooth management of incidents across both platforms. Comments made on incidents in either platform are also synced, ensuring your team stays up-to-date.

Incidents from Spike can be sent to Linear manually or automatically using playbooks. All created issues will be automatically synced with Spike's incidents.

---

### Set up

To connect [Linear](https://linear.app), head to [Settings > Organisation](https://app.spike.sh/settings/general/organisation) and find the Task management integrations section. The connect will take you to Linear to connect with Spike.

<figure><img src="../../.gitbook/assets/image (2) (1) (2).png" alt=""><figcaption></figcaption></figure>

You can also alternatively set it up from the Incidents table or from the incident details page

{% hint style="info" %}
Once set up, all team members across your account can create tickets in Linear directly from Spike.sh.
{% endhint %}

### How to create an issue on Linear from Spike.sh?

1. **Manually create issues**

Select incidents, Locate the Linear button, and follow along the next steps

<figure><img src="../../.gitbook/assets/image (6).png" alt=""><figcaption><p>Create an issue on Linear</p></figcaption></figure>

2. **Automate creating issues**

With [Playbooks](playbooks/introduction-to-playbooks), you can pre-configure and automate creating Linear issues. When creating a playbook, select Create an issue on, then Linear, and set up. 


<figure><img src="../../.gitbook/assets/image (11) (1).png" alt=""><figcaption></figcaption></figure>
