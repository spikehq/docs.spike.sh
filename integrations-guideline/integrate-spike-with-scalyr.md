# Integrate Spike with Scalyr

### Service and integration <a href="service-and-integration" id="service-and-integration"></a>

Make sure to add the Scalyr integration and copy the webhook.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

###

### Using webhooks with Scalyr

#### Step 1

Go to the Alerts page and add a new alert.

![](<../.gitbook/assets/image (87).png>)



#### Step 2

Paste the following in the **Email/Webhook** field. Make sure to add your Spike webhook URL in place of **SPIKE_URL**

![](<../.gitbook/assets/image (88).png>)

```
webhook-trigger:POST 
SPIKE_URL[[{"trigger":#trigger#,"description":#description#,"title":#title#,"link":#link#,"id":#id#}]],
webhook-resolve:POST
SPIKE_URL[[{"trigger":#trigger#,"description":#description#,"title":#title#,"link":#link#,"id":#id#}]]
```

