# Render

## Overview

[Render](https://render.com) is a unified cloud platform that simplifies building and running applications and websites with managed services including web services, static sites, databases, cron jobs, and background workers. Render monitors your infrastructure continuously, tracking deployments, service health, database operations, and scaling events to help you maintain reliable and efficient systems.

With Spike's integration, you can receive real-time alerts for various incidents detected by Render, including:

* **Deployment Events**: Notifications for build and deploy lifecycle events, including successful completions, failures, and cancellations across all your services.
* **Service Availability Issues**: Alerts when services become unavailable due to runtime errors, hardware failures, or enter maintenance mode.
* **Database Operations**: Notifications for Render Postgres events including backups, high availability failovers, version upgrades, and replica synchronization issues.
* **Scaling Events**: Alerts for manual and automatic scaling operations, instance count changes, and autoscaling configuration updates.
* **Cron Job Execution**: Notifications when scheduled cron jobs start, complete successfully, or fail during execution.
* **Infrastructure Changes**: Alerts for configuration changes such as plan updates, disk operations, and service suspensions or resumptions.

This integration helps you stay on top of your entire Render infrastructure, allowing for immediate response to deployments, service disruptions, and operational issues.

{% hint style="info" %}
Spike will automatically group repeated incidents and also suppress alerts while incident is open. You can set up [alert rules](https://docs.spike.sh/alerts/alert-rules) to determine incident severity and take actions accordingly. Auto-resolution is supported for certain event types.
{% endhint %}

## Set up instructions

**Step 1:** Create a Render integration in the Spike dashboard and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

**Step 2:**

{% tabs %}
{% tab title="Setup on Render" %}

**Prerequisites:**
* You must be a workspace admin in Render to create webhooks.
* Your Render workspace requires a Professional plan or higher.

**Create the Webhook:**

1. **Navigate to Webhooks Settings:**
   * From your workspace home in the Render Dashboard, click **Integrations → Webhooks** in the left sidebar.
   * Click **+ Create Webhook**.

2. **Configure the Webhook:**
   * **Name**: Enter a descriptive name (e.g., "Spike Incident Management").
   * **URL**: Paste the Spike webhook URL copied from Step 1.
   * **Events**: Select the events that will trigger notifications to Spike. You can choose any combination of supported event types:

**Recommended Event Types:**

* **Deployment Lifecycle:**
  * `build_ended` - Build completions (includes status: succeeded, failed, canceled)
  * `build_started` - Build initiations
  * `deploy_ended` - Deploy completions (includes status: succeeded, failed, canceled)
  * `deploy_started` - Deploy initiations
  * `pre_deploy_ended` - Pre-deploy command completions
  * `pre_deploy_started` - Pre-deploy command initiations
  * `job_run_ended` - One-off job completions (includes status)
  * `commit_ignored` - Skipped auto-deploys based on commit message
  * `branch_deleted` - Git branch deletions (disables auto-deploys)

* **Service Availability:**
  * `server_failed` - Service unavailability (critical)
  * `server_available` - Service recovery
  * `server_hardware_failure` - Hardware-related failures
  * `server_restarted` - Service restarts
  * `service_suspended` - Service suspensions
  * `service_resumed` - Service resumptions
  * `maintenance_started` - Maintenance window starts
  * `maintenance_ended` - Maintenance window ends
  * `maintenance_mode_enabled` - User-initiated maintenance mode
  * `zero_downtime_redeploy_started` - Zero-downtime deploys
  * `zero_downtime_redeploy_ended` - Zero-downtime deploy completions

* **Render Postgres:**
  * `postgres_unavailable` - Database unavailability (critical)
  * `postgres_available` - Database recovery
  * `postgres_backup_failed` - Manual backup failures
  * `postgres_backup_completed` - Manual backup completions
  * `postgres_cluster_leader_changed` - HA failover events
  * `postgres_restore_failed` - Point-in-time recovery failures
  * `postgres_restore_succeeded` - Point-in-time recovery successes
  * `postgres_pitr_checkpoint_failed` - Daily checkpoint failures
  * `postgres_upgrade_failed` - Version upgrade failures
  * `postgres_upgrade_succeeded` - Version upgrade successes
  * `postgres_read_replica_stale` - Replica sync issues
  * `postgres_wal_archive_failed` - WAL archive failures

* **Scaling:**
  * `autoscaling_started` - Autoscaling operations begin
  * `autoscaling_ended` - Autoscaling operations complete
  * `instance_count_changed` - Manual scaling changes
  * `autoscaling_config_changed` - Autoscaling configuration updates

* **Cron Jobs:**
  * `cron_job_run_ended` - Cron job completions (includes status)
  * `cron_job_run_started` - Cron job initiations

* **Configuration Changes:**
  * `plan_changed` - Instance type changes
  * `disk_created` - Persistent disk additions
  * `disk_updated` - Disk configuration updates
  * `disk_deleted` - Disk deletions

3. **Save the Webhook:**
   * Click **Create Webhook** to save your configuration.
   * Render will display a **Signing Secret** for your webhook - you can use this for signature validation if needed, but it's not required for basic Spike integration.

4. **Test the Integration:**
   * Trigger a test event in Render (such as deploying a service or manually triggering a build).
   * Verify that the event appears in Spike as a new incident.
   * Check that the incident details include the service name, event type, and timestamp.

{% endtab %}
{% endtabs %}

## Event payload structure

Render sends webhook notifications as JSON payloads with the following structure:

```json
{
  "type": "deploy_ended",
  "timestamp": "2025-02-25T16:22:19.979294509Z",
  "data": {
    "id": "evt-cuuuses015js70180jk0",
    "serviceId": "srv-cukouhrtq21c73e9scng",
    "serviceName": "my-service",
    "status": "succeeded"
  }
}
```

**Key Fields:**
* `type` - The event type that triggered the notification
* `timestamp` - When the event occurred (ISO 8601 format)
* `data.id` - Unique event identifier (starts with `evt-`)
* `data.serviceId` - Service identifier (starts with `srv-`)
* `data.serviceName` - Human-readable service name
* `data.status` - Event outcome (present for build, deploy, and job events: `succeeded`, `failed`, or `canceled`)

## Troubleshooting

**Webhook not receiving events:**
* Verify your workspace has a Professional plan or higher
* Check that you're a workspace admin in Render
* Ensure the webhook hasn't been disabled due to delivery failures
* Verify the Spike webhook URL is correctly configured

**Missing events in Spike:**
* Confirm the specific event types are selected in your Render webhook configuration
* Check Render's webhook delivery logs in the Dashboard
* Test with a simple event like manually triggering a deploy

**Webhook disabled by Render:**
* Check your email for notifications from Render about webhook failures
* Verify Spike's webhook endpoint is accessible and responding with 2xx status codes
* After resolving issues, re-enable the webhook from the webhook Settings page in Render Dashboard

{% hint style="success" %}
This integration auto resolves
{% endhint %}