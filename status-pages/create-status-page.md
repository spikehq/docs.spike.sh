---
description: Create a status page to communicate the health of your system components to customers.
---

# Create a status page

A status page is a public-facing page that shows the current status of your system components: website, API, mobile app, or any service your customers depend on.

To create one, open the Status Pages dashboard and click **Create status page** from the dropdown in the top navigation.

<figure><img src="../.gitbook/assets/create status page 1.png" alt="Create status page dropdown in Spike"><figcaption></figcaption></figure>

## Step 1: Add status page details

<figure><img src="../.gitbook/assets/create status page 2 - 1.png" alt="Status page details form in Spike"><figcaption></figcaption></figure>

Fill in the name and description. The subdomain you set here becomes the URL where your status page is publicly accessible.

Upload a logo so customers can identify the page as yours.

Set the visibility to **Public** to make the page accessible to anyone with the link.

## Step 2: Add components

<figure><img src="../.gitbook/assets/create status page 2 - 2.png" alt="Add components to status page in Spike"><figcaption></figcaption></figure>

Components represent the parts of your system you want to display status for: website, API, mobile app, or individual microservices.

For each component, add a name, description, and start date. The start date determines how far back historical stats are shown.

Set the initial status for each component. The available states are:

- Operational
- Degraded performance
- Partial outage
- Critical outage
- Planned maintenance

<figure><img src="../.gitbook/assets/create status page 3.png" alt="New status page in the Spike dashboard"><figcaption></figcaption></figure>

Your new status page appears in the dashboard once created.

{% hint style="info" %}
Next, [style your status page](style-your-status-page.md) with your brand colors, or [add a custom domain](add-custom-domain-to-status-page.md).
{% endhint %}