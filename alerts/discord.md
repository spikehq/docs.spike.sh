---
description: Spike sends incident alerts to Discord channels. Set it up using a webhook.
---

# Discord

<figure><img src="../.gitbook/assets/image (78).png" alt="Incident alert on Discord from Spike"><figcaption><p>Incident alert on Discord.</p></figcaption></figure>

## How to set up

{% stepper %}
{% step %}
### Create a webhook in Discord

Navigate to your channel's **Settings** > **Integrations** and select **Webhooks**.

<figure><img src="../.gitbook/assets/discord-1.png" alt="Webhook settings in a Discord channel"><figcaption><p>Webhook settings in a Discord channel.</p></figcaption></figure>
{% endstep %}
{% step %}
### Name and copy the webhook URL

Name the webhook **Spike** and copy the URL. You can use the badge below as the avatar.

{% file src="../.gitbook/assets/spike-badge-400.png" %}
Spike badge for Discord
{% endfile %}

<figure><img src="../.gitbook/assets/discord-2.png" alt="Naming the webhook and copying the URL"><figcaption><p>Name the webhook and copy the URL.</p></figcaption></figure>
{% endstep %}
{% step %}
### Paste the URL in Spike

Go to [Settings > Organisation > Alerts](https://app.spike.sh/settings/general/alerts), paste the webhook URL in the Discord setup, and save.

<figure><img src="../.gitbook/assets/discord-3.png" alt="Saving the Discord webhook URL in Spike"><figcaption><p>Paste the webhook URL in Spike settings.</p></figcaption></figure>

{% hint style="success" %}
Once saved, Spike sends a test message to your Discord channel.
{% endhint %}
{% endstep %}
{% step %}
### Add Discord to your escalation policy

Select Discord as a step in your [escalation policy](https://app.spike.sh/escalations).

<figure><img src="../.gitbook/assets/image (79).png" alt="Discord as a step in an escalation policy"><figcaption><p>Discord as a step in an escalation policy.</p></figcaption></figure>
{% endstep %}
{% endstepper %}

## Remove a Discord channel

You can remove a Discord channel from Spike, but make sure it's not part of any active escalation policy before doing so.

{% hint style="info" %}
Discord doesn't support acknowledging or resolving incidents from the channel. Use the Spike dashboard, phone, SMS, or other alert channels to take action.
{% endhint %}
