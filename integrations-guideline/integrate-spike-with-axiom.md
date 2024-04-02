# Integrate Spike with Axiom

### Service and integration

Make sure to add the Axiom integration and copy the webhook. 

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}



### Using webhooks with Axiom

#### Step 1: Creating a New Monitor
- Navigate to the 'Monitors' section in your dashboard.
- Click on 'New monitor' to begin setting up your monitor.
- Fill in the 'Name' field with a unique identifier for your monitor.
- In the 'Description' field, provide a brief description of what the monitor aims to check.
- Specify the query conditions and set the frequency of checks.

![Create a new monitor](<../.gitbook/assets/integrations/axiom/create_monitor.png>)

#### Step 2: Adding a Notifier
- In the 'Notification Options' section, click on 'Manage notifiers'.
- Enter a recognizable 'Name' for your notifier.
- Select the 'Webhook' integration.
- Paste your 'Axiom Webhook'.
- Save your notifier.

![Create a new notifier](<../.gitbook/assets/integrations/axiom/create_notifier.png>)

#### Step 3: Linking Notifier to the Monitor
- Return to your monitor's configuration page.
- Locate the 'Notification Options' section.
- Select the newly created notifier.
- Save your monitor settings to finalize the setup.

![Create a new notifier](<../.gitbook/assets/integrations/axiom/select_notifier.png>)

{% hint style="success" %}
This integration auto resolves
{% endhint %}

