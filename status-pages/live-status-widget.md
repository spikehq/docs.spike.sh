---
description: Showcase live status with the embedded widget
layout:
  title:
    visible: true
  description:
    visible: true
  tableOfContents:
    visible: true
  outline:
    visible: true
  pagination:
    visible: true
---

# Live status widget

<figure><img src="../.gitbook/assets/Live system widget.png" alt=""><figcaption></figcaption></figure>

This widget showcases the latest system health and embeds in your html by simply pasting our code.  It is traditionally placed on website's footer, contact pages, and support documentations and it is not uncommon to place it under navigation such as header dropdown or sidebars. The choice is yours.&#x20;

### Status priority order

The status is displayed based on the highest priority of your component's statuses. Below is the priority list from highest to lowest.

1. Planned Maintenances
2. Critical Outage
3. Partial Outage
4. Degraded Performance
5. Operational

Consider your status page with 4 components A, B, C, and D. If components A, B, and C are in Degraded performance and D is in critical outage then widget will show Critical Outage. This is how the above priority comes to play in the embedded widget.&#x20;

***

### Customisation

Spike offers out of the box support for Light, Dark, and System modes. You can further override our default css to modify the look and feel. All html classes are prefixed with **`spike--`** class names.

{% tabs %}
{% tab title="How to enable?" %}
1. Visit your status page dashboard at [https://statuspage.spike.sh](https://statuspage.spike.sh)
2. Navigate to **Widget** from the sidebar
3. Enable Embed Live Status Page Widget <img src="../.gitbook/assets/enable-icon-for-docs.png" alt="" data-size="line">
4. Click **Get code** and paste it in your `<body>` tag
{% endtab %}
{% endtabs %}



Below is an example of snippet on initialising with configuration options.&#x20;

```javascript
<script>
    // Initialize the widget with custom settings
    Spike.initializeStatusWidget({
        element: "#spike-live-status", // set your html element's unique identifer
        statusPageId: "<your unique id>", // do not change this
        theme: "system", // Other options -> light, dark
        console: true // Set to 'false' to disable error logs
    })
</script>
```

{% hint style="info" %}
Please customise it to meet your frontend stack's needs on loading and initialising the snippet.
{% endhint %}

{% tabs %}
{% tab title="Large rounded corners" %}
<figure><img src="../.gitbook/assets/Live system widget large rounds.png" alt=""><figcaption></figcaption></figure>
{% endtab %}

{% tab title="Small rounded corners" %}
<figure><img src="../.gitbook/assets/Live system widget small rounds.png" alt=""><figcaption></figcaption></figure>
{% endtab %}
{% endtabs %}

***

### Security

Select your domains and them to allowlist for the widgets to load. Use an asterik(\*) to allow all subdomains - \*.example.com. While debugging, we suggest using a provider like [ngrok](https://ngrok.com) and temporarily adding their domains to test.&#x20;

