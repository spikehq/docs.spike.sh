---
description: Get incident alerts and on-call shift notifications on Telegram. Acknowledge or resolve incidents with a simple command.
---

# Telegram

Spike's Telegram bot is [@SpikeHQ\_bot](https://t.me/SpikeHQ\_bot). Run `/connect` to link your Spike account and start receiving alerts.

You can receive alerts for:

- New incidents
- On-call shift start
- On-call shift end

<figure><img src="../.gitbook/assets/Screenshot from 2022-07-22 12-34-47.png" alt="Incident alert on Telegram from Spike"><figcaption><p>Incident alert on Telegram.</p></figcaption></figure>

Add Telegram to your [escalation policies](https://app.spike.sh/escalations) to receive incident alerts. For on-call shift alerts, visit [On-call settings](https://app.spike.sh/settings/personal-on-call).

{% hint style="success" %}
Use `/ack` or `/acknowledge` to acknowledge an incident. Use `/res` or `/resolve` to resolve one.
{% endhint %}

{% hint style="info" %}
Telegram can only be connected to one Spike account at a time.
{% endhint %}
