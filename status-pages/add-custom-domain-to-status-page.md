---
description: You can point your own domain to your status page on Spike.sh.
---

# Add custom domain to status page

#### Step 1: Add your domain to the status page

You can add your custom domain (e.g. "status.apple.com") to a status page.

#### Step 2: Make changes in your domain settings

Please add this CNAME (for the domain you added above) to your DNS - `alias.spike.sh`.&#x20;

We will add your domain to our SAN certificate so your status page gets a SSL certificate and loads correctly on HTTPS.&#x20;

If you are on **Cloudflare**, please disable the proxy.

It will take about 10 minutes for these DNS changes to propagate and start showing the status page on your domain.&#x20;

If your domain does not show your status page after some time, please email us at [support@spike.sh](mailto:support@spike.sh).
