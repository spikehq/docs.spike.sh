# Integrate Spike with Tenderly

### Service and Integration

Make sure to make a Tenderly integration and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

### Using Webhooks with Tenderly

#### Step 1

From the left-hand menu, go to **Alerts ->** **Destinations** tab, where you'll see a list of all the available destinations.

<figure><img src="../.gitbook/assets/image (5).png" alt=""><figcaption></figcaption></figure>



#### Step 2

To create a webhook alert destination, click on the Webhook card, which will open up the configuration modal. You'll be prompted to configure the following options:&#x20;

* **Webhook name** - Must be unique and cannot be changed later
* **Webhook URL** - Paste the Spike integration URL here
* **Description** - Optional parameter, but you can use it to provide more information about the webhook configuration

<figure><img src="../.gitbook/assets/image (2).png" alt=""><figcaption></figcaption></figure>

#### Step 3&#x20;

Add webhook and save the destination.\
If everything works as expected and you've received the event, click on the Add Webhook button. This action will add the new webhook destination to the Active Destinations list.
