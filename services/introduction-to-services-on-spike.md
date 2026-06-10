---
description: In Spike, every integration belongs to a service. Services are how you organize and track incidents by component.
---

# Services

A service represents a component of your architecture, like an API, a database, or a frontend app. Each service can have multiple integrations. Incidents are scoped to the service that triggered them. You can create unlimited services.

## Why create a service?

Services help you scope and track incidents, monitor platform health, and view reports by component. Create a separate service for each module or part of your architecture.

{% hint style="danger" %}
Services are mandatory on Spike.
{% endhint %}

{% content-ref url="../integrations-guideline/create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](../integrations-guideline/create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Affected services

When an incident triggers, the associated service is marked as affected. A single root cause can impact multiple services at once, each triggering its own incidents. The **Affected services** section on the dashboard shows all impacted services so you can see the full scope of an outage at a glance.

<figure><img src="../.gitbook/assets/Screenshot 2020-06-24 at 10.37.32 AM.png" alt="Affected services on the Spike dashboard"><figcaption><p>Affected services on the Spike dashboard.</p></figcaption></figure>
