# NinjaOne

## Overview

[NinjaOne](https://www.ninjaone.com/) is a unified endpoint management platform that provides remote monitoring and management (RMM), endpoint security, patch management, and IT automation capabilities. NinjaOne continuously monitors your devices, networks, and IT infrastructure, tracking everything from system health and security events to automated tasks and user activities.

With Spike's integration, you can receive real-time alerts for various activities and events detected by NinjaOne, including:

* **Device Management**: Notifications for device enrollment, approval/rejection, configuration changes, and system events
* **Security Events**: Alerts for antivirus detections, security policy violations, and threat responses
* **Patch Management**: Notifications for patch deployments, approvals, rejections, and system update activities
* **Remote Access**: Events for remote control sessions, connections, and disconnections
* **Backup Operations**: Alerts for backup jobs, restores, and data protection activities
* **Automation & Scripting**: Notifications for script execution, scheduled tasks, and automation workflows
* **User Activities**: Events related to user logins, account changes, and access management
* **Service Monitoring**: Alerts for Windows services, system processes, and application states
* **Network Events**: Notifications for network changes, port activity, and connectivity issues
* **Hardware Changes**: Events for disk operations, CPU/memory changes, and hardware failures

This integration helps you stay on top of your entire IT infrastructure, allowing for immediate response to critical system events, security incidents, and operational issues.

{% hint style="info" %}
Spike will automatically group repeated incidents and also suppress alerts while incident is open. You can set up [alert rules](https://docs.spike.sh/alerts/alert-rules) to determine incident severity and take actions accordingly. Auto-resolution is supported for certain activity types.
{% endhint %}

## Set up instructions

**Step 1:** Create a NinjaOne integration in the Spike dashboard and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

**Step 2:**

{% tabs %}
{% tab title="Setup on NinjaOne" %}

**Prerequisites:**
* Webhook URL from Spike (completed in Step 1)
* System Administrator role privileges in NinjaOne

**Create the Webhook Notification Channel:**

1. **Navigate to Notification Channels:**
   * Log in to your NinjaOne account with a user that has the "system administrator" role
   * Go to **Administration → Apps → Notification Channels**

2. **Create Webhook Channel:**
   * Click the **Add** button
   * Select **Webhook** from the options

3. **Configure the Webhook:**
   * **Name**: Enter a descriptive name (e.g., "Spike Incident Management")
   * **URL**: Paste the Spike webhook URL you copied in Step 1
   * **Enabled**: Ensure this checkbox is checked

4. **Save the Webhook:**
   * Click **Save** to establish the connection

**Associate Webhook with Alerts:**

1. **Navigate to Policies:**
   * Go to **Administration → Policies**
   * Open an existing policy or create a new one

2. **Configure Conditions:**
   * Under the **Conditions** tab, set up your desired alert conditions (e.g., device offline, disk space low, security events)
   * In the condition configuration or policy's **Channels** dropdown, select the webhook you just created

3. **Save Policy Changes:**
   * Click **Save** to apply the webhook association

**Recommended Alert Types for Incident Management:**

* **Critical System Events:**
  * Device offline/online status changes
  * High CPU/memory/disk usage alerts
  * Service failures and crashes

* **Security Alerts:**
  * Antivirus detections and quarantine events
  * Security policy violations
  * Unauthorized access attempts

* **Patch Management:**
  * Failed patch installations
  * Missing critical security updates
  * Patch deployment status

* **Backup Monitoring:**
  * Backup job failures
  * Storage space issues
  * Recovery point validation errors

{% hint style="info" %}
You can create multiple policies with different conditions, each associated with the same webhook channel. This allows granular control over which events trigger incidents in Spike.
{% endhint %}

**Test the Integration:**
* Trigger a test alert in NinjaOne (e.g., create a condition that will fire immediately)
* Verify that the event appears as a new incident in Spike
* Check that the incident includes relevant device information and alert details

{% endtab %}
{% endtabs %}

## Event payload structure

NinjaOne sends webhook notifications as JSON payloads with the following structure when alerts are triggered through Notification Channels:

```json
{
  "id": 12345,
  "activityTime": 1703123456.789,
  "deviceId": 67890,
  "severity": "MAJOR",
  "priority": "HIGH",
  "seriesUid": "uuid-string",
  "activityType": "CONDITION",
  "statusCode": "TRIGGERED",
  "activityResult": "SUCCESS",
  "sourceConfigUid": "uuid-string",
  "sourceName": "CPU Usage Alert",
  "subject": "High CPU Usage Detected",
  "userId": 11111,
  "message": "CPU utilization exceeded 90% for device WORKSTATION-001",
  "type": "Alert",
  "data": {
    "customField": "additional data"
  },
  "device": {
    "id": 67890,
    "parentDeviceId": null,
    "organizationId": 22222,
    "locationId": 33333,
    "nodeClass": "WINDOWS_WORKSTATION",
    "nodeRoleId": 44444,
    "rolePolicyId": 55555,
    "policyId": 66666,
    "approvalStatus": "APPROVED",
    "offline": false,
    "displayName": "WORKSTATION-001",
    "systemName": "WORKSTATION-001.domain.com",
    "dnsName": "workstation-001.domain.com",
    "netbiosName": "WORKSTATION-001",
    "created": 1700000000,
    "lastContact": 1703123456,
    "lastUpdate": 1703123456
  }
}
```

**Key Fields:**
* `id` - Unique activity identifier
* `activityTime` - Unix timestamp of the event
* `deviceId` - ID of the affected device
* `severity` - Event severity (NONE, MINOR, MODERATE, MAJOR, CRITICAL)
* `priority` - Event priority (NONE, LOW, MEDIUM, HIGH)
* `activityType` - Category of activity (CONDITION, ACTIONSET, SECURITY, etc.)
* `statusCode` - Specific status within the activity type
* `subject` - Human-readable event title
* `message` - Detailed event description
* `device` - Device information

{% hint style="info" %}
The payload structure is the same regardless of how you configure the webhook, but additional device/organization details are not automatically included when using Notification Channels. If you need expanded device information, consider using the API method for webhook configuration.
{% endhint %}

## Troubleshooting

**Webhook not receiving events:**
* Verify you have "System Administrator" role in NinjaOne
* Check that the webhook is enabled in Notification Channels
* Confirm the Spike webhook URL is correct and accessible
* Ensure the webhook is properly saved and active

**Missing events in Spike:**
* Verify that conditions are properly configured in your policies
* Check that the webhook channel is selected in the policy's notification settings
* Test by manually triggering a condition to see if it fires
* Review policy conditions to ensure they're not too restrictive

**Webhook failures:**
* Check NinjaOne's activity logs under **Administration → Activities**
* Look for webhook delivery failure notifications
* Verify your Spike webhook endpoint is responding with 2xx status codes
* Check if there are any network connectivity issues

**Performance and rate limiting:**
* Be mindful of alert frequency to avoid notification overload
* Use appropriate thresholds to prevent false positives
* Monitor webhook delivery logs for any rate limiting issues

{% hint style="success" %}
This integration supports auto-resolution for certain event types when the corresponding reset or completion events are received.
{% endhint %}