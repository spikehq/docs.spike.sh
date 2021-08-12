# Integrate Spike with Prometheus

### Service and integration

Make sure to add the Grafana integration and copy the webhook. 

{% page-ref page="create-integration-and-service-on-dashboard.md" %}

### 

### Using the Webhook with Grafana

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

