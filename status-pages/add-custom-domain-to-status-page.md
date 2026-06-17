---
description: Host your status page on a custom subdomain like status.example.com.
---

# Add a custom domain to your status page

## Step 1: Add your domain in Spike

Click **Host** in the top-right menu on your status page.

<figure><img src="../.gitbook/assets/add custom domain 1 (1).png" alt="Host option in Spike status page settings"><figcaption></figcaption></figure>

Enter your custom domain, for example `status.example.com`.

<figure><img src="../.gitbook/assets/add custom domain 2.png" alt="Add custom domain to Spike status page"><figcaption></figcaption></figure>

## Step 2: Update your DNS settings

In your domain's DNS settings, add a CNAME record pointing to `alias.spike.sh`.

Spike adds your domain to its SAN certificate so your status page loads correctly over HTTPS.

DNS changes can take up to 10 minutes to propagate.

{% hint style="info" %}
If your status page does not appear on your custom domain after 30 minutes, contact [support@spike.sh](mailto:support@spike.sh).
{% endhint %}