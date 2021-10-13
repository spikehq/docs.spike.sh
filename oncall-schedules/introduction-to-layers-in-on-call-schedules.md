---
description: >-
  Understand the basics of Layers in on-call scheduling and how it helps you
  bring flexibility into scheduling
---

# Introduction to Layers in on-call schedules

## What are Layers in on-call schedules?

Layers are schedules with the same key components as members, handoff, rotation and slots. You can add multiple layers to one on-call schedule. This helps you give flexibility over timings and members. 

Layers for your on-call schedule are organised sequentially in ascending order. This means when timing overlaps between Layer 2 and Layer 1, the higher layer will overlap the lower ones, i.e. in this case **Layer 2 will overlap 1.** 

For 3 layers, Layer 3 will take overlap over 1 and 2. 

{% hint style="info" %}
Every on-call schedule will have at least one layer
{% endhint %}

### What does overlapping mean?

In simple words - if both layers have common times then Layer 2 will overlap calendar schedules from layer 1. Let's take an example. 

### Understand layers with an example

Here is a simple on-call schedule with 2 members rotating each day. This means one of the members is on-call every day covering for the entire week. 

**All days - **Daily rotation among 2 members 

![Just one layer to our schedule](../.gitbook/assets/layer-1.png)

This is how the calendar looks like with just the above layer in our on-call schedule

![Calendar for above on-call schedule with just one layer](<../.gitbook/assets/image (67).png>)

### Adding the weekend layer to override

Now, this could be too much to handle. How about we give them a break over the weekend and ask other members to help out. 

To enable this, we can add another layer with weekly rotation among members who only need to be on-call **from Friday 6 PM to Monday 9 AM**

**Weekdays - **Daily rotation among 2 members \
**Weekends** - One person for the entire weekend rotating weekly

![2 separate layers, one for weekday and another for weekend](../.gitbook/assets/weekday-weekend-desc.png)

Members from Layer 1 will be on-call every alternate day, on all weekdays and members from Layer 2 will be on-call for the entire alternate weekend (since weekly rotation has been applied). 

This is how the calendar looks with both layers. 

![Calendar with 2 layers, one set of members for weekdays and another for weekend](<../.gitbook/assets/image (68).png>)

### **How did overlapping work here?**

Members from Layer 2 will overlap the scheduled on-call from Friday 6 PM to Monday 9 AM. 

{% hint style="info" %}
If the weekend layer was Layer 1 and the weekday layer was Layer 2 then the weekend layer would have never come to effect. **There are no limits on number of layers to be added on a single on-call schedule**
{% endhint %}

You can start experimenting with layers by editing the same schedule as many times as you want. 

### FAQs on Layers

* **Can I add a layer temporarily?**
  * You can add a layer and then delete it. A common use case if a person needs to take the day off and someone else has agreed to cover them, then add a new layer to cover that day alone. Once the day is passed, delete the layer. 
* **How many layers can I add?**
  * There is no limitation. Our recommendation is to avoid adding too many layers. Otherwise, it could get confusing how the calendar works and as a result teams usually hesitate to delete any layer. 
* **How many members can be added in one layer?**
  * There is no limit here either. 











