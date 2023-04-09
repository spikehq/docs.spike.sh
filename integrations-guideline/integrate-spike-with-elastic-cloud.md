# Integrate Spike with Elastic Cloud

### Service and integration <a href="service-and-integration" id="service-and-integration"></a>

Make sure to add the Elastic Cloud integration and copying the webhook.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}



### Using Webhooks with Elastic Cloud

**Step 1**

In the alerts and insights section, navigate to rules and connections. Then create a new rule.

![](<../.gitbook/assets/Group 39.png>)



**Step 2**

While creating a rule, select the webhook action.

![](<../.gitbook/assets/Group 40.png>)



**Step 3**

Paste the Spike webhook URL and save.

![](<../.gitbook/assets/Group 41.png>)



**Step 4**

Paste the JSON payload provided below for the webhook action.

![](<../.gitbook/assets/Group 42.png>)



```
{
	"kibanaBaseUrl": "{{kibanaBaseUrl}}",
	"alert": {
		"actionGroup": "{{alert.actionGroup}}",
		"actionGroupName": "{{alert.actionGroupName}}",
		"actionSubgroup": "{{alert.actionSubgroup}}",
		"id": "{{alert.id}}"
	},
	"context": {
		"anomalyExplorerUrl": "{{{context.anomalyExplorerUrl}}}",
		"isInterim": "{{context.isInterim}}",
		"jobIds": "{{context.jobIds}}",
		"message": "{{context.message}}",
		"score": "{{context.score}}",
		"timestamp": "{{context.timestamp}}"
	},
	"rule": {
		"id": "{{rule.id}}",
		"name": "{{rule.name}}",
		"tags": "{{rule.tags}}",
		"type": "{{rule.type}}"
	}
}
```
