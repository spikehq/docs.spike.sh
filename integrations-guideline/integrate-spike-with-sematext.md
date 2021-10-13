---
description: >-
  Detect and troubleshoot production & performance issues with logs, metrics,
  synthetic and real user monitoring. All in one place on Sematext.
---

# Integrate Spike with Sematext

## Service and integration

Create a new Sematext integration. Follow the steps in the link below to create a service and integration.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

###

### Using the webhook on Sematext

### Step 1

From the [Sematext Hook](https://apps.sematext.com/ui/hooks) dashboard,** Create New** alert.

![Select to add Alerts](../.gitbook/assets/sematext-1.png)

### Step 2

From the list of options, select **Spike.sh**. 

![Select WebHook](../.gitbook/assets/sematext-2.png)



### Step 3

You will be now displayed with a configuration panel.

Paste your **Spike webhook** in the URL field

```
// Make sure to add the following parameters and any other variables you deem fit

$description
$title

```

You can also add custom variables for more in-depth information about the alert.

Finally, **Save notification hook.**

![Configure the Webhook fields](../.gitbook/assets/sematext-3.png)

At Spike, we are working hard to integrate with all the tools your business uses. We are on a mission to help **you** identify incidents/crashes/spikes before your customers do.

If you have any integration in mind and would like us to build it for you then contact us at [support@spike.sh.](mailto:support@spike.sh)
