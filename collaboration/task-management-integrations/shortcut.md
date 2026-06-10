---
description: Connect Shortcut to Spike and create stories directly from incidents.
---

# Shortcut

Spike's Shortcut integration creates stories from incidents. Stories cover follow-up work like root cause analysis or longer-term fixes that go beyond immediate incident response.

## How to set up

Go to [Settings > Organisation](https://app.spike.sh/settings/general/organisation) and find the **Task management integrations** section. Click **Connect** and enter your Shortcut API key. Spike validates the key and completes the connection.

{% hint style="info" %}
Once set up, every team member in your account can create stories in Shortcut from Spike. Spike does not read any data from your Shortcut account.
{% endhint %}

## How to create a story

There are two ways to create a Shortcut story from an incident:

1. From the incidents table

<figure><img src="../../.gitbook/assets/CleanShot 2024-05-24 at 09.54.03@2x.png" alt="Create a Shortcut story from the incidents table"><figcaption><p>Create a story from the incidents table.</p></figcaption></figure>

2. From the incident details page

<figure><img src="../../.gitbook/assets/CleanShot 2024-05-24 at 09.59.16@2x (1).png" alt="Create a Shortcut story from the incident details page"><figcaption><p>Create a story from the incident details page.</p></figcaption></figure>

You can pre-configure story details before sending to Shortcut.

<figure><img src="../../.gitbook/assets/CleanShot 2024-05-24 at 09.54.46@2x.png" alt="Pre-configure Shortcut story details in Spike"><figcaption><p>Pre-configure story details.</p></figcaption></figure>

<figure><img src="../../.gitbook/assets/CleanShot 2024-05-24 at 09.56.52@2x.png" alt="Create multiple Shortcut stories from multiple incidents"><figcaption><p>Create multiple stories from multiple incidents.</p></figcaption></figure>

## Automate with Playbooks

Use [Playbooks](../../playbooks/introduction-to-playbooks.md) to automate creating Shortcut stories. For example, create a story automatically for every new incident with a specific title or on a specific service.

<figure><img src="../../.gitbook/assets/CleanShot 2024-05-24 at 10.20.54@2x (1).png" alt="Automate Shortcut story creation with Spike Playbooks"><figcaption><p>Automate Shortcut stories with Playbooks.</p></figcaption></figure>

Team members with the right permissions can also run the Playbook manually.

<figure><img src="../../.gitbook/assets/CleanShot 2024-05-24 at 10.24.32.gif" alt="Run a Shortcut Playbook manually in Spike"><figcaption></figcaption></figure>
