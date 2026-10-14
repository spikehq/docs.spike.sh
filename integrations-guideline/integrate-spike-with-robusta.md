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

Robusta's `description` is its own sentence about the fault, so whenever it is not empty it is the title, with whitespace collapsed. Every title is cut to at most 200 characters.

```
Pod payments/checkout-api-7d9f8b6c5-x2k4p (checkout-api) is in waiting state (reason: "CrashLoopBackOff").
```

For Prometheus alerts Robusta appends a `LABELS = map[...]` tail to the description; Spike removes it. When `description` is `null` or empty, which happens for some native Kubernetes findings, Spike falls back in this order:

1. `title`, with a leading `[RESOLVED] ` removed. For example `Pod checkout-api is crash looping`.
2. `aggregation_key on subject.namespace/subject.name in cluster_name`, for example `KubePodCrashLooping on payments/checkout-api-7d9f8b6c5-x2k4p in prod-us-east-1`. The namespace is left out when it is `null`, and each part is left out when it is missing.
3. `Robusta alert with no details`.

A recovery gets this title instead:

```
Resolved: Pod is crash looping. — payments/checkout-api-7d9f8b6c5-x2k4p in prod-us-east-1
```

That is `Resolved: `, then `title` without the `[RESOLVED] ` prefix (`aggregation_key` if `title` is empty), then ` — `, then `subject.namespace/subject.name in cluster_name`.

When the body has no usable `fingerprint`, Spike matches by title instead, so it skips `description` and uses `title` without its `[RESOLVED] ` prefix (else `aggregation_key`, else `Robusta alert with no details`). That keeps the title identical when the alert fires and when it recovers. A `fingerprint` counts as usable when it is a non-empty string or a number and is not an unexpanded template variable. Otherwise the title is for display only; matching is done on `fingerprint`.

## Severity

Spike takes the incident severity from the payload's `severity` keys before alert rules run. A Robusta body has two: Robusta's own `severity` (`LOW`, `HIGH`, and so on) and, for Prometheus alerts, the alert's `severity` label at `subject.labels.severity` (such as `warning` or `critical`). When both are present the Prometheus label wins, so the severity Spike uses, and the value an [alert rule](../alerts/alert-rules.md) sees as `severity`, is the label's. The example body carries no `severity` label, so there Robusta's `LOW` is used.

To route or suppress by severity, write the rule on the label values (`warning`, `critical`). Rules that match `HIGH` or `LOW` only match findings that carry no Prometheus `severity` label, such as native Kubernetes findings. Robusta's original value stays in the body on the incident page. Read more about [priority and severity](../incidents/priority-and-severity.md).

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

`clusterName` must be set: it becomes `cluster_name`, the last part of the fallback and recovery titles.

## Step 3 — Check it works

Wait for the next alert Robusta forwards, or post a test finding by hand. A firing alert opens an incident, and posting the same body again with `"title": "[RESOLVED] Pod is crash looping."` and the same `fingerprint` resolves it:

```bash
curl -X POST "https://hooks.spike.sh/<your-token>/push-events" \
  -H "Content-Type: application/json" \
  -d '{"title": "Pod is crash looping.", "description": "Pod payments/checkout-api-7d9f8b6c5-x2k4p (checkout-api) is in waiting state (reason: \"CrashLoopBackOff\").", "cluster_name": "prod-us-east-1", "account_id": "6f1c2a9e-4b7d-4e2a-9c3f-1d8e5b7a0c42", "severity": "LOW", "source": "PROMETHEUS", "finding_type": "ISSUE", "aggregation_key": "KubePodCrashLooping", "failure": true, "fingerprint": "a1f3c9e27b4d6058", "category": null, "service_key": null, "creation_date": "2026-10-14T03:12:41.118205", "investigate_uri": null, "add_silence_url": true, "starts_at": "2026-10-14T03:02:11.402000+00:00", "ends_at": null, "id": "3b9e6d1a-7c2f-4e58-9a01-5d4b8e2f6c13", "service": null, "subject": {"name": "checkout-api-7d9f8b6c5-x2k4p", "kind": "pod", "namespace": "payments", "node": "ip-10-0-3-17.ec2.internal", "container": "checkout-api", "labels": {"app": "checkout-api", "pod-template-hash": "7d9f8b6c5"}, "annotations": {}}, "links": [], "enrichments": []}'
```

The same body, formatted, is in the payload reference below. For the recovery, send the second body.

## Payload reference

Robusta posts `application/json`, one finding per request. A firing alert looks like this:

```json
{
  "title": "Pod is crash looping.",
  "description": "Pod payments/checkout-api-7d9f8b6c5-x2k4p (checkout-api) is in waiting state (reason: \"CrashLoopBackOff\").",
  "cluster_name": "prod-us-east-1",
  "account_id": "6f1c2a9e-4b7d-4e2a-9c3f-1d8e5b7a0c42",
  "severity": "LOW",
  "source": "PROMETHEUS",
  "finding_type": "ISSUE",
  "aggregation_key": "KubePodCrashLooping",
  "failure": true,
  "fingerprint": "a1f3c9e27b4d6058",
  "category": null,
  "service_key": null,
  "creation_date": "2026-10-14T03:12:41.118205",
  "investigate_uri": null,
  "add_silence_url": true,
  "starts_at": "2026-10-14T03:02:11.402000+00:00",
  "ends_at": null,
  "id": "3b9e6d1a-7c2f-4e58-9a01-5d4b8e2f6c13",
  "service": null,
  "subject": {
    "name": "checkout-api-7d9f8b6c5-x2k4p",
    "kind": "pod",
    "namespace": "payments",
    "node": "ip-10-0-3-17.ec2.internal",
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
  "description": "Pod payments/checkout-api-7d9f8b6c5-x2k4p (checkout-api) is in waiting state (reason: \"CrashLoopBackOff\").",
  "cluster_name": "prod-us-east-1",
  "account_id": "6f1c2a9e-4b7d-4e2a-9c3f-1d8e5b7a0c42",
  "severity": "LOW",
  "source": "PROMETHEUS",
  "finding_type": "ISSUE",
  "aggregation_key": "KubePodCrashLooping",
  "failure": true,
  "fingerprint": "a1f3c9e27b4d6058",
  "category": null,
  "service_key": null,
  "creation_date": "2026-10-14T03:41:07.553912",
  "investigate_uri": null,
  "add_silence_url": true,
  "starts_at": "2026-10-14T03:02:11.402000+00:00",
  "ends_at": "2026-10-14T03:40:41.402000+00:00",
  "id": "c84e2b17-0f6a-4d93-b5e8-27a1f9d03e6b",
  "service": null,
  "subject": {
    "name": "checkout-api-7d9f8b6c5-x2k4p",
    "kind": "pod",
    "namespace": "payments",
    "node": "ip-10-0-3-17.ec2.internal",
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
| `title` | The finding title. A leading `[RESOLVED] ` marks a recovery, and it is the fallback title when `description` is empty |
| `description` | Robusta's sentence about the fault. The title whenever it is not empty |
| `cluster_name` | The last part of the fallback and recovery titles |
| `subject.namespace`, `subject.name` | The `namespace/name` part of the fallback and recovery titles |
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

The title is Robusta's `description` whenever it is not empty, otherwise `title`, then `aggregation_key` with the namespace, name and cluster. Use a [Title Remapper](../alerts/title-remapper.md) to write your own from the payload, for example `{{data.body.aggregation_key}} on {{data.body.cluster_name}}`.

</details>
