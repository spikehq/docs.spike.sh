---
description: War rooms create instant meeting links tied to incidents, so your team can join a call without scrambling for a link.
---

<figure><img src="../.gitbook/assets/Video integrations.png" alt="War rooms on Spike"><figcaption></figcaption></figure>

# War rooms

When an incident triggers and your team needs to coordinate on a call, war rooms create an instant meeting link tied to the incident. Everyone knows exactly where to join.

Spike supports:

1. Google Meet
2. Zoom _(coming soon)_
3. Your personal room link (Daily.co, Gather.town, or any URL)

## Set up

Go to **Organization Settings > Video Conferencing** and connect Google Meet or add a personal room link. For a personal room, paste the link and it's ready to use.

<figure><img src="../.gitbook/assets/collaboration/collaboration-war-rooms-setup-1.png" alt="Video Conferencing settings in Spike Organization Settings"><figcaption><p>Video Conferencing in Organization Settings.</p></figcaption></figure>

### How Google Meet links work

Spike connects to your Google account and requests permission to access Google Calendar. When a war room is created, Spike creates a calendar event on your account and generates a Meet link from it.

{% hint style="success" %}
Spike does not read your calendar events or store them. It only creates a calendar event to generate the Meet link.
{% endhint %}

## Create a war room

Open the incident page and click **Start Google Meet** from the Quick Actions menu.

<figure><img src="../.gitbook/assets/collaboration/collaboration-war-rooms-create-1.png" alt="Start Google Meet from the incident page Quick Actions menu"><figcaption><p>Start a war room from the incident page.</p></figcaption></figure>

## Invite others to join

When creating the war room, you can invite current responders, escalation members, or the entire team. You can also search for specific teammates to add.

<figure><img src="../.gitbook/assets/collaboration/collaboration-war-rooms-invite-1.png" alt="Invite members while creating a war room in Spike"><figcaption><p>Invite members while creating the war room.</p></figcaption></figure>

{% hint style="warning" %}
Spike's Google App is currently pending verification for extended access to calendar scopes.
{% endhint %}
