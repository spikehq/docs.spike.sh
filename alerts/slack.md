---
description: >-
  The Spike app for Slack delivers alerts for incidents and on-call rotations directly to your public or private channels. It also includes slash commands to create incidents and view on-call responders.
---

The Spike app for Slack keeps your team informed and responsive during incidents.

Key features include:
-	Incident alerts and acknowledge / resolve / escalate them
-	On-Call shift notifications
-	Private channel support
-	Create incidents directly from Slack
-	View currently on-call responders

{% tabs %}
{% tab title="Quick links" %}
* [Install Spike app on Slack](https://app.spike.sh/settings/general/alerts)
* [App on Slack marketplace](https://slack.com/apps/AKRF4KSG5-spike)
* [Set incident alerts with escalations](https://app.spike.sh/escalations)
* [Set on-call alerts](https://app.spike.sh/settings/general/alerts)
{% endtab %}
{% endtabs %}

# How to set up
Visit the [Alerts section](https://app.spike.sh/settings/general/alerts) in settings and click on **Add to Slack.**

{% tabs %}

{% tab title="Incident alerts" %}
<figure><img src="../.gitbook/assets/slack/slack-new-incident.png" alt=""><figcaption></figcaption></figure>

Add Slack as a step in your [escalation policy](https://app.spike.sh/escalations) to get incident notifications. You can choose between public or private channels for these alerts.
{% endtab %}

{% tab title="On-call shift notifications" %}
<figure><img src="../.gitbook/assets/slack/slack-oncall-alert.png" alt=""><figcaption></figcaption></figure>

Visit [Settings > Alerts](https://app.spike.sh/settings/general/alerts) to select Slack channels to receive on-call shift alerts.
{% endtab %}

{% tab title="Connect for DMs" %}
* Other team members can also link their Slack accounts to receive direct messages for important updates.
* Run the `/connect` command to connect
{% endtab %}

{% endtabs %}

Use the `/help` command on Slack for further help.

{% hint style="info" %}
**Privacy notice -** Our Slack app cannot read any of your messages.
{% endhint %}

---

## Incident Alerts
Spike's incident alerts will mention `@here` to notify everyone online on the channel. The incident contains some key details like Title, Responders, Links, and Integration.

Available Actions for Each Incident
1. __Acknowledge__: Mark the incident as acknowledged to pause further alerts.
2. __Resolve__: Resolve the incident once fixed.
3. __Escalate__: Escalate the incident to the next level in your escalation policy.
4. __Discuss in a New Channel__: Create a dedicated channel to collaborate on the incident. Only the user initiating this action will be added to the new channel to begin.

### Private channels setup
Private channels access can be configured in [Settings > Alerts](https://app.spike.sh/settings/general/alerts)

#### Adding private channels to escalations

When managing escalations, only users who have connected their Slack account with Spike can view private channels. However, they can only access private channels that:

1.	They are a member of.
2.	The `@Spike.sh` app has been added to.

Both the user and the `@Spike.sh` app must be part of the private channel for it to appear under escalations.

#### Private channel visibility in escalations

Once a private channel is added to an escalation, its name is visible only to users who:
	1.	Have connected their Slack account with Spike.
	2.	Are members of the same private channel.

Users without these permissions will not see the private channel name, ensuring enhanced privacy.

---

## Slash commands

<figure><img src="../.gitbook/assets/slack/slash-commands.png" alt=""><figcaption></figcaption></figure>

Here are all the available `/slash` commands - 

1. `/create-incident`
Create a new incident directly from Slack. Anyone in your workspace can use this command.

2. `/oncall now` or `/oncall me`
Check who is currently on-call or view your on-call schedule.

4. `/connect`
Connects your Slack account in the workspace with Spike.

4. `/help`
Display a help message with guidance on using the Spike app in Slack.

---

## Auto-Update for Resolved Incidents

If a Slack alert has been sent for a new incident and it is resolved—whether automatically, via Phone, SMS, Email, or the Dashboard—the Slack message will automatically update to reflect the resolved status, eliminating any ambiguity about the incident’s state.

If the incident hasn’t auto-resolved on Slack and you attempt to resolve it manually, the Slack app will notify you that the incident has already been resolved.

![Reflecting the true state of incident on Slack in all cases](../.gitbook/assets/slack/incident-was-already-resolved.png)

---

## FAQs


<details> 
<summary>1. Can anyone create an incident? Is there an extra charge?</summary>
No, anyone can create an incident, and there is no additional cost.
</details>

<details> 
<summary>2.	User A and B are part of a private channel in the escalation policy, but B can’t see the channel name in Escalation. Why?
</summary>
This happens when User B hasn’t connected their Slack account with Spike. To connect, they can:
- Search for the Spike.sh bot in Slack and send a direct message to connect.
- Run the `/connect` command to connect
</details>

<details>
<summary>3.	I can’t find a channel in the dropdown. What should I do?</summary>
Click on the channel name to open the channel’s details. Within the channel details on the **About** section you can find the unique ID .
<figure><img src="../.gitbook/assets/slack/find-slack-channel-id.png" alt=""><figcaption></figcaption></figure>
</details>