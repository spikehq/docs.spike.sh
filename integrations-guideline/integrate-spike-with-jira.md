# Jira

## Overview

[Jira](https://www.atlassian.com/software/jira) is a project management and issue tracking platform used by teams to plan, track, and manage work. Jira helps teams organize issues, track progress, and collaborate effectively across projects and workflows.

With Spike's integration, you can receive real-time alerts for various activities in your Jira projects, including:

* **Issue Create**: When issues are created
* **Status Changes**: Alerts when issues transition between workflow states
* **Resolution Events**: Notifications when issues are resolved or closed

This integration helps you stay informed about critical project activities, enabling immediate response to high-priority issues and ensuring your team never misses important updates.

{% hint style="info" %}
Spike will automatically group repeated incidents and also suppress alerts while incident is open. You can set up [alert rules](https://docs.spike.sh/alerts/alert-rules) to determine incident severity and take actions accordingly. Auto-resolution is supported when issues are resolved or closed.
{% endhint %}

## Set up instructions

**Step 1:** Create a Jira integration in the Spike dashboard and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

**Step 2:**

{% tabs %}
{% tab title="Setup on Jira" %}

**Prerequisites:**
* Jira administrator permissions
* Access to System settings in your Jira instance

**Create the Webhook:**

1. **Navigate to Webhook Settings:**
   * Log in to your Jira instance as an administrator
   * Go to **Settings → System → Webhooks**
   * Click **Create a Webhook**

2. **Configure the Webhook:**
   * **Name**: Enter a descriptive name (e.g., "Spike Incident Management")
   * **Status**: Ensure the webhook is **Enabled**
   * **URL**: Paste the Spike webhook URL copied from Step 1

3. **Select Events:**
   Choose the Jira events that should trigger notifications:
   * Issue created
   * Issue updated

4. **Add JQL Filter (Optional):**
   * Filter specific issues using JQL (Jira Query Language)
   * Example: `project = MYPROJECT AND priority in (High, Highest)`
   * Leave blank to receive all events

5. **Save and Test:**
   * Click **Create** to save the webhook
   * Create or update a test issue in Jira
   * Verify the event appears in Spike as a new incident

{% endtab %}
{% endtabs %}

{% hint style="success" %}
This integration supports auto-resolution when Jira issues are marked as Done, Resolved, or Closed.
{% endhint %}