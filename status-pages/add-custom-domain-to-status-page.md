---
description: You can point your own domain to your status page on Spike.sh.
---

# Add custom domain to status page

#### Step 1: Make changes in your domain settings

In the settings for the domain you added above, add this CNAME to your DNS - `alias.spike.sh`.&#x20;

We will add your domain to our SAN certificate so your status page gets a SSL certificate and loads correctly on HTTPS.&#x20;

{% hint style="warning" %}
If you are on **Cloudflare**, please disable the proxy.
{% endhint %}

It will take about 10 minutes for these DNS changes to propagate and start showing the status page on your domain.&#x20;

If your custom domain does not show your status page after 30 minutes, email us at [support@spike.sh](mailto:support@spike.sh) and we will help you set this up.

#### Step 2: Add your domain to the status page on Spike.sh

{% hint style="info" %}
Ensure you have implemented changes in your domains settings (step 1) before proceeding
{% endhint %}

Click on the "**Host**" option in the top-right menu for your status page.

![](<../.gitbook/assets/add custom domain 1 (1).png>)

Add your custom domain (e.g. "status.apple.com") that should show your status page.&#x20;

![](<../.gitbook/assets/add custom domain 2.png>)

