# Integrate Spike with Dynatrace

### Service and Integration

Make sure to make a Dynatrace integration and copy the webhook URL.

{% page-ref page="create-integration-and-service-on-dashboard.md" %}



### Using webhook with Dynatrace

#### Step 1

From your Dynatrace dashboard, navigate to &gt; Settings &gt; Integration &gt; Problem notifications.

From the available options, select **custom integration.**

![](../.gitbook/assets/image%20%2874%29.png)



#### Step 2

Paste the Spike webhook URL.

![](../.gitbook/assets/image%20%2822%29.png)

Paste the following JSON payload in the **Custom payload** section of the integration.

```text
{
    "State": "{State}",
    "ProblemID": "{ProblemID}",
    "PID": "{PID}",
    "ProblemTitle": "{ProblemTitle}",
    "ImpactedEntity": "{ImpactedEntity}",
    "ImpactedEntities": "{ImpactedEntities}",
    "ProblemDetailsText": "{ProblemDetailsText}",
    "ProblemSeverity": "{ProblemSeverity}",
    "ProblemURL": "{ProblemURL}"
}
```



{% hint style="success" %}
This integration auto resolves.
{% endhint %}



