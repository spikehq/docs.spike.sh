---
description: Connect your Twilio number to Spike to enable Live Call Routing.
---

<figure><img src="../.gitbook/assets/live-call-routing/twilio-banner.png" alt="Configure Twilio for Live Call Routing on Spike"><figcaption></figcaption></figure>

# Configure your Twilio number for Live Call Routing

Spike provides a webhook URL during Live Call Routing setup. Follow these steps to connect it with your Twilio number.

{% stepper %}
{% step %}
### Sign in to Twilio

In your Twilio Console, go to **Develop → Phone Numbers → Manage → Active Numbers**.
If you don't have a phone number, buy one from the Twilio dashboard first.
{% endstep %}
{% step %}
### Select your phone number

Choose the number you want to use with Live Call Routing.
{% endstep %}
{% step %}
### Configure incoming call settings

Scroll down to the **Voice** section.

- For **When a call comes in**, select **Webhook** from the dropdown.
- Paste your **Spike webhook URL** in the field.
- Set the HTTP method to **HTTP POST**.
{% endstep %}
{% step %}
### Configure the fallback handler (optional)

In the same section, find **If primary handler fails**.

- Select **Webhook** from the dropdown.
- Paste the **same Spike webhook URL**.
- Set the HTTP method to **HTTP POST**.

{% hint style="info" %}
Save your changes by scrolling to the bottom of the page and clicking Save.
{% endhint %}
{% endstep %}
{% step %}
### Access call recordings

When call recording is enabled, Spike retrieves recordings directly from your Twilio account.

- In your Twilio Console, go to **Develop → Voice → Settings → General**.
- Under **HTTP Basic Authentication for media access**, select **Disable**.
{% endstep %}
{% endstepper %}

<figure><img src="../.gitbook/assets/live-call-routing/twilio-screenshot-settings.png" alt="Twilio webhook settings for Live Call Routing"><figcaption></figcaption></figure>

Once saved, your Twilio number will forward all incoming calls to Spike. Spike handles routing, fallbacks, and call logging automatically.

{% hint style="info" %}
Need help connecting your Twilio account? Reach out to [support@spike.sh](mailto:support@spike.sh).
{% endhint %}
