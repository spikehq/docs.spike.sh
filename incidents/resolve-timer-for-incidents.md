# Resolve Timer

Keep your incident dashboard clean and focused with automated incident resolution. Resolve Timer automatically closes incidents after a specified time period, helping your team focus on what matters most.

## Overview

Resolve Timer is an intelligent automation feature that automatically resolves incidents after a predetermined time period. Think of it as your dashboard's cleanup crew - it ensures that incidents don't linger indefinitely and clutter your incident management view.

When an incident remains open for the duration you've specified, Resolve Timer steps in and automatically marks it as resolved. This helps maintain a clean, actionable dashboard where your team can focus on active, unresolved incidents that need immediate attention.

## Why use Resolve Timer?

**Cleaner dashboards**: Eliminate incident clutter and maintain focus on active issues that require immediate attention.

**Better team productivity**: Your team spends time on genuine incidents.

**Consistent incident hygiene**: Ensure incidents don't remain open indefinitely, maintaining accurate incident metrics and reporting.

## How Resolve Timer works

Once configured, Resolve Timer monitors your incidents and automatically resolves them based on your specified timeframe. The timer starts counting from the moment an incident is created, and when it reaches your configured duration, the incident is automatically marked as resolved.

You can configure Resolve Timer in two ways:
- **Integration-level**: Automatically resolve all incidents from a specific integration
- **Alert rule-level**: Resolve incidents that match specific conditions using alert rules

## Prerequisites

Before configuring Resolve Timer, make sure you have:
- Permission to Edit/Create an Alert rule
- Permission to Edit/Create an Integration

## Configuration Methods

### Method 1: Integration-level Resolve Timer

Use this method when you want every incident from a specific integration to automatically resolve after a set time period.

#### Step-by-step setup

**Step 1**: Navigate to your integration settings
- Go to **Integrations** in your Spike dashboard
- Find the integration you want to configure
- Click **Edit** or create a new integration

**Step 2**: Access advanced configuration
- Scroll down to the **Advanced Configuration** section
- Look for the **Resolve Timer** toggle switch

**Step 3**: Enable and configure Resolve Timer
- Toggle the **Resolve Timer** switch to **ON**
- Enter your desired time value in the input field
- Select the time unit from the dropdown: **Minutes**, **Hours**, or **Days**

**Step 4**: Save your configuration
- Click **Save** to apply your changes
- All future incidents from this integration will automatically resolve after your specified time period

#### Example configuration
- **Time value**: 24
- **Time unit**: Hours
- **Result**: All incidents from this integration will automatically resolve after 24 hours

<img src="../.gitbook/assets/setup resolve timer (integration).png" style="border-radius: 6px; width: 100%;" alt="How to configure resolve timer in alert rules">


### Method 2: Alert Rule-based Resolve Timer

Use this method when you want to resolve incidents that match specific conditions, giving you more granular control over which incidents get automatically resolved.

#### Step-by-step setup

**Step 1**: Create or edit an alert rule
- Navigate to **Alert Rules** in your dashboard
- Click **Create Alert Rule** or select an existing rule to edit

**Step 2**: Configure your conditions
- Set up your alert conditions as needed
- Define which incidents should trigger this rule

**Step 3**: Add the Resolve Timer action
- In the **Actions** section, click **Add Action**
- Select **Resolve After** from the action dropdown

**Step 4**: Configure timing
- Enter your desired time value
- Select the time unit: **Minutes**, **Hours**, or **Days**
- Click **Save** or **Update** to apply your rule

#### Example alert rule configuration
- **Condition**: Incidents from "Production Database" service
- **Action**: Resolve After 2 hours
- **Result**: Database incidents automatically resolve after 2 hours if not manually handled

<img src="../.gitbook/assets/Setup resovle timer (alert rules).png" style="border-radius: 6px; width: 100%" alt="How to configure resolve timer in alert rules">

## Configuration Options

### Time Units Available
| Unit | Minimum Value | Maximum Value | Best For |
|------|---------------|---------------|----------|
| Minutes | 1 | 1440 (24 hours) | Short-lived alerts, testing |
| Hours | 1 | 168 (7 days) | Standard incident workflows |
| Days | 1 | 7 | Long-running maintenance, planned outages |

### Integration vs Alert Rule: Which to choose?

**Use Integration-level Resolve Timer when**:
- You want consistent behavior across all incidents from a source
- You're dealing with noisy integrations that generate many low-priority alerts
- You need simple, set-and-forget automation

**Use Alert Rule-based Resolve Timer when**:
- You need different resolution times based on incident characteristics
- You want to combine auto-resolution with other automated actions
- You need conditional logic for incident resolution


> ✅ **Resolve Timer is available on all Spike plans** - Starter, Business, and Enterprise.

## Best Practices

**Start with longer timeframes**: Begin with conservative resolution times (like 24 hours) and adjust based on your team's workflow patterns.

**Monitor resolution patterns**: Review auto-resolved incidents periodically to ensure you're not missing important alerts.

**Use different timers for different services**: Critical production services might need longer resolution times than development or staging environments.

**Test your configuration**: Set up Resolve Timer with a test integration first to understand how it behaves with your incident types.

## FAQs

<details>
<summary>Q: Can I disable Resolve Timer for specific incidents?</summary>
A: Not for individual incidents, but you can disable it at the integration level or modify alert rule conditions to exclude certain incident types.
</details>

<details>
<summary>Q: What happens if I manually resolve an incident before the timer expires?</summary>
A: Manual resolution takes priority. The timer stops, and the incident remains manually resolved.
</details>

<details>
<summary>Q: Can I see which incidents were auto-resolved?</summary>
A: Yes, auto-resolved incidents show a `Resolved (timer)` status. You can also check activity log to see if the incident was auto
</details>

<details>
<summary>Q: Can I set different resolution times for different severity levels?</summary>
A: Yes, using alert rules you can create different Resolve Timer configurations based on incident severity, service, or other conditions.
</details>

<details>
<summary>Q: What's the shortest resolution time I can set?</summary>
A: The minimum is 1 minute, though we recommend at least 15-30 minutes for most use cases to allow for proper incident handling.
</details>

<details>
<summary>Q: Will I get notified when incidents auto-resolve?</summary>
A: This depends on your notification settings. You can configure whether you want to receive notifications for auto-resolved incidents.
</details>

## Need Help?

If you're having trouble setting up Resolve Timer or have questions about your specific use case:
- Check out our [Integration documentation](https://docs.spike.sh/integrations-guideline/create-integration-and-service-on-dashboard)
- Learn about [Alert Rules](https://docs.spike.sh/alerts/alert-rules) for advanced incident handling
- Contact our support team at support@spike.sh for personalized assistance

---

*Was this helpful? Let us know at support@spike.sh*