---
description: >-
  Send Lightup data quality notifications to Spike through a Lightup Email List, so each incident alert opens an incident and pages your on-call rotation.
---

# Integrate Spike with Lightup

[Lightup](https://lightup.ai) monitors data quality. When a monitor detects a variation that is out of bounds, Lightup logs an incident and sends alerts to the alerting channels registered for that monitor. Lightup has no webhook channel; its alerting channels are Email List, Jira, Microsoft Teams, Opsgenie, PagerDuty, ServiceNow and Slack ([Lightup: Integrations overview](https://docs.lightup.ai/docs/integrations-overview)). Spike connects through an **Email List**: you add the Spike integration's email address to the list, and every email Lightup sends to it opens or joins an incident in Spike.

{% hint style="info" %}
Lightup does not publish the format of its notification emails: their subject, their body, or how an alert for a resolved incident differs from a new one. Spike therefore reads only the email's subject, and does not auto-resolve Lightup incidents. Resolve them in Spike when the Lightup incident is over.
{% endhint %}

## Prerequisites

* A Lightup workspace where you can add integrations. Lightup's [Integrations overview](https://docs.lightup.ai/docs/integrations-overview) says you can add one in any workspace where you have at least the Workspace Editor role.
* Permission to create integrations in Spike.

## Step 1: Create the integration in Spike

1. From the header, click [Add integration](https://app.spike.sh/integrations/new) and select **Lightup**.
2. Give it a name and select the service it should alert.
3. Click **Create integration**.
4. Copy the email address shown on the integration page. It looks like `ced6f1c82327db079e3f@email-hooks.spike.sh`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2: Create an Email List alerting channel in Lightup

These steps are from Lightup's [Email List](https://docs.lightup.ai/docs/email-list) page.

1. Select the workspace where you want to add the integration, and then select **Integrations** on the left panel.
2. Select **Create Integration +**.
3. In the list that appears, choose **Email List**.
4. In the **Add Email List** dialog, enter a name for the list, for example `Spike`.
5. Enter the Spike email address from Step 1, then select **+** in the same row to add it to the list.
6. Select **Add**.

Lightup can send a channel's alerts immediately, or as an hourly, daily or weekly digest that summarises how many incidents started, ended or are ongoing ([Lightup: Manage incidents](https://docs.lightup.ai/docs/manage-incidents#recurring-incident-alerts)). If the dialog offers a choice, send alerts immediately: a digest is one email about many incidents, so Spike would open one incident for all of them, once per period.

Lightup channels can also send alerts for resolved incidents (the Slack and Microsoft Teams dialogs have a toggle for it, and the API's email channel setting is `muteResolvedAlerts`). Spike cannot tell such an email from a new alert, so each one opens or joins an incident like any other email. If you do not want that, turn alerts for resolved incidents off for this list.

## Step 3: Send monitor incidents to the list

Attach the Email List to every monitor that should page through Spike. When you create or edit a monitor, choose the alerting channel in the **Manage alerts** setting ([Lightup: Create a monitor manually](https://docs.lightup.ai/docs/create-a-monitor-manually)). A monitor with **Mute notifications** on, or inside its muting schedule, sends no alerts.

To also page on Lightup's system events, such as a datasource that is not reachable, open **System Events** from the workspace menu, go to the **Configuration** tab, and add the Email List under **Alert Channels** for the event levels you want ([Lightup: Work with system events](https://docs.lightup.ai/docs/system-events)).

## How Spike handles each email

| What arrives | What Spike does |
| --- | --- |
| An alert email | Opens an incident. The incident title is the email's subject. |
| Another email with the same subject while that incident is open | Joins the open incident instead of paging again. Subjects are compared whole, ignoring case and extra whitespace. |
| An email with a different subject | Opens a separate incident. |
| An alert for a resolved incident | Treated like any other email. Spike does not auto-resolve Lightup incidents. |
| A digest email | Treated like any other email: one incident per subject. |
| An email with no subject | Opens a new incident each time, because there is nothing to match it by. |

Spike reads no severity or priority from a Lightup email, because Lightup does not publish where its email carries one. Set them with [alert routing rules](../alerts/alert-rules.md) if you need them.

## Step 4: Test it

Wait for a monitor to open an incident in Lightup, or forward an earlier Lightup alert email to your Spike address. An incident titled with the email's subject should appear in Spike within a minute.

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Check that the Spike address is a member of the Email List, that the list is selected as the monitor's alerting channel, and that the monitor's notifications are not muted. Check also that the integration has not been archived in Spike.

</details>

<details>

<summary>Every email opens a new incident</summary>

Spike joins emails into one incident only when their subjects are the same. If each of Lightup's emails for one incident has a different subject, each one opens its own incident.

</details>

Disclaimer: These integration instructions are offered independently by Spike.sh, and Spike.sh is not affiliated with nor a partner of Lightup.
