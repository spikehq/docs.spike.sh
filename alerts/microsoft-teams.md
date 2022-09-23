---
description: Get alerts on your Microsoft Teams from Spike.sh
---

# Microsoft Teams

## Get Teams alerts from Spike.sh

The alert messages on Microsoft Teams (referred to as Teams from here on) comes with gists for you and your team to quickly learn about the incident.&#x20;

![How alerts look on Teams](<../.gitbook/assets/image (59).png>)

## How to set up Teams?

**Step 1 - Setup incoming webhook**

Go to the Apps section in your teams account and install the **Incoming Webhook** app (created by Microsoft).

![Install the Incoming Webhook app](<../.gitbook/assets/Screenshot 2021-03-04 at 5.41.41 PM.png>)

Select a channel of your choice and click **setup connector**

![](../.gitbook/assets/setup-connector.png)

****

Name your connector and upload our Spike.sh logo so as to easily identify alerts coming from us. [You can download our logo here.](https://drive.google.com/drive/u/1/folders/1o1JwoMXVY9uYUb8v12wZOMUhaaxVLHnH)

![Submit the form and then copy the unique URL](../.gitbook/assets/teams-url.png)

**Step 2 - Paste the URL on Spike.sh**

Head over to Spike.sh dashboard and visit [settings > organisation > alerts](https://app.spike.sh/settings/general/alerts) and create a Teams integration by giving a friendly name along with the URL you copied from step 1.

{% hint style="warning" %}
Make sure to paste the exact URL from above. Any changes in the URL might result in missing alerts
{% endhint %}

![](<../.gitbook/assets/image (62).png>)

{% hint style="success" %}
Once integrated, we will send a sample alert to your configured Teams channel
{% endhint %}

A friendly name will help you identify this integration while creating escalation policies. Like below -&#x20;

![Using Teams in Escalation policies](<../.gitbook/assets/image (64).png>)

You can create multiple Teams integrations with different incoming webhooks configured on Teams.&#x20;

{% hint style="success" %}
Our MS Team alert channel accepts inputs from you to acknowledge or resolve an incident.
{% endhint %}



### Possible Caveats

We have noticed that in some MS Teams account, **acknowledge** and the **resolve** buttons fail.

![](<../.gitbook/assets/image (109).png>)

It could be possible because the connector is disabled in your tenant setting access list. Another possible cause for this could be that you are using a legacy account.

Refer to this [GitHub issue](https://github.com/MicrosoftDocs/msteams-docs/issues/1221) or why this might happen.

