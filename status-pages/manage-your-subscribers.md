---
description: You can choose to import, delete subscribers for your status page
---

# Manage your subscribers

Your users or visitors can choose to subscribe to your status page to receive real-time status updates to incidents and maintenances.

### How to subscribe?

Users and visitors to your status page can subscribe by entering their email. The subscribe button will be visible on public and private status pages.&#x20;

{% hint style="info" %}
Private status page subscribers must have a Spike account
{% endhint %}

### Configure subscriber control

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

### Importing subscribers

Visit the **subscribers** section from the sidebar ([link](https://statuspage.spike.sh/susbcribers)) and you will find a list of all your active subscribers. You can also choose to delete a subscriber and import more by uploading a comma-separated values (csv) file with **Email** in the header field. No other fields from your csv are processed.

{% hint style="info" %}
Subscribers are scoped to each of [your status pages](#user-content-fn-1)[^1] and cannot be shared.
{% endhint %}

### Keep your subscribers informed

When adding status updates or creating new incidents, enable the option to notify subscribers. They will receive email updates. The notify option is **enabled as default**.&#x20;

[^1]: You can have multiple status pages. They can be private or public. To share subscribers among your status pages, consider uploading the csv to every page

