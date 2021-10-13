# Integrate Spike with Logz

### Service and Integration

Make sure to make a Logz.io integration and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}



### Using Webhooks with Logz.io



**Step 1**

From the Alerts tab, go to **Notification Endpoints. **

![](<../.gitbook/assets/image (117).png>)



**Step 2**

Add a new notification endpoint. Paste the Spike webhook URL and make the request type as `POST`

Paste the below template and save.

```
{
    "alert_title": "{{alert_title}}",
    "alert_description": "{{alert_description}}",
    "alert_severity": "{{alert_severity}}",
    "account_id": "{{account_id}}",
    "account_name": "{{account_name}}",
    "alert_samples": "{{alert_samples}}",
    "alert_tags_json": "[{{alert_tags_json}}]"
}
```



![](<../.gitbook/assets/image (120).png>)

