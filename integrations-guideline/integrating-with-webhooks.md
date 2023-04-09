---
description: Use spike's webhook and create an incident from your code.
---

# Integrating with Webhooks

## Create an incident using our webhooks integration

Each webhook is unique to the service and escalation policy. Make sure you create a webhook integration and copy the webhook URL. [Know how](https://docs.spike.sh/integrations-guideline/create-integration-and-service-on-dashboard).

From your code, you can create an incident simply by making a **POST** request.

{% swagger baseUrl="https://hooks.spike.sh" path="/:token/push-events" method="post" summary="Create an incident" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="path" name="token" type="string" %}
Unique token for your webhook integration
{% endswagger-parameter %}

{% swagger-parameter in="body" name="title" type="string" %}
This will be the title of your incident. Failing to add this will create an empty incident. Read more about this below 👇
{% endswagger-parameter %}

{% swagger-parameter in="body" name="body" type="string" %}
Accepts objects and strings. This data will be in your incident details
{% endswagger-parameter %}

{% swagger-parameter in="body" name="severity" type="string" %}
Sets the severity on your incident. Options are 

**sev1, sev2, and sev3.**
{% endswagger-parameter %}

{% swagger-parameter in="body" name="priority" type="string" %}
Sets the priority on your incident. Options are 

**p1, p2, p3, p4, and p5**
{% endswagger-parameter %}

{% swagger-response status="200" description="Cake successfully retrieved." %}
```
{ Ok: true }
```
{% endswagger-response %}

{% swagger-response status="500" description="Could not process your request." %}
```
{}
```
{% endswagger-response %}
{% endswagger %}

The above request will create a new incident. Please make sure you have used the correct webhook URL. If you have copied the URL from the dashboard then the **token **_****_** should already be present.** A new incident is created soon as make a POST request. A successful request will get you 200 HTTP response status code.&#x20;

### **When is a new incident NOT created?**

If the integration has an open incident (_not resolved state_) __ with the same title then a new incident will NOT be created.

### What is the title's significance?

The **title** plays an important role really. A new incident will use this title and it will be sent on all alter channels. The title acts as a unique identifier to perform group actions, suppress repeated incidents and also to auto-resolve them.

### What happens if I miss adding a title?

Failing to add **title** would create incidents with no message. This also means that it will NOT group, suppress or auto-resolve these incidents.

{% hint style="info" %}
We highly recommend you add a title to your POST request while creating an incident
{% endhint %}

{% swagger baseUrl="https://hooks.spike.sh" path="/:token/push-events" method="post" summary="Auto-resolve incident" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="path" name="token" type="string" %}
Unique token for your webhook integration
{% endswagger-parameter %}

{% swagger-parameter in="body" name="status" type="string" %}
**resolve**
{% endswagger-parameter %}

{% swagger-parameter in="body" name="body" type="string" %}
As of now, you can add any message about the incident you would like here. Accepts objects too.
{% endswagger-parameter %}

{% swagger-parameter in="body" name="title" type="string" %}
This will be the title of your incident. Failing to add this will create an empty incident title with all other parameters. Read more about this below 👇
{% endswagger-parameter %}

{% swagger-response status="200" description="Cake successfully retrieved." %}
```
{ Ok: true }
```
{% endswagger-response %}

{% swagger-response status="500" description="Could not process your request." %}
```
{}
```
{% endswagger-response %}
{% endswagger %}

The above request will automatically resolve incidents. We use the title and the token to uniquely get open incidents and resolve them.&#x20;

All you need is to add the **status parameter as 'resolve'** in your POST request. The rest of the parameters are the same as creating incident request.

{% hint style="warning" %}
Make sure to have the same **title while resolving,** otherwise it won't work.
{% endhint %}
