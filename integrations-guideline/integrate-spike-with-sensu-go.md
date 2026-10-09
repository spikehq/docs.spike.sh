---
description: "Send Sensu Go check events to Spike through a pipe handler and pipeline for instant on-call alerts."
---
# Integrate Spike with Sensu Go

### Service and Integration

Make sure to make a Sensu Go integration and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

### Using a handler with Sensu Go

Sensu Go sends events to external tools through handlers, which run inside a pipeline. A handler receives the event as JSON and Spike receives that same JSON, unchanged, as the request body.

#### Step 1

Create a pipe handler. Run this on a machine with `sensuctl` configured, or use the Sensu Web UI: go to your namespace, then "Configuration" -> "Handlers" and click "Add Handler" -> "Pipe". Replace `<your-spike-webhook-url>` with the webhook URL you copied.

```bash
sensuctl handler create spike --type pipe \
  --command "curl -s -X POST -H 'Content-Type: application/json' -d @- <your-spike-webhook-url>" \
  --timeout 10
```

The Sensu backend writes the event to the handler's standard input, so `-d @-` posts it as the request body. `curl` must be installed on the host or container that runs `sensu-backend`.

#### Step 2

Create a pipeline that uses the handler. In the Web UI go to "Configuration" -> "Pipelines" and click "Add Pipeline", or run `sensuctl create` with this resource:

```yaml
type: Pipeline
api_version: core/v2
metadata:
  name: spike_alerts
  namespace: default
spec:
  workflows:
    - name: send_to_spike
      filters:
        - name: is_incident
          type: EventFilter
          api_version: core/v2
        - name: not_silenced
          type: EventFilter
          api_version: core/v2
      handler:
        name: spike
        type: Handler
        api_version: core/v2
```

The built-in `is_incident` filter passes failing events and the event that resolves them, so Spike gets both the alert and its recovery. Do not remove it.

#### Step 3

Add the pipeline to your checks. In the Web UI open "Configuration" -> "Checks", edit a check, and under "Pipelines" add `spike_alerts`. With `sensuctl`:

```bash
sensuctl check set-pipelines check_cpu spike_alerts
```

#### Step 4

Trigger a failing check and confirm the incident appears in Spike. When the check returns to status 0, the incident resolves automatically.

### Fields Spike reads

Spike reads these fields from the event Sensu Go sends. You do not have to build the body yourself.

| Field | Required | Used for |
| --- | --- | --- |
| `check.metadata.name` | Yes | The check name. Part of how Spike matches a recovery to its alert. |
| `entity.metadata.name` | Yes | The entity (agent host or proxy entity) the check ran for. Part of the match. |
| `check.status` | Yes | 0 resolves the incident. 1 is a warning, 2 is critical, and any other value is unknown or custom. All of these open or update an incident. |
| `check.output` | Recommended | The plugin's output. Its first line becomes the incident title. |
| `check.metadata.namespace` | Recommended | The Sensu namespace. Keeps two namespaces with the same entity and check names from merging. |

If `entity.metadata.name` or `check.metadata.name` is missing, Spike matches by title and uses the plain title `<check> on <entity>`, without the plugin output.

### Example payload

A firing event looks like this:

```json
{
  "timestamp": 1760003107,
  "entity": {
    "entity_class": "agent",
    "system": {
      "hostname": "db-prod-03",
      "os": "linux",
      "platform": "ubuntu",
      "platform_family": "debian",
      "platform_version": "22.04",
      "arch": "amd64"
    },
    "subscriptions": [
      "system",
      "entity:db-prod-03"
    ],
    "last_seen": 1760003101,
    "deregister": false,
    "deregistration": {},
    "user": "agent",
    "metadata": {
      "name": "db-prod-03",
      "namespace": "default"
    },
    "sensu_agent_version": "6.12.0"
  },
  "check": {
    "command": "check-cpu-usage -w 75 -c 90",
    "handlers": [],
    "high_flap_threshold": 0,
    "interval": 60,
    "low_flap_threshold": 0,
    "publish": true,
    "runtime_assets": [
      "check-cpu-usage"
    ],
    "subscriptions": [
      "system"
    ],
    "proxy_entity_name": "",
    "check_hooks": null,
    "stdin": false,
    "subdue": null,
    "ttl": 0,
    "timeout": 0,
    "round_robin": false,
    "duration": 5.041,
    "executed": 1760003101,
    "history": [
      {
        "status": 0,
        "executed": 1760002861
      },
      {
        "status": 0,
        "executed": 1760002921
      },
      {
        "status": 0,
        "executed": 1760002981
      },
      {
        "status": 1,
        "executed": 1760003041
      },
      {
        "status": 2,
        "executed": 1760003101
      }
    ],
    "issued": 1760003101,
    "output": "CheckCPU TOTAL CRITICAL: total=96.12 user=88.41 nice=0.00 system=7.53 idle=3.88 iowait=0.10 irq=0.00 softirq=0.08 steal=0.00 guest=0.00 guestnice=0.00\n",
    "state": "failing",
    "status": 2,
    "total_state_change": 14,
    "last_ok": 1760002981,
    "occurrences": 1,
    "occurrences_watermark": 1,
    "is_silenced": false,
    "output_metric_format": "",
    "output_metric_handlers": null,
    "env_vars": null,
    "secrets": null,
    "scheduler": "memory",
    "processed_by": "db-prod-03",
    "metadata": {
      "name": "check_cpu",
      "namespace": "default"
    }
  },
  "metadata": {
    "namespace": "default"
  },
  "id": "b2f5c0de-4d1e-4c6a-9a37-6f0e2d9a71c4",
  "sequence": 312,
  "pipelines": [
    {
      "name": "spike_alerts",
      "type": "Pipeline",
      "api_version": "core/v2"
    }
  ]
}
```

The recovery event has the same shape with `check.status` set to `0`, `check.state` set to `"passing"` and an OK `check.output`.

***

***
