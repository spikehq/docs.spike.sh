# Integrate Spike with Uptime Robot

## Service and Integration

Make sure you have the service and integration already setup for Uptime Robot. Follow the link below on instructions of how to create integration and service

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Use the webhook on Uptime Robot

Login to [Uptime Robot](https://uptimerobot.com/login) and navigate to Settings from the header.

Go to **settings > click Add Alert contact**

This is where you manage all the alerts for your monitors. Create as many alerts as you would like and you select which monitor's up and down will be alerted by identifying by name.

####

Select webhook from the drop-down menu.

![](<../.gitbook/assets/3 Dashboard  Uptime Robot 2019-07-04 17-34-24.png>)

****

Paste the Spike webhook URL in the **URL to Notify** field.

![](<../.gitbook/assets/Screenshot 2021-05-26 at 5.34.05 PM.png>)



Paste the following JSON in the **POST Value** field.

```
{   
    "monitorID": "*monitorID*",
    "monitorURL": "*monitorURL*",
    "monitorFriendlyName": "*monitorFriendlyName*",
    "alertType": "*alertType*",
    "alertTypeFriendlyName": "*alertTypeFriendlyName*",
    "alertDetails": "*alertDetails*",
    "alertDuration": "*alertDuration*",
    "alertDateTime": "*alertDateTime*",
    "sslExpiryDate": "*sslExpiryDate*",
    "sslExpiryDaysLeft": "*sslExpiryDaysLeft*"
}
```



After selecting the Webhook option, paste the webhook you copied earlier from the dashboard and hit **Create alert contact**

## Receive alerts

For your new or already existing monitors, follow these simple steps to send alerts to Spike.

![](<../.gitbook/assets/5 Dashboard  Uptime Robot 2019-07-04 17-38-55.png>)

Edit your monitors

![](<../.gitbook/assets/6 Dashboard  Uptime Robot 2019-07-04 17-39-37.png>)

Identify your Spike integration by name and select it.

{% hint style="success" %}
This integration supports auto resolution.
{% endhint %}

**Hit save!**



## FAQ

1. **How many services and integrations can I create on Spike?**
   * Unlimited
2. **How many escalation policies can I have on Spike?**
   * Unlimited

At Spike, we are working hard to integrate with all the tools your business uses. We are on a mission to help **you** identify incidents/crashes/spikes before your customers do.

If you have any integration in mind and would like us to build it for you then contact us at [support@spike.sh.](mailto:support@spike.sh)
