---
description: >-
  Spike.sh is a simple incident management platform. We help you by alerting the right team members about incidents that affect your customer.
---
# What is Spike.sh?

Spike.sh is a simple incident management platform. We help you by alerting the right team members about incidents that affect your customer.&#x20;

## Focusing on simplicity

Spike.sh's mission is to reduce the complexity of managing incidents and make it simple so teams of all sizes use it.&#x20;

**Our platform consists of a few modules -**

1. Integrations
2. Alerts
3. Escalations
4. Services
5. On-call schedules
6. Reports
7. Automation
    - Alert rules: automate routing alerts, setting priority and severity, triggering outbound webhooks
    - Outbound webhooks: trigger your scripts by creating an outbound webhook (GET/POST/PUT requests)
    - Title remapper: extract values from an incident and change the incident title programatically for better context
    - Playbooks (beta): Automate common actions like creating war rooms or creating a ticket on JIRA, or updating your status page

{% hint style="info" %}
To get in depth, please reach out to us at [demo@spike.sh](mailto:demo@spike.sh) or book a call directly on our [calendar](https://calendly.com/spikehq).&#x20;
{% endhint %}

### Integrations

{% content-ref url="integrations-guideline/setup-integrations.md" %}
[setup-integrations.md](integrations-guideline/setup-integrations.md)
{% endcontent-ref %}

We integrate with a number of services and tools so you can use Spike as a central intelligence as we gather incidents and alert the right person. You can add an unlimited number of integrations, there are no restrictions. Each integration would have a separate identifiable token so you needn't worry about incidents mixing up and rest knowing that we have got you covered.

{% hint style="info" %}
We have a growing [list of integrations](https://spike.sh/integrations). If you don't see an integration you need then email us at [integrations@spike.sh](mailto:integrations@spike.sh) and we would be happy to build it for you and release it for everyone.
{% endhint %}

### Services

![Services on spike](<.gitbook/assets/affected services.png>)

**You can think of services as a microservice.** Services are a way to scope your internal services from your architecture. Each of your service can have multiple integrations and you can create unlimited number of services. We highly encourage you to create different services for each of your different modules.

You can create services by just adding a name to it. No other field is required. With the power of unlimited services, you can create a blueprint of your entire architecture on Spike. This way, we will tell which service is affected and what is the current health status in terms of open incidents.

### Escalations

![Multiple escalation policies](.gitbook/assets/escalations-list.png)

We provide simplicity by un-complicating escalation policies by allowing you to choose your alert channels. Anyone from your team can create escalation policies you can easily use. With the power of unlimited escalations, you can create escalations policies just for your self or one for your team and one for every team in your organization.

### Reports

![](<.gitbook/assets/Screenshot 2020-06-24 at 10.38.57 AM.png>)

![Reports and data you will actually use](<.gitbook/assets/image (18).png>)

No matter the size of your team, we believe everyone should have access to reports to bring in transparency to know how your platform measures in terms of open incidents. **We provide graphs to get a sense of total incidents, new incidents and repeated incidents for a given time period.**

__
