---
description: >-
  Automate your common actions with Playbooks to reduce mean time to resolution.
---

# Playbooks

Get started with Playbooks at [Sidebar > Automation > Playbooks](https://app.spike.sh/automation/playbook)

A Playbook is a powerful tool to automate common actions in your incident management process. It's like a pre-programmed sequence of steps your team should take when specific incidents occur. Instead of scrambling to remember protocols or manually initiating a series of tasks, responders can activate a Playbook with a single click. This triggers a predefined set of actions, such as notifying team members, setting incident severity/priority, or creating support tickets, all tailored to the nature of the incident. 

For added flexibility, Playbooks can be configured to run automatically under certain conditions or for specific incidents, ensuring that your response is both immediate and precisely aligned with your procedures. 

## Simplifying your Incident Management process
One of the biggest wins with Playbooks is how they make everyone's life easier, especially during crunch time. Let's say something critical goes down. Normally, this would mean a lot of rushing around, messaging people, and trying to remember what needs to be done first. With Playbooks, the heavy lifting is done for you. 

Members can set up a Playbook ahead of time, laying out all the necessary actions like who to alert and add additional responders, and where to document the incident across your task management or support desks. When things hit the fan, anyone on the team can kickstart this process with just one click. 

Playbooks serve as an automated guide, streamlining the execution of all necessary actions promptly and without omission. This approach shortens response times and also shifts the team's focus toward resolving the issue, removing the need for manual coordination and procedure memorization.

## Common Actions with Playbooks

Playbooks can automate a wide range of actions, including but not limited to:

- Adding responders to incidents based on severity or type.
- Setting incident priorities and severities to align with predefined criteria.
- Automatically creating communication channels or war rooms for collaboration.
- Generating tickets in project management or issue tracking systems such as JIRA, Linear, or ClickUp.
- Initiating support tickets in customer service platforms like Zendesk or Freshdesk.
- Executing custom scripts or workflows via outbound webhooks for specialized tasks

## How Playbooks function

Playbooks are versatile, capable of functioning in two distinct modes: through manual run and via automatic runs based on specific conditions for select or all integrations/services.

{% hint style="info" %}
The sequence of actions in a Playbook is strictly adhered to. Say for example - if you add responders as Step 1, set severity as Step 2, and trigger an outbound webhook as Step 3, these actions will be executed in their precise order.
{% endhint %}

#### Manual Runs
Users can manually run a Playbook with the simple click of a button. This feature is particularly useful in situations where a rapid response is required, and the user is aware of the need to initiate a specific set of actions. Upon running, the Playbook carries out its predefined sequence, such as alerting team members, establishing communication channels, and documenting the incident in appropriate systems.

#### Automatic Runs
Playbooks are also designed to run autonomously, executing predetermined actions when certain conditions are satisfied. These conditions could be as specific as the type or severity of an incident being identified. This autonomous operation mode allows Playbooks to function in the background, seamlessly managing your incident responses without demanding immediate manual oversight. This level of automation guarantees both consistency in handling incidents and enables responders to dedicate their focus to resolving the issues at hand.


## Who can access it?

By default, Playbooks are accessible to all team members, including admins and responders. They can create, edit, and delete Playbooks. However, advanced permission settings that enable teams to customize access levels, granting specific read, write, and execution rights to different roles within the organization.

Evaluates to True if the total incident occurrences crossed a specific threshold.

## Some Example Use Cases in Brief
1. **Critical Incident Response:** Automatically gather a response team in a video conference, assign severity, and create an incident ticket.
2. **Low Severity Management:** For minor issues, set the incident to low priority and resolve it automatically, ensuring focus remains on critical tasks.
3. **External Communication:** Upon incident detection, create a status page incident and notify subscribers, keeping all stakeholders informed.
4. **Custom Workflow Integration:** Use outbound webhooks to trigger custom scripts or processes, integrating with external tools or systems for specialized responses.
5. **High-Volume Ticket Triage:** During peak times when customer support tickets or new incidents surge, a Playbook can categorize tickets based on keywords in incidents, assign them to the appropriate responders, and set priorities.
6. **Security Breach Detected:** Upon a security incidnet, Acknowledge the incident, generate a high-priority Support ticket for the security team, and trigger security protocols via outbound webhook to isolate.
