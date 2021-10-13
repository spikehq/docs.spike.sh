# Integrate Spike with ElastAlert

### Service and Integration

Make sure to make an ElastAlert integration and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}



### Using webhooks with ElastAlert

ElastAlert provides an option to configure alerts via HTTP POST requests. Read more [here](https://elastalert.readthedocs.io/en/latest/ruletypes.html#http-post).

Copy the following code snippet and add the Spike webhook URL for `http_post_url `

Paste this code in the configuration YAML file for ElastAlert.

```
alert: post
http_post_url: <Paste the Spike.sh Webhook URL for ElastAlert integration
http_post_static_payload:
	Title: <Incident Title>
http_post_all_values: true
```

