# Integrate Spike with Semaphore

### Service and Integration

Make sure to add a Semaphore integration and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}



### Using Webhooks with Semaphore



#### Semaphore provides the option to trigger alerts by filtering by pipeline results <a href="#filtering-by-pipeline-result" id="filtering-by-pipeline-result"></a>

You can specify notifications to be sent only on specific pipeline results.

Available values for the results filter are:

* `passed`
* `failed`
* `stopped`
* `canceled`

Example YAML configuration:

```
# notify-on-fail.yml

apiVersion: v1alpha
kind: Notification
metadata:
  name: notify-on-fail
spec:
  rules:
    - name: "Example"
      filter:
        projects:
          - example-project
        results:
          - failed
      notify:
        webhook:
          endpoint: https://hooks.spike.sh/********/push-events
```



Create the notification flow above using the following command

`sem create -f notify-on-fail.yml`

