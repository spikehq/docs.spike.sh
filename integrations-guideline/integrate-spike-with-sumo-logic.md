# Integrate Spike with Sumo Logic

### Service and integration

Make sure to add the Sumo Logic integration and copy the webhook. 

{% page-ref page="create-integration-and-service-on-dashboard.md" %}



### Using Webhooks with Sumo Logic

**Step 1**

Navigate to the alerts page and open the connections tab.

![](../.gitbook/assets/group-28.png)



**Step 2**

Select the webhook connection type.

![](../.gitbook/assets/group-27.png)



**Step 3**

Paste the Spike webhook URL and the JSON provided below.

![](../.gitbook/assets/group-26.png)



```text
{
    "Name": "{{Name}}",
    "Description": "{{Description}}",
    "MonitorType": "{{MonitorType}}",
    "Query": "{{Query}}",
    "QueryURL": "{{QueryURL}}",
    "ResultsJson": "{{ResultsJson}}",
    "NumQueryResults": "{{NumQueryResults}}",
    "Id": "{{Id}}",
    "DetectionMethod": "{{DetectionMethod}}",
    "TriggerType": "{{TriggerType}}",
    "TriggerTimeRange": "{{TriggerTimeRange}}",
    "TriggerTime": "{{TriggerTime}}",
    "TriggerCondition": "{{TriggerCondition}}",
    "TriggerValue": "{{TriggerValue}}",
    "TriggerTimeStart": "{{TriggerTimeStart}}",
    "TriggerTimeEnd": "{{TriggerTimeEnd}}",
    "SourceURL": "{{SourceURL}}"
}
```

