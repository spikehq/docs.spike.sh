---
description: Services scope your infrastructure in Spike. Each service can hold multiple integrations and map to a microservice, product area, or team.
---

# Introduction to services

A service in Spike represents a distinct part of your infrastructure — a backend API, a payments module, a worker queue. Every integration belongs to a service, and every incident is tied to one.

## Why services matter

Services give you a clean way to track incidents by area. When something breaks, you can see exactly which service is involved, who owns it, and what's happening across your stack.

## Affected services

When an incident is triggered, its service is marked as affected. If multiple integrations fire at once, Spike surfaces all the involved services in one view — so responders know where to focus.

## Create a service

<figure><img src="../.gitbook/assets/overview/overview-services-1.png" alt="Services in Spike"><figcaption><p>Services in Spike.</p></figcaption></figure>

{% content-ref url="../integrations-guideline/create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](../integrations-guideline/create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}
