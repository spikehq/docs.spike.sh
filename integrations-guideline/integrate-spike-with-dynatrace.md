# Integrate Spike with Dynatrace

### Service and Integration

Make sure to make a Dynatrace integration and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}



### Using webhook with Dynatrace

#### Step 1

From your Dynatrace dashboard, navigate to > Settings > Integration > Problem notifications.

From the available options, select **custom integration.**

![](<../.gitbook/assets/image (97).png>)



#### Step 2

Paste the Spike webhook URL.

![](<../.gitbook/assets/image (99).png>)

Paste the following JSON payload in the **Custom payload** section of the integration.

```
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

