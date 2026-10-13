---
description: >-
  Add a Robusta webhook sink so Kubernetes alerts from your clusters open incidents in Spike and page your on-call team by phone, SMS, Slack or Teams, and resolve when Robusta reports the alert recovered.
---

# Integrate Spike with Robusta

[Robusta](https://robusta.dev) is an open source Kubernetes troubleshooting and alert enrichment tool. It runs inside your cluster, picks up Prometheus alerts and Kubernetes events such as crash-looping pods and unavailable replicas, and forwards each one as a finding to the sinks you configure. Robusta's webhook sink posts every finding as JSON to a URL, so Spike can open an incident for it, page whoever is on call, and resolve the incident when the alert clears.

Nothing is installed besides the sink. You add one `webhook_sink` to the `sinksConfig` in your Robusta Helm values and upgrade the release; it covers every alert that cluster's Robusta forwards.

{% hint style="warning" %}
The webhook sink is documented by Robusta as a legacy ("Robusta classic") sink. Check Robusta's current sink documentation if a newer release renames or drops it.
{% endhint %}

## What Spike does with each finding

| Robusta finding | What happens in Spike |
| --- | --- |
| A new alert, `fingerprint` not seen on an open incident | Opens an incident and pages your escalation policy |
| The same alert again, same `fingerprint` | Added as an event to the incident already open. It never pages again |
| A recovery: `title` starts with `[RESOLVED] ` and the `fingerprint` matches an open incident | Resolves that incident |
| A recovery with no matching open incident | Dropped. It never opens an incident |

The `[RESOLVED] ` prefix on `title` is the only thing that marks a recovery. `failure` stays `true` on a recovery, so it is not used.

{% hint style="info" %}
Recoveries exist only for Prometheus alerts. Findings that come from the Kubernetes API, such as a node not ready event, are not expected to send a recovery, so give the integration a [resolve timer](../incidents/resolve-timer.md) if you forward those.
{% endhint %}

## One incident per alert

Spike identifies the incident by `fingerprint`. For Prometheus alerts that is the Alertmanager alert fingerprint; for everything else Robusta derives it from the subject, `source` and `aggregation_key`. Both are stable, so a firing alert that keeps re-notifying stays one incident, and its recovery finds that same incident. The same rule on two pods has two fingerprints and is two incidents.

{% hint style="warning" %}
Robusta cuts the body at `size_limit` (default 4096 bytes) by dropping keys, `enrichments` first. We have not confirmed whether `fingerprint` can be dropped when the title or description is very long, so treat a large body as a risk. Without a `fingerprint`, Spike falls back to matching on the incident title, and a recovery can no longer reliably resolve the incident. Raise `size_limit` in the sink (Step 2) if your findings are large.
{% endhint %}

## How incidents are titled

Robusta's `description` is its own sentence about the fault, so whenever it is not empty it is the title, with whitespace collapsed and cut at a word to at most 200 characters:

```
Pod payments/checkout-api-7d9f8b6c4-x2kqp (checkout-api) is in waiting state (reason: "CrashLoopBackOff").
```

For Prometheus alerts Robusta appends a `LABELS = map[...]` tail to the description; Spike removes it. When `description` is `null` or empty, which happens for some native Kubernetes findings, the title is built from `title` and where it fired:

```
Pod is crash looping on payments/checkout-api-7d9f8b6c4-x2kqp (prod-eu-west)
```

That is `title`, then ` on `, then `subject.namespace/subject.name`, then `cluster_name` in brackets. A leading `[RESOLVED] ` is removed from `title` first, and any part that is empty or already in `title` is left out. A recovery gets `Resolved: ` in front of the title the firing alert would have:

```
Resolved: Pod payments/checkout-api-7d9f8b6c4-x2kqp (checkout-api) is in waiting state (reason: "CrashLoopBackOff").
```

When the body has no usable `fingerprint`, Spike matches by title instead, so it skips `description` and always uses the `title` form above. That keeps the title identical when the alert fires and when it recovers. A body with nothing usable is titled `Robusta alert with no details`. Otherwise the title is for display only; matching is done on `fingerprint`.

## Severity

Spike does not read a severity from the Robusta payload. `severity` is kept on the incident, but incidents open at your integration's default. Write an [alert rule](../alerts/alert-rules.md) on `severity` to set it, route to another escalation policy, or suppress. Read more about [priority and severity](../incidents/priority-and-severity.md).

## Prerequisites

* Robusta installed in your cluster with Helm, and permission to change its values and upgrade the release
* A Robusta integration in Spike and its webhook URL
* Cluster egress to `hooks.spike.sh`. Nothing needs to be opened inbound

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Robusta**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Add a webhook sink in Robusta

1. Open the Helm values file you installed Robusta with (`generated_values.yaml` if you used the Robusta CLI).
2. Under `sinksConfig`, add a `webhook_sink`:

```yaml
sinksConfig:
  - webhook_sink:
      name: spike_sink
      url: "https://hooks.spike.sh/<your-token>/push-events"
      format: json
      size_limit: 16384
```

| Field | What to put in it |
| --- | --- |
| `name` | Required. Anything you will recognise, such as `spike_sink` |
| `url` | Required. The full Spike webhook URL from Step 1, including `/push-events` |
| `format` | Set to `json`, so Robusta posts one flat JSON object per finding, as shown in the payload reference |
| `size_limit` | Optional. Maximum body size in bytes; default 4096. Robusta drops keys to fit, so raise it if your findings are large |

Keep your existing sinks in the list; add this one next to them.

Recoveries come from Alertmanager. Leave `send_resolved: true` on your Alertmanager receiver for Robusta (the default), and keep the Prometheus playbook at `status: all` in the Robusta values, so Robusta sees the resolved alerts and sends the `[RESOLVED] ` findings.

3. Apply it:

```bash
helm upgrade robusta robusta/robusta -f ./generated_values.yaml --set clusterName=<YOUR_CLUSTER_NAME>
```

`clusterName` must be set: it becomes `cluster_name`, the bracketed cluster in the fallback title.

## Step 3 — Check it works

Wait for the next alert Robusta forwards, or post a test finding by hand. A firing alert opens an incident, and posting the same body again with `"title": "[RESOLVED] Pod is crash looping."` and the same `fingerprint` resolves it:

```bash
curl -X POST "https://hooks.spike.sh/<your-token>/push-events" \
  -H "Content-Type: application/json" \
  -d '{"title": "Pod is crash looping.", "description": "Pod payments/checkout-api-7d9f8b6c4-x2kqp (checkout-api) is in waiting state (reason: \"CrashLoopBackOff\").", "cluster_name": "prod-eu-west", "account_id": "5f1c9a2e-3b7d-4e8a-9c41-2d6b7f0e1a93", "severity": "LOW", "source": "PROMETHEUS", "finding_type": "ISSUE", "aggregation_key": "KubePodCrashLooping", "failure": true, "fingerprint": "8c3e1f0a9b7d2e46", "starts_at": "2026-10-13T03:12:45.123000+00:00", "ends_at": null, "id": "e2b7c6d1-4f3a-4a8e-b5c9-71d0f2a6e3b4", "category": null, "service": null, "service_key": "payments/Deployment/checkout-api", "creation_date": "2026-10-13T03:13:02.481233", "investigate_uri": null, "add_silence_url": true, "subject": {"name": "checkout-api-7d9f8b6c4-x2kqp", "kind": "pod", "namespace": "payments", "node": "ip-10-0-3-17.eu-west-1.compute.internal", "container": "checkout-api", "labels": {"alertname": "KubePodCrashLooping", "container": "checkout-api", "namespace": "payments", "pod": "checkout-api-7d9f8b6c4-x2kqp", "severity": "warning"}, "annotations": {}}, "links": [{"name": "Prometheus graph", "url": "http://prometheus.monitoring.svc:9090/graph?g0.expr=max_over_time%28kube_pod_container_status_waiting_reason%7Breason%3D%22CrashLoopBackOff%22%7D%5B5m%5D%29+%3E%3D+1", "type": "prometheus_generator_url"}], "enrichments": []}'
```

The same body, formatted, is in the payload reference below. For the recovery, send the second body.

## Payload reference

Robusta posts `application/json`, one finding per request. A firing alert looks like this:

```json
{
  "title": "Pod is crash looping.",
  "description": "Pod payments/checkout-api-7d9f8b6c4-x2kqp (checkout-api) is in waiting state (reason: \"CrashLoopBackOff\").",
  "cluster_name": "prod-eu-west",
  "account_id": "5f1c9a2e-3b7d-4e8a-9c41-2d6b7f0e1a93",
  "severity": "LOW",
  "source": "PROMETHEUS",
  "finding_type": "ISSUE",
  "aggregation_key": "KubePodCrashLooping",
  "failure": true,
  "fingerprint": "8c3e1f0a9b7d2e46",
  "starts_at": "2026-10-13T03:12:45.123000+00:00",
  "ends_at": null,
  "id": "e2b7c6d1-4f3a-4a8e-b5c9-71d0f2a6e3b4",
  "category": null,
  "service": null,
  "service_key": "payments/Deployment/checkout-api",
  "creation_date": "2026-10-13T03:13:02.481233",
  "investigate_uri": null,
  "add_silence_url": true,
  "subject": {
    "name": "checkout-api-7d9f8b6c4-x2kqp",
    "kind": "pod",
    "namespace": "payments",
    "node": "ip-10-0-3-17.eu-west-1.compute.internal",
    "container": "checkout-api",
    "labels": {
      "alertname": "KubePodCrashLooping",
      "container": "checkout-api",
      "namespace": "payments",
      "pod": "checkout-api-7d9f8b6c4-x2kqp",
      "severity": "warning"
    },
    "annotations": {}
  },
  "links": [
    {
      "name": "Prometheus graph",
      "url": "http://prometheus.monitoring.svc:9090/graph?g0.expr=max_over_time%28kube_pod_container_status_waiting_reason%7Breason%3D%22CrashLoopBackOff%22%7D%5B5m%5D%29+%3E%3D+1",
      "type": "prometheus_generator_url"
    }
  ],
  "enrichments": []
}
```

The recovery has the same `fingerprint`, a `[RESOLVED] ` prefix on `title`, and an `ends_at`:

```json
{
  "title": "[RESOLVED] Pod is crash looping.",
  "description": "Pod payments/checkout-api-7d9f8b6c4-x2kqp (checkout-api) is in waiting state (reason: \"CrashLoopBackOff\").",
  "cluster_name": "prod-eu-west",
  "account_id": "5f1c9a2e-3b7d-4e8a-9c41-2d6b7f0e1a93",
  "severity": "LOW",
  "source": "PROMETHEUS",
  "finding_type": "ISSUE",
  "aggregation_key": "KubePodCrashLooping",
  "failure": true,
  "fingerprint": "8c3e1f0a9b7d2e46",
  "starts_at": "2026-10-13T03:12:45.123000+00:00",
  "ends_at": "2026-10-13T03:41:15.004000+00:00",
  "id": "0a9d4c2e-6b1f-4d37-8e5a-c3f2b9e1d670",
  "category": null,
  "service": null,
  "service_key": "payments/Deployment/checkout-api",
  "creation_date": "2026-10-13T03:41:20.917645",
  "investigate_uri": null,
  "add_silence_url": true,
  "subject": {
    "name": "checkout-api-7d9f8b6c4-x2kqp",
    "kind": "pod",
    "namespace": "payments",
    "node": "ip-10-0-3-17.eu-west-1.compute.internal",
    "container": "checkout-api",
    "labels": {
      "alertname": "KubePodCrashLooping",
      "container": "checkout-api",
      "namespace": "payments",
      "pod": "checkout-api-7d9f8b6c4-x2kqp",
      "severity": "warning"
    },
    "annotations": {}
  },
  "links": [
    {
      "name": "Prometheus graph",
      "url": "http://prometheus.monitoring.svc:9090/graph?g0.expr=max_over_time%28kube_pod_container_status_waiting_reason%7Breason%3D%22CrashLoopBackOff%22%7D%5B5m%5D%29+%3E%3D+1",
      "type": "prometheus_generator_url"
    }
  ],
  "enrichments": []
}
```

| Field | What Spike does with it |
| --- | --- |
| `fingerprint` | Identity of the alert across firing and recovery. Required for reliable grouping and resolving |
| `title` | The finding title. A leading `[RESOLVED] ` marks a recovery, and it is the fallback title |
| `description` | Robusta's sentence about the fault. The title whenever it is not empty |
| `cluster_name` | The last part of the fallback title, in brackets |
| `subject.namespace`, `subject.name` | The `namespace/name` part of the fallback title |
| Everything else | Kept on the incident and shown on the incident page |

## Things worth knowing

* **Only Prometheus alerts recover.** Kubernetes-API findings have no recovery; use a resolve timer for them.
* **A recovery never opens an incident.** If the incident was already resolved in Spike, or the firing alert never reached Spike, the recovery is dropped.
* **The URL is the credential.** Guard the webhook URL like any Spike integration URL.

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Confirm the sink is in the running config (`helm get values robusta`), that `url` is the full Spike URL including `/push-events`, and that the Robusta runner pod can reach `hooks.spike.sh`. Check the runner logs for webhook errors.

</details>

<details>

<summary>Incidents open but never resolve</summary>

The recovery needs a `fingerprint`. If `size_limit` is too small, Robusta truncates the body and `fingerprint` can be dropped. Raise `size_limit` and upgrade the release. Also remember that only Prometheus alerts send recoveries.

</details>

<details>

<summary>The title is not what I expected</summary>

The title is Robusta's `description` whenever it is not empty, otherwise built from `title`, the namespace and name, and the cluster. Use a [Title Remapper](../alerts/title-remapper.md) to write your own from the payload, for example `{{data.body.aggregation_key}} on {{data.body.cluster_name}}`.

</details>
