# Integrate Spike with Zabbix

### Service and Integration

Make sure to make a Zabbix integration and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}



### Using Webhooks with Zabbix

#### Step 1

Create a new media type in Zabbix: Go to "Administration" -> "Media types" and click "Create media type". In the "Type" field, select "Webhook". In the "URL" field, enter the URL of the Spike.sh integration webhook endpoint. You can also specify any additional parameters, such as headers or payload, in the "Headers" and "Body" fields.

#### Step 2

Assign the media type to a user: Go to "Administration" -> "Users" and select the user you want to receive alerts. In the "Media" tab, click "Add" and select the media type you just created. Enter any additional parameters.

#### Step 3

Create a new action: Go to "Configuration" -> "Actions" and click "Create action". Give the action a name and select the conditions under which the action should trigger. In the "Operations" tab, click "Add" and select the media type and user you just configured.

#### Step 4

Save the action and test it: Once you've saved the action, you can test it by triggering the conditions you configured in step 3. If everything works correctly, you should see alerts sent to the webhook URL you specified in step 1.

****

****



