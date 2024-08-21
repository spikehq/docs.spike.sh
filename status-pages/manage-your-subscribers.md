---
description: Subscribers can stay updated with incidents and maintenances on your status page via email or rss. RSS updates can be used for automation as well. 
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

Your users or visitors can choose to subscribe to your status page to receive real-time updates on incidents and maintenance events. Email subscribers will receive customized, branded emails that reflect your brand’s identity. Set up branding options [under themes](https://statuspage.spike.sh/themes).

## How to subscribe?
Users and visitors to your status page can subscribe by entering their email or using RSS/Atom feed.

### Email Subscription
Email susbcribers is commonly used and once subscriberd they will not receive a confirmation email. The subscribe button is visible on both public and private status pages.&#x20;

{% hint style="info" %}
Email subscribers for private status page must have a Spike account
{% endhint %}

### RSS Subscription
Users can now subscribe to your status page via RSS or Atom feed. This allows for more flexible integration with various platforms and tools. Private status page feed urls comes with a unique token.

**RSS for Slack and Microsoft Teams**: Extend your status updates to Slack or Microsoft Teams channels by using RSS feeds, keeping your team informed directly within their preferred communication tools.
**Automate with RSS**: Use RSS feeds to automate status updates across different systems, ensuring your users are always in the loop without manual intervention.

{% tabs %}
{% tab title="Email" %}
<figure><img src="../.gitbook/assets/subscriber option email.png" alt=""><figcaption></figcaption></figure>
{% endtab %}

{% tab title="RSS / Atom" %}
<figure><img src="../.gitbook/assets/subscriber option rss.png" alt=""><figcaption></figcaption></figure>
{% endtab %}

{% tab title="Slack" %}
<figure><img src="../.gitbook/assets/subscriber option slack.png" alt=""><figcaption></figcaption></figure>
{% endtab %}

{% tab title="Microsoft Teams" %}
<figure><img src="../.gitbook/assets/subscriber option microsoft teams.png" alt=""><figcaption></figcaption></figure>
{% endtab %}
{% endtabs %}

## Configure subscriber control

Under Status page > <img src="../.gitbook/assets/image.png" alt="" data-size="line"> > Security & Access ([link](https://statuspage.spike.sh/configure/security-access)), set up susbcription controls. Options are

* Allow new subscribers (enabled by default)
* Control email domains allowed for subscription (subdomains should be added separately)
* Do not allow unsubscribe (subscribers can’t unsubscribe themselves)



| Allow new subscribers                         | Subscribers with domains                                               | Who can subscribe?                              |
| --------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------- |
| Enabled                                       | _<mark style="color:orange;">Disabled</mark>_                          | Anyone can subscribe                            |
| Enabled                                       | Enabled                                                                | Specific email domains are allowed to subscribe |
| _<mark style="color:orange;">Disabled</mark>_ | _<mark style="background-color:yellow;">Automatically disabled</mark>_ | No-one                                          |

{% hint style="warning" %}
Consider your options carefully before making changes.
{% endhint %}

## Importing subscribers

Visit the **subscribers** section from the sidebar ([link](https://statuspage.spike.sh/susbcribers)) and you will find a list of all your active subscribers. You can also choose to delete a subscriber and import more by uploading a comma-separated values (csv) file with **Email** in the header field. No other fields from your csv are processed.

{% hint style="info" %}
Subscribers are scoped to each of [your status pages](#user-content-fn-1)[^1] and cannot be shared.
{% endhint %}

## Keeping your subscribers informed

When adding status updates or creating new incidents, enable the option to notify subscribers. They will receive email and rss updates. The notify option is **enabled as default**.&#x20;

[^1]: You can have multiple status pages. They can be private or public. To share subscribers among your status pages, consider uploading the csv to every page

