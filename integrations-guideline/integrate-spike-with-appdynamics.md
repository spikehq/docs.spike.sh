# Integrate Spike with AppDynamics

### Service and Integration

Make sure to add the AppDynamics integration and copying the webhook.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

### Using webhooks with AppDynamics

#### Step 1

From the dashboard, go to the Alert & Respond menu.

![](<../.gitbook/assets/image (98) (1).png>)

####

#### Step 2

Select HTTP Request Templates.

![](<../.gitbook/assets/image (94).png>)

####

#### Step 3

Add a Custom Templating Variable named `sc_event_type` and the default value as `triggered`.\
Paste the Spike webhook URL

![](<../.gitbook/assets/image (95).png>)

#### Step 4

Paste the webhook provided below and add success criteria

![](<../.gitbook/assets/image (96).png>)

```
{
    "description": "${latestEvent.displayName} on ${latestEvent.node.name}",
    "client": "AppDynamics",
    "client_url": "${controllerUrl}",
    "event_type": "${sc_event_type}",
    "incident_key": "${latestEvent.node.name} - ${latestEvent.application.name}",
    "details": {
        "event_name": "${latestEvent.displayName}",
        "message": "${latestEvent.eventMessage}",
        "summary": "${latestEvent.summaryMessage}",
        "event_id": "${latestEvent.id}",
        "event_time": "${latestEvent.eventTime}",
        "event_type_key": "${latestEvent.eventTypeKey}",
        "node_name": "${latestEvent.node.name}",
        "application_name": "${latestEvent.application.name}",
        "event_type": "${latestEvent.eventType}",
        "guid": "${latestEvent.guid}",
        "severity": "${latestEvent.severity}"
    }
}
```

{% hint style="success" %}
This integration auto resolves
{% endhint %}
