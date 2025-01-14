---
description: >-
  Overriding gives you the ability to add someone on-call to cover others shift
  for a specific period of time
---

# On-call overrides

<figure><img src="../.gitbook/assets/oncall/override-cover.png" alt=""><figcaption></figcaption></figure>

## Introduction
On-call overrides give your team flexibility by allowing temporary adjustments to your schedule without permanently changing it. Whether you're stepping out for a dentist appointment or taking a well-deserved break after a hectic week, overrides help ensure that incident coverage continues seamlessly. Overrides are non-recurring and ideal for short-term coverage.

{% hint style="success" %}
Overrides are temporary and do not repeat like regular schedules, simplifying one-time changes to your on-call coverage.
{% endhint %}

## Adding an override

You can create overrides for a specific user's shift or for the entire duration between a start and end time. Here’s how to set it up:

{% tabs %}
{% tab title="Set up instructions" %}
* From your [on-call schedule](https://app.spike.sh/on-calls), press `O` or click on `Override`.
* Add the name of the team member, the start and end time, and an optional comment for context.
* **Save**: The override will be applied, and the selected member will temporarily take over on-call responsibilities.
{% endtab %}
{% endtabs %}


{% tabs %}
{% tab title="Cover a user's shift" %}
Example: In the screenshot below, James has been assigned an override to cover Kaushik's shifts from January 14th to January 16th at midnight. The comment provides clarity about the reason for the override.

<figure><img src="../.gitbook/assets/oncall/cover-users-shift.png" alt=""><figcaption></figcaption></figure>
<figure><img src="../.gitbook/assets/oncall/james-cover-kaushik.png" alt=""><figcaption></figcaption></figure>
{% endtab %}
{% tab title="Cover everyone's shift" %}
Example: In the screenshot below, James has been assigned an override to cover **everyone's** shifts from January 14th to January 16th at midnight. The comment provides clarity about the reason for the override.

<figure><img src="../.gitbook/assets/oncall/cover-everyone-shift.png" alt=""><figcaption></figcaption></figure>


<figure><img src="../.gitbook/assets/oncall/james-cover-everyone.png" alt=""><figcaption></figcaption></figure>
{% endtab %}
{% endtabs %}


## FAQs
<details>
<summary>Can I add multiple overrides for the same time period?</summary>
Yes, you can. If overrides overlap, the most recently added override will take precedence.
</details>

<details>
<summary>Can I override the schedule for multiple team members at once?</summary>
No, each override is specific to one user and covers their shift or a time period. Multiple overrides must be added individually.
</details>

<details>
<summary>Are notifications sent when an override is added or removed?</summary>
Yes, team members affected by the override will receive notifications about the change.
</details>

<details>
<summary>Who can add or remove overrides?</summary> 
Anyone who is not assigned a "Viewer" role in your team can add and delete overrides. This permission is fixed and cannot be customized. 
</details>