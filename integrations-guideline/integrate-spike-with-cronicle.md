---
description: >-
   Integrate Spike with Cronicle to receive real-time alerts via Phone calls, SMS, Slack, MS Teams, and more when scheduled jobs complete with failures.
---

# How Spike Integrates with Cronicle
<figure><img src="../.gitbook/assets/integrations/cronicle/cronicle-integration.png" alt=""><figcaption></figcaption></figure>

## Overview
[Cronicle](https://cronicle.net) is an open-source task scheduler for running cron-style jobs across one or more servers. It helps teams schedule, run, and monitor recurring tasks from a central web interface.

With Spike’s Cronicle integration, incidents are triggered only when a job run is completed and failed. This helps reduce noise from in-progress events and keeps alerts focused on actionable failures.

## How it works
Spike evaluates Cronicle webhook payloads using the event action and completion result:

* Spike only creates incidents for `action: job_complete` events where `complete: 1` and `code` is non-zero.
* `job_start` events are ignored by default and do not trigger incidents.
* Spike auto-resolves an existing Cronicle incident when a later `job_complete` event for the same job id has `complete: 1` and `code: 0`.
* Cronicle’s exit code is read from the `code` field in the webhook payload (`0` = success, non-zero = failure).

{% hint style="success" %}
Auto-resolution is supported for this integration. Spike will also automatically group repeated incidents and suppress alerts while incident is open.
{% endhint %}

## Set up instructions

**Step 1:** Create a Cronicle integration in the Spike dashboard and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

**Step 2:** Configure the webhook in Cronicle.

{% tabs %}
{% tab title="Setup on Cronicle" %}
1. Log in to the Cronicle web UI and open the **Schedule** tab.
2. Find the job/event, click **Edit** (or open the event to edit it).
3. In the **Edit Event** form, scroll to **Event Notification → Event Web Hook**.
4. Paste the Spike webhook URL into the **Web Hook URL** field, then save the event.

Cronicle posts webhook events on job start and job complete. Spike acts only on `job_complete` by default.
{% endtab %}
{% endtabs %}

## Test the integration
1. Trigger a Cronicle job run that fails (for example, force a non-zero process exit code).
2. Confirm Cronicle sends the webhook and verify a new incident is created in Spike.
3. Run the same job again and ensure it completes successfully (`complete: 1`, `code: 0`).
4. Confirm Spike auto-resolves the previously open incident for that job.
