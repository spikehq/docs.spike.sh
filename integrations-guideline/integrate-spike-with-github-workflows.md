# Integrate Spike with GitHub Workflows

### Service and Integration

Create a GitHub Workflows integration and copy the unique webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

### Integrating with GitHub Workflows

**Step 1** 
Go to the settings section of the repository and open the webhooks settings.
<figure><img src="../.gitbook/assets/gw-1.png" alt="Spike.sh on GitHub Actions"><figcaption></figcaption></figure>

**Step 2**
Add a new webhook.
<figure><img src="../.gitbook/assets/gw-2.png" alt="Spike.sh on GitHub Actions"><figcaption></figcaption></figure>

**Step 3**
Paste the Spike.sh hooks URL and select content type as application/json. 
Select individual events to choose the events to monitor.
<figure><img src="../.gitbook/assets/gw-3.png" alt="Spike.sh on GitHub Actions"><figcaption></figcaption></figure>

**Step 4**
Scroll to the bottom and select the workflow events.
<figure><img src="../.gitbook/assets/gw-4.png" alt="Spike.sh on GitHub Actions"><figcaption></figcaption></figure>

Your integration is ready.

{% hint style="success" %}
This integration auto resolves incidents
{% endhint %}
