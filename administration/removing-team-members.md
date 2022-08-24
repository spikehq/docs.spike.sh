# Removing team members

## How to remove team members?

Only admins can remove a team member. On your [team settings panel](https://app.spike.sh/settings/team), you will have the option to remove any **member** from your organization. Removing them would affect the escalation policies they are part of. You will be shown the number of escalations that could get affected along with the open incidents that the member is assigned to right now. Once removed, no alerts will be sent to this member.

![A snapshot of escalations and current incidents assigned that might get affected](<../.gitbook/assets/image (12) (1).png>)

### How are escalation policies affected?

The user gets automatically removed from all escalations policies they are part of. So, if a escalation has two users A and B wherein the first alert goes to A and 20 minutes later the second alert goes to B; if you choose to remove A then the escalation policy will always send only one alert immediately to B.

{% hint style="warning" %}
If the escalation policy only has only this team member then that policy will never come into affect. We recommend you edit that policy by adding alerts to other team members instead of creating a new one.
{% endhint %}

### How are assigned open incidents affected?

Incidents which are not resolved are open incidents. If there are any open incidents assigned then we recommend you assign them to someone else from your team. Alerts about only these incidents are sent to the user after they are removed too. _So, we suggest you reassign them soon as this member is removed._

{% hint style="info" %}
Billing is adjusted from the next month cycle based on number of max team members from your organization using Spike.
{% endhint %}

## Can I add the same member back again?

Yes, we give you the option to add this same member back again. However, you will have to add them again to escalation policies and re-assign them incidents.

_Remember that this is not the same as undo-ing the removal of a member_

![Add removed team members](<../.gitbook/assets/Screenshot 2020-09-25 at 12.54.15 PM.png>)
