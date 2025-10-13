# Integrate Spike with LibreNMS

### Service and Integration

Make sure to add a LibreNMS integration and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}



### Using webhooks with LibreNMS

**Step 1**

* From the **Alerts** menu, choose **Alert Transports** from the dropdown.
* Create a new Alert Transport

![](<../.gitbook/assets/image (114).png>)

**Step 2**

* Give a **Name** to the Alert Transport
* Select `Api` as **Transport type**
* **Default alert** is toggled to `ON`
* Choose the **API Method** as `POST`
* Paste the Spike webhook URL
* In **Body**, paste the following template given below.

```
{
  "device_id": "{{ $device_id }}",
  "hostname": "{{ $hostname }}",
  "sysName": "{{ $sysName }}",
  "sysDescr": "{{ $sysDescr }}",
  "sysContact": "{{ $sysContact }}",
  "os": "{{ $os }}",
  "type": "{{ $type }}",
  "ip": "{{ $ip }}",
  "hardware": "{{ $hardware }}",
  "version": "{{ $version }}",
  "features": "{{ $features }}",
  "serial": "{{ $serial }}",
  "uptime_short": "{{ $uptime_short }}",
  "uptime_long": "{{ $uptime_long }}",
  "description": "{{ $description }}",
  "notes": "{{ $notes }}",
  "location": "{{ $location }}",
  "uptime": "{{ $uptime }}",
  "ping_avg": "{{ $ping_avg }}",
  "title": "{{ $title }}",
  "elapsed": "{{ $elapsed }}",
  "builder": "{{ $builder }}",
  "id": "{{ $id }}",
  "uid": "{{ $uid }}",
  "state": "{{ $state }}",
  "severity": "{{ $severity }}",
  "alert_notes": "{{ $alert_notes }}",
  "ping_timestamp": "{{ $ping_timestamp }}",
  "ping_loss": "{{ $ping_loss }}",
  "ping_min": "{{ $ping_min }}",
  "ping_max": "{{ $ping_max }}",
  "rule": "{{ $rule }}",
  "name": "{{ $name }}",
  "proc": "{{ $proc }}",
  "timestamp": "{{ $timestamp }}",
  "transport": "{{ $transport }}",
  "transport_name": "{{ $transport_name }}",
  "message": "{{ $msg }}"
}
```

![LibreNMS configuration](<../.gitbook/assets/integrations/librenms/config.png>)

