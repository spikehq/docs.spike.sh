---
description: >-
  Responders can choose to change incident status on phone alerts, slack and on
  the dashboard. More support for changing statuses on email and slack is coming
  soon
---

# How to change incident status?

## From the dashboard

![Select one or more incidents](../.gitbook/assets/incident-status-change-new.png)

You will see open incidents on the [dashboard](https://app.spike.sh). Select a single incident with the checkbox on the left-hand side and hit the **Acknowledge** button on top. Similarly, you can choose to **Resolve** by using the adjacent button.

### Multiple incidents

Alternatively, you can choose multiple incidents to change status by selecting each incident or use the dropdown to quickly select all incidents that match the criteria.

## From phone call



![Take actions on incidents from the phone call](../.gitbook/assets/phone.png)

On the phone alert, you can take immediate actions by - 

1. **Press 4 to Acknowledge**
2. **Press 6 to Resolve**
3. **Press 9 to Escalate**

Phone calls are restricted to 420 characters which we believe should suffice to give you the context of the incident. 

{% hint style="info" %}
You will get a voice confirmation on the same call upon incident status change
{% endhint %}

## **From Slack**

All alerts on Slack will have actionable buttons to **Acknowledge** and **Resolve** incidents.

![](../.gitbook/assets/slack-gif.gif)

{% hint style="info" %}
Upon status change, the relevant Slack messages will update to reflect them. This also applies if anyone changes the status via Phone, Email, SMS, or from the Dashboard too. 
{% endhint %}

## **From Email**

Use the following actions to change incident status directly from email by replying - 

1. **#res** to resolve
2. **#ack** to acknowledge

{% hint style="info" %}
Upon status change, we do not send a confirmation
{% endhint %}

## **From SMS**

Send Spike.sh an SMS from your registered phone number to change incident status. 

1. **#\<incident_id> res** to resolve. (example: #2071 res)
2. **#\<incident_id> ack **to acknowledge. (example: #1226 ack)

The SMS action doesn't depend on replying to our message. It only relies on you sending us a message. This means if you don't have SMS in your escalation policy and then choose to perform the above action, it would still work. 

{% hint style="info" %}
Upon status change, we do not send a confirmation
{% endhint %}

## From mobile website

Our dashboard page and incident details page are mobile compatible. You can check open incidents and relevant incidents on your mobile and change incident statuses. 

![Incident page on mobile](<../.gitbook/assets/image (73).png>)

{% hint style="info" %}
visit [https://app.spike.sh](https://app.spike.sh) on mobile to access the dashboard.
{% endhint %}

