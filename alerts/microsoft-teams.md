---
description: Get alerts on your Microsoft Teams from Spike.sh
---

# Microsoft Teams

Our Microsoft Teams app simplifies incident management by delivering alerts directly to your Teams channels and enabling you to take immediate actions. Below is a quick overview of the available features:

1. **Receive Incident Alerts**: Get real-time incident alerts directly in your Teams channels
2. **Create Incidents from Teams**: Seamlessly create new incidents directly from within Microsoft Teams and keep your workflow uninterrupted.
3. **Manage Incidents**: Easily acknowledge, resolve, or escalate incidents.
4. **On-call Notifications**: Receive direct messages for the start and end of your on-call shifts, invitations to join a war-room, and notifications when you're mentioned in a comment on Spike.sh.
5. **On-Call Shift Information**: Quickly check who is currently on-call and get details about your current and upcoming on-call shift timings.

[Install our Teams app](https://teams.microsoft.com/l/app/aea2c271-cfd3-4360-86bb-4a16998b2bde?source=app-details-dialog) directly or search for "Spike.sh" in the Teams Apps section on the sidebar. If you need assistance with installation due to permission restrictions, please contact your Teams admin.

If you're unable to install the app, you can still receive alerts by using the Incoming Webhook connectors. *Scroll down for detailed setup instructions.*

{% embed url="https://www.youtube.com/watch?v=aLuMQXcaJEk" %}

### Getting Started with the Spike App on Microsoft Teams

After installing the app, you'll receive a message with instructions on how to connect your Spike account. For full functionality, we recommend using both the `connect` **and** `connect-org` commands.

{% hint style="info" %}
- The `connect` command links your personal Spike account with Teams, enabling direct messages for on-call shift notifications and when you are mentioned in a comment.

- The `connect-org` command links your organization’s Spike account with Teams. This will enable your org to receive actionable incident alerts in channels.

For the best experience, we suggest running both commands.
{% endhint %}

### Available Commands

{% tabs %}
{% tab title="Commands in Microsoft Teams" %}
* **New incident**:
  * `/create-new-incident` - Create a new incident from Teams
* **Am I on-call?**:
  * `/oncall-me` - Check if you are on-call and when your shift ends.
* **Who is on-call?**:
  * `/oncall-now` - See who is currently on-call.
* **Disconnect**:
  * `/disconnect` - Disconnects your Spike account from Teams. _Note: This will only disconnect your personal account. Incident alerts will continue to be available in channels._
{% endtab %}
{% endtabs %}

### Setting Up Incident Alerts with the Spike App

Once your account is connected, you can easily add any of your Teams channels to an escalation policy. To do this, select "Teams" in the escalation policy, and your available channels will automatically appear on the right-hand side.

![How incident alerts look on Teams](../.gitbook/assets/microsoft-teams-app-incident-alerts.png)

Any team member can take action on an incident directly from Teams. We recommend creating a dedicated channel for responders to receive and manage alerts. If an incident is acknowledged or resolved via the Spike dashboard, phone call, email, or any other medium, the latest incident will be automatically reflected in the Teams channel, along with the suppressed and repeated counts.

### Direct Messages (DMs)

After running the connect command, you can use the oncall-me and oncall-now commands to get information about your on-call schedules directly in Teams. You will also receive direct messages from Spike.sh for important notifications, such as:

1. Invites to War rooms
2. Mentions in comments
3. The ability to create new incidents directly from Teams
4. Your on-call shift alerts

## Connecting multiple groups on Teams
~~Since our bot can only be connected to one group at a time, you'll need to disconnect the current group and then reconnect to the new one.~~

You can easily connect the Spike bot to multiple groups of channels in Microsoft Teams. Follow these steps:

1. Go to the desired group in Microsoft Teams and type @Spike.sh connect-org to establish the connection.
2. Next, visit your escalations page, and you'll see the newly connected channels listed in the dropdown menu.

There is no limit on how many groups can be connected. 

![How incident alerts look on Teams](<../.gitbook/assets/all dms on teams from Spike.png>)

***

## Get Teams alerts from Spike.sh using Incoming Webhook (to be deprecated)

{% hint style="warning" %}
Microsoft will deprecate all new webhook connectors on 15th September. On Spike, we will deprecate the incoming webhook support on 8th November 2024.
{% endhint %}

The alert messages on Microsoft Teams (referred to as Teams from here on) comes with gists for you and your team to quickly learn about the incident.

![How incident alerts look on Teams](<../.gitbook/assets/image (59).png>)

### How to set up Teams?

**Step 1 - Setup incoming webhook**

Go to the Apps section in your teams account and install the **Incoming Webhook** app (created by Microsoft).

![Install the Incoming Webhook app](<../.gitbook/assets/Screenshot 2021-03-04 at 5.41.41 PM.png>)

Select a channel of your choice and click **setup connector**

![](../.gitbook/assets/setup-connector.png)

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

A friendly name will help you identify this integration while creating escalation policies. Like below -

![Using Teams in Escalation policies](<../.gitbook/assets/image (64).png>)

You can create multiple Teams integrations with different incoming webhooks configured on Teams.