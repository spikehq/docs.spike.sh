---
description: >-
  Learn how to set up automated Playbooks so they run without any intervention from users
---

# Introduction to Automating Playbooks

Automating Playbooks empowers teams to handle incidents more effectively by ensuring that predefined actions are run **automatically under certain conditions**. This capability will take a step further in streamlining the incident response process and guarantees consistency in handling incidents, regardless of the time of day or the availability of personnel. Here are a few use cases where automating Playbooks can significantly enhance your incident management workflow:

By leveraging automation, teams can respond to incidents with the speed and precision required to minimize impact and maintain high levels of service availability and performance.

## Setting Up Automation for Playbooks

Follow these steps to configure your Playbooks for automation in Spike.sh, making your incident response process more efficient and reliable.

### Step 1: Choose Your Trigger Event

Incident Event: Currently, the primary trigger for automating a Playbook is an incident event, such as the creation of a new incident. Future updates will introduce more trigger options, like on-call shift changes.

### Step 2: Apply to Integrations or Services
Selection: Decide whether the automation should apply to all integrations and services on Spike or only specific ones. This choice tailors the Playbook's execution to relevant areas of your operations.

### Step 3: Define Conditions (Optional)
Incident Title: Include keywords or use regular expressions to identify incidents by their titles.
Incident Details: Specify keywords or regex patterns in incident details, focusing on payload keys and values.
Incident Occurrences: Trigger the Playbook based on the frequency of an incident within a given timeframe.
Incident Priority or Severity: Set conditions based on the incident's priority (P1 to P5) or severity (SEV1 to SEV3).
Conditions can be combined using AND/OR logic for precise control, e.g., "Run Playbook if incident is P1 priority OR contains 'Down' in its title."

### Step 4: Select Incident Status Change Condition
**Run on Any Incident:** Choose to run the Playbook for any incident status change—triggered, acknowledged, or resolved. This setting ensures the Playbook runs for any incident that matches the conditions from Step 3.

**Run When All Incidents:** Opt to run the Playbook when all incidents in a set reach a certain status, like all being acknowledged or resolved. This approach is useful for coordinated actions across multiple incidents.


Once you've configured the trigger, applied the Playbook to the desired integrations or services, and set your conditions, your Playbook is ready to automate. Remember, every Playbook can also be triggered manually, offering flexibility in how you respond to incidents.

## Example use cases for automations
There are 2 types of use cases here. First when an incident is trigger and second when incidents are all acknowledged or resolved.


### When Any incident is Triggered:
1. **Automatic service recovery:** Detect a common incident, trigger external scripts via outbound webhook for restarting servers, log diagnostics, run GitHub workflows, resource scaling, backup your dbs, etc. 
2. **Keyword "Down" Incident:** Automatically detect severity on keyword, alert the teams, and set system updates on your status page. Optionally, create a support ticket on Freshdesk, Zendesk, etc or create a new issue on Linear, JIRA, etc. 
3. **Critical Integration Incident:** For SEV1 incidents on select integration, set priority P1, launch a War room (video conference), and run external scripts with outbound webhook.
4. **Customer-Service Outage:** Automaticaly **Acknowledge** incident, create Zendesk ticket, and prepare customer support for communication.
5. **Service Self-Recovery Attempts:** Auto-Acknowledge or Resolve service restart attempts
6. **Performance Degrade Alert:** Trigger diagnostics via outbound webhooks and alert relevant teams if performance metrics fall below thresholds.

### When one or all incidents are Acknowledged or Resolved:
1. **Post-Incident Review Initiation**: Trigger an outbound webhook to schedule a review and compile reports once all deployment-related incidents are resolved.
2. **Automated System Health Rechecks**: After acknowledging connectivity issues, automate a health check to confirm stability. Again, via Outbound webhooks.
3. **Customer Communication Update**: Automatically update the status page and email resolution summaries to customers when service incidents are resolved.
4. **Resource Scaling Down**: Initiate resource optimization and scaling down after high-usage incidents are resolved.
5. **Infrastructure Restoration and Backup Verification**: Automate service restoration and backup checks following database instability resolutions.

With the power of automation of Playbooks, the possibilities for streamlining your incident management process are truly endless.