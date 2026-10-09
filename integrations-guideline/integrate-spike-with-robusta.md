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
`fingerprint` is the tenth key in Robusta's payload. Robusta cuts the body at `size_limit` (default 4096 bytes) and drops keys from the end, so a large body can lose it. Without a `fingerprint`, Spike falls back to matching on the incident title, and a recovery can no longer reliably resolve the incident. Raise `size_limit` in the sink (Step 2) if your findings are large.
{% endhint %}

## How incidents are titled

Robusta's `description` is its own sentence about the fault, so it is the title when it reads as one short line:

```
Pod default/checkout-api-7d9f8b6c5-x2lqz (checkout-api) is in waiting state (reason: "CrashLoopBackOff").
```

When `description` is empty, or is a paragraph, the title is built from the rule and where it fired:

```
Pod crash looping on default/checkout-api-7d9f8b6c5-x2lqz in prod-eu-1
```

The place is `subject.namespace/subject.name`, else `subject.name`, else `subject.node`, followed by ` in ` and `cluster_name`. A recovery is written as:

```
Resolved: Pod is crash looping on default/checkout-api-7d9f8b6c5-x2lqz in prod-eu-1
```

Titles are capped at 200 characters. A body with nothing usable is titled `Robusta alert with no details`. The title is for display only; matching is done on `fingerprint`.

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
| `size_limit` | Optional. Maximum body size in bytes; default 4096. Robusta drops keys from the end of the body to fit, and `fingerprint` can be dropped, so raise it |

Keep your existing sinks in the list; add this one next to them.

Recoveries come from Alertmanager. Leave `send_resolved: true` on your Alertmanager receiver for Robusta (the default), and keep the Prometheus playbook at `status: all` in the Robusta values, so Robusta sees the resolved alerts and sends the `[RESOLVED] ` findings.

3. Apply it:

```bash
helm upgrade robusta robusta/robusta -f ./generated_values.yaml --set clusterName=<YOUR_CLUSTER_NAME>
```

`clusterName` must be set: it becomes `cluster_name`, the ` in <cluster>` part of the incident title.

## Step 3 — Check it works

Trigger a test finding from a pod with Robusta's CLI, for example:

```bash
robusta playbooks trigger prometheus_alert alert_name=KubePodCrashLooping namespace=default pod_name=<a-pod>
```

The incident should appear in Spike within seconds. You can also post a body by hand:

```bash
curl -X POST "https://hooks.spike.sh/<your-token>/push-events" \
  -H "Content-Type: application/json" \
  -d @robusta-firing.json
```

## Payload reference

Robusta posts `application/json`. A firing alert looks like this:

```json
{
  "title": "Pod is crash looping.",
  "description": "Pod default/checkout-api-7d9f8b6c5-x2lqz (checkout-api) is in waiting state (reason: \"CrashLoopBackOff\").",
  "cluster_name": "prod-eu-1",
  "account_id": "6f1c2d4e-8a3b-4c5d-9e7f-0a1b2c3d4e5f",
  "severity": "LOW",
  "source": "PROMETHEUS",
  "finding_type": "ISSUE",
  "aggregation_key": "KubePodCrashLooping",
  "failure": true,
  "fingerprint": "a3f6c2b19d8e4f70",
  "starts_at": "2026-10-09T03:12:41.523000+00:00",
  "ends_at": null,
  "id": "0b8e6f3a-2c41-4d7e-9a55-3e1f7c9d2b14",
  "category": null,
  "service": null,
  "service_key": "",
  "creation_date": null,
  "investigate_uri": "https://platform.robusta.dev/graphs",
  "add_silence_url": true,
  "subject": {
    "name": "checkout-api-7d9f8b6c5-x2lqz",
    "kind": "pod",
    "namespace": "default",
    "node": "ip-10-0-3-17.eu-west-1.compute.internal",
    "container": "checkout-api",
    "labels": {
      "app": "checkout-api",
      "pod-template-hash": "7d9f8b6c5"
    },
    "annotations": {}
  },
  "links": [],
  "enrichments": []
}
```

The recovery has the same `fingerprint`, a `[RESOLVED] ` prefix on `title`, and an `ends_at`:

```json
{
  "title": "[RESOLVED] Pod is crash looping.",
  "description": "Pod default/checkout-api-7d9f8b6c5-x2lqz (checkout-api) is in waiting state (reason: \"CrashLoopBackOff\").",
  "cluster_name": "prod-eu-1",
  "account_id": "6f1c2d4e-8a3b-4c5d-9e7f-0a1b2c3d4e5f",
  "severity": "LOW",
  "source": "PROMETHEUS",
  "finding_type": "ISSUE",
  "aggregation_key": "KubePodCrashLooping",
  "failure": true,
  "fingerprint": "a3f6c2b19d8e4f70",
  "starts_at": "2026-10-09T03:12:41.523000+00:00",
  "ends_at": "2026-10-09T03:41:11.204000+00:00",
  "id": "5d2a9c71-e8b0-4f63-a1d4-7c6e0b3f9a82",
  "category": null,
  "service": null,
  "service_key": "",
  "creation_date": null,
  "investigate_uri": "https://platform.robusta.dev/graphs",
  "add_silence_url": true,
  "subject": {
    "name": "checkout-api-7d9f8b6c5-x2lqz",
    "kind": "pod",
    "namespace": "default",
    "node": "ip-10-0-3-17.eu-west-1.compute.internal",
    "container": "checkout-api",
    "labels": {
      "app": "checkout-api",
      "pod-template-hash": "7d9f8b6c5"
    },
    "annotations": {}
  },
  "links": [],
  "enrichments": []
}
```

| Field | What Spike does with it |
| --- | --- |
| `fingerprint` | Identity of the alert across firing and recovery. Required for reliable grouping and resolving |
| `title` | The rule summary. A leading `[RESOLVED] ` marks a recovery |
| `description` | Robusta's sentence about the fault. The firing title when it reads as one short line |
| `aggregation_key` | The rule name, such as `KubePodCrashLooping`. Used for the title when `description` and `title` are not usable |
| `cluster_name` | Appended to the place as ` in <cluster>` |
| `subject.namespace`, `subject.name`, `subject.node` | The place: `namespace/name`, else `name`, else `node` |
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

The title is Robusta's `description` when it is one short line, otherwise built from the rule and the place. Use a [Title Remapper](../alerts/title-remapper.md) to write your own from the payload, for example `{{data.body.aggregation_key}} on {{data.body.cluster_name}}`.

</details>
