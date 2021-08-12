---
description: >-
  Integrations has to be added to a service. In this doc we will take you
  through the process of how to create a service and add any number of
  integrations to it.
---

# Create integration and service on our dashboard

## **What is a service?**

**You can think of services as a microservice.** Services are a way to scope your internal services from your architecture. Each of your services can have multiple integrations and you can create an unlimited number of services. We highly encourage you to create different services for each of your different modules.

[Learn more about services](https://docs.spike.sh/services/introduction-to-services-on-spike).

## Adding service

![](../.gitbook/assets/image%20%2825%29.png)

You can create a new service by clicking on the [New Service button](https://app.spike.sh/services/new) on the [services page](https://app.spike.sh/services).

Give it an appropriate name, **for ex: Billing service**. \( This way you can also integrate your payment gateway by adding another integration for every time payments fail \). Hit **Create service!**  


Once the service is created you will be able to see an overview of your service with all of it's integrations. 

### Adding integration

From the header, select Add integration. Optionally, on the sidebar select integrations and then add integration.

![Step 1 - Select an integration](../.gitbook/assets/image%20%2854%29.png)

![Step 2 - add service, escalation, Acknowledge timeout](../.gitbook/assets/image%20%28106%29.png)

[Acknowledge timeout](https://docs.spike.sh/incidents/acknowledge-timeout) and repeat escalations are optional but we highly recommend it. 

![](../.gitbook/assets/copy-webhook.png)

The last bit on our dashboard is the final step of copying the webhook to be used on Pingdom used as an example here. 

So, get the webhook by clicking on the **Copy Webhook** button.

![Final step - copy the integration webhook](../.gitbook/assets/integration-last.png)

{% hint style="danger" %}
Make sure to use the Pingdom webhook in Pingdom. Using it on other integrations might not give you the proper incident messages and will not reliably group repeated 
{% endhint %}

{% hint style="success" %}
Not able to find an integration you are looking for?? Use the **Webhook** integration instead and paste it on any service. 
{% endhint %}

