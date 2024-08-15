---
description: >-
   Admins can safely remove members from their organization’s account. You can optionally reassign the member’s roles in on-call, escalations, and incident response to others.
---

# Removing team members

## How to remove team members?

Only admins have the ability to remove a team member. In your [team settings panel](https://app.spike.sh/settings/general/team), you'll find the option to remove any member from your organization. When you remove a member, it may affect the escalation policies they’re part of. You’ll see the number of affected escalations and any open incidents currently assigned to that member. Once removed, the member will no longer receive any alerts.

It is recommended to transfer duties before removing any member to never miss an alert.

### Transferring duties (recommended)
When removing a member, it’s important to transfer their responsibilities in on-call schedules, escalations, and incidents they are responding to. This will help with smooth transition, so no alerts are missed and the removed member doesn’t inadvertently go on-call again.

![A snapshot of escalations and current incidents assigned that might get affected](<../.gitbook/assets/remove-team-members.png>)

### How are escalation policies affected?

When a member is removed, they are automatically excluded from all escalation policies they were part of. For example, if an escalation policy sends the first alert to User A and the second alert to User B after 20 minutes, removing User A will result in the policy immediately alerting User B without delay.

{% hint style="warning" %}
If the escalation policy only included this member, that policy will no longer trigger. We recommend you transfer their duties or edit the escalation policy.
{% endhint %}

### How are assigned open incidents affected?

Open incidents are those that remain unresolved. If there are any open incidents assigned to the removed member, we recommend adding another responder or transferring responsibilities during the removal process.

{% hint style="success" %}
Billing is adjusted in the next month's cycle. The adjustment is based on the highest number of team members from your organization using Spike.
{% endhint %}

## Can I add the same member back again?

Yes, you can add the same member back. However, you will need to re-add them to the relevant escalation policies and reassign any incidents they were handling. [Find removed members here](https://app.spike.sh/settings/general/team/invites-and-deactivated).

![Add removed team members](<../.gitbook/assets/activate-user-account.png>)
