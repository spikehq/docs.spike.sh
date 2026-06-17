---
description: Get incident alerts and on-call shift notifications on WhatsApp. Acknowledge or resolve incidents without leaving WhatsApp.
---

# WhatsApp

You can receive alerts for:

- New incidents
- Acknowledge timeout
- On-call shift start
- On-call shift end

<figure><img src="../.gitbook/assets/WhatsApp alerts.png" alt="WhatsApp alerts from Spike"><figcaption><p>WhatsApp alerts from Spike.</p></figcaption></figure>

## How to set up

WhatsApp is enabled by default for all phone numbers. Add it to your escalation policies or configure on-call notifications in [On-call settings](https://app.spike.sh/settings/personal-on-call).

<figure><img src="../.gitbook/assets/alerts/alerts-whatsapp-escalation-policy-1.png" alt="WhatsApp in an escalation policy"><figcaption><p>Adding WhatsApp to an escalation policy.</p></figcaption></figure>

{% hint style="success" %}
To acknowledge or resolve an incident, reply to the Spike WhatsApp bot with `ack test-123` or `res test-123`, where `test-123` is the incident ID.
{% endhint %}

If you prefer a different messaging bot, Spike also has a Telegram integration:

{% content-ref url="telegram.md" %}
[telegram.md](telegram.md)
{% endcontent-ref %}
