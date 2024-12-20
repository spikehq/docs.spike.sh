# Integrate Spike with Prometheus

### Service and integration

Make sure to add the Prometheus integration and copy the webhook.&#x20;

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

###

### Using the Webhook with Prometheus

### Step 1

Download **Prometheus** and **Alert Monitor** from the [download page](https://prometheus.io/download/) and unzip it.



### Step 2

In the Prometheus folder, configure the `prometheus.yml` file as below.

![prometheus.yml](../.gitbook/assets/prometheus-1.png)

### Step 3

Configure the `alertmanager.yml` file under alertmaager folder and paste the spike webhook as highlighted.

![alertmanager.yml](../.gitbook/assets/promethues-2.png)

{% hint style="success" %}
This integration auto resolves itself
{% endhint %}



If you have any integration in mind and would like us to build it for you then contact us at [support@spike.sh.](mailto:support@spike.sh)
