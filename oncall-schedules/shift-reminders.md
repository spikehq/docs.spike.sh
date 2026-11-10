---
description: "Get a heads-up before your on-call shift starts or ends, by email, push, Slack or Microsoft Teams."
---

# Shift reminders

Shift reminders give you a heads-up before your on-call shift starts or ends. For example, "2 weeks before my shift starts" or "1 hour before it ends". You can set your own, and admins can set them for a whole schedule.

## Overview

A shift reminder arrives ahead of time, so you can plan around your shift.

It's separate from [shift start and end alerts](notifications-for-on-call-shifts.md). Those fire at the moment a shift changes hands.

Reminders never phone you, text you (SMS) or WhatsApp you. They arrive by email, push, Slack or Microsoft Teams.

You can set reminders in two places:

* **Your own reminders.** These apply to every schedule you're on.
* **A schedule's reminders.** These go to whoever is on call on that schedule, on top of their own reminders.

Each reminder is one row with three parts:

* **How long before:** 15 minutes, 30 minutes, 1, 2, 4 or 12 hours, 1, 2 or 3 days, or 1, 2 or 4 weeks.
* **Start or end:** before the shift starts, or before it ends.
* **Channels:** where the reminder goes.

{% hint style="info" %}
Until now, Spike emailed everyone 30 minutes before a shift started. That email now appears as a reminder in your own list: **30 minutes · before start · Email**. You can change it, turn it off or remove it.
{% endhint %}

## Set your own reminders

<!-- screenshot: Account → On-call alerts → Shift reminders -->

1. Go to **Account → On-call alerts**.
2. Find **Shift reminders**.
3. Click **Add reminder**. Spike suggests a lead time you don't have yet.
4. Pick how long before, and whether it's before the shift starts or ends.
5. Click the channel pills you want. A picked pill shows a tick. You can pick as many as you like.

Changes save as you make them. Your reminders apply to every schedule you're on.

To remove a reminder, click the **✕** on its row. You can undo from the message that appears, or press **⌘Z** / **Ctrl+Z** while it's showing.

## Set reminders for a whole schedule (admins)

<!-- screenshot: Schedule settings → Reminders -->

Schedule reminders let you make advance notice the standard for a whole team. They go to whoever is on call on that schedule, on top of their own reminders.

1. Open the on-call schedule.
2. Go to **Settings → Reminders**.
3. Click **Add reminder**.
4. Pick how long before, and whether it's before the shift starts or ends.
5. Click the channel pills you want.

Changes save as you make them. You remove and undo the same way as your own reminders.

Anyone who can edit the schedule can change its reminders. That's admins by default. Everyone else sees them read-only.

If your own reminder and a schedule's reminder are the same (same lead time, same start or end), you get it once. It goes to every channel either one asks for.

## Channels

| Channel | How it arrives | What you need |
| --- | --- | --- |
| Email | An email to the address on your Spike account. | Nothing extra. |
| Push | A notification from the Spike mobile app (iOS / Android). Tapping it opens the schedule. | The Spike mobile app. |
| Slack | A direct message from the Spike Slack app. | Your Slack account linked to Spike (**Account → Messaging → Slack**). |
| Microsoft Teams | A direct message from the Spike bot in Teams. | Your Teams account linked through the Spike bot (**Integrations → Microsoft Teams**). |

If Slack or Teams isn't connected, it shows as a dashed **+ Slack** or **+ Teams** pill. Hover it to see "Click to connect …". Click it to go to where you connect it.

On a schedule's reminders, Slack and Teams need the organisation to have the Slack or Microsoft Teams integration installed. People who haven't linked their own account simply don't get that channel.

## Turning a reminder off

<!-- screenshot: a reminder turned Off -->

To turn a reminder off without removing it, un-pick every channel.

The reminder stays in your list and shows **Off**. Nothing is sent until you pick a channel again.

## What happens when the rota changes

Before a reminder is sent, Spike checks the live rota. If you were swapped out of the shift beforehand, you won't get it.

Once a reminder has gone out, nothing more is sent if the rota changes, for example after an override or a schedule edit. There's no correction or retraction. A reminder describes the rota at the moment it was sent.

## Limits

* Up to 5 reminders per list. That's 5 of your own, and 5 for each schedule.
* No two identical reminders in one list. Combinations you already have are greyed out in the pickers.

## FAQ

### Do reminders follow my shift start/end alert settings?

No. Reminders are set separately from shift start and end alerts.

### Can I turn off a reminder my admin set for the schedule?

No. Only someone who can edit the schedule can change its reminders. You can change your own reminders.

### I got a reminder but someone else is covering now.

Reminders aren't corrected after they're sent. The on-call calendar is the source of truth.

### Why can't I pick Slack or Teams?

It isn't connected yet. Click the **+ Slack** or **+ Teams** pill to connect it.

### Can I set reminders from the mobile app?

Not yet. That's coming in the next app update. For now, use the web app. Push reminders already arrive on the mobile app.
