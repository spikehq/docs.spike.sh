---
description: "Send Sensu Go check events to Spike through a pipe handler and pipeline, so a failing check pages your on-call and a passing check resolves the incident."
---
# Integrate Spike with Sensu Go

[Sensu Go](https://sensu.io) runs checks on your agents and proxy entities and hands the resulting events to handlers. A handler in a pipeline can post each event to Spike: a failing check opens an incident and pages your escalation policy, repeats of the same check join that incident, and the check returning to status 0 resolves it.

## Prerequisites

* A Sensu Go backend, and a user that can create handlers and pipelines in the namespace of your checks
* A Sensu Go integration in Spike and its webhook URL
* `curl` on the host or container that runs `sensu-backend`, with outbound HTTPS to `hooks.spike.sh`

## Step 1 — Create the integration in Spike

Make a Sensu Go integration, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Create a pipe handler in Sensu Go

A pipe handler runs a command and writes the event to its standard input. Spike receives that event JSON, unchanged, as the request body. Run this on a machine with `sensuctl` configured, in the namespace of your checks. Replace `<your-spike-webhook-url>` with the URL you copied.

```bash
sensuctl handler create spike --type pipe \
  --command "curl -sS --fail -X POST -H 'Content-Type: application/json' --data-binary @- <your-spike-webhook-url>" \
  --timeout 10
```

`--data-binary @-` makes `curl` post the event read from standard input as the body, byte for byte. `--fail` makes `curl` exit non-zero when Spike answers with an error, so a failed post shows up in the `sensu-backend` log.

{% hint style="warning" %}
This command is Spike's suggestion, not one from Sensu's documentation. Sensu documents that a handler receives the event on standard input, and the community `sensu-http-handler` asset ships standard input as a request body in the same way, but nobody has published a Sensu-tested handler for Spike. After setting it up, check on the first incident's page that the payload arrived as the event JSON.
{% endhint %}

## Step 3 — Create a pipeline that uses the handler

Save this resource as `spike-pipeline.yml` and run `sensuctl create --file spike-pipeline.yml`:

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

The built-in `is_incident` filter passes failing events and the event that resolves them, so Spike gets both the alert and its recovery. Keep it: without `is_incident` the pipeline posts every passing check result to Spike, not only the one that resolves an incident.

## Step 4 — Add the pipeline to your checks

Run `sensuctl edit check check-disk-usage` (with your check's name) and add a `pipelines` entry to the check's `spec`:

```yaml
spec:
  pipelines:
    - name: spike_alerts
      type: Pipeline
      api_version: core/v2
```

Or put the same `pipelines` list in the check's YAML and apply it with `sensuctl create`. `sensuctl` has no `set-pipelines` subcommand, so the pipeline has to be listed in the check definition.

## Step 5 — Confirm it with a failing check

Make a check fail (lower its warning threshold, for example). An incident opens in Spike on the service you attached. When the check returns to status 0 the incident resolves itself.

## How Spike reads an event

Spike reads these fields from the event Sensu sends. You do not build the body yourself: the handler passes Sensu's event through.

| Field | Required | Used for |
| --- | --- | --- |
| `entity.metadata.name` | Yes | The entity (agent host or proxy entity) the check ran for. Half of the incident identity, and the "where" of the title. |
| `check.metadata.name` | Yes | The check name. The other half of the identity. |
| `entity.metadata.namespace` | Recommended | The Sensu namespace. Keeps the same entity and check names in two namespaces as two separate alerts. |
| `check.status` | Yes | `0` is OK and resolves. `1` is a warning and `2` is critical. Any other integer is unknown or custom. All of those open or join an incident. |
| `check.output` | Recommended | The plugin's output. Its first line becomes the incident title. |

`check.state` (`passing`, `failing`, `flapping`) is not read: `check.status` decides. The event's top-level `id` is a new UUID for every check execution, so it is never used to match anything.

### What opens, joins and resolves an incident

* **Opens or joins:** any event whose `check.status` is not `0`. A status that is missing or unreadable also opens or joins, and never resolves.
* **Resolves:** an event whose `check.status` is the number `0` or the string `"0"`, for the same entity, check and namespace as the open incident. Both events must name the entity and the check. This includes a flapping check that reports status 0.
* **Identity:** `entity.metadata.name` plus `check.metadata.name`, scoped by `entity.metadata.namespace` when present. A name counts only when it is a non-empty string or a number. Everything else in the event can change between deliveries (timestamps, `sequence`, `check.output`, `check.history`, counters, `check.status`) and a repeat still joins the open incident.
* **No identity:** if either `entity.metadata.name` or `check.metadata.name` is missing, Spike falls back to matching by title, so it uses the plain title below without the plugin output. Such an event never resolves an incident: its recovery joins the open incident, which you resolve in Spike.

## Incident title

The title is the plugin's output followed by the entity:

```
{check.output} on {entity.metadata.name}
```

* The output line is the first non-empty line of `check.output`, with everything from the first `|` (Nagios performance data, with or without a space before it) dropped and whitespace collapsed.
* ` on {entity.metadata.name}` is added only when the line does not already name the entity as a whole word.
* The title is at most 200 characters. A longer line is cut at a word boundary and ends in `...`, and the ` on {entity}` part is kept whole.
* If `check.output` is empty: `{check.metadata.name} on {entity.metadata.name}`.
* A recovery (status 0): `{check.metadata.name} recovered on {entity.metadata.name}`.
* Without identity, the output is never used: `{check.metadata.name} on {entity.metadata.name}`, or whichever of the two exists.
* Nothing usable: `Sensu Go alert with no details`.

For the firing event below the title is:

```
check-disk-usage CRITICAL: / 93.10% used, 3.45 GiB free of 50.00 GiB on web-prod-01
```

and for the recovery event:

```
check-disk-usage recovered on web-prod-01
```

The title is for display. The entity and check names decide which incident an event belongs to, so a reading that changes in the output does not open a new incident. Use a [Title Remapper](../alerts/title-remapper.md) if you prefer another title.

## Example payloads

A firing event, which opens the incident:

```json
{
  "id": "7a1f4c2e-93b1-4f0e-8d55-2c6b0e9a41d3",
  "metadata": {
    "namespace": "default"
  },
  "timestamp": 1760352187,
  "sequence": 42,
  "entity": {
    "entity_class": "agent",
    "metadata": {
      "name": "web-prod-01",
      "namespace": "default",
      "labels": {
        "environment": "production"
      }
    },
    "subscriptions": [
      "linux",
      "webservers",
      "entity:web-prod-01"
    ],
    "last_seen": 1760352181,
    "deregister": false,
    "user": "agent",
    "redact": [
      "password",
      "passwd",
      "pass",
      "api_key",
      "api_token",
      "access_key",
      "secret_key",
      "private_key",
      "secret"
    ],
    "sensu_agent_version": "6.11.0",
    "system": {
      "hostname": "web-prod-01",
      "os": "linux",
      "platform": "ubuntu",
      "platform_family": "debian",
      "platform_version": "22.04",
      "arch": "amd64"
    }
  },
  "check": {
    "metadata": {
      "name": "check-disk-usage",
      "namespace": "default"
    },
    "command": "check-disk-usage -w 85 -c 90",
    "handlers": [
      "spike"
    ],
    "interval": 60,
    "subscriptions": [
      "linux"
    ],
    "publish": true,
    "timeout": 10,
    "ttl": 0,
    "round_robin": false,
    "executed": 1760352186,
    "issued": 1760352186,
    "duration": 0.043,
    "history": [
      {
        "status": 0,
        "executed": 1760351946
      },
      {
        "status": 0,
        "executed": 1760352006
      },
      {
        "status": 1,
        "executed": 1760352066
      },
      {
        "status": 2,
        "executed": 1760352126
      },
      {
        "status": 2,
        "executed": 1760352186
      }
    ],
    "is_silenced": false,
    "last_ok": 1760352006,
    "occurrences": 2,
    "occurrences_watermark": 2,
    "output": "check-disk-usage CRITICAL: / 93.10% used, 3.45 GiB free of 50.00 GiB\n",
    "output_metric_format": "",
    "state": "failing",
    "status": 2,
    "total_state_change": 32,
    "high_flap_threshold": 0,
    "low_flap_threshold": 0,
    "proxy_entity_name": "",
    "processed_by": "web-prod-01",
    "scheduler": "etcd"
  }
}
```

The recovery event has the same shape. `check.status` is `0`, `check.state` is `"passing"`, and the output is an OK message:

```json
{
  "id": "c4e0b8a7-5f2d-4e61-9a3c-0d8f71b2e6a9",
  "metadata": {
    "namespace": "default"
  },
  "timestamp": 1760352487,
  "sequence": 47,
  "entity": {
    "entity_class": "agent",
    "metadata": {
      "name": "web-prod-01",
      "namespace": "default",
      "labels": {
        "environment": "production"
      }
    },
    "subscriptions": [
      "linux",
      "webservers",
      "entity:web-prod-01"
    ],
    "last_seen": 1760352481,
    "deregister": false,
    "user": "agent",
    "redact": [
      "password",
      "passwd",
      "pass",
      "api_key",
      "api_token",
      "access_key",
      "secret_key",
      "private_key",
      "secret"
    ],
    "sensu_agent_version": "6.11.0",
    "system": {
      "hostname": "web-prod-01",
      "os": "linux",
      "platform": "ubuntu",
      "platform_family": "debian",
      "platform_version": "22.04",
      "arch": "amd64"
    }
  },
  "check": {
    "metadata": {
      "name": "check-disk-usage",
      "namespace": "default"
    },
    "command": "check-disk-usage -w 85 -c 90",
    "handlers": [
      "spike"
    ],
    "interval": 60,
    "subscriptions": [
      "linux"
    ],
    "publish": true,
    "timeout": 10,
    "ttl": 0,
    "round_robin": false,
    "executed": 1760352486,
    "issued": 1760352486,
    "duration": 0.039,
    "history": [
      {
        "status": 2,
        "executed": 1760352246
      },
      {
        "status": 2,
        "executed": 1760352306
      },
      {
        "status": 2,
        "executed": 1760352366
      },
      {
        "status": 2,
        "executed": 1760352426
      },
      {
        "status": 0,
        "executed": 1760352486
      }
    ],
    "is_silenced": false,
    "last_ok": 1760352486,
    "occurrences": 1,
    "occurrences_watermark": 6,
    "output": "check-disk-usage OK: / 61.20% used, 19.40 GiB free of 50.00 GiB\n",
    "output_metric_format": "",
    "state": "passing",
    "status": 0,
    "total_state_change": 16,
    "high_flap_threshold": 0,
    "low_flap_threshold": 0,
    "proxy_entity_name": "",
    "processed_by": "web-prod-01",
    "scheduler": "etcd"
  }
}
```

## Things worth knowing

* **Several Spike integrations are fine.** Create one handler and pipeline per Spike integration if different teams own different checks.
* **Resolving in Spike does not touch Sensu.** The check keeps failing in Sensu until it passes.
* **Keep the check name stable.** Renaming a check in Sensu makes its recovery a different alert from the incident opened under the old name.

Disclaimer: These integration instructions are offered independently by Spike.sh, and Spike.sh is not affiliated with nor a partner of Sensu Inc.
