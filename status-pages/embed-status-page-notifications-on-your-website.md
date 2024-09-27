---
description: >-
  To keep your visitors and/or users informed, you can choose to embed
  notifications for incidents and planned maintenance on your website
---

# Embed status page notifications on your website

### Status page notifications

Your operational status is crucial to all your users, and maintaining transparency is essential. Instead of having users repeatedly visit your status page to check updates, you can proactively keep them informed using our embed feature.

The embed feature displays live notifications of status page updates directly on any of your websites. Below is an example of how the notification looks:

![example notification for upcoming planned maintenance](<../.gitbook/assets/image (144) (1).png>)

#### Example use case:

1. **SaaS**: Embed maintenance notifications on your dashboard to keep users informed and prepared.
2. **Crypto Platforms**: Add notifications to trading dashboards for real-time transparency.
3. **Home Page**: Use your homepage to display important updates for visitors.

### When do the notifications appear?

Once the page load is complete, the notification appears within 5 seconds to your visitor. By default, it shows up in the bottom-right corner, but you can configure its position to fit your preferences.

{% hint style="success" %}
Notifications support planned maintenances and are shown once every visitor
{% endhint %}

### Set up

To set up notifications, visit **Widgets** section from the sidebar. Copy the code and place it at the end of the `<body>` tag on every page where you want the notification to appear.

While creating or editing a planned maintenance, enable **Notify visitors.**&#x20;

![](<../.gitbook/assets/Image 2022-05-12 17-21-38.png>)

### Security

Select your domains and them to allowlist for the widgets to load. Use an asterik(\*) to allow all subdomains - \*.example.com. While debugging, we suggest using a provider like [ngrok](https://ngrok.com) and temporarily adding their domains to test.&#x20;
