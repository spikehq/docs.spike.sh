---
description: >-
  Get notifications via phone call, WhatsApp, Telegram, SMS, Email, Slack, Microsoft Teams, and Discord when your on-call shift starts and ends.
---
<figure><img src="../.gitbook/assets/oncall/oncall-notifications--cover.png" alt="On-call shift rotations alerts on Spike"><figcaption></figcaption></figure>

# Notifications for On-Call Shifts

Stay updated on your on-call shifts with notifications across multiple channels. Spike supports both **personal** and **team-wide** notifications for on-call schedules.

## Available Notification Channels

### **Personal Notifications**
Receive direct alerts when your on-call shift starts or ends:
- Phone calls
- SMS
- WhatsApp
- Telegram
- Email

### **Team-wide Alerts**
Notify your team when any member starts or ends their shift:
- Slack
- Microsoft Teams
- Discord

---

## When Your On-Call Shift Starts/Ends

![Personal On-call notifications](<../.gitbook/assets/oncall/oncall-notifications--personal--shift-start-notifications.png>)

You can choose to receive alerts over **Phone calls, WhatsApp, Telegram, SMS, and Email** when your shift starts or ends. 

To enable notifications:
1. Visit [On-call notifications in settings](https://app.spike.sh/settings/personal-on-call).
2. Enable alerts separately for **Shift Start** and **Shift End**.
3. Once saved, notifications will apply to all on-call schedules you are part of.

{% hint style="info" %}
You can override these per schedule.
{% endhint %}

You can also customize alerts per on-call schedule in the schedule's settings.

---

## When Any Team Member Starts/Ends Their On-Call Shift

![Slack notifications for shift start and ends](<../.gitbook/assets/oncall/oncall-notifications--team--slack.png>)

You can set up notifications when **anyone** in your team starts or ends an on-call shift. 

To enable:
1. Visit [Slack settings under Organisation > Alerts](https://app.spike.sh/settings/general/alerts).
2. Select one or more channels where notifications should be sent.
3. Once saved, all members in the selected Slack channels will receive updates on shift start and end.

Similar settings are available for **Microsoft Teams** and **Discord**.

{% hint style="info" %}
You can override Slack and Microsoft Teams alerts for per on-call schedule under the schedule's settings.
{% endhint %}

---

## Webhook trigger on On-call shift rotations

![Webhook triggers shift start and ends](<../.gitbook/assets/oncall/oncall-notifications--webhook.png>)

You can configure outbound webhooks to trigger using POST, PUT, or GET requests. Spike will send a webhook each time an on-call shift starts or ends, with separate requests for each event.

If one shift ends and another begins immediately, Spike will trigger both the end and start webhooks in quick succession—each with its own payload.

The webhook payload includes detailed information about the on-call schedule and the shift member. Refer below:

{% tabs %}
{% tab title="Shift starts payload" %}
```
{
  "event_type": "oncall_shift_start", <---- EVENT DIFFERS
  "organization": {
    "id": "65f15fd64171a1487c4fe666",
    "name": "spike"
  },
  "user": {
    "id": "660bb3f8324701c2f2e24c98",
    "firstName": "John",
    "lastName": "Doe",
    "email": "johndoe@example.com"
  },
  "oncall": {
    "id": "67a20db2c9f79829b51fbf80",
    "name": "Weekday after office hours rotation",
    "url": "https://app.spike.sh/on-calls/67a20db2c9f79829b51fbf80", <-- permalink
    "shift": {
      "id": "67f3c5e9f6dd8715782cc7b2",
      "start": "2025-05-26T10:23:20.294Z", <-- times in UTC
      "end": "2025-05-26T18:30:00.000Z"
    }
  }
}
```
{% endtab %}

{% tab title="Shift end payload" %}
{
  "event_type": "oncall_shift_end", <---- EVENT DIFFERS
  "organization": {
    "id": "65f15fd64171a1487c4fe666",
    "name": "spike"
  },
  "user": {
    "id": "660bb3f8324701c2f2e24c98",
    "firstName": "John",
    "lastName": "Doe",
    "email": "johndoe@example.com"
  },
  "oncall": {
    "id": "67a20db2c9f79829b51fbf80",
    "name": "Weekday after office hours rotation",
    "url": "https://app.spike.sh/on-calls/67a20db2c9f79829b51fbf80", <-- permalink
    "shift": {
      "id": "67f3c5e9f6dd8715782cc7b2",
      "start": "2025-05-26T10:23:20.294Z", <-- times in UTC
      "end": "2025-05-26T18:30:00.000Z"
    }
  }
}
{% endtab %}
{% endtabs %}

---

## FAQs
<details> 
<summary>Can I receive on-call shift notifications via multiple channels?</summary> 
Yes, you can enable multiple channels such as Phone calls, SMS, WhatsApp, Telegram, and Email for personal notifications. Team-wide notifications can be sent to Slack, Microsoft Teams, and Discord.
</details> 
<details>
<summary>Are on-call notifications available on all plans?</summary> 
Yes, on-call notifications are available on all plans. 
</details>
<details>
<summary>Can I disable notifications for a specific on-call schedule?</summary>
No, notifications apply to all on-call schedules globally. If you wish to disable them, you will need to turn off on-call notifications in your personal settings → https://app.spike.sh/settings/personal-on-call.
</details>
<details>
<summary>Do on-call notifications count toward my monthly alert quota?</summary>  
Yes, for plans with limited alerts per month, on-call shift notifications are included in your monthly quota.  
</details>