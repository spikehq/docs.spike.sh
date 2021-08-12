# Introduction to services on Spike

## **What is a service?**

**You can think of services as a microservice.** Services are a way to scope your internal services from your architecture. Each of your service can have multiple integrations and you can create unlimited number of services. We highly encourage you to create different services for each of your different modules.

## Why create a service?

We ask users to create services to easily scope and track incidents, monitor platform health better and visualise reports segregated by every service.

{% hint style="danger" %}
Services are mandatory on Spike.
{% endhint %}

{% page-ref page="../integrations-guideline/create-integration-and-service-on-dashboard.md" %}

## Affected services

When an incident is triggered, a service gets affected. Many a times, other integrations also get affected adding up to more incidents. The **Affected services section** on the dashboard brings you transparency on which services needs to be worked upon.

![Affected services on Spike](../.gitbook/assets/screenshot-2020-06-24-at-10.37.32-am.png)

