---
description: >-
  You can change the shift rotation day for your on-call. Here's how.
---

# Change on-call rotation day
Suppor you have an on-call on weekly shift which rotates every Wednesday and wish to change it to rotate from Monday (or any other day) then please read carefully. 

It comes with 2 caveats though and this documents how to solve them. Please read carefully before changing.

## Example on-call
Assume we have a Primary on-call schedule with A,B,C,and D as on-call members in the exact sequence rotating their duties on a weekly basis. C is currently on-call. Next week, D will be on-call.

### How to change?
You must use the `schedule to start` option. This helps you to schedule an on-call to start a future date. The strategy here is to change the existing schedule to start on the next Monday (or the day you wish to start). To change, Visit on-call schedule > edit > select next monday on the calendar in `Schedule on-call start` > update on-call schedule.

{% hint style="warning" %}
**Caveats!** Be wary of this. There are 2 caveats since our systems will pretty much treat this as a new on-call schedule.
1. No-one will be on-call till the next Monday. To solve this problem, we would recommend you add an override to cover the gap till then. 
2. This will also change the on-call order. Before updating, C was currently on-call and D was supposed to go on-call next week. But now, we will have nobody on-call and A will be on-call again starting Monday. This resets the cycle.
{% endhint %}

To combat the above caveats, we recommend the following actions
1. Add C as an override till the next Monday.
2. Change the order of members going on-call to D,A,B,C. To do this, visit on-call schedule > edit > scroll to the layer and rearrage the order by holding the `::` dots icon next to the names. 

This would change the rotations from Monday to Monday.

# F.A.Qs

## Can this be undone?
No, this operation cannot be undone. To test, feel free to create a new on-call schedule. You can archive it later.

## Can I schedule to start in the past?
No, we don't support scheduling an on-call to start in the past.

## Do you consider finding a better way to do this?
Most definitely. Please, upvote this feature on our [HUB](https://hub.spike.sh/12).