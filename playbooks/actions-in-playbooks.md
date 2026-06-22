---
description: Learn about all the actions you can automate with Playbooks
---

# Actions in Playbooks

Playbooks comes up with an ever-growing range of actions to automate your incident response process. Below is a comprehensive list of these actions, each designed to streamline different aspects of your incident response.

## List of Actions

1. Add one or more responders
2. Set priority
3. Set severity
4. Change title of an incident with Title remapper
5. Setup war room (video conference)
6. Create an issue on JIRA, Linear, or ClickUp
7. Create a support ticket on Zendesk, Freshdesk, and Supportpal
8. Trigger external scripts using outbound webhook
9. Resolve incident(s)
10. Acknowledge incident(s)
11. Create an incident on status page and notify subscribers
12. Resolve an incident on status page
13. Add links to incident

## Learn more about Playbook actions

1. **Add One or More Responders** Automatically involves team members in the response process, ensuring the right expertise is engaged from the start.
2. **Set Priority** Assigns a predefined urgency level (P1 to P5) to the incident, helping to prioritize response efforts based on impact and urgency.
3. **Set Severity** Marks the incident with a severity level (SEV1 to SEV3), indicating the extent of impact and guiding the response strategy.
4. **Change Title of an Incident with Title Remapper** Utilizes predefined templates or rules to dynamically adjust incident titles for clarity and context.
5. **Setup War Room (Video Conference)** Initiates a virtual meeting space on supported platforms like Google Meet or Zoom, facilitating immediate team collaboration.
6. **Create an Issue on JIRA, Linear, or ClickUp** Logs the incident as an issue within popular project management tools, using the incident's title for seamless integration and tracking.
7. **Create a Support Ticket on Zendesk, Freshdesk, and Supportpal** Opens a ticket in customer support platforms to manage and respond to user-impacting issues effectively.
8. **Trigger External Scripts Using Outbound Webhook** Executes custom scripts or processes through specified endpoints, enabling integration with external systems or workflows.
9. **Resolve Incident(s)** Marks incidents as resolved, signaling the successful mitigation or correction of the issue.
10. **Acknowledge Incident(s)** Indicates that an incident has been noticed and is being addressed, informing team members of ongoing response actions.
11. **Create an Incident on Status Page and Notify Subscribers** Publicizes the incident on a status page and alerts subscribed users, maintaining transparency and communication with stakeholders.
12. **Resolve an Incident on Status Page** Updates the status page to reflect the resolution of an incident, informing subscribers and users of the return to normal operations.
13. **Add links to incident** adds static links to your incident. Use cases include adding internal documentations, Pull requests, Deploy pipelines, customer support, etc.&#x20;

Each of these actions plays a vital role to help you automate as effectively as possible. This will enable your teams to focus on fast resolution and minimizing impact.

## How to use?

Here are the examples illustrated in the form of actions.

#### Comprehensive Response to Critical Incidents

**Action 1:** Add one or more responders -- Automatically brings in senior engineering team members. **Action 2:** Set priority -- Assigns the incident a P1 urgency level. **Action 3:** Set severity -- Marks the incident as SEV1. **Action 4:** Setup war room (video conference) -- Creates a Google Meet for immediate discussion. **Action 5:** Create an issue on JIRA -- Logs the incident for tracking and further action.

**Conditions:** Analyze the payload for severity indicators and/or look for number of times an incident has occured in the past `x` minutes.

#### Automated Low Severity Incidents

**Action 1:** Set severity -- Marks the incident as SEV3, indicating low severity. **Action 2:** Set priority -- Assigns a P5 priority, reflecting lower urgency. **Action 3:** Resolve incidents -- Automatically marks the incident as resolved.

**Conditions:** Analyse the payload for low severity indicators using specific key/value pairs.

#### Automated Status Page Communications

**Action 1:** Create an incident on status page and notify subscribers **Action 2:** Resolve an incident on status page -- Updates subscribers on resolution status.

#### Nudge for Repeated Incident Occurrences

**Action 1:** Set Severity (SEV2) **Action 2:** Create an alert rule to change escalation policy to alert responders.

**Conditions:** If incident has occurred `x number of times in the last y minutes` (_5 times in the last 30 minutes_)

#### Payment System Glitch

**Action 1:** Resolve incident **Action 2:** Auto-create a Support ticket detailing the issue for proactive customer outreach

#### Automated Resolution of Incidents

**Action 1:** Trigger external scripts using outbound webhook -- Initiates custom analysis or alerts external systems for further action. **Action 2:** Resolve the incident

These examples clearly illustrate how Playbooks can be configured to automate responses to a variety of incidents, showcasing the flexibility and power of Playbooks in Spike.sh. By breaking down each response into actionable steps, we demonstrate the practical application of Playbooks in streamlining incident management processes, ensuring teams can respond swiftly and effectively to any situation.
