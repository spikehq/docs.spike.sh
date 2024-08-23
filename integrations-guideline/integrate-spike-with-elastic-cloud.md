---
description: >-
  This guide will walk you through the steps to integrate Spike.sh with Elastic
  Cloud using webhooks. With this integration, you can send alerts from Elastic
  Cloud directly to Spike.sh for streamlined i
---

# Integrate Spike with Elastic Cloud

<figure><img src="../.gitbook/assets/Elastic cloud integration.png" alt=""><figcaption></figcaption></figure>

### Overview

[Elastic Cloud](https://cloud.elastic.co) provides powerful monitoring and alerting capabilities for Elasticsearch clusters and other monitoring services. It allows teams to maintain the health and performance of their search, analytics, and server operations by detecting issues like slow queries, node failures, or resource exhaustion in real-time.

### Incident alerts from Elastic Cloud

With the Spike integration, you can receive real-time alerts for various incidents detected by Elastic Cloud. These include:

* Cluster health issues
* Node failures
* Resource exhaustion (CPU, memory, disk)
* Slow query performance
* And much more

{% hint style="info" %}
This integration automatically detects and sets Critical severity. It also auto-resolves relevant incidents if configured on Elastic Cloud.
{% endhint %}

***

## Set up instructions

**Step 1:** Create an Elastic Cloud integration on [Spike dashboard](https://app.spike.sh/integrations) and Copy the webhook URL for your integrartion.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

**Step 2:**

{% tabs %}
{% tab title="Setup on Airbrake.io" %}
* **Navigate to alerts**:
  * Go to the Observability section, then select **Alerts and Actions**.
* **Create or modify rule**:
  * Either create a new alert or modify an existing one to define the conditions under which the alert should trigger.
* **Add a Webhook Action**:
  * In the **"Actions"** section of the alert setup, choose Webhook as the action type.
  * Paste the Spike integration webhook URL into the URL field.
  * Adjust the JSON payload to include relevant data for Spike.sh. _Refer to next section for possible payload_
  * `Important` - In the headers, set the `Content-Type` to `application/json`.
  * Save the integration.
{% endtab %}
{% endtabs %}

### Payloads

Using Elastic Cloud's available variables, we have formed some template payloads you can use.

{% tabs %}
{% tab title="Cloud monitoring" %}
```
{
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
{% endtab %}

{% tab title="Kibana" %}
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
{% endtab %}
{% endtabs %}
