# Integrate Spike with Scalyr

### Service and integration <a id="service-and-integration"></a>

Make sure to add the Scalyr integration and copy the webhook.

{% page-ref page="create-integration-and-service-on-dashboard.md" %}

### 

### Using webhooks with Scalyr

#### Step 1

Go to the Alerts page and add a new alert.

![](../.gitbook/assets/image%20%288%29.png)



#### Step 2

Paste the following in the **Email/Webhook** field. Make sure to add your Spike webhook URL in place of **SPIKE\_URL**

![](../.gitbook/assets/image%20%2821%29.png)

```text
webhook-trigger:POST 
SPIKE_URL[[{"trigger":#trigger#,"description":#description#,"title":#title#,"link":#link#,"id":#id#}]],
webhook-resolve:POST
SPIKE_URL[[{"trigger":#trigger#,"description":#description#,"title":#title#,"link":#link#,"id":#id#}]]
```



