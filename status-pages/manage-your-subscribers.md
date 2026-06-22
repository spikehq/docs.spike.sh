---
description: Let visitors subscribe to your status page for real-time updates on incidents and maintenance events.
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

# Manage your subscribers

Visitors subscribe directly from your status page using email, RSS/Atom, Slack, or Microsoft Teams. From your settings, you can control who can subscribe, restrict by domain, and import subscribers in bulk.

## How to subscribe

{% tabs %}
{% tab title="Email" %}
<figure><img src="../.gitbook/assets/subscriber option email.png" alt="Email subscription option on Spike status page"><figcaption></figcaption></figure>
{% endtab %}

{% tab title="RSS / Atom" %}
<figure><img src="../.gitbook/assets/subscriber option rss.png" alt="RSS/Atom subscription option on Spike status page"><figcaption></figcaption></figure>
{% endtab %}

{% tab title="Slack" %}
<figure><img src="../.gitbook/assets/subscriber option slack.png" alt="Slack subscription option on Spike status page"><figcaption></figcaption></figure>
{% endtab %}

{% tab title="Microsoft Teams" %}
<figure><img src="../.gitbook/assets/subscriber option microsoft teams.png" alt="Microsoft Teams subscription option on Spike status page"><figcaption></figcaption></figure>
{% endtab %}
{% endtabs %}

### Email subscription

Email is the most common subscription method. Subscribers do not receive a confirmation email after subscribing. The subscribe button appears on both public and private status pages. Email notifications follow your status page theme. Set up branding [under Themes](https://statuspage.spike.sh/themes).

{% hint style="info" %}
Subscribers on private status pages must have a Spike account.
{% endhint %}

### RSS subscription

Subscribers can use an RSS or Atom feed to receive updates. Private status page feed URLs include a unique token.

Use the RSS feed to post status updates to Slack or Microsoft Teams channels, or to automate updates across other systems.

## Configure subscriber control

Open **Security & Access** in your status page settings ([link](https://statuspage.spike.sh/configure/security-access)) to control who can subscribe:

- **Allow new subscribers**: enabled by default
- **Restrict by email domain**: only specified domains can subscribe (add subdomains separately)
- **Disable unsubscribe**: subscribers cannot remove themselves

| Allow new subscribers | Subscribers with domains | Who can subscribe? |
| --------------------- | ------------------------ | ------------------ |
| Enabled | Disabled | Anyone |
| Enabled | Enabled | Specified email domains only |
| Disabled | Automatically disabled | No one |

## Import subscribers

Open the **Subscribers** section from the sidebar ([link](https://statuspage.spike.sh/subscribers)) to see all active subscribers, delete individual subscribers, or import new ones via CSV. The CSV must include an **Email** header. No other fields are processed.

{% hint style="info" %}
Subscribers are scoped to each status page and cannot be shared across pages. To add the same subscribers to multiple pages, upload the CSV to each one.
{% endhint %}

## Notify subscribers

When creating incidents or posting updates, enable the notify option to send email and RSS updates to subscribers. This option is enabled by default.