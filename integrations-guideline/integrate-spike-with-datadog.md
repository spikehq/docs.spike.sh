# Integrate Spike with Datadog

### Service and integration

Make sure to add the Datadog integration and copying the webhook. 

{% page-ref page="create-integration-and-service-on-dashboard.md" %}



## Using the webhook with Datadog



### Step 1

Select Integrations from the Sidebar

![Select Inr](../.gitbook/assets/image%20%2882%29.png)

### Step 2

Select Webhooks



![Select Webhook](../.gitbook/assets/image%20%28103%29.png)



### Step 3

Fill out the details and paste the Spike hooks URL in the URL field

![Datadog Webhook](../.gitbook/assets/image%20%2888%29.png)

### Step 4

Copy the below payload and paste it on Datadog. Alternatively, you can add your own payload or customise ours with the many variables Datadog provides.

{% hint style="warning" %}
Make sure to   
1. Add **$AGGREG\_KEY** so your incidents will auto-resolve.  
2. Add **$ALERT\_TRANSITION** so we know if the event is for triggering or  resolving.
{% endhint %}

```text
{ 
  "body": "$EVENT_MSG",
  "last_updated": "$LAST_UPDATED",
  "event_type": "$EVENT_TYPE",
  "title": "$EVENT_TITLE",
  "date": "$DATE",
  "alert_transition": "$ALERT_TRANSITION",
  "aggreg_key": "$AGGREG_KEY", 
  "org": {
    "id": "$ORG_ID",
    "name": "$ORG_NAME"
  },
  "id": "$ID" 
}
```



At Spike, we are working hard to integrate with all the tools your business uses. We are on a mission to help **you** identify incidents/crashes/spikes before your customers do.

If you have any integration in mind and would like us to build it for you then contact us at [support@spike.sh.](mailto:support@spike.sh)

