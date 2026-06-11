---
description: Change the rotation day on a weekly on-call schedule without losing coverage or disrupting the rotation order.
---

# Change on-call rotation day

Say you have a weekly on-call schedule rotating every Wednesday and want to switch it to Monday. This page covers how to make that change and how to handle the two issues that come with it.

## How to change the rotation day

Use the **Schedule to start** option. This reschedules the on-call to begin on a new date without changing the members or rotation type.

Visit **On-call schedule > Settings > Schedule to start**, set the next Monday (or whichever day you want), and save.

## What changes when you do this

The system treats the updated schedule as a fresh start. Two things happen as a result:

1. **Coverage gap.** No one is on-call from now until the new start date.
2. **Rotation order resets.** The cycle restarts from the first member. For example, if A, B, C, D are in order and C is currently on-call with D due next, after the change A goes on-call first from Monday. D's turn gets pushed back.

## Fixing the gap and order

To address both issues before making the change:

1. Add C as an [override](override-an-on-call.md) to cover the gap until the new start date.
2. Update the member order to D, A, B, C. Visit **On-call schedule > Edit**, scroll to the layer, and drag names using the `::` handle to reorder them.

This keeps coverage continuous and picks up the rotation where it left off.

## FAQs

### Can this be undone?

No. To test changes safely, create a separate on-call schedule first and archive it afterward.

### Can I schedule to start in the past?

No. The schedule to start option only supports future dates.
