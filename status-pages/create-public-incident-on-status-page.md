---
description: Create public incidents on your status page and post updates as the situation evolves.
---

# Incidents on your status page

Use the status page dashboard to create public incidents and keep customers informed as the situation develops.

## Create a new incident

On the [Status Page dashboard](https://statuspage.spike.sh), click **Incidents** in the left sidebar, then click **New incident**.

<figure><img src="../.gitbook/assets/create incident 2.png" alt="Create a new incident on Spike status page"><figcaption></figcaption></figure>

Fill in the **title** and **description** to describe the issue.

Select the **affected components**: the parts of your system impacted by the incident.

For each component, set its current state:

- **Operational**: The component is functioning correctly.
- **Degraded performance**: The component is working but below normal performance, such as slower API response times.
- **Partial outage**: The component is not working for some users or in some situations.
- **Critical outage**: The component is not functioning for most users.
- **Planned maintenance**: The component has scheduled maintenance. Consider creating a [Planned Maintenance event](create-planned-maintenance-on-status-page.md) instead.

Set the **date and time** the incident was identified. Spike uses this to calculate outage duration for affected components.

Set the **incident impact** based on your assessment. You can update this as the situation develops.

To **notify subscribers** by email, check the notification option. Spike sends an email to all status page subscribers.

<figure><img src="../.gitbook/assets/create incident 3.png" alt="Incident creation form on Spike status page"><figcaption></figcaption></figure>

## Add updates to an incident

<figure><img src="../.gitbook/assets/create incident 4.png" alt="Incident page in Spike status page dashboard"><figcaption></figcaption></figure>

As you learn more, post updates to keep subscribers informed. Click **Add status update** on the incident page.

<figure><img src="../.gitbook/assets/create incident 5.png" alt="Add a status update to an incident on Spike"><figcaption></figcaption></figure>

For each update, select the current incident status:

- **Investigating**: You are looking into the issue.
- **Identified**: You have identified the cause or the fix.
- **Resolved**: The issue is fixed. Move affected components back to Operational.
- **Postmortem**: The issue is resolved. Use this to share findings and steps to prevent recurrence.
- **Update**: A general update when none of the above statuses apply.

<figure><img src="../.gitbook/assets/create incident 6.png" alt="Incident status updates visible on public status page"><figcaption></figcaption></figure>

Updates appear on your public status page immediately after posting.