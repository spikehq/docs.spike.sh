---
description: >-
  Integrate Spike with MongoDB Atlas to receive real-time alerts via Phone calls, SMS, Slack, MS Teams, and more for when your database triggers alerts or events.
---

<figure><img src="../.gitbook/assets/oncall/linked-calendars/cover.png" alt="linked calendars"><figcaption></figcaption></figure>

# Introduction

[Linked Calendars](https://app.spike.sh/oncalls/linked-calendars) let you bring in your team’s external or holiday calendars to view them alongside your on-call schedules. These calendars appear as overlays on the calendar view, helping you plan shifts around holidays, regional events, or company-wide leaves.

Linked calendars are for reference only. They **do not** modify, offset, or affect any existing on-call shifts.

{% hint style="info" %}
You can link calendars from Google Calendar, Outlook, or any calendar that provides a public ICS link. You can also upload an `.ics` file directly.
{% endhint %}

### Common use cases:
- Public holiday calendars for your region
- Company-wide leave calendars from HR systems
- Shared team calendars for local events or office closures

## Adding a Linked Calendar

You can add calendars from different sources depending on what your team uses. Linked calendars are displayed as overlays on your on-call schedule and can be toggled on or off anytime.

To bring, visit the [Linked Calendars](https://app.spike.sh/oncalls/linked-calendars) section on your dashboard.

{% tabs %}
{% tab title="Upload ICS File" %}
* **Export your calendar**
* From your external calendar (Google, Outlook, or others), export your events as an .ics file.
    * Upload to Spike
    * In the Linked Calendars section, click + Link a calendar → choose Upload file.
    * Select your .ics file and click Link.

    The imported calendar will appear as an overlay on your on-call schedule.
    You can toggle visibility anytime using the checkbox beside its name.
{% endtab %}
{% tab title="Link from Google Calendar" %}
* **Get the public link**
    * In Google Calendar, go to **Settings → Integrate calendar**.
    * Copy the Public address in iCal format.
    * Your calendar should be public for this to work.

* **Add to Spike**
    * In the Linked Calendars section, click Link calendar → choose from link and paste the link.

    Spike will automatically fetch updates from the linked calendar. It will also refresh fetch again every 24 hrs at midnight UTC.

    You can toggle visibility and refresh manually anytime.
{% endtab %}
{% tab title="Link from Outlook Calendar" %}
* **Get the sharing link**

    * In Outlook Calendar, go to **Settings → View all Outlook settings → Calendar → Shared calendars**.
    * Under Publish a calendar, select the calendar and permissions, then copy the ICS link.
* **Add to Spike**

    * In the Linked Calendars section, click Link calendar → choose from link and paste teh link.

    Spike will automatically fetch updates from the linked calendar. It will also refresh fetch again every 24 hrs at midnight UTC.

    You can toggle visibility and refresh manually anytime.
{% endtab %}
{% endtabs %}

{% hint style="info" %}
Spike only reads data from linked calendars. It cannot write, modify, or delete any events on external calendars.
{% endhint %}

## Managing Linked Calendars

All linked calendars appear in the [Linked Calendars list](https://app.spike.sh/oncalls/linked-calendars) below your on-call calendar. You can manage their visibility or remove them anytime.

- **Toggle on/off:** Use the checkbox beside a calendar name to show or hide it on the on-call view.

- **Refresh data:** If a linked calendar is from a public ICS URL, click Refresh to fetch the latest events. Spike refreshes data everyday at 12:00 AM (midnight) in UTC timezone.

**Permissions:** Only users who can modify on-call schedules can add, delete, or manage linked calendars.

{% hint style="info" %}
Linked calendars are shared across the team. Toggling visibility, adding and deleteing linked calendars affects everyone’s view
{% endhint %}

## FAQs

<details>
<summary><strong>Can I link multiple calendars?</strong></summary>  
Yes. You can link multiple calendars such as regional holidays, company events, or shared team calendars.  
All of them will appear as overlays on your on-call calendar.  
</details>

<details>
<summary><strong>Does linking a calendar change my on-call schedule?</strong></summary>  
No. Linked calendars are for reference only and do not modify or offset any on-call shifts.  
</details>

<details>
<summary><strong>How often do linked calendars refresh?</strong></summary>  
Linked calendars added via public links automatically refresh every 24 hours at 12:00 AM, UTC.
You can also refresh them manually anytime by clicking the **Refresh** option beside the calendar name.  
</details>

<details>
<summary><strong>Who can add or manage linked calendars?</strong></summary>  
Anyone with permission to modify on-call schedules can add, delete, or manage linked calendars.  
These permissions are shared with the on-call configuration access level.  
</details>

<details>
<summary><strong>Can I hide a calendar without deleting it?</strong></summary>  
Yes. You can toggle visibility on or off using the checkbox beside each calendar.  
This visibility change applies to everyone in the workspace.  
</details>
