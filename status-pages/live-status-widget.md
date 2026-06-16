---
description: Embed a live status widget on your website to show real-time system health.
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

<figure><img src="../.gitbook/assets/Live status widget.png" alt="Live status widget embedded on a website"><figcaption></figcaption></figure>

The live status widget displays your system's current health directly on your website. Paste the code snippet into any page: footer, contact page, support docs, header dropdown, or sidebar.

## Status priority order

The widget shows the highest-priority status across all your components:

1. Planned Maintenance
2. Critical Outage
3. Partial Outage
4. Degraded Performance
5. Operational

For example, if components A, B, and C are in _Degraded Performance_ and component D is in _Critical Outage_, the widget shows _Critical Outage_.

## Customisation

Spike supports Light, Dark, and System themes out of the box. You can override Spike's default CSS to modify the look and feel. All HTML classes use the **`spike--`** prefix.

### How to enable

1. Visit your status page dashboard at [https://statuspage.spike.sh](https://statuspage.spike.sh)
2. Navigate to **Widget** from the sidebar
3. Enable **Embed Live Status Page Widget** <img src="../.gitbook/assets/enable-icon-for-docs.png" alt="" data-size="line">
4. Click **Get code** and paste it in your `<body>` tag

You can initialise the widget with configuration options:

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
Adjust the loading and initialisation to fit your frontend stack.
{% endhint %}

{% tabs %}
{% tab title="Large rounded corners" %}
<figure><img src="../.gitbook/assets/Live status widget rounded.png" alt="Live status widget with large rounded corners"><figcaption></figcaption></figure>
{% endtab %}

{% tab title="Small rounded corners" %}
<figure><img src="../.gitbook/assets/Live status widget square.png" alt="Live status widget with small rounded corners"><figcaption></figcaption></figure>
{% endtab %}
{% endtabs %}

## Security

Add your domains to the allowlist so the widget loads correctly. Use `*.example.com` to allow all subdomains. For local testing, add your testing domain (such as an [ngrok](https://ngrok.com) URL) to the allowlist temporarily.