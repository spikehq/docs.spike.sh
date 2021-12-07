---
description: Share real time updates with your users about ongoing tech incidents.
---

# Create public Incident on status page

#### Step 1: Create new incident

![](<.gitbook/assets/create incident 1.png>)

In the Status Pages dashboard, click on 'Incidents' in the left sidebar. Then click on 'New incident' button on the Incidents page.

![](<.gitbook/assets/create incident 2.png>)

In the 'Create incident' form, add details about your incident. Add a **title** and a **description** to describe the tech issue.&#x20;

Select the **affected components** - these are system components that are impacted by the incident. For example, if it is a problem with mobile app only, choose that from the component list. Then select the current state for that component. Here is what the different component states mean -&#x20;

* **Operational** - This component is functioning correctly.&#x20;
* **Degraded performance** - The component is functioning, but at a less than optimal performance e.g. longer response times with APIs.&#x20;
* **Partial outage** - This component is not working for some users and/or in some situations.&#x20;
* **Critical outage** - This component is not functioning correctly for a majority of the users.&#x20;
* **Planned maintenance** - This state is used when you have scheduled maintenance activity on some components. You can create a Planned Maintenance event in such cases.

You can specify the **date and time** at which the incident was identified. This will also be used to calculate the outage time for your components.&#x20;

You can choose the **Incident impact** value based on your assessment of the situation. You can change this as you get more information about the incident.

Finally, you can choose whether to **notify your status page subscribers** via email about this incident. If you select this option, an email will be sent to all subscribers of the status page.

![](<.gitbook/assets/create incident 3.png>)

You should&#x20;



#### Step 2: Add updates to an incident

![](<.gitbook/assets/create incident 4.png>)

As you get more information about the incident, you can **add updates** to the incident. Click on 'Add status update' on the incident page in your dashboard.

![](<.gitbook/assets/create incident 5.png>)

For each update, you can choose the current Incident status. This can be one of -

* **Investigating** - You are looking into the issue.
* **Identified** - You have identified the cause of the issue and/or the fix to solve it.&#x20;
* **Resolved** - You have fixed the problem and will most likely move the affected components back to Operational state.
* **Postmortem** - This update is after the issue is resolved and meant to communicate your findings and steps you will take to prevent the issue in the future.
* **Update** - This is a generic update to the incident that can be used when any of the above statuses don't apply.

![](<.gitbook/assets/create incident 6.png>)

You can see the incident updates on your public status page.&#x20;
