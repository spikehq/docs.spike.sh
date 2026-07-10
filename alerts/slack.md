---
description: >-
  The Spike app for Slack sends incident and on-call alerts to your channels,
  lets you run incident actions without leaving Slack, unfurls incident links,
  and answers @Spike mentions with an AI assistant.
---

# Slack

<figure><img src="../.gitbook/assets/slack/cover.png" alt="Spike app for Slack"><figcaption><p>Spike app for Slack.</p></figcaption></figure>

## Overview

The Spike app for Slack delivers incident and on-call alerts to the channels you choose and lets responders act on them in place: acknowledge, resolve, add notes, spin up an incident channel, pull the activity log, inspect the full payload, and open a linked Statuspage incident. It unfurls Spike incident links into an editable preview and includes `@Spike`, an AI assistant that declares incidents, manages responders and on-call overrides, and answers questions about your account from a mention. This page covers:

* [Install and connect](#install-and-connect)
* [Reconnecting an existing workspace](#reconnecting-an-existing-workspace)
* [Incident alerts in Slack](#incident-alerts-in-slack)
* [On-call alerts in Slack](#on-call-alerts-in-slack)
* [Link unfurling](#link-unfurling)
* [@Spike, the AI assistant](#spike-the-ai-assistant)

---

## Install and connect

Install the app once per Slack workspace. You need admin access to your Spike account and permission to add apps to your Slack workspace.

{% stepper %}
{% step %}
### Start from the dashboard

Go to **Integrations** in the Spike dashboard and click **Add to Slack**. Starting from the dashboard links the workspace to your Spike account; installing from the Slack marketplace alone does not make that link.
{% endstep %}

{% step %}
### Authorize in Slack

Slack shows the permission screen with the scopes the app requests (listed below) and asks you to pick the workspace to install into. Review and click **Allow**.
{% endstep %}

{% step %}
### Land back in Spike

After authorization you return to **Integrations**, where the workspace now shows as connected. You can then select channels for on-call alerts and add Slack as a step in your [escalation policies](https://app.spike.sh/escalations) to route incident alerts.
{% endstep %}
{% endstepper %}

<!-- screenshot: Slack OAuth permission screen for the new app -->

Anyone on your team can link their personal Slack account to the app by sending the Spike bot a direct message and following the prompt. A linked account is what lets Spike attribute actions to a person and show them private channels they belong to.

### OAuth scopes requested

The app requests the following scopes. Each maps to a specific capability; the app does not use scopes beyond what these features need.

| Scope | Used for |
| --- | --- |
| `chat:write` | Posting incident and on-call alerts, updating those messages in place, and sending action results. |
| `commands` | Receiving interactions from buttons and actions on alert messages. |
| `app_mentions:read` | Detecting `@Spike` mentions so the assistant can respond. |
| `assistant:write` | Powering the `@Spike` AI assistant experience in threads and channels. |
| `channels:read` / `groups:read` | Listing public and private channels so you can pick alert destinations. |
| `channels:manage` / `groups:write` | Creating a dedicated incident channel from an alert. |
| `channels:history` / `groups:history` | Reading a thread's messages only when you ask `@Spike` to create an incident from that thread, so it can carry the context forward. |
| `links:read` / `links:write` | Detecting Spike incident links and rendering the unfurled preview. |
| `users:read` / `users:read.email` | Matching Slack users to Spike responders when you link a personal account. |
| `im:write` | Sending direct messages, including the personal-account connection flow. |

{% hint style="info" %}
The app reads a thread's contents only when you explicitly ask `@Spike` to create an incident from that thread. It does not read channel messages otherwise.
{% endhint %}

---

## Reconnecting an existing workspace

The Slack app was rebuilt and now requests additional scopes. Workspaces installed on the previous app keep working for existing features but must reconnect before any of the new capabilities become available.

**Before you reconnect**, on the old app:

* Incident and on-call alerts continue to be delivered to your existing channels.
* Acknowledge and resolve on existing alerts continue to work.

**Does not work until you reconnect:**

* `@Spike`, the AI assistant.
* Link unfurling of incident links.
* Add a note, create an incident channel, fetch the activity log, view the full payload, and create a Statuspage incident from an alert.
* Adding an on-call override directly from an on-call alert.

### Steps to reconnect

{% stepper %}
{% step %}
### Open Integrations

Go to **Integrations** in the Spike dashboard and find your connected Slack workspace.
{% endstep %}

{% step %}
### Reconnect

Click **Reconnect** (or **Add to Slack** again for the same workspace). Slack shows the updated permission screen listing the new scopes.
{% endstep %}

{% step %}
### Approve the new scopes

Confirm the workspace and click **Allow**. The workspace returns to a connected state with the new scopes granted.
{% endstep %}
{% endstepper %}

### What survives a reconnect

| Configuration | Survives? |
| --- | --- |
| Channel mappings (alert destinations) | Yes. Preserved as-is. |
| Escalation routing (Slack steps in policies) | Yes. Preserved as-is. |
| Notification rules (on-call channel selections and shift settings) | Yes. Preserved as-is. |

Reconnecting re-authorizes the existing installation and adds scopes; it does not reset your configuration.

{% hint style="warning" %}
Reconnecting is not restricted to the original installer. Any Spike admin with permission to add apps to the Slack workspace can reconnect. The person who reconnects becomes the current authorizing user for the installation.
{% endhint %}

---

## Incident alerts in Slack

<figure><img src="../.gitbook/assets/slack/slack-incident-alert-hero.png" alt="Incident alert on Slack"><figcaption><p>Incident alert on Slack.</p></figcaption></figure>

Add Slack as a step in an [escalation policy](https://app.spike.sh/escalations) to send incident alerts to a channel. Each alert message shows the incident title, current status, priority and severity, the triggering integration, assigned responders, and a link back to the incident in Spike. Status changes made anywhere — Slack, phone, SMS, email, or the dashboard — update the message in place, so the channel always sees the current state.

### Actions on an alert

| Action | What it does | Visible to | Requires |
| --- | --- | --- | --- |
| **Acknowledge** | Marks the incident acknowledged in Spike and stops further escalation. Updates the message for everyone. | Channel | Linked account recommended so the ack is attributed to you |
| **Resolve** | Marks the incident resolved in Spike. Updates the message for everyone. If it was already resolved elsewhere, the app tells you. | Channel | Linked account recommended for attribution |
| **Add a note** | Opens a dialog to write a note; the note is saved to the incident's timeline in Spike. | Channel | Linked account for attribution |
| **Create an incident channel** | Creates a dedicated channel for the incident and posts a link to it on the alert. Only the person who clicked is added initially; others can join. | Channel (the new channel link is posted) | `channels:manage` / `groups:write` |
| **Fetch the activity log** | Pulls the incident's activity log from Spike and shows it to you. | Only you (ephemeral) | — |
| **View the full incident payload** | Shows the complete raw payload that triggered the incident. | Only you (ephemeral) | — |
| **Create a Statuspage incident** | Creates an incident on your connected Statuspage and links it to the Spike incident, so status updates stay associated. | Channel | A connected **Statuspage** integration |

{% hint style="info" %}
**Create a Statuspage incident** appears only when a Statuspage integration is connected to your Spike account. Without it, the action is not shown.
{% endhint %}

<figure><img src="../.gitbook/assets/slack/slack-discuss-in-new-channel.png" alt="Dedicated incident channel in Slack"><figcaption><p>A dedicated incident channel created from an alert.</p></figcaption></figure>

{% hint style="info" %}
The two read-only actions — **Fetch the activity log** and **View the full incident payload** — reply only to the person who clicked, so large output does not flood the channel.
{% endhint %}

---

## On-call alerts in Slack

<figure><img src="../.gitbook/assets/slack/slack-oncall-alert.png" alt="On-call shift alert on Slack"><figcaption><p>On-call shift alert on Slack.</p></figcaption></figure>

Go to **Integrations** to choose the channels that receive on-call alerts. Alerts can be sent when a shift starts and when a shift ends. The message names the schedule, who is going on or off call, and the shift window.

### Add an on-call override from the alert

The alert includes an **Add override** action so you can arrange short-term coverage without opening the dashboard.

<!-- screenshot: Add override dialog opened from an on-call alert -->

* **Fields:** the team member who will cover, and the start and end time of the coverage. An optional comment can be added for context.
* **What it writes:** the override is written to the same on-call schedule the alert came from — the exact schedule and rotation, not a separate one.
* **How long it lasts:** the override applies only for the start-to-end window you set. It is a one-time, non-recurring adjustment and does not change the underlying schedule. When the window ends, the normal rotation resumes.
* **Editing or removing it:** manage it from the [on-call schedule](https://app.spike.sh/on-calls) in the dashboard — open the schedule, find the override, and edit its times or delete it. See [On-call overrides](../oncall-schedules/override-an-on-call.md) for details. Anyone without a Viewer role can add or delete overrides.

---

## Link unfurling

Paste a Spike incident link into a channel and the app renders an inline preview of that incident instead of a plain URL.

<!-- screenshot: unfurled incident preview in a Slack channel -->

The preview shows:

* Incident title
* Status
* Priority and severity
* Assigned responders
* The triggering integration
* A link to open the incident in Spike

Fields you can edit inline from the preview:

* **Status** — acknowledge or resolve the incident.
* **Responders** — add or remove people from the incident.

Editing from the preview changes the incident in Spike and is reflected everywhere the incident appears.

{% hint style="warning" %}
Unfurling requires the app to be present in the channel where the link is pasted. In a channel the app has not been added to, the link stays a plain URL. Add the app with `/invite @Spike` in that channel.
{% endhint %}

---

## @Spike, the AI assistant

`@Spike` responds to mentions in channels and threads. Mention it in plain language to run incident and on-call actions or ask about your account.

### What it can do

| Capability | Example invocation | Expected reply |
| --- | --- | --- |
| Declare a new incident | `@Spike declare a new incident: checkout returning 500s` | Creates the incident in Spike and replies with a link and its status. |
| Create an incident from the current thread | `@Spike turn this thread into an incident` | Reads the thread, creates an incident that carries the thread's context into the description, and replies with a link. |
| Add responders | `@Spike add @maya and @chen to INC-1043` | Adds those users as responders and confirms who was added. |
| Remove responders | `@Spike remove @chen from INC-1043` | Removes the responder and confirms. |
| Add an on-call override | `@Spike put @maya on call for payments from 6pm to 10pm` | Writes a one-time override to that schedule for the window and confirms the coverage. |
| Show who is on call | `@Spike who's on call for payments right now?` | Replies with the current on-call responder(s) for the schedule. |
| List open incidents | `@Spike list open incidents` | Replies with the current open incidents and their status. |
| Answer questions about the account | `@Spike which escalation policy does the API service use?` | Answers from your Spike account data. |

<!-- screenshot: @Spike declaring an incident from a thread -->

### Boundaries

* **What it cannot do:** `@Spike` does not delete incidents or schedules, change billing, alter account settings, or take destructive actions. It acts within the same permissions your Spike account exposes and asks for clarification when a request is ambiguous.
* **Scope of an action:** an action applies to the incident named in the request. It does not act on unrelated incidents or on incidents it was not mentioned about, and it does not take action on its own without a mention.
* **Whose permissions apply:** an action runs under the permissions of the person who invoked it — the linked Spike user who sent the mention — not the app installer. If that person is not linked or lacks permission for the action, `@Spike` declines and says so. Link your account by sending the Spike bot a direct message.
* **Activity log and attribution:** actions `@Spike` takes are recorded in the incident's activity log like any other action, and are attributed to the person who invoked them, noted as performed via `@Spike`.

### Availability

`@Spike` is available in every workspace running the current app. It becomes active once the workspace has been installed — or [reconnected](#reconnecting-an-existing-workspace) — with the current scopes; workspaces still on the previous app must reconnect before `@Spike` will respond.

---

## FAQs

### Do I have to reconnect if everything still works?

Alerts and acknowledge/resolve keep working on the old app, but the new actions, unfurling, and `@Spike` stay off until you [reconnect](#reconnecting-an-existing-workspace).

### I can't find a channel in the dropdown. What should I do?

Paste the channel ID. Open the channel in Slack, go to the **About** section, and copy the unique ID.

<figure><img src="../.gitbook/assets/slack/find-slack-channel-id.png" alt="Finding a Slack channel ID"><figcaption><p>Find the channel ID in the About section.</p></figcaption></figure>

### Why can't I see a private channel when picking a destination?

You must be a member of the private channel, have a linked Slack account, and have added the app to that channel with `/invite @Spike`. Private channel names are visible only to linked members of that channel.

### Can non-Spike users use `@Spike` or join an incident channel?

Anyone in the workspace can be invited to an incident channel. For `@Spike` actions that change data, the person must have a linked Spike account with sufficient permission; otherwise `@Spike` declines.

### Can the same incident channel be reused for another incident?

No. A new channel is created per incident. Archive it after the incident is resolved to keep your workspace tidy.

### Does Spike read our messages?

No. The app reads a thread's contents only when you explicitly ask `@Spike` to create an incident from that thread. It does not otherwise read channel messages.
