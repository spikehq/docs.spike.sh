---
description: "Connect Flux to Spike to get alerted when a Kustomization, HelmRelease or source fails to reconcile, and have the incident resolve when it reconciles again."
---
# Flux

## Overview

[Flux](https://fluxcd.io) is a GitOps toolkit for Kubernetes. It keeps your clusters in sync with configuration stored in Git, OCI registries and Helm repositories. Flux's notification-controller forwards events from its controllers (kustomize-controller, helm-controller, source-controller and others) to external systems.

With Spike's integration, you can receive real-time alerts when Flux reports problems such as:

* **Failed reconciliations**: A Kustomization or HelmRelease could not be applied, for example because of a validation error.
* **Failed health checks**: Resources applied by Flux did not become ready in time.
* **Build and fetch failures**: Kustomize builds, Git clones or artifact downloads fail.
* **Helm action failures**: Helm installs, upgrades, tests or rollbacks fail.

Spike uses the Kubernetes UID of the Flux object (the Kustomization, HelmRelease, GitRepository and so on) to group repeated failures into one incident and to resolve it when the same object reports a successful reconciliation. The UID is what identifies the incident, so the title is for display only.

{% hint style="info" %}
Spike will automatically group repeated incidents and also suppress alerts while incident is open. You can set up [alert rules](https://docs.spike.sh/alerts/alert-rules) to determine incident severity and take actions accordingly.
{% endhint %}

## Set up instructions

**Step 1:** Create a Flux integration in the Spike dashboard and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

**Step 2:**

{% tabs %}
{% tab title="Setup on Flux" %}

**Prerequisites:**
* Flux is installed on your cluster, including the notification-controller.
* You can apply resources to the `flux-system` namespace (or the namespace where you keep your Flux notification resources).

You send events to Spike with a Flux `Provider` of type `generic` and an `Alert` that points at it.

1. **Create a Secret holding the Spike webhook URL:**

   ```bash
   kubectl -n flux-system create secret generic spike-webhook \
     --from-literal=address=<SPIKE_WEBHOOK_URL>
   ```

   Replace `<SPIKE_WEBHOOK_URL>` with the webhook URL copied in Step 1.

2. **Create the Provider:**

   Save it as `spike-provider.yaml`.

   ```yaml
   apiVersion: notification.toolkit.fluxcd.io/v1beta3
   kind: Provider
   metadata:
     name: spike
     namespace: flux-system
   spec:
     type: generic
     secretRef:
       name: spike-webhook
   ```

3. **Create the Alert:**

   Save it as `spike-alert.yaml`.

   ```yaml
   apiVersion: notification.toolkit.fluxcd.io/v1beta3
   kind: Alert
   metadata:
     name: spike
     namespace: flux-system
   spec:
     providerRef:
       name: spike
     eventSeverity: info
     eventSources:
       - kind: Kustomization
         name: '*'
         namespace: flux-system
       - kind: Kustomization
         name: '*'
         namespace: apps
       - kind: HelmRelease
         name: '*'
         namespace: apps
       - kind: GitRepository
         name: '*'
         namespace: flux-system
   ```

   * **providerRef** (required): the Provider created in the previous step.
   * **eventSources** (required): the Flux objects to watch. A source without `namespace` only matches objects in the Alert's own namespace (`flux-system` here), and `*` is not supported for `namespace`. List one entry per kind and namespace you want to watch, as in the example (change `apps` to your own namespaces).
   * **eventSeverity** (required for auto-resolution): use `info` so Flux also sends success events. With `error`, incidents open but never resolve automatically.
   * **eventMetadata** (optional): any keys you add are sent in `metadata` and kept on the incident, but Spike does not read them.

4. **Apply the manifests:**

   ```bash
   kubectl apply -f spike-provider.yaml -f spike-alert.yaml
   ```

5. **Test the Integration:**
   * Make a Kustomization fail, for example by committing an invalid manifest to the watched path.
   * Verify that a new incident appears in Spike titled with Flux's error message.
   * Fix the manifest and verify that the incident resolves after the next successful reconciliation.

{% endtab %}
{% endtabs %}

## Event payload structure

Flux sends each event to Spike as a JSON payload. A failure looks like this:

```json
{
  "involvedObject": {
    "apiVersion": "kustomize.toolkit.fluxcd.io/v1",
    "kind": "Kustomization",
    "name": "webapp",
    "namespace": "apps",
    "uid": "7d0cdc51-ddcf-4743-b223-83ca5c699632"
  },
  "metadata": {
    "kustomize.toolkit.fluxcd.io/revision": "main/731f7eaddfb6af01cb2173e18f0f75b0ba780ef1"
  },
  "severity": "error",
  "reason": "ValidationFailed",
  "message": "service/apps/webapp validation error: spec.type: Unsupported value: Ingress",
  "reportingController": "kustomize-controller",
  "reportingInstance": "kustomize-controller-7c7b47f5f-8bhrp",
  "timestamp": "2022-10-28T07:26:19Z"
}
```

When the same object reconciles successfully, Flux sends a recovery event:

```json
{
  "involvedObject": {
    "apiVersion": "kustomize.toolkit.fluxcd.io/v1",
    "kind": "Kustomization",
    "name": "webapp",
    "namespace": "apps",
    "uid": "7d0cdc51-ddcf-4743-b223-83ca5c699632"
  },
  "metadata": {
    "kustomize.toolkit.fluxcd.io/revision": "main/8b2e4f0c1d9a7e6b5c4d3e2f1a0b9c8d7e6f5a4b"
  },
  "severity": "info",
  "reason": "ReconciliationSucceeded",
  "message": "Reconciliation finished in 1.42s, next run in 10m0s",
  "reportingController": "kustomize-controller",
  "reportingInstance": "kustomize-controller-7c7b47f5f-8bhrp",
  "timestamp": "2022-10-28T07:41:03Z"
}
```

**Key Fields:**
* `involvedObject.uid` - Kubernetes UID of the Flux object. Spike uses it to match repeat and recovery events to the open incident. It must be a non-empty string or a number, not an unexpanded template such as `$uid` or `{{ .uid }}`. An event without a usable UID is not matched to an incident.
* `involvedObject.kind`, `involvedObject.namespace`, `involvedObject.name` - The Flux object the event is about. They appear in the fallback and recovery titles.
* `severity` - `error` opens an incident, or joins the open one for the same UID. `info` resolves the open incident for the same UID only when `reason` is a success reason. Every other `info` event (for example `Progressing` or `DependencyNotReady`) is accepted and ignored, and so is any other severity such as `trace`.
* `reason` - Taken from the object's Ready condition, for example `ValidationFailed`, `ReconciliationFailed` or `HealthCheckFailed`. The success reasons that resolve an incident are `ReconciliationSucceeded`, `Succeeded`, `InstallSucceeded`, `UpgradeSucceeded` and `TestSucceeded`.
* `message` - Flux's description of what happened. It becomes the incident title.

The remaining fields (`apiVersion`, `metadata`, `reportingController`, `reportingInstance`, `timestamp`) are sent by Flux and are not used to open or resolve incidents. Keys you add through `eventMetadata` appear in `metadata` and are kept on the incident, not read.

## Incident titles

| Event | Title |
| --- | --- |
| Failure | Flux's `message`, whitespace collapsed and cut at 200 characters |
| Failure with an empty `message` | `{reason} on {kind} {namespace}/{name}` |
| Failure with neither | `Flux alert with no details` |
| Recovery | `{kind} {namespace}/{name} reconciled successfully` |
| Recovery when the object is not named | `Flux alert recovered` |

The first payload above creates an incident titled `service/apps/webapp validation error: spec.type: Unsupported value: Ingress`. The second resolves it, and the recovery title is `Kustomization apps/webapp reconciled successfully`. The recovery title leaves out `message` because it carries durations.

## Troubleshooting

**No incidents appear in Spike:**
* Check the Provider and Alert status with `kubectl -n flux-system get providers,alerts`; both should be ready.
* Confirm the `address` in the Secret is the exact Spike webhook URL.
* Confirm `eventSources` has an entry with the kind and `namespace` of the failing object. An entry without `namespace` only matches the Alert's own namespace.
* Check the notification-controller logs: `kubectl -n flux-system logs deploy/notification-controller`.

**Incidents do not resolve:**
* Set `eventSeverity: info` on the Alert so Flux sends success events.
* Resolution happens when the same object (same `involvedObject.uid`) sends an `info` event whose `reason` is `ReconciliationSucceeded`, `Succeeded`, `InstallSucceeded`, `UpgradeSucceeded` or `TestSucceeded`. Only `ReconciliationSucceeded` (kustomize-controller) has been confirmed against Flux's source.

{% hint style="success" %}
This integration auto resolves
{% endhint %}
