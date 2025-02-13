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

You can choose to receive alerts over **Phone calls, WhatsApp, Telegram, SMS, and Email** when your shift starts or ends. 

To enable notifications:
1. Visit [On-call notifications in settings](https://app.spike.sh/settings/personal-on-call).
2. Enable alerts separately for **Shift Start** and **Shift End**.
3. Once saved, notifications will apply to all on-call schedules you are part of.

{% hint style="info" %}
Personal on-call settings apply to all on-call schedules. However, you can override them for specific schedules by updating their individual settings.
{% endhint %}

You can also customize alerts per on-call schedule in the schedule's settings.

![Personal On-call notifications](<../.gitbook/assets/oncall/oncall-notifications.png>)

---

## When Any Team Member Starts/Ends Their On-Call Shift

You can set up notifications when **anyone** in your team starts or ends an on-call shift. 

To enable:
1. Visit [Slack settings under Organisation > Alerts](https://app.spike.sh/settings/general/alerts).
2. Select channels where notifications should be sent.
3. Once saved, all members in the selected Slack channels will receive updates on shift start and end.

Similar settings are available for **Microsoft Teams** and **Discord**.

![Slack notifications for shift start and ends](<../.gitbook/assets/oncall/oncall-notifications--slack.png>)

---

## Overriding Personal On-Call Notifications for Specific Schedules

If you prefer different notification settings for a **specific** on-call schedule (e.g., **Primary On-Call**), you can override your **global** settings.

To override:
1. Visit the **On-Call Schedule Settings** for the specific schedule.
2. Choose custom shift start and end alerts on different channels.
3. Save your preferences.

{% hint style="info" %}
Overrides only apply to the selected schedule, while your global on-call settings remain unchanged.
{% endhint %}

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
No, notifications apply to all on-call schedules globally. If you wish to disable them, you will need to turn off **on-call notifications** in your [personal settings](https://app.spike.sh/settings/personal-on-call).
</details>
<details>  
<summary>Do on-call notifications count toward my monthly alert quota?</summary>  
Yes, for plans with limited alerts per month, on-call shift notifications are included in your monthly quota.  
</details>